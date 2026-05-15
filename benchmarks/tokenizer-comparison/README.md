# Multi-Tokenizer Benchmark

This benchmark evaluates TOON's token efficiency across 7 tokenizers from different
model families, addressing the question: **do TOON's efficiency gains generalize
beyond GPT tokenization?**

## Motivation

The original TOON benchmarks used only the GPT `o200k_base` tokenizer. This benchmark
extends the evaluation to 6 additional tokenizers covering different vocabulary sizes
and tokenization algorithms (BPE, SentencePiece), validating that TOON's efficiency
claims hold across the broader LLM ecosystem.

## Tokenizers

| Tokenizer | Model | Vocabulary | Algorithm |
|-----------|-------|-----------|-----------|
| `gpt-o200k` | GPT-4o / GPT-5 | 200k | BPE |
| `claude-cl100k` | Claude (approx.) | 100k | BPE |
| `llama-3.1` | Meta Llama 3.1 8B | 128k | BPE |
| `mistral-7b` | Mistral 7B v0.1 | 32k | BPE |
| `qwen-2.5` | Qwen 2.5 7B | 150k | BPE |
| `gemma-2` | Google Gemma 2 2B | 256k | SentencePiece |
| `phi-3` | Microsoft Phi-3 Mini | 32k | BPE |

## Datasets

| Dataset | Description | Structure |
|---------|-------------|-----------|
| `tabular` | 2000 employee records | Uniform |
| `nested` | 500 e-commerce orders | Nested |
| `analytics` | 365 days time-series | Uniform |
| `github` | 100 GitHub repositories | Uniform |
| `event-logs` | 2000 semi-structured logs | Semi-uniform |
| `nested-config` | Deeply nested config | Deep |

## Reproducibility

### Environment

| Component | Version |
|-----------|---------|
| Node.js | v24.10.0 |
| Python | 3.14 |
| tiktoken | 1.0.22 |
| gpt-tokenizer | 3.4.0 |
| tsx | 4.21.0 |
| transformers | 5.8.1 |
| torch | 2.11.0 |
| sentencepiece | 0.2.1 |

### Models

| Tokenizer | HuggingFace Model ID | Vocabulary | Revision |
|-----------|---------------------|-----------|---------|
| GPT | o200k_base (via gpt-tokenizer) | 200k | - |
| Claude | cl100k_base (via tiktoken) | 100k | - |
| LLaMA 3.1 | meta-llama/Llama-3.1-8B | 128k | main |
| Mistral 7B | mistralai/Mistral-7B-v0.1 | 32k | main |
| Qwen 2.5 | Qwen/Qwen2.5-7B | 150k | main |
| Gemma 2 | google/gemma-2-2b | 256k | main |
| Phi-3 | microsoft/Phi-3-mini-4k-instruct | 32k | main |

### Bootstrap parameters

| Parameter | Value |
|-----------|-------|
| N runs | 30 |
| Sample ratio | 50% |
| Confidence interval | 95% |
| Excluded datasets | nested-config (single object, not bootstrappable) |


## Setup

### TypeScript dependencies

```bash
cd benchmarks
pnpm install
```

### Python dependencies

```bash
cd benchmarks
python3 -m venv venv
source venv/bin/activate
pip install transformers==5.8.1 torch==2.11.0 sentencepiece==0.2.1
```

### HuggingFace authentication

Some models (LLaMA, Mistral) require accepting their license on HuggingFace and
authenticating locally:

```bash
pip install huggingface_hub
huggingface-cli login
```

Then accept the license for each model:
- https://huggingface.co/meta-llama/Llama-3.1-8B
- https://huggingface.co/mistralai/Mistral-7B-v0.1

## Running

```bash
pnpm benchmark:tokenizers
```

Results are saved to `results/tokenizer-comparison/`.

## Key Findings

### TOON is consistently the most efficient format on uniform/tabular data

Across all 7 tokenizers, TOON reduces token count by ~55-61% compared to JSON-pretty
on tabular datasets:

| Tokenizer | JSON-pretty | TOON | Reduction |
|-----------|-------------|------|-----------|
| GPT (o200k) | 127,050 | 49,966 | -61% |
| Claude (cl100k) | 127,753 | 50,447 | -61% |
| LLaMA 3.1 | 127,694 | 50,392 | -61% |
| Mistral 7B | 177,201 | 75,214 | -58% |
| Qwen 2.5 | 141,084 | 63,780 | -55% |
| Gemma 2 | 158,921 | 66,931 | -58% |
| Phi-3 | 177,416 | 75,429 | -57% |

### TOON efficiency is robust across vocabulary sizes

Despite vocabulary sizes ranging from 32k (Mistral, Phi-3) to 256k (Gemma 2),
TOON consistently outperforms all other formats on uniform datasets. The relative
gains are stable (55-61%), confirming that TOON's efficiency is not an artifact
of GPT tokenization.

### TOON is less efficient on nested/complex data

On nested and semi-uniform datasets, JSON-compact outperforms TOON:

- `nested`: JSON-compact = 69,528 vs TOON = 73,246 (GPT)
- `event-logs`: JSON-compact = 128,480 vs TOON = 154,032 (GPT)
- `nested-config`: JSON-compact = 552 vs TOON = 620 (GPT)

This pattern is consistent across all tokenizers, suggesting TOON is best suited
for uniform/tabular data structures.

### Tokenizer family does not affect relative rankings

The format efficiency ranking (TOON < JSON-compact < YAML < JSON-pretty < XML)
is identical across all 7 tokenizers on uniform datasets, confirming that
TOON's structural advantages are tokenizer-agnostic.

## Results

Full results available in:
- `results/tokenizer-comparison/results.json` (raw data)
- `results/tokenizer-comparison/report.md` (summary table)
