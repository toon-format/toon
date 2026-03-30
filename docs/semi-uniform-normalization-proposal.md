# Proposal: Pre-Encoding Normalization for Semi-Uniform Data

> **Status**: Draft (with prototype implementation & benchmark results)  
> **Date**: 2026-03-30  
> **Author**: @long.black  
> **Target**: TOON spec discussion / encoder option proposal

## Summary

TOON의 tabular 압축은 uniform 배열에서 JSON compact 대비 **-36.9%** 토큰 절감을 달성하지만, semi-uniform 배열에서는 오히려 **+19.9%** 증가합니다. 이 문서는 semi-uniform 데이터를 인코딩 전에 **base + extras 테이블로 분리**하여 양쪽 모두 uniform으로 만드는 정규화 전략을 제안합니다.

`normalizeForToon()` 프로토타입 구현과 벤치마크 결과, event-logs에서 TOON 154,084 → **normalized 95,675 tokens** (−37.9%), JSON compact 대비 **−25.6%** 절감을 달성했습니다.

## 1. Problem: Semi-Uniform Data의 성능 저하

### 현재 벤치마크 결과 (Event Logs, tabularEligibility: 50%)

| Format | Tokens (2000 logs) | vs JSON compact |
|--------|-------------------|-----------------|
| JSON compact | 128,529 | baseline |
| YAML | 155,397 | +20.9% |
| **TOON** | **154,084** | **+19.9%** |
| JSON pretty | 181,201 | +41.0% |

| Format | Accuracy (75 logs, 4 models) | Tokens |
|--------|------------------------------|--------|
| json-compact | 68.3% | 4,839 |
| **toon** | **65.0%** | **5,819** |
| json-pretty | 69.2% | 6,817 |
| yaml | 61.7% | 5,847 |

TOON이 토큰도 더 많고 정확도도 낮습니다.

### 원인 분석

Event Log 구조:

```typescript
interface EventLog {
  // 공통 필드 (6개) — 모든 로그에 존재
  timestamp: string
  level: 'info' | 'warn' | 'error'
  endpoint: string
  statusCode: number
  responseTime: number
  userId: number
  // 선택적 필드 — ~50%의 로그에만 존재
  error?: {
    message: string
    stack: string
    retryable: boolean
  }
}
```

`error` 객체가 있는 로그와 없는 로그가 섞여 있어서:
- 필드 셋이 동일하지 않음 → tabular 조건 불충족
- TOON이 YAML 스타일 list format으로 폴백
- `[N]{fields}:` 헤더 등 TOON 고유 문법 오버헤드만 추가됨
- 키 이름이 매 객체마다 반복 (tabular의 "한 번만 선언" 이점 상실)

## 2. Proposed Strategy: Base + Extras Normalization

### 핵심 아이디어

인코딩 전에 semi-uniform 배열을 두 개의 uniform 테이블로 분리합니다:

1. **base**: 모든 객체가 공유하는 공통 필드만 → 100% uniform
2. **extras**: 선택적 필드가 있는 객체만, 원본 인덱스(`idx`)와 함께 → 100% uniform

### 2.1 Single Extras: Before/After (EventLog)

**Before** (현재 TOON — list format 폴백):

```toon
logs[4]:
  - timestamp: 2025-03-15T10:00:00Z
    level: info
    endpoint: /api/users
    statusCode: 200
    responseTime: 45
    userId: 1001
  - timestamp: 2025-03-15T10:01:00Z
    level: error
    endpoint: /api/orders
    statusCode: 500
    responseTime: 3200
    userId: 1002
    error:
      message: Database connection timeout
      stack: "Error: timeout\n  at connect\n  at query"
      retryable: true
  - timestamp: 2025-03-15T10:02:00Z
    level: info
    endpoint: /api/products
    statusCode: 200
    responseTime: 120
    userId: 1003
  - timestamp: 2025-03-15T10:03:00Z
    level: warn
    endpoint: /api/auth
    statusCode: 429
    responseTime: 5000
    userId: 1004
    error:
      message: Rate limit exceeded
      stack: "Error: rate limit\n  at check\n  at middleware"
      retryable: true
```

키 이름이 매 객체마다 반복됩니다. 4개 로그에서 `timestamp`, `level`, `endpoint`, `statusCode`, `responseTime`, `userId`가 4번씩 = 24회 반복.

**After** (base + extras 분리):

