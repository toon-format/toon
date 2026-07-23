# TOON Benchmarks

Benchmarks measuring TOON's **token efficiency**, **retrieval accuracy**, and **structured-output generation** compared to JSON, XML, YAML, and CSV.

> [!NOTE]
> Token-efficiency and retrieval-accuracy results are automatically embedded in the [main README](https://github.com/toon-format/toon/#benchmarks). This guide focuses on running the benchmarks locally.

## Quick Start

```bash
# Run token efficiency benchmark
pnpm benchmark:tokens

# Run retrieval accuracy benchmark (requires API keys)
pnpm benchmark:accuracy

# Run structured generation benchmark (requires a Nebius API key)
pnpm benchmark:generation
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

1. Generate 209 questions across 11 datasets (6 primary + 5 structural validation; CSV only included for datasets with flat/tabular structure)
2. Convert each dataset to all supported formats
3. Query each LLM with formatted data + question
4. Validate answers deterministically using type-aware comparison (no LLM judge needed)
5. Aggregate metrics and generate report

### Setup

1. Edit [`src/evaluate.ts`](./src/evaluate.ts) and add models to the exported `models` array:
   ```ts
   export const models: LanguageModelV3[] = [
     openai('gpt-5-nano'),
     anthropic('claude-haiku-4-5-20251001'),
     google('gemini-3-flash-preview'),
     xai('grok-4-1-fast-non-reasoning'),
     // Add your models here
   ]
   ```
2. Duplicate `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   ```

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

- `MODEL_RPM_LIMITS` – Rate limits per model
- `DEFAULT_CONCURRENCY` – Parallel tasks (default: 10)
- `DRY_RUN_LIMITS` – Questions per dry run (default: 10)

## Structured Generation Benchmark

Compares three ways to generate the same four typed payloads:

1. Plain JSON text
2. JSON object mode (`response_format: { type: "json_object" }`)
3. TOON text decoded with the local TypeScript implementation

Each response is validated with strict, case-specific rules, canonicalized, and compared with gold data. Invalid responses receive up to two repair attempts. The benchmark records one-shot accuracy, final accuracy, attempts, and prompt/completion token usage.

This TypeScript implementation ports the methodology from [`vetertann/TOON-generation-benchmark`](https://github.com/vetertann/TOON-generation-benchmark), while using the monorepo's local TOON encoder and decoder instead of Python and CLI subprocesses.

### Setup

1. Add a [Nebius Token Factory](https://tokenfactory.nebius.com/) key to `.env`:
   ```bash
   NEBIUS_API_KEY=your_key
   ```
2. Optionally choose models and the number of runs:
   ```bash
   GENERATION_MODELS=openai/gpt-oss-120b GENERATION_RUNS=1 pnpm benchmark:generation
   ```
3. Run the full default matrix (21 models, 10 runs each):
   ```bash
   pnpm benchmark:generation
   ```

For a one-model, one-run smoke test, set `DRY_RUN=true`. Results are checkpointed after every completed run in `results/generation/` as raw, per-case, and per-model CSV files.

Gold JSON and TOON fixtures are committed in `data/generation/`. Regenerate them after changing a case:

```bash
pnpm generate:generation-fixtures
```

### Published Results

The committed baseline contains 10 runs for each of 21 models. Accuracy is reported for the first attempt (1-S) and after up to two repairs (Fin); Tok is the average prompt plus completion token count.

| Case | JSON 1-S | JSON Fin | JSON Tok | JSON-object 1-S | JSON-object Fin | JSON-object Tok | TOON 1-S | TOON Fin | TOON Tok |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| users | 94.8% | 94.8% | 1,078 | 92.9% | 100% | 556 | 90.5% | 90.5% | 840 |
| order | 81.9% | 81.9% | 1,746 | 78.6% | 83.3% | 1,255 | 74.3% | 78.6% | 1,585 |
| company | 18.6% | 43.8% | 3,575 | 21.9% | 48.1% | 2,592 | 0% | 48.6% | 2,567 |
| invoice | 90.0% | 90.0% | 1,723 | 87.6% | 95.2% | 1,349 | 0% | 52.4% | 3,626 |

See the [raw runs](./results/generation/eval-runs.csv), [per-case aggregates](./results/generation/eval-results-by-case.csv), and [per-model aggregates](./results/generation/eval-results-by-model.csv).

## Project Structure

```
scripts/
├── accuracy-benchmark.ts         # Retrieval accuracy benchmark
├── generation-benchmark.ts       # Structured output generation benchmark
├── generate-generation-fixtures.ts # Regenerate generation gold data
├── token-efficiency-benchmark.ts # Token counting benchmark
└── fetch-github-repos.ts         # Update GitHub dataset
src/
├── constants.ts                  # Configuration
├── datasets.ts                   # Test data generators
├── evaluate.ts                   # LLM evaluation
├── formatters.ts                 # Format converters
├── normalize.ts                  # Answer normalization
├── report.ts                     # Markdown reports
├── storage.ts                    # Result caching
├── types.ts                      # Type definitions
├── utils.ts                      # Helpers
├── generation/                   # Generation cases, evaluation, and reports
└── questions/                    # Question generators
    ├── analytics.ts
    ├── event-logs.ts
    ├── github.ts
    ├── index.ts
    ├── nested-config.ts
    ├── nested.ts
    ├── structural-validation.ts
    ├── structure.ts
    ├── tabular.ts
    └── utils.ts
data/
├── generation/                   # Gold JSON and TOON generation fixtures
└── github-repos.json             # Top 100 GitHub repos
results/
├── generation/                   # Generation run and aggregate CSV files
├── token-efficiency.md           # Token savings report
├── retrieval-accuracy.md         # Accuracy report
└── accuracy/models/              # Per-model results (JSON)
```
