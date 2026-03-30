# Implementation Plan: Multi-Depth Semi-Uniform Normalization with Dynamic Extras Splitting

> **Status**: Ready for execution
> **Date**: 2026-03-30
> **Related**: [semi-uniform-normalization-proposal.md](../semi-uniform-normalization-proposal.md)
> **Test Fixtures**: [normalization-fixtures.json](./normalization-fixtures.json)

---

## Git Branch Strategy

이 프로젝트는 `toon-format/toon`의 fork(`oksusucha/toon`)에서 작업한다.

```
upstream: https://github.com/toon-format/toon.git   (원본)
origin:   https://github.com/oksusucha/toon.git      (fork)
branch:   feat/semi-uniform-normalization             (작업 브랜치)
```

### 작업 규칙

- **main 브랜치에서 직접 작업하지 않는다**
- 모든 작업은 `feat/semi-uniform-normalization` 브랜치에서 진행
- 작업 완료 후 `origin/feat/semi-uniform-normalization`에 push
- PR: `toon-format/toon:main` ← `oksusucha/toon:feat/semi-uniform-normalization`

### 커밋 컨벤션

프로젝트에 `commitlint.config.ts`가 있으므로 conventional commits를 따른다.
커밋은 **목적 단위로 잘게 쪼개고**, body에 **왜 이 작업을 하는지** 디테일하게 기술한다.

**형식:**

```
type: 무엇을 했는지 (소문자, 간결한 요약)

왜 이 작업이 필요한지 배경 설명.
구체적으로 무엇이 포함되는지 상세 내용.
```

**커밋 분리 기준:**

| 커밋 | type | subject |
|------|------|---------|
| TDD 테스트 작성 | `test` | `add normalize-extras test fixtures for semi-uniform splitting` |
| 핵심 유틸리티 구현 | `feat` | `implement normalizeForToon() core utility` |
| export 추가 | `feat` | `export normalizeForToon from package entry point` |
| 데이터셋 추가 | `feat` | `add semi-uniform-orders and deep-incidents benchmark datasets` |
| 상수 추가 | `feat` | `add dataset names and icons for new benchmark datasets` |
| formatter 통합 | `feat` | `integrate toon-normalized formatter into benchmarks` |
| 벤치마크 결과 | `docs` | `update token-efficiency results with toon-normalized data` |
| proposal 보강 | `docs` | `enhance semi-uniform normalization proposal with multi-depth analysis` |

**샘플 커밋 메시지:**

```
test: add normalize-extras test fixtures for semi-uniform splitting

TOON tabular compression falls back to list format on semi-uniform arrays,
causing +19.9% token increase vs JSON compact. To validate the base+extras
normalization strategy, add test cases covering:

- 1-depth single extras (EventLog error pattern)
- 2-3 depth multi-extras (Order with discount + shipping.address)
- 4+ depth recursive flatten (Incident with resolution.timeline.escalation)
- maxFlattenDepth exceeded → JSON string serialization fallback
- threshold miss → skip splitting when extras ratio < 20%
- already uniform arrays → passthrough without modification

Fixtures are in docs/plans/normalization-fixtures.json and serve as
the TDD Red phase input for normalizeForToon() implementation.
```

```
feat: implement normalizeForToon() core utility

Add pre-encoding normalization that splits semi-uniform object arrays
into base + extras tables, enabling TOON tabular compression on both.

The algorithm:
1. Computes field intersection (base) / difference (extras) across rows
2. Groups extra fields and recursively flattens nested objects (dot notation)
3. Calculates dynamic net benefit per group to decide whether splitting
   saves more tokens than the idx overhead it introduces
4. Only splits groups exceeding both threshold (20%) and positive net benefit

This addresses the core problem where semi-uniform data like EventLogs
(~50% with optional error objects) causes TOON to fall back to verbose
list format, losing all tabular compression benefits.
```

---

## Subagent Delegation

사용 가능한 서브에이전트 중 이 프로젝트에 적합한 에이전트:

| Agent | 담당 | Tasks |
|-------|------|-------|
| `backend-developer` | 핵심 구현 (TDD), 데이터셋, 벤치마크, 문서 | Task 1 → 1b → 2 → 2b → 3 → 4 → 5 |
| `code-reviewer` | 구현 완료 후 코드 리뷰 | 전체 구현 완료 후 1회 |

### 실행 전략