```toon
logs[4]{timestamp,level,endpoint,statusCode,responseTime,userId}:
  2025-03-15T10:00:00Z,info,/api/users,200,45,1001
  2025-03-15T10:01:00Z,error,/api/orders,500,3200,1002
  2025-03-15T10:02:00Z,info,/api/products,200,120,1003
  2025-03-15T10:03:00Z,warn,/api/auth,429,5000,1004
logs.error[2]{idx,message,stack,retryable}:
  1,Database connection timeout,"Error: timeout\n  at connect\n  at query",true
  3,Rate limit exceeded,"Error: rate limit\n  at check\n  at middleware",true
```

- `logs` 테이블: 공통 6필드, 4행 → **100% uniform, tabular 압축 적용**
- `logs.error` 테이블: error가 있는 행만, `idx`로 참조 → **100% uniform, tabular 압축 적용**
- 키 이름 반복: 24회 → **0회** (헤더에 한 번만 선언)

### 2.2 Multi-Extras: Before/After (Order + discount + shipping)

2-3 depth 중첩 + 여러 독립 extras 그룹이 있는 경우:

```typescript
interface SemiUniformOrder {
  orderId: string
  total: number
  status: string
  orderDate: string
  discount?: { code: string; amount: number }           // ~30%
  shipping?: {                                           // ~60%
    carrier: string
    tracking: string
    address: { city: string; zip: string; country: string }
  }
}
```

**Before** (TOON list format):

```toon
orders[6]:
  - orderId: ORD-001
    total: 150
    status: delivered
    orderDate: 2025-03-01
  - orderId: ORD-002
    total: 200
    status: shipped
    orderDate: 2025-03-02
    discount:
      code: SAVE20
      amount: 40
    shipping:
      carrier: UPS
      tracking: UP456
      address:
        city: Seoul
        zip: "06100"
        country: KR
  ...
```

**After** (base + 2 extras tables):

```toon
orders[6]{orderId,total,status,orderDate}:
  ORD-001,150,delivered,2025-03-01
  ORD-002,200,shipped,2025-03-02
  ORD-003,80,processing,2025-03-03
  ORD-004,300,delivered,2025-03-04
  ORD-005,95,pending,2025-03-05
  ORD-006,420,shipped,2025-03-06
orders.discount[2]{idx,code,amount}:
  1,SAVE20,40
  3,VIP10,30
orders.shipping[5]{idx,carrier,tracking,address.city,address.zip,address.country}:
  1,UPS,UP456,Seoul,06100,KR
  2,FedEx,FX789,Busan,48058,KR
  3,DHL,DH012,Incheon,21554,KR
  4,CJ,CJ345,Daegu,41585,KR
  5,Hanjin,HJ678,Gwangju,61477,KR
```

- `discount`은 이미 flat (primitive 값만) → 그대로 extras 테이블
- `shipping.address`는 2-depth → dot notation으로 flatten (`address.city`, `address.zip`, `address.country`)
- 각 extras 테이블이 독립적으로 100% uniform

### 2.3 Deep Extras: Before/After (4+ depth Incident)

```typescript
interface Incident {
  id: string
  title: string
  severity: string
  createdAt: string
  resolution?: {                                    // ~40%
    assignee: string
    timeline: {
      startedAt: string
      resolvedAt: string
      escalation?: {                                // resolution 중 ~50%
        level: number
        approvedBy: string
        notes: string
      }
    }
  }
}
```

**After** (recursive flatten with null-padding):

```toon
incidents[5]{id,title,severity,createdAt}:
  INC-001,Login page 500 error,critical,2025-03-15T08:00:00Z
  INC-002,Slow dashboard load,major,2025-03-15T09:00:00Z
  INC-003,Payment timeout,critical,2025-03-15T10:00:00Z
  INC-004,CSS broken on mobile,minor,2025-03-15T11:00:00Z
  INC-005,API rate limit hit,major,2025-03-15T12:00:00Z
incidents.resolution[3]{idx,assignee,timeline.startedAt,timeline.resolvedAt,timeline.escalation.level,timeline.escalation.approvedBy,timeline.escalation.notes}:
  1,alice@example.com,2025-03-15T09:30:00Z,2025-03-15T11:00:00Z,2,bob@example.com,Required DB team involvement
  2,charlie@example.com,2025-03-15T10:15:00Z,2025-03-15T12:00:00Z,,,
  4,diana@example.com,2025-03-15T12:30:00Z,2025-03-15T14:00:00Z,3,eve@example.com,Infra scaling required
```

