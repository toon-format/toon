# Proposal: Pre-Encoding Normalization for Semi-Uniform Data

> **Status**: Draft  
> **Date**: 2026-03-30  
> **Author**: @long.black  
> **Target**: TOON spec discussion / encoder option proposal

## Summary

TOON의 tabular 압축은 uniform 배열에서 JSON compact 대비 **-36.9%** 토큰 절감을 달성하지만, semi-uniform 배열에서는 오히려 **+19.9%** 증가합니다. 이 문서는 semi-uniform 데이터를 인코딩 전에 **base + extras 테이블로 분리**하여 양쪽 모두 uniform으로 만드는 정규화 전략을 제안합니다.

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

### Before (현재 TOON — list format 폴백)

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

### After (base + extras 분리)

```toon
logs[4]{timestamp,level,endpoint,statusCode,responseTime,userId}:
  2025-03-15T10:00:00Z,info,/api/users,200,45,1001
  2025-03-15T10:01:00Z,error,/api/orders,500,3200,1002
  2025-03-15T10:02:00Z,info,/api/products,200,120,1003
  2025-03-15T10:03:00Z,warn,/api/auth,429,5000,1004
logs.errors[2]{idx,message,stack,retryable}:
  1,Database connection timeout,"Error: timeout\n  at connect\n  at query",true
  3,Rate limit exceeded,"Error: rate limit\n  at check\n  at middleware",true
```

- `logs` 테이블: 공통 6필드, 4행 → **100% uniform, tabular 압축 적용**
- `logs.errors` 테이블: error가 있는 행만, `idx`로 참조 → **100% uniform, tabular 압축 적용**
- 키 이름 반복: 24회 → **0회** (헤더에 한 번만 선언)

### 네이밍 컨벤션

```
{arrayKey}[N]{baseFields}:          ← base table
{arrayKey}.{extraName}[M]{fields}:  ← extras table (dot notation)
```

- `idx` 필드는 항상 extras 테이블의 첫 번째 컬럼
- `idx`는 base 테이블의 0-based 행 인덱스
- dot notation은 TOON의 기존 key folding 문법과 일관됨

## 3. Token Savings Estimate

### 4개 로그 예시 기준 (위 예시)

| 항목 | Before (list) | After (base+extras) |
|------|--------------|---------------------|
| 키 이름 반복 | 24회 (6필드 × 4행) | 0회 |
| 구조 문자 (`- `, 들여쓰기) | 매 행 | 없음 |
| error 키 반복 | 6회 (3필드 × 2행) | 0회 |
| 헤더 오버헤드 | 0 | 2줄 (base + extras 헤더) |

### 2000개 로그 스케일 추정 (~50% error 포함)

현재 벤치마크 데이터 기반:

| 항목 | 현재 TOON | 정규화 후 TOON (추정) | JSON compact |
|------|----------|---------------------|-------------|
| Tokens | 154,084 | ~85,000–95,000 | 128,529 |
| vs JSON compact | +19.9% | **-26% ~ -34%** | baseline |

추정 근거:
- base 테이블 (2000행, 6필드): uniform employee records 벤치마크에서 TOON이 JSON compact 대비 -36.9% → 유사한 절감률 기대
- extras 테이블 (~1000행, 4필드): 동일하게 uniform tabular 적용
- 헤더 오버헤드: 2줄 추가 (무시 가능)

## 4. Implementation Approaches

### Option A: Encoder Option (권장)

TOON 인코더에 `normalizeExtras` 옵션 추가:

```typescript
encode(data, {
  normalizeExtras: {
    // 자동 감지: 배열 내 객체들의 필드 차이를 분석
    mode: 'auto',
    // 또는 명시적 지정
    // mode: 'manual',
    // extras: { 'logs': { extraKey: 'errors', fields: ['error.message', 'error.stack', 'error.retryable'] } }
  }
})
```

`auto` 모드 동작:
1. 배열 내 모든 객체의 필드 셋 수집
2. 교집합 = base fields, 차집합 = extra fields
3. extra fields가 있는 객체만 extras 테이블로 분리
4. 중첩 객체는 flat하게 펼침 (`error.message`, `error.stack`, ...)

### Option B: Pre-Processing Utility

인코딩 전에 데이터를 변환하는 독립 유틸리티:

```typescript
import { normalizeForToon } from '@toon-format/toon/normalize'
import { encode } from '@toon-format/toon'

const normalized = normalizeForToon(data, { threshold: 0.3 })
// threshold: extras가 전체의 30% 이상일 때만 분리 (너무 적으면 오버헤드)
const toon = encode(normalized)
```

### Option C: Documentation-Only (최소 접근)

스펙이나 인코더를 변경하지 않고, "Best Practices" 문서에 semi-uniform 데이터 처리 가이드로 추가.

## 5. Edge Cases & Limitations

### 5.1 LLM의 idx 참조 이해도

LLM이 `logs.errors`의 `idx: 1`을 보고 `logs` 테이블의 2번째 행(0-based)과 연결할 수 있는지 검증 필요.

- TOON의 `[N]` 헤더가 이미 인덱스 기반 구조를 암시하므로 자연스러울 가능성 높음
- 벤치마크에 idx 참조 질문 유형 추가 필요 (예: "idx 1인 에러의 endpoint는?")

### 5.2 Multiple Extra Groups

하나의 배열에 여러 종류의 선택적 필드가 있을 수 있음:

```typescript
interface Order {
  id: string
  total: number
  // Group A: ~30%에만 존재
  discount?: { code: string; amount: number }
  // Group B: ~60%에만 존재
  shipping?: { carrier: string; tracking: string }
}
```

→ `orders.discounts[M]{idx,...}:` + `orders.shipping[K]{idx,...}:` 로 다중 extras 테이블 생성

### 5.3 Threshold 결정

extras 비율이 너무 낮으면 (예: 5%) 별도 테이블 오버헤드가 절감보다 클 수 있음. 최소 threshold 필요.

- 제안: extras가 전체 행의 **20% 이상**일 때만 분리
- 20% 미만이면 base에 null/빈값으로 포함하는 것이 더 효율적

### 5.4 Deeply Nested Extras

`error.stack` 같은 1-depth 중첩은 flat하게 펼칠 수 있지만, 2-depth 이상 중첩은 복잡해짐.

- 제안: extras 테이블의 값은 primitive만 허용 (1-depth flatten)
- 2-depth 이상은 JSON string으로 직렬화하여 하나의 셀에 넣기

### 5.5 Round-Trip (Decode)

정규화된 TOON을 다시 원본 JSON으로 복원하려면:
1. `logs.errors`의 `idx`를 기준으로 `logs` 행에 error 객체 재결합
2. dot notation key (`logs.errors`)를 파싱하여 관계 추론

이는 TOON의 기존 `expandPaths: 'safe'` 옵션과 유사한 패턴.

## 6. Validation Plan

이 전략의 효과를 검증하려면 기존 벤치마크 프레임워크에 추가 실험이 필요합니다:

1. **Token Efficiency**: `generateEventLogs(2000)`을 정규화 후 인코딩하여 실제 토큰 수 측정
2. **Retrieval Accuracy**: 정규화된 형태에서 idx 참조 질문 포함한 accuracy 벤치마크
3. **Threshold Sweep**: extras 비율 10%, 20%, 30%, 50%, 70%에서 각각 토큰 효율 측정
4. **Multi-Extras**: 여러 extras 그룹이 있는 데이터셋 추가

## 7. Related Work

- TOON 공식 문서의 ["When Not to Use TOON"](https://github.com/toon-format/toon#when-not-to-use-toon) 섹션에서 semi-uniform 데이터에 대해 "Token savings diminish. Prefer JSON if your pipelines already rely on it."으로 언급
- [BoundaryML의 "Beware When Using TOON"](https://boundaryml.com/blog/beware-when-using-toon) 블로그에서 non-uniform 데이터 추가 시 TOON이 "malformed YAML처럼 보인다"고 비판했으나 대안은 제시하지 않음
- TOON GitHub PR/Discussion에서 semi-uniform 정규화 관련 논의는 **아직 없음** (2026-03-30 기준)

## 8. Next Steps

- [ ] 프로토타입 구현: `normalizeForToon()` 유틸리티 함수
- [ ] 토큰 효율 벤치마크 실행 (event logs 데이터셋)
- [ ] LLM accuracy 벤치마크 실행 (idx 참조 질문 포함)
- [ ] 결과 기반으로 TOON Discussion에 제안 게시