```
Phase 1: backend-developer
  Task 1 + 1b (normalizeForToon TDD 구현 + export)
  Task 2 + 2b (데이터셋 + 상수)
  Task 3 (formatter 통합)
  Task 4 (벤치마크 실행)
  Task 5 (proposal 문서 보강 — 실측 데이터 반영)

Phase 2: code-reviewer
  전체 변경사항 리뷰 (코드 품질, 테스트 커버리지, 문서 정합성)
```

### 위임 시 제공할 컨텍스트

`backend-developer`에게 위임 시 반드시 포함할 정보:
- 이 plan 문서 경로: `docs/plans/multi-depth-normalization-plan.md`
- 테스트 fixture 경로: `docs/plans/normalization-fixtures.json`
- 기존 proposal 경로: `docs/semi-uniform-normalization-proposal.md`
- 프로젝트 구조: TypeScript monorepo, `pnpm`, `vitest` 사용
- 테스트 실행: `pnpm test` (root) 또는 `cd packages/toon && npx vitest`
- 벤치마크 실행: `cd benchmarks && node scripts/token-efficiency-benchmark.ts`

---

## ⚠️ 필수 규칙: TDD (Test-Driven Development)

**모든 코드 작업은 반드시 TDD로 진행한다. 예외 없음.**

1. **Red** — 실패하는 테스트를 먼저 작성
2. **Green** — 테스트를 통과하는 최소한의 코드 구현
3. **Refactor** — 테스트가 통과하는 상태에서 코드 정리

각 Task의 구현 순서:
1. 테스트 파일 생성 및 테스트 케이스 작성
2. `vitest` 실행하여 테스트 실패 확인 (Red)
3. 구현 코드 작성
4. `vitest` 실행하여 테스트 통과 확인 (Green)
5. 필요 시 리팩토링 후 테스트 재확인

**테스트 없이 구현 코드를 먼저 작성하지 않는다.**

---

## Problem Statement

TOON tabular 압축은 uniform 배열에서 -36.9% 토큰 절감을 달성하지만, semi-uniform 배열에서는 +19.9% 증가한다. 현재 proposal은 1-depth 단일 extras만 다루고 있어, multi-depth 중첩 + 여러 종류의 extras 그룹이 존재하는 실제 데이터에서의 정규화 전략이 부재하다. 토큰 효율과 LLM 해석 정확도를 동시에 보장하는 재귀적 정규화 알고리즘을 설계·구현하고, 벤치마크로 검증해야 한다.

## Requirements

1. 2-3 depth 및 4+ depth 중첩 구조 모두에서 정규화 전략 분석
2. Multi-extras: threshold 기반 자동 결정 + 동적 상한 (토큰 절감 vs idx 복잡도 순이익 비교)
3. LLM 해석 정확도 보장 — 원본 데이터가 왜곡 없이 복원 가능해야 함
4. 토큰 효율 이론 분석 + 실제 벤치마크 + 재귀적 정규화 알고리즘 설계
5. proposal 문서 보강 + `normalizeForToon()` 프로토타입 구현

## Background

- 인코더의 `isTabularArray`는 모든 값이 primitive일 때만 tabular 적용, 중첩 객체가 하나라도 있으면 list format 폴백
- 기존 key folding이 dot notation 지원 → extras 테이블 네이밍(`logs.errors`)과 자연스럽게 호환
- `benchmarks/src/formatters.ts`에 새 formatter 추가하면 기존 벤치마크 파이프라인에 바로 통합 가능
- 벤치마크는 `gpt-tokenizer` (o200k_base)로 토큰 수 측정, `node scripts/token-efficiency-benchmark.ts`로 실행
- 기존 데이터셋에 multi-depth semi-uniform 케이스 없음

## Proposed Solution

재귀적 `normalizeForToon()` 유틸리티가 배열 내 객체들을 분석하여:

1. 필드 교집합 = base, 차집합 = extra groups
2. 각 extra group을 재귀적으로 flatten (dot notation)
3. 각 group별로 **토큰 절감 추정치** 계산: `(group 출현 횟수 × flatten된 필드 수 × 평균 키 토큰) - (헤더 오버헤드 + idx 컬럼 오버헤드)`
4. 순이익이 양수인 group만 extras 테이블로 분리, 나머지는 base에 null 패딩으로 포함
5. 4+ depth는 `maxFlattenDepth`까지 flatten, 초과 시 JSON string 직렬화

---

## Task Breakdown

### Task 1: `normalizeForToon()` 핵심 유틸리티

> **파일**: `packages/toon/src/normalize-extras.ts` (신규)
> **테스트**: `packages/toon/test/normalize-extras.test.ts` (신규)

