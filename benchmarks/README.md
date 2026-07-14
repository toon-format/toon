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

To add `MiniMax-M3` and `MiniMax-M2.7` to the model selection, set `MINIMAX_API_KEY` and choose a region and API protocol:

```bash
MINIMAX_API_KEY=your-key
MINIMAX_API_REGION=global_en
MINIMAX_API_PROTOCOL=anthropic
```

The benchmark supports these public base URLs:

| Region | Protocol | Base URL |
| --- | --- | --- |
| `global_en` | `openai` | `https://api.minimax.io/v1` |
| `global_en` | `anthropic` | `https://api.minimax.io/anthropic` |
| `cn_zh` | `openai` | `https://api.minimaxi.com/v1` |
| `cn_zh` | `anthropic` | `https://api.minimaxi.com/anthropic` |

Regional documentation is available for [global endpoints](https://platform.minimax.io/docs) and [mainland China endpoints](https://platform.minimaxi.com/docs).

Set `MINIMAX_API_BASE_URL` only to override the default selected by `MINIMAX_API_REGION` and `MINIMAX_API_PROTOCOL`. Anthropic-compatible public base URLs must end in `/anthropic`; the adapter derives the internal request path without changing the configured public URL.

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

## Project Structure

```
scripts/
├── accuracy-benchmark.ts         # Retrieval accuracy benchmark
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
└── github-repos.json             # Top 100 GitHub repos
results/
├── token-efficiency.md           # Token savings report
├── retrieval-accuracy.md         # Accuracy report
└── accuracy/models/              # Per-model results (JSON)
```