- `resolution` → `assignee` (depth 1), `timeline.startedAt` (depth 2), `timeline.escalation.level` (depth 3)
- `escalation`이 없는 INC-003은 `timeline.escalation.*` 필드가 null로 패딩
- 모든 행이 동일한 필드 셋 → 100% uniform tabular

### 네이밍 컨벤션

```
{arrayKey}[N]{baseFields}:          ← base table
{arrayKey}.{extraName}[M]{fields}:  ← extras table (dot notation)
```

- `idx` 필드는 항상 extras 테이블의 첫 번째 컬럼
- `idx`는 base 테이블의 0-based 행 인덱스
- dot notation은 TOON의 기존 key folding 문법과 일관됨

## 3. Token Savings: 추정치 vs 실측치

### 실측 벤치마크 결과

`normalizeForToon()` 프로토타입으로 실제 토큰 수를 측정한 결과:

| Dataset | Records | JSON compact | TOON | TOON (normalized) | normalized vs JSON compact |
|---------|---------|-------------|------|-------------------|---------------------------|
| event-logs | 2,000 | 128,529 | 154,084 (+19.9%) | **95,675** | **−25.6%** |
| semi-uniform-orders | 500 | 25,674 | 31,467 (+22.6%) | **17,375** | **−32.3%** |
| deep-incidents | 500 | 32,893 | 37,031 (+12.6%) | **25,846** | **−21.4%** |

### 추정치 vs 실측치 비교

| Dataset | 추정 범위 | 실측 | 오차 |
|---------|----------|------|------|
| event-logs | ~85,000–95,000 | 95,675 | 추정 범위 상한 근처 ✓ |

추정이 정확했던 이유:
- base 테이블의 uniform tabular 절감률이 employee records 벤치마크와 유사
- extras 테이블도 동일하게 tabular 적용
- 헤더 오버헤드가 실제로 무시 가능한 수준

### 핵심 인사이트

정규화는 TOON의 semi-uniform 문제를 완전히 해결합니다:
- **event-logs**: +19.9% → **−25.6%** (45.5%p 개선)
- **semi-uniform-orders**: +22.6% → **−32.3%** (54.9%p 개선)
- **deep-incidents**: +12.6% → **−21.4%** (34.0%p 개선)

## 4. Recursive Normalization Algorithm

### 알고리즘 의사코드

```
function normalizeForToon(data, options):
  threshold = options.threshold ?? 0.2
  maxFlattenDepth = options.maxFlattenDepth ?? 3
  result = {}

  for each (key, value) in data:
    if value is not array of objects:
      result[key] = value
      continue

    baseFields = intersection of all objects' field sets
    extraFields = union of (each object's fields - baseFields)

    if extraFields is empty:
      result[key] = value    // already uniform, passthrough
      continue

    // Build base table (strip extras)
    result[key] = objects.map(obj => pick(obj, baseFields))

    // Process each extras group independently
    for each extraField in extraFields:
      occurrences = objects that have extraField
      ratio = occurrences.length / objects.length

      if ratio < threshold:
        continue              // below threshold, skip

      // Flatten each extra value recursively
      flatRows = occurrences.map(obj =>
        { idx: obj.index, ...flatten(obj[extraField], maxFlattenDepth) }
      )

      // Null-pad missing keys across rows
      allKeys = union of all flatRows' keys
      paddedRows = flatRows.map(row => padMissing(row, allKeys, null))

      // Net benefit check
      benefit = occurrences × flatFieldCount × AVG_KEY_TOKENS
              - (HEADER_OVERHEAD + occurrences × IDX_OVERHEAD)
      if benefit <= 0:
        continue              // overhead exceeds savings

      result[key + "." + extraField] = paddedRows

  return result
```

### 동적 순이익 계산 공식

각 extras 그룹의 분리 여부를 결정하는 공식:

```
benefit = occurrences × repeatedKeyTokens − (headerTokens + occurrences × idxTokenOverhead)
```

- `occurrences`: extras 필드가 존재하는 행 수
- `repeatedKeyTokens`: flatten된 필드 수 × 평균 키 토큰 수 (≈2)
- `headerTokens`: extras 테이블 헤더 오버헤드 (≈5 tokens)
- `idxTokenOverhead`: 각 행의 idx 컬럼 오버헤드 (≈1 token)

순이익이 양수인 그룹만 분리합니다. 이는 threshold 조건과 독립적으로 적용되어, threshold를 통과하더라도 필드가 너무 적으면 분리하지 않습니다.