**TDD 순서:**

1. **테스트 먼저 작성** (`normalize-extras.test.ts`):
   - 단일 extras (EventLog 패턴): `{ logs: [...] }` → `{ logs: [...base], "logs.error": [...extras with idx] }`
   - 다중 독립 extras (Order + discount + shipping): base + 2개 extras 테이블
   - 깊은 중첩 extras (4+ depth): recursive flatten 확인
   - threshold 미달 시 분리 안 함
   - 순이익 음수 시 분리 안 함
   - 이미 uniform인 배열은 변경 없음
   - 빈 배열, 비-객체 배열은 변경 없음
2. **테스트 실패 확인** (Red)
3. **구현** (`normalize-extras.ts`):
   - 인터페이스: `normalizeForToon(data: Record<string, unknown>, options?: NormalizeExtrasOptions): Record<string, unknown>`
   - `NormalizeExtrasOptions`: `{ threshold?: number (default 0.2), maxFlattenDepth?: number (default 3) }`
   - 알고리즘:
     1. 데이터 내 모든 배열을 탐색 (top-level 키 순회)
     2. 배열이 객체 배열이면 필드 교집합/차집합 계산
     3. 차집합 필드를 그룹핑 (각 optional 필드가 하나의 group)
     4. 각 그룹을 재귀적으로 flatten (예: `error` → `error.message`, `error.stack`, `error.retryable`)
     5. flatten 결과가 모두 primitive인지 확인, `maxFlattenDepth` 초과 시 JSON string 직렬화
     6. 동적 순이익 계산: `benefit = occurrences × flattenedFieldCount × AVG_KEY_TOKENS - (HEADER_OVERHEAD + occurrences × IDX_OVERHEAD)`
     7. 순이익 양수인 group만 `{arrayKey}.{groupName}` extras 테이블로 분리
     8. base 테이블에서 분리된 필드 제거, extras 테이블에 `idx` 컬럼 추가
4. **테스트 통과 확인** (Green)
5. **리팩토링**

### Task 1b: Export 추가

> **파일**: `packages/toon/src/index.ts`

- `normalizeForToon`과 `NormalizeExtrasOptions`를 export에 추가
- 기존 export 패턴을 따름

---

### Task 2: Multi-depth semi-uniform 테스트 데이터셋

> **파일**: `benchmarks/src/datasets.ts`

**TDD 순서:**

1. **테스트 먼저 작성** (간단한 검증 스크립트 또는 inline assertion):
   - `generateSemiUniformOrders(100)`: discount 비율 ~30%, shipping 비율 ~60% 확인
   - `generateIncidents(100)`: resolution 비율 ~40% 확인
   - 모든 레코드가 공통 필드를 가지는지 확인
2. **구현**:
   - `generateSemiUniformOrders(count)`:
     - 공통 필드: `orderId`, `total`, `status`, `orderDate`
     - optional `discount?: { code: string, amount: number }` (~30%)
     - optional `shipping?: { carrier: string, tracking: string, address: { city: string, zip: string, country: string } }` (~60%)
     - 2-3 depth, multi-extras
   - `generateIncidents(count)`:
     - 공통 필드: `id`, `title`, `severity`, `createdAt`
     - optional `resolution?: { assignee: string, timeline: { startedAt: string, resolvedAt: string, escalation?: { level: number, approvedBy: string, notes: string } } }` (~40%)
     - 4+ depth
   - `TOKEN_EFFICIENCY_DATASETS`에 두 데이터셋 추가 (각 500건)
   - 타입 인터페이스 정의: `SemiUniformOrder`, `Incident`

### Task 2b: 상수 추가

> **파일**: `benchmarks/src/constants.ts`

- `DATASET_NAMES`에 `'semi-uniform-orders'`, `'deep-incidents'` 추가
- `token-efficiency-benchmark.ts`의 `DATASET_ICONS`에 아이콘 추가:
  - `'semi-uniform-orders'`: `'🛍️'`
  - `'deep-incidents'`: `'🚨'`

---

### Task 3: `toon-normalized` formatter 통합

> **파일**: `benchmarks/src/formatters.ts`, `benchmarks/src/constants.ts`, `benchmarks/scripts/token-efficiency-benchmark.ts`

**TDD 순서:**

1. **테스트 먼저 작성**:
   - `toon-normalized` formatter가 `event-logs` 데이터셋에서 `toon`보다 토큰이 적은지 확인
   - `toon-normalized` formatter가 uniform 데이터셋에서는 `toon`과 동일한 토큰 수인지 확인
