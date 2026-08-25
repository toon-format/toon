# TOON Benchmarks

Benchmarks measuring TOON's **token efficiency** and **retrieval accuracy** compared to JSON, XML, YAML, and CSV.

> [!NOTE]
> Results are automatically embedded in the [main README](https://github.com/toon-format/toon/#benchmarks). This guide focuses on running the benchmarks locally.

## Quick Start

```bash
# Run token efficiency benchmark
pnpm benchmark:tokens

# Run retrieval accuracy benchmark (requires API keys)
pnpm benchmark:accuracy
```

## Token Efficiency Benchmark

Measures token count reduction across JSON, XML, YAML, CSV, and TOON:

1. Generate datasets (GitHub repos, analytics, orders)
2. Convert to all formats (TOON, JSON, XML, YAML, CSV)
3. Tokenize using `gpt-tokenizer` (`o200k_base` encoding)
4. Calculate savings and generate report

```bash
pnpm benchmark:tokens
```

Results are saved to `results/token-efficiency.md`.

## Retrieval Accuracy Benchmark

Tests how well LLMs can answer questions about data in different formats (TOON, JSON, JSON compact, XML, YAML, CSV):

1. Generate 244 questions across 13 datasets (8 primary + 5 structural validation; CSV only included for flat, tabular-eligible datasets)
2. Convert each dataset to all supported formats
3. Query each LLM with formatted data + question
4. Validate answers deterministically using type-aware comparison (no LLM judge needed)
5. Aggregate metrics and generate report

This measures **comprehension**: each model reads formatted data and answers questions about it. It does not test a model's ability to *generate* TOON.

### What the Datasets Cover

Live row counts and per-dataset scores are in the generated [dataset catalog](./results/retrieval-accuracy.md); this is what each one is for.

**Primary datasets** – eight shapes, chosen so the tabular-eligibility axis is covered end to end:

| Dataset | Exercises |
| ------- | --------- |
| Employee records | Uniform objects with identical fields – the best case for tabular form |
| E-commerce orders | Nested customer objects and item arrays |
| Time-series analytics | Dates and numeric values |
| GitHub repositories | Real-world data, long string values |
| Event logs | Semi-uniform data, roughly half flat and half with nested error objects |
| Nested config | Deep nesting with almost no tabular eligibility – TOON's worst case |
| Feature flags | A map of uniform objects – exercises [keyed tabular form](https://github.com/toon-format/spec/blob/main/SPEC.md#95-objects-of-uniform-objects--keyed-tabular-form) (`key[N:]{fields}:`) |
| Contacts | Uniform records with nested address and plan objects – exercises [nested field groups](https://github.com/toon-format/spec/blob/main/SPEC.md#93-arrays-of-objects--tabular-form) |

**Structural validation datasets** – five variants of one valid 20-row dataset. The corruption is applied to the *encoded text* after it is emitted, so TOON's `[N]` length and field-list width still declare the original shape while the other formats render the lossy-pipeline outcome:

| Variant | What changes | Why it matters |
| ------- | ------------ | -------------- |
| Control | Nothing – text passed through untouched | Baseline |
| Truncated | Last 3 row lines removed | TOON still declares `[20]`, so the shortfall is detectable; formats without length metadata stay valid and undetectable in principle |
| Extra rows | 3 rows appended past the declared `[20]` | Detectable in TOON, valid and undetectable elsewhere |
| Width mismatch | One cell dropped from row 10 | TOON's row is narrower than its field list (CSV narrower than its column row); JSON/YAML/XML merely drop the property, a schema-level signal |
| Missing fields | Email value removed from every 5th record | Surfaces the same way as width mismatch |

That contrast is the point of the structural-validation track: two of these corruptions cannot be detected in JSON, YAML, XML, or CSV at all, because those formats carry no declared length.

### How Questions Are Generated

244 questions across five categories, generated from the datasets rather than hand-written (see [`src/questions/`](./src/questions/)):

- **Field retrieval** – direct value lookups, including booleans and simple counts such as array lengths. *"What is Ada's salary?"* → `75000`
- **Aggregation** – dataset-level totals and averages plus single-condition filters. *"How many employees work in Engineering?"* → `17`
- **Filtering** – multi-condition queries requiring compound logic. *"How many employees in Sales have salary > 80000?"* → `5`
- **Structure awareness** – format-native structural affordances: TOON's `[N]` count and field list, CSV's header row. *"List the field names for employees"*
- **Structural validation** – detecting truncated or corrupted data from the encoded text alone. *"Is this data complete and valid?"* → `YES` / `NO`

> With reasoning disabled, multi-row arithmetic is hard in every format – aggregation and filtering scores mostly measure computation under format friction and sit near the floor for all formats. The per-question-type table in the generated report makes this visible.

Answers are validated deterministically with type-aware comparison (`50000` = `$50,000`, `Engineering` = `engineering`, `2025-01-01` = `January 1, 2025`), so no LLM judge is involved.

### Setup

1. Edit [`src/evaluate.ts`](./src/evaluate.ts) and add models to the exported `MODELS` array:
   ```ts
   export const MODELS: ModelDescriptor[] = [
     { id: 'gpt-5.4-nano', rpm: 50, create: () => openai('gpt-5.4-nano') },
     { id: 'claude-haiku-4-5-20251001', rpm: 50, create: () => anthropic('claude-haiku-4-5-20251001') },
     { id: 'gemini-3.6-flash', rpm: 25, create: () => google('gemini-3.6-flash') },
     { id: 'grok-4.5', rpm: 25, reasoning: 'low', create: () => xai('grok-4.5') },
     // Add your models here
   ]
   ```
2. Duplicate `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   ```

> [!TIP]
> OrcaRouter (`orcarouter/auto`) is included as a ready-made entry. It is an
> OpenAI-compatible gateway, so the benchmark wires it up with
> `createOpenAI({ baseURL: 'https://api.orcarouter.ai/v1' })` (via the chat
> completions endpoint) and reads its key from `ORCAROUTER_API_KEY` (see
> [`src/evaluate.ts`](./src/evaluate.ts)).

### Usage

```bash
# Full benchmark
pnpm benchmark:accuracy

# Dry run (10 questions only, for testing setup)
DRY_RUN=true pnpm benchmark:accuracy
```

Running the script will:

1. Prompt you to select which models to test.
2. Skip models with existing results (rerun to overwrite).
3. Show progress with rate limiting.
4. Save results to `results/accuracy/models/{model-id}.json`.
5. Generate report at `results/retrieval-accuracy.md`.

### Configuration

Edit [`src/constants.ts`](./src/constants.ts) to adjust:

- `DEFAULT_CONCURRENCY` – Parallel tasks (default: 10)
- `DRY_RUN_LIMITS` – Questions per dry run (default: 10)

Rate limits now live on each [`src/evaluate.ts`](./src/evaluate.ts) `MODELS` entry via its `rpm` field.

## Project Structure

```
scripts/
├── accuracy-benchmark.ts         # Retrieval accuracy benchmark
├── token-efficiency-benchmark.ts # Token counting benchmark
├── fetch-github-repos.ts         # Update GitHub dataset
├── verify-feature-datasets.ts    # Keyed/nested-group dataset guards
├── verify-structural-corruption.ts # Corruption invariant guards
└── verify-utils.ts               # Shared verify script plumbing
src/
├── constants.ts                  # Configuration
├── datasets.ts                   # Test data generators
├── evaluate.ts                   # LLM evaluation
├── formats.ts                    # Format registry (converters, primers, fences, labels)
├── normalize.ts                  # Answer normalization
├── report.ts                     # Markdown reports
├── storage.ts                    # Result caching
├── structural-corruption.ts      # Post-encode text corruption
├── types.ts                      # Type definitions
├── utils.ts                      # Helpers
└── questions/                    # Question generators
    ├── analytics.ts
    ├── event-logs.ts
    ├── github.ts
    ├── index.ts
    ├── keyed.ts
    ├── nested-config.ts
    ├── nested-group.ts
    ├── nested.ts
    ├── structural-validation.ts
    ├── structure.ts
    ├── tabular.ts
    └── utils.ts
data/
└── github-repos.json             # Top 100 GitHub repos
results/
├── token-efficiency.md           # Token savings report
├── retrieval-accuracy.md         # Accuracy report
└── accuracy/models/              # Per-model results (JSON)
```