### `maxFlattenDepth` 동작

재귀 flatten은 `maxFlattenDepth` (기본값 3)까지만 수행합니다:

| Depth | 동작 | 예시 |
|-------|------|------|
| 1 | 직접 flatten | `error.message`, `error.stack` |
| 2 | 재귀 flatten | `timeline.startedAt`, `timeline.resolvedAt` |
| 3 | 재귀 flatten | `timeline.escalation.level`, `timeline.escalation.notes` |
| 4+ | **JSON string 직렬화** | `context.environment.cluster` → `"{\"name\":\"prod-1\",\"nodes\":5}"` |

배열 값도 JSON string으로 직렬화됩니다: `tags` → `"[\"urgent\",\"security\"]"`

### Multi-Extras 그룹핑 전략

각 optional 필드가 독립적인 그룹으로 처리됩니다:

1. 필드 교집합 = base, 차집합의 각 필드 = 독립 group
2. 각 group별로 threshold + net benefit 필터링
3. 통과한 group만 `{arrayKey}.{groupName}` extras 테이블로 분리
4. 통과하지 못한 group의 필드는 base에서 제거 (null 패딩 없이 drop)

이 전략은 extras 테이블 수에 동적 상한을 두지 않습니다 — 순이익이 양수인 모든 그룹이 분리됩니다. 실제로 대부분의 데이터에서 2-3개 이상의 독립 extras 그룹이 발생하는 경우는 드뭅니다.

## 5. Implementation Approaches

### Option A: Encoder Option (권장)

TOON 인코더에 `normalizeExtras` 옵션 추가:

```typescript
encode(data, {
  normalizeExtras: {
    mode: 'auto',
  }
})
```

### Option B: Pre-Processing Utility (구현 완료 ✓)

인코딩 전에 데이터를 변환하는 독립 유틸리티:

```typescript
import { normalizeForToon, encode } from '@toon-format/toon'

const normalized = normalizeForToon(data, {
  threshold: 0.2,       // extras 비율 최소 20%
  maxFlattenDepth: 3,   // 3-depth까지 flatten, 초과 시 JSON string
})
const toon = encode(normalized)
```

### Option C: Documentation-Only (최소 접근)

스펙이나 인코더를 변경하지 않고, "Best Practices" 문서에 semi-uniform 데이터 처리 가이드로 추가.

## 6. Edge Cases & Limitations

### 6.1 LLM의 idx 참조 이해도

LLM이 `logs.error`의 `idx: 1`을 보고 `logs` 테이블의 2번째 행(0-based)과 연결할 수 있는지 검증 필요.

- TOON의 `[N]` 헤더가 이미 인덱스 기반 구조를 암시하므로 자연스러울 가능성 높음
- 벤치마크에 idx 참조 질문 유형 추가 필요 (예: "idx 1인 에러의 endpoint는?")

### 6.2 Multiple Extra Groups — 동적 상한 전략

하나의 배열에 여러 종류의 선택적 필드가 있을 수 있음:

```typescript
interface Order {
  id: string
  total: number
  discount?: { code: string; amount: number }   // Group A: ~30%
  shipping?: { carrier: string; tracking: string } // Group B: ~60%
}
```

→ `orders.discount[M]{idx,...}:` + `orders.shipping[K]{idx,...}:` 로 다중 extras 테이블 생성

**동적 상한 전략**: 각 그룹별로 독립적으로 순이익을 계산하여 양수인 그룹만 분리합니다. 고정된 상한 대신 경제적 판단에 의존하므로, 필드가 적거나 출현 빈도가 낮은 그룹은 자동으로 제외됩니다.

실측 결과 (semi-uniform-orders, 500건):
- `orders.discount` (30%): 분리 → 순이익 양수 ✓
- `orders.shipping` (60%): 분리 + 2-depth flatten → 순이익 양수 ✓
- 전체 결과: TOON 31,467 → normalized 17,375 (−44.8%)

### 6.3 Threshold 결정

extras 비율이 너무 낮으면 (예: 5%) 별도 테이블 오버헤드가 절감보다 클 수 있음. 최소 threshold 필요.

- 기본값: extras가 전체 행의 **20% 이상**일 때만 분리
- 20% 미만이면 base에서 해당 필드를 제거 (null 패딩 없이 drop)
- threshold는 `NormalizeExtrasOptions.threshold`로 조정 가능