2. **구현**:
   - `formatters.ts`에 `'toon-normalized'` 추가: `data => encode(normalizeForToon(data as Record<string, unknown>))`
   - `FORMATTER_DISPLAY_NAMES`에 `'toon-normalized': 'TOON (normalized)'` 추가
   - `token-efficiency-benchmark.ts`에서:
     - `COMPARISON_FORMAT_ORDER`에 `'toon-normalized'` 추가 (toon 바로 뒤에 배치)
     - semi-uniform/deep 구조 데이터셋에서만 `toon-normalized` 적용하는 조건 추가
       (structureClass가 `'semi-uniform'` 또는 `'deep'`이거나, 새 데이터셋인 경우)

---

### Task 4: 벤치마크 실행 및 실측 데이터 수집

> **실행**: `cd benchmarks && node scripts/token-efficiency-benchmark.ts`

- 전체 토큰 효율 벤치마크 실행
- 결과에서 dataset별 format별 토큰 수 수집
- 핵심 비교:
  - `event-logs`: `toon` vs `toon-normalized` vs `json-compact`
  - `semi-uniform-orders`: `toon` vs `toon-normalized` vs `json-compact`
  - `deep-incidents`: `toon` vs `toon-normalized` vs `json-compact`
- proposal 추정치(event-logs: ~85,000-95,000)와 실측치 비교
- `benchmarks/results/token-efficiency.md`에 업데이트된 리포트 생성 확인

---

### Task 5: Proposal 문서 보강

> **파일**: `docs/semi-uniform-normalization-proposal.md`

**추가/수정할 섹션:**

#### Section 2 확장: Multi-Extras Before/After 예시

- Order + discount + shipping → base + 2 extras 테이블 예시 (TOON 코드 포함)
- 4+ depth incident → flatten된 extras 예시 (TOON 코드 포함)

#### 새 Section: "Recursive Normalization Algorithm"

- 재귀 flatten 알고리즘 의사코드
- 동적 순이익 계산 공식:
  ```
  benefit = occurrences × repeatedKeyTokens - (headerTokens + occurrences × idxTokenOverhead)
  ```
- `maxFlattenDepth` 동작: depth 초과 시 JSON string fallback
- multi-extras 그룹핑 전략: 각 optional 필드가 독립 group, threshold + net benefit 필터링

#### Section 3 확장: 실측 토큰 절감 비교표

- Task 4의 실측 데이터로 토큰 절감 비교표 업데이트
- dataset × format × tokens 테이블
- 기존 추정치와 실측치 비교

#### Section 5 확장: Edge Cases

- 5.2 Multiple Extra Groups: 동적 상한 전략으로 구체화 (순이익 기반 자동 결정)
- 5.4 Deeply Nested Extras: `maxFlattenDepth` + JSON serialize fallback 알고리즘으로 대체
- 새 edge case: extras 테이블 간 idx 충돌 방지, 순환 참조 처리

#### Section 6 Validation Plan 업데이트

- multi-depth/multi-extras 벤치마크 항목 추가

---

## Key Files

| File | Action |
|------|--------|
| `packages/toon/src/normalize-extras.ts` | 신규 생성 |
| `packages/toon/test/normalize-extras.test.ts` | 신규 생성 (TDD — 먼저 작성) |
| `packages/toon/src/index.ts` | export 추가 |
| `benchmarks/src/datasets.ts` | 새 데이터셋 추가 |
| `benchmarks/src/constants.ts` | 새 상수 추가 |
| `benchmarks/src/formatters.ts` | 새 formatter 추가 |
| `benchmarks/scripts/token-efficiency-benchmark.ts` | toon-normalized 통합 |
| `docs/semi-uniform-normalization-proposal.md` | 문서 보강 |

## Execution Order

```
Phase 1: backend-developer (순차 실행)
┌─────────────────────────────────────────────────────────┐
│ Task 1  → Task 1b → Task 2 → Task 2b → Task 3 → Task 4 → Task 5 │
│  (TDD)               (TDD)              (TDD)    (run)    (doc)   │
└─────────────────────────────────────────────────────────┘

Phase 2: code-reviewer (Phase 1 완료 후)
┌─────────────────────────────────────────────────────────┐
│ 전체 변경사항 리뷰: 코드 품질, 테스트 커버리지, 문서 정합성     │
└─────────────────────────────────────────────────────────┘
```

각 TDD 표시된 Task는 반드시 테스트 → 실패 확인 → 구현 → 통과 확인 순서로 진행한다.