### 6.4 Deeply Nested Extras — `maxFlattenDepth` + JSON Serialize Fallback

재귀 flatten은 `maxFlattenDepth` (기본값 3)까지 수행합니다:

- depth ≤ maxFlattenDepth: dot notation으로 flatten (`timeline.escalation.level`)
- depth > maxFlattenDepth: **JSON string으로 직렬화** (`context.environment.cluster` → `"{\"name\":\"prod-1\",\"nodes\":5}"`)
- 배열 값: 항상 JSON string으로 직렬화 (`tags` → `"[\"urgent\",\"security\"]"`)

이 전략은 기존 proposal의 "1-depth flatten만 허용" 제한을 제거하고, 실제 데이터의 중첩 깊이에 맞게 동적으로 대응합니다.

실측 결과 (deep-incidents, 500건):
- `resolution.timeline.escalation.*` (depth 3): 정상 flatten ✓
- escalation이 없는 행: null 패딩 ✓
- 전체 결과: TOON 37,031 → normalized 25,846 (−30.2%)

### 6.5 Extras 테이블 간 idx 충돌 방지

각 extras 테이블의 `idx`는 동일한 base 테이블의 0-based 인덱스를 참조합니다. 여러 extras 테이블이 존재해도 각각 독립적이므로 idx 충돌은 발생하지 않습니다.

예: `orders.discount`의 `idx: 1`과 `orders.shipping`의 `idx: 1`은 모두 `orders[1]`을 참조하지만, 서로 다른 테이블이므로 혼동 없음.

### 6.6 순환 참조 처리

`normalizeForToon()`은 입력 데이터가 JSON-serializable하다고 가정합니다. 순환 참조가 있는 객체는 `JSON.stringify()`에서 에러가 발생하므로, 호출자가 사전에 처리해야 합니다. 이는 TOON 인코더 자체의 제약과 동일합니다.

### 6.7 Round-Trip (Decode)

정규화된 TOON을 다시 원본 JSON으로 복원하려면:
1. `logs.error`의 `idx`를 기준으로 `logs` 행에 error 객체 재결합
2. dot notation key (`logs.error`)를 파싱하여 관계 추론

이는 TOON의 기존 `expandPaths: 'safe'` 옵션과 유사한 패턴.

## 7. Validation Plan

### 완료된 검증

- [x] **프로토타입 구현**: `normalizeForToon()` 유틸리티 함수 (`packages/toon/src/normalize-extras.ts`)
- [x] **토큰 효율 벤치마크**: event-logs, semi-uniform-orders, deep-incidents 3개 데이터셋
- [x] **Multi-depth 검증**: 1-depth (EventLog), 2-3 depth (Order), 4+ depth (Incident) 모두 테스트
- [x] **Multi-extras 검증**: Order의 discount + shipping 독립 분리 확인
- [x] **maxFlattenDepth 검증**: depth 초과 시 JSON string fallback 확인
- [x] **Threshold 검증**: 20% 미만 extras 비율에서 분리 스킵 확인

### 추가 검증 필요

- [ ] **LLM Accuracy 벤치마크**: 정규화된 형태에서 idx 참조 질문 포함한 accuracy 벤치마크
- [ ] **Threshold Sweep**: extras 비율 10%, 20%, 30%, 50%, 70%에서 각각 토큰 효율 측정
- [ ] 결과 기반으로 TOON Discussion에 제안 게시

## 8. Related Work

- TOON 공식 문서의 ["When Not to Use TOON"](https://github.com/toon-format/toon#when-not-to-use-toon) 섹션에서 semi-uniform 데이터에 대해 "Token savings diminish. Prefer JSON if your pipelines already rely on it."으로 언급
- [BoundaryML의 "Beware When Using TOON"](https://boundaryml.com/blog/beware-when-using-toon) 블로그에서 non-uniform 데이터 추가 시 TOON이 "malformed YAML처럼 보인다"고 비판했으나 대안은 제시하지 않음
- TOON GitHub PR/Discussion에서 semi-uniform 정규화 관련 논의는 **아직 없음** (2026-03-30 기준)

## 9. Next Steps

- [x] 프로토타입 구현: `normalizeForToon()` 유틸리티 함수
- [x] 토큰 효율 벤치마크 실행 (event-logs + semi-uniform-orders + deep-incidents)
- [ ] LLM accuracy 벤치마크 실행 (idx 참조 질문 포함)
- [ ] 결과 기반으로 TOON Discussion에 제안 게시
