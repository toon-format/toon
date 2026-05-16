![TOON logo with step‑by‑step guide](./.github/og.png)

# Token-Oriented Object Notation (TOON)

[![CI](https://github.com/toon-format/toon/actions/workflows/ci.yml/badge.svg)](https://github.com/toon-format/toon/actions)
[![npm version](https://img.shields.io/npm/v/@toon-format/toon.svg?labelColor=1b1b1f&color=fef3c0)](https://www.npmjs.com/package/@toon-format/toon)
[![SPEC v3.0](https://img.shields.io/badge/spec-v3.0-fef3c0?labelColor=1b1b1f)](https://github.com/toon-format/spec)
[![npm downloads (total)](https://img.shields.io/npm/dt/@toon-format/toon.svg?labelColor=1b1b1f&color=fef3c0)](https://www.npmjs.com/package/@toon-format/toon)
[![License: MIT](https://img.shields.io/badge/license-MIT-fef3c0?labelColor=1b1b1f)](./LICENSE)

**Token-Oriented Object Notation** is a compact, human-readable encoding of the JSON data model that minimizes tokens and makes structure easy for models to follow. It's intended for *LLM input* as a drop-in, lossless representation of your existing JSON.

TOON combines YAML's indentation-based structure for nested objects with a CSV-style tabular layout for uniform arrays. TOON's sweet spot is uniform arrays of objects (multiple fields per row, same structure across items), achieving CSV-like compactness while adding explicit structure that helps LLMs parse and validate data reliably. For deeply nested or non-uniform data, JSON may be more efficient.

The similarity to CSV is intentional: CSV is simple and ubiquitous, and TOON aims to keep that familiarity while remaining a lossless, drop-in representation of JSON for Large Language Models.

Think of it as a translation layer: use JSON programmatically, and encode it as TOON for LLM input.

> [!TIP]
> The TOON format is stable, but also an idea in progress. Nothing's set in stone – help shape where it goes by contributing to the [spec](https://github.com/toon-format/spec) or sharing feedback.

## Table of Contents

- [Why TOON?](#why-toon)
- [Key Features](#key-features)
- [When Not to Use TOON](#when-not-to-use-toon)
- [Benchmarks](#benchmarks)
- [Installation & Quick Start](#installation--quick-start)
- [Playgrounds](#playgrounds)
- [Editor Support](#editor-support)
- [CLI](#cli)
- [Format Overview](#format-overview)
- [Using TOON with LLMs](#using-toon-with-llms)
- [Documentation](#documentation)
- [Other Implementations](#other-implementations)
- [📋 Full Specification](https://github.com/toon-format/spec/blob/main/SPEC.md)

## Why TOON?

AI is becoming cheaper and more accessible, but larger context windows allow for larger data inputs as well. **LLM tokens still cost money** – and standard JSON is verbose and token-expensive:

```json
{
  "context": {
    "task": "Our favorite hikes together",
    "location": "Boulder",
    "season": "spring_2025"
  },
  "friends": ["ana", "luis", "sam"],
  "hikes": [
    {
      "id": 1,
      "name": "Blue Lake Trail",
      "distanceKm": 7.5,
      "elevationGain": 320,
      "companion": "ana",
      "wasSunny": true
    },
    {
      "id": 2,
      "name": "Ridge Overlook",
      "distanceKm": 9.2,
      "elevationGain": 540,
      "companion": "luis",
      "wasSunny": false
    },
    {
      "id": 3,
      "name": "Wildflower Loop",
      "distanceKm": 5.1,
      "elevationGain": 180,
      "companion": "sam",
      "wasSunny": true
    }
  ]
}
```

<details>
<summary>YAML already conveys the same information with <strong>fewer tokens</strong>.</summary>

```yaml
context:
  task: Our favorite hikes together
  location: Boulder
  season: spring_2025
friends:
  - ana
  - luis
  - sam
hikes:
  - id: 1
    name: Blue Lake Trail
    distanceKm: 7.5
    elevationGain: 320
    companion: ana
    wasSunny: true
  - id: 2
    name: Ridge Overlook
    distanceKm: 9.2
    elevationGain: 540
    companion: luis
    wasSunny: false
  - id: 3
    name: Wildflower Loop
    distanceKm: 5.1
    elevationGain: 180
    companion: sam
    wasSunny: true
```

</details>

TOON conveys the same information with **even fewer tokens** – combining YAML-like indentation with CSV-style tabular arrays:

```yaml
context:
  task: Our favorite hikes together
  location: Boulder
  season: spring_2025
friends[3]: ana,luis,sam
hikes[3]{id,name,distanceKm,elevationGain,companion,wasSunny}:
  1,Blue Lake Trail,7.5,320,ana,true
  2,Ridge Overlook,9.2,540,luis,false
  3,Wildflower Loop,5.1,180,sam,true
```

## Key Features

- 📊 **Token-Efficient & Accurate:** TOON reaches 76.4% accuracy (vs JSON's 75.0%) while using ~40% fewer tokens in mixed-structure benchmarks across 4 models.
- 🔁 **JSON Data Model:** Encodes the same objects, arrays, and primitives as JSON with deterministic, lossless round-trips.
- 🛤️ **LLM-Friendly Guardrails:** Explicit [N] lengths and {fields} headers give models a clear schema to follow, improving parsing reliability.
- 📐 **Minimal Syntax:** Uses indentation instead of braces and minimizes quoting, giving YAML-like readability with CSV-style compactness.
- 🧺 **Tabular Arrays:** Uniform arrays of objects collapse into tables that declare fields once and stream row values line by line.
- 🌐 **Multi-Language Ecosystem:** Spec-driven implementations in TypeScript, Python, Go, Rust, .NET, and other languages.

## Media Type & File Extension

By convention, TOON files use the `.toon` extension and the provisional media type `text/toon` for HTTP and content-type–aware contexts. TOON documents are always UTF-8 encoded; the `charset=utf-8` parameter may be specified but defaults to UTF-8 when omitted. See [SPEC.md §18.2](https://github.com/toon-format/spec/blob/main/SPEC.md#182-provisional-media-type) for normative details.

## When Not to Use TOON

TOON excels with uniform arrays of objects, but there are cases where other formats are better:

- **Deeply nested or non-uniform structures** (tabular eligibility ≈ 0%): JSON-compact often uses fewer tokens. Example: complex configuration objects with many nested levels.
- **Semi-uniform arrays** (~40–60% tabular eligibility): Token savings diminish. Prefer JSON if your pipelines already rely on it.
- **Pure tabular data**: CSV is smaller than TOON for flat tables. TOON adds minimal overhead (~5–10%) to provide structure (array length declarations, field headers, delimiter scoping) that improves LLM reliability.
- **Latency-critical applications**: If end-to-end response time is your top priority, benchmark on your exact setup. Some deployments (especially local/quantized models like Ollama) may process compact JSON faster despite TOON's lower token count. Measure TTFT, tokens/sec, and total time for both formats and use whichever is faster.

See [benchmarks](#benchmarks) for concrete comparisons across different data structures.

## Benchmarks

Benchmarks are organized into two tracks to ensure fair comparisons:

- **Mixed-Structure Track**: Datasets with nested or semi-uniform structures (TOON vs JSON, YAML, XML). CSV excluded as it cannot properly represent these structures.
- **Flat-Only Track**: Datasets with flat tabular structures where CSV is applicable (CSV vs TOON vs JSON, YAML, XML).

### Retrieval Accuracy

<!-- automd:file src="./benchmarks/results/retrieval-accuracy.md" -->

Benchmarks test LLM comprehension across different input formats using 209 data retrieval questions on 4 models.

<details>
<summary><strong>Show Dataset Catalog</strong></summary>

#### Dataset Catalog

| Dataset | Rows | Structure | CSV Support | Eligibility |
| ------- | ---- | --------- | ----------- | ----------- |
| Uniform employee records | 100 | uniform | ✓ | 100% |
| E-commerce orders with nested structures | 50 | nested | ✗ | 33% |
| Time-series analytics data | 60 | uniform | ✓ | 100% |
| Top 100 GitHub repositories | 100 | uniform | ✓ | 100% |
| Semi-uniform event logs | 75 | semi-uniform | ✗ | 50% |
| Deeply nested configuration | 11 | deep | ✗ | 0% |
| Valid complete dataset (control) | 20 | uniform | ✓ | 100% |
| Array truncated: 3 rows removed from end | 17 | uniform | ✓ | 100% |
| Extra rows added beyond declared length | 23 | uniform | ✓ | 100% |
| Inconsistent field count (missing salary in row 10) | 20 | uniform | ✓ | 100% |
| Missing required fields (no email in multiple rows) | 20 | uniform | ✓ | 100% |

**Structure classes:**
- **uniform**: All objects have identical fields with primitive values
- **semi-uniform**: Mix of uniform and non-uniform structures
- **nested**: Objects with nested structures (nested objects or arrays)
- **deep**: Highly nested with minimal tabular eligibility

**CSV Support:** ✓ (supported), ✗ (not supported – would require lossy flattening)

**Eligibility:** Percentage of arrays that qualify for TOON's tabular format (uniform objects with primitive values)

</details>

#### Efficiency Ranking (Accuracy per 1K Tokens)

Each format ranked by efficiency (accuracy percentage per 1,000 tokens):

```
TOON           ████████████████████   27.7 acc%/1K tok  │  76.4% acc  │  2,759 tokens
JSON compact   █████████████████░░░   23.7 acc%/1K tok  │  73.7% acc  │  3,104 tokens
YAML           ██████████████░░░░░░   19.9 acc%/1K tok  │  74.5% acc  │  3,749 tokens
JSON           ████████████░░░░░░░░   16.4 acc%/1K tok  │  75.0% acc  │  4,587 tokens
XML            ██████████░░░░░░░░░░   13.8 acc%/1K tok  │  72.1% acc  │  5,221 tokens
```

*Efficiency score = (Accuracy % ÷ Tokens) × 1,000. Higher is better.*

> [!TIP]
> TOON achieves **76.4%** accuracy (vs JSON's 75.0%) while using **39.9% fewer tokens**.

**Note on CSV:** Excluded from ranking as it only supports 109 of 209 questions (flat tabular data only). While CSV is highly token-efficient for simple tabular data, it cannot represent nested structures that other formats handle.

#### Per-Model Accuracy

Accuracy across 4 LLMs on 209 data retrieval questions:

```
claude-haiku-4-5-20251001
→ TOON           ████████████░░░░░░░░    59.8% (125/209)
  JSON           ███████████░░░░░░░░░    57.4% (120/209)
  YAML           ███████████░░░░░░░░░    56.0% (117/209)
  XML            ███████████░░░░░░░░░    55.5% (116/209)
  JSON compact   ███████████░░░░░░░░░    55.0% (115/209)
  CSV            ██████████░░░░░░░░░░    50.5% (55/109)

gemini-3-flash-preview
  XML            ████████████████████    98.1% (205/209)
  JSON           ███████████████████░    97.1% (203/209)
  YAML           ███████████████████░    97.1% (203/209)
→ TOON           ███████████████████░    96.7% (202/209)
  JSON compact   ███████████████████░    96.7% (202/209)
  CSV            ███████████████████░    96.3% (105/109)

gpt-5-nano
→ TOON           ██████████████████░░    90.9% (190/209)
  JSON compact   ██████████████████░░    90.9% (190/209)
  JSON           ██████████████████░░    89.0% (186/209)
  CSV            ██████████████████░░    89.0% (97/109)
  YAML           █████████████████░░░    87.1% (182/209)
  XML            ████████████████░░░░    80.9% (169/209)

grok-4-1-fast-non-reasoning
→ TOON           ████████████░░░░░░░░    58.4% (122/209)
  YAML           ████████████░░░░░░░░    57.9% (121/209)
  JSON           ███████████░░░░░░░░░    56.5% (118/209)
  XML            ███████████░░░░░░░░░    54.1% (113/209)
  JSON compact   ██████████░░░░░░░░░░    52.2% (109/209)
  CSV            ██████████░░░░░░░░░░    51.4% (56/109)
```

> [!TIP]
> TOON achieves **76.4% accuracy** (vs JSON's 75.0%) while using **39.9% fewer tokens** on these datasets.

<details>
<summary><strong>Performance by dataset, model, and question type</strong></summary>

#### Performance by Question Type

| Question Type | TOON | JSON | YAML | JSON compact | XML | CSV |
| ------------- | ---- | ---- | ---- | ---- | ---- | ---- |
| Field Retrieval | 99.6% | 99.3% | 98.5% | 98.5% | 98.9% | 100.0% |
| Aggregation | 61.9% | 61.9% | 59.9% | 58.3% | 54.4% | 50.9% |
| Filtering | 56.8% | 53.1% | 56.3% | 55.2% | 51.6% | 50.9% |
| Structure Awareness | 89.0% | 87.0% | 84.0% | 84.0% | 81.0% | 85.9% |
| Structural Validation | 70.0% | 60.0% | 60.0% | 55.0% | 85.0% | 80.0% |

#### Performance by Dataset

##### Uniform employee records

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 73.2% | 2,334 | 120/164 |
| `toon` | 73.2% | 2,498 | 120/164 |
| `json-compact` | 73.8% | 3,924 | 121/164 |
| `yaml` | 73.8% | 4,959 | 121/164 |
| `json-pretty` | 73.8% | 6,331 | 121/164 |
| `xml` | 74.4% | 7,296 | 122/164 |

##### E-commerce orders with nested structures

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `toon` | 82.3% | 7,458 | 135/164 |
| `json-compact` | 78.7% | 7,110 | 129/164 |
| `yaml` | 79.9% | 8,755 | 131/164 |
| `json-pretty` | 79.3% | 11,234 | 130/164 |
| `xml` | 77.4% | 12,649 | 127/164 |

##### Time-series analytics data

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 75.0% | 1,411 | 90/120 |
| `toon` | 78.3% | 1,553 | 94/120 |
| `json-compact` | 74.2% | 2,354 | 89/120 |
| `yaml` | 75.8% | 2,954 | 91/120 |
| `json-pretty` | 75.0% | 3,681 | 90/120 |
| `xml` | 72.5% | 4,389 | 87/120 |

##### Top 100 GitHub repositories

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 65.9% | 8,527 | 87/132 |
| `toon` | 66.7% | 8,779 | 88/132 |
| `yaml` | 65.2% | 13,141 | 86/132 |
| `json-compact` | 59.8% | 11,464 | 79/132 |
| `json-pretty` | 63.6% | 15,157 | 84/132 |
| `xml` | 56.1% | 17,105 | 74/132 |

##### Semi-uniform event logs

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `json-compact` | 68.3% | 4,839 | 82/120 |
| `toon` | 65.0% | 5,819 | 78/120 |
| `json-pretty` | 69.2% | 6,817 | 83/120 |
| `yaml` | 61.7% | 5,847 | 74/120 |
| `xml` | 58.3% | 7,729 | 70/120 |

##### Deeply nested configuration

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `json-compact` | 90.5% | 568 | 105/116 |
| `toon` | 94.8% | 655 | 110/116 |
| `yaml` | 93.1% | 675 | 108/116 |
| `json-pretty` | 92.2% | 924 | 107/116 |
| `xml` | 91.4% | 1,013 | 106/116 |

##### Valid complete dataset (control)

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `toon` | 100.0% | 535 | 4/4 |
| `json-compact` | 100.0% | 787 | 4/4 |
| `yaml` | 100.0% | 992 | 4/4 |
| `json-pretty` | 100.0% | 1,274 | 4/4 |
| `xml` | 25.0% | 1,462 | 1/4 |
| `csv` | 0.0% | 483 | 0/4 |

##### Array truncated: 3 rows removed from end

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 413 | 4/4 |
| `xml` | 100.0% | 1,243 | 4/4 |
| `toon` | 0.0% | 462 | 0/4 |
| `json-pretty` | 0.0% | 1,085 | 0/4 |
| `yaml` | 0.0% | 843 | 0/4 |
| `json-compact` | 0.0% | 670 | 0/4 |

##### Extra rows added beyond declared length

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 550 | 4/4 |
| `toon` | 75.0% | 605 | 3/4 |
| `json-compact` | 75.0% | 901 | 3/4 |
| `xml` | 100.0% | 1,678 | 4/4 |
| `yaml` | 75.0% | 1,138 | 3/4 |
| `json-pretty` | 50.0% | 1,460 | 2/4 |

##### Inconsistent field count (missing salary in row 10)

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 480 | 4/4 |
| `json-compact` | 100.0% | 782 | 4/4 |
| `yaml` | 100.0% | 985 | 4/4 |
| `toon` | 100.0% | 1,008 | 4/4 |
| `json-pretty` | 100.0% | 1,266 | 4/4 |
| `xml` | 100.0% | 1,453 | 4/4 |

##### Missing required fields (no email in multiple rows)

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 340 | 4/4 |
| `xml` | 100.0% | 1,409 | 4/4 |
| `toon` | 75.0% | 974 | 3/4 |
| `json-pretty` | 50.0% | 1,225 | 2/4 |
| `yaml` | 25.0% | 951 | 1/4 |
| `json-compact` | 0.0% | 750 | 0/4 |

#### Performance by Model

##### claude-haiku-4-5-20251001

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `toon` | 59.8% | 125/209 |
| `json-pretty` | 57.4% | 120/209 |
| `yaml` | 56.0% | 117/209 |
| `xml` | 55.5% | 116/209 |
| `json-compact` | 55.0% | 115/209 |
| `csv` | 50.5% | 55/109 |

##### gemini-3-flash-preview

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `xml` | 98.1% | 205/209 |
| `json-pretty` | 97.1% | 203/209 |
| `yaml` | 97.1% | 203/209 |
| `toon` | 96.7% | 202/209 |
| `json-compact` | 96.7% | 202/209 |
| `csv` | 96.3% | 105/109 |

##### gpt-5-nano

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `toon` | 90.9% | 190/209 |
| `json-compact` | 90.9% | 190/209 |
| `json-pretty` | 89.0% | 186/209 |
| `csv` | 89.0% | 97/109 |
| `yaml` | 87.1% | 182/209 |
| `xml` | 80.9% | 169/209 |

##### grok-4-1-fast-non-reasoning

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `toon` | 58.4% | 122/209 |
| `yaml` | 57.9% | 121/209 |
| `json-pretty` | 56.5% | 118/209 |
| `xml` | 54.1% | 113/209 |
| `json-compact` | 52.2% | 109/209 |
| `csv` | 51.4% | 56/109 |

</details>

#### What's Being Measured

This benchmark tests **LLM comprehension and data retrieval accuracy** across different input formats. Each LLM receives formatted data and must answer questions about it. This does **not** test the model's ability to generate TOON output – only to read and understand it.

#### Datasets Tested

Eleven datasets designed to test different structural patterns and validation capabilities:

**Primary datasets:**

1. **Tabular** (100 employee records): Uniform objects with identical fields – optimal for TOON's tabular format.
2. **Nested** (50 e-commerce orders): Complex structures with nested customer objects and item arrays.
3. **Analytics** (60 days of metrics): Time-series data with dates and numeric values.
4. **GitHub** (100 repositories): Real-world data from top GitHub repos by stars.
5. **Event Logs** (75 logs): Semi-uniform data with ~50% flat logs and ~50% with nested error objects.
6. **Nested Config** (1 configuration): Deeply nested configuration with minimal tabular eligibility.

**Structural validation datasets:**

7. **Control**: Valid complete dataset (baseline for validation)
8. **Truncated**: Array with 3 rows removed from end (tests `[N]` length detection)
9. **Extra rows**: Array with 3 additional rows beyond declared length
10. **Width mismatch**: Inconsistent field count (missing salary in row 10)
11. **Missing fields**: Systematic field omissions (no email in multiple rows)

#### Question Types

209 questions are generated dynamically across five categories:

- **Field retrieval (33%)**: Direct value lookups or values that can be read straight off a record (including booleans and simple counts such as array lengths)
  - Example: "What is Alice's salary?" → `75000`
  - Example: "How many items are in order ORD-0042?" → `3`
  - Example: "What is the customer name for order ORD-0042?" → `John Doe`

- **Aggregation (30%)**: Dataset-level totals and averages plus single-condition filters (counts, sums, min/max comparisons)
  - Example: "How many employees work in Engineering?" → `17`
  - Example: "What is the total revenue across all orders?" → `45123.50`
  - Example: "How many employees have salary > 80000?" → `23`

- **Filtering (23%)**: Multi-condition queries requiring compound logic (AND constraints across fields)
  - Example: "How many employees in Sales have salary > 80000?" → `5`
  - Example: "How many active employees have more than 10 years of experience?" → `8`

- **Structure awareness (12%)**: Tests format-native structural affordances (TOON's `[N]` count and `{fields}`, CSV's header row)
  - Example: "How many employees are in the dataset?" → `100`
  - Example: "List the field names for employees" → `id, name, email, department, salary, yearsExperience, active`
  - Example: "What is the department of the last employee?" → `Sales`

- **Structural validation (2%)**: Tests ability to detect incomplete, truncated, or corrupted data using structural metadata
  - Example: "Is this data complete and valid?" → `YES` (control dataset) or `NO` (corrupted datasets)
  - Tests TOON's `[N]` length validation and `{fields}` consistency checking
  - Demonstrates CSV's lack of structural validation capabilities

#### Evaluation Process

1. **Format conversion**: Each dataset is converted to all 6 formats (TOON, JSON, YAML, JSON compact, XML, CSV).
2. **Query LLM**: Each model receives formatted data + question in a prompt and extracts the answer.
3. **Validate deterministically**: Answers are validated using type-aware comparison (e.g., `50000` = `$50,000`, `Engineering` = `engineering`, `2025-01-01` = `January 1, 2025`) without requiring an LLM judge.

#### Models & Configuration

- **Models tested**: `claude-haiku-4-5-20251001`, `gemini-3-flash-preview`, `gpt-5-nano`, `grok-4-1-fast-non-reasoning`
- **Token counting**: Using `gpt-tokenizer` with `o200k_base` encoding (GPT-5 tokenizer)
- **Temperature**: Not set (models use their defaults)
- **Total evaluations**: 209 questions × 6 formats × 4 models = 5,016 LLM calls

<!-- /automd -->

### Token Efficiency

Token counts are measured using the GPT-5 `o200k_base` tokenizer via [`gpt-tokenizer`](https://github.com/niieani/gpt-tokenizer). Savings are calculated against formatted JSON (2-space indentation) as the primary baseline, with additional comparisons to compact JSON (minified), YAML, and XML. Actual savings vary by model and tokenizer.

The benchmarks test datasets across different structural patterns (uniform, semi-uniform, nested, deeply nested) to show where TOON excels and where other formats may be better.

<!-- automd:file src="./benchmarks/results/token-efficiency.md" -->

#### Mixed-Structure Track

Datasets with nested or semi-uniform structures. CSV excluded as it cannot properly represent these structures.

```
🛒 E-commerce orders with nested structures  ┊  Tabular: 33%
   │
   TOON                █████████████░░░░░░░    73,126 tokens
   ├─ vs JSON          (−33.3%)               109,599 tokens
   ├─ vs JSON compact  (+5.3%)                 69,459 tokens
   ├─ vs YAML          (−14.4%)                85,415 tokens
   └─ vs XML           (−40.7%)               123,344 tokens

🧾 Semi-uniform event logs  ┊  Tabular: 50%
   │
   TOON                █████████████████░░░   154,084 tokens
   ├─ vs JSON          (−15.0%)               181,201 tokens
   ├─ vs JSON compact  (+19.9%)               128,529 tokens
   ├─ vs YAML          (−0.8%)                155,397 tokens
   └─ vs XML           (−25.2%)               205,859 tokens

🧩 Deeply nested configuration  ┊  Tabular: 0%
   │
   TOON                ██████████████░░░░░░       620 tokens
   ├─ vs JSON          (−31.9%)                   911 tokens
   ├─ vs JSON compact  (+11.1%)                   558 tokens
   ├─ vs YAML          (−6.3%)                    662 tokens
   └─ vs XML           (−38.2%)                 1,003 tokens

──────────────────────────────────── Total ────────────────────────────────────
   TOON                ████████████████░░░░   227,830 tokens
   ├─ vs JSON          (−21.9%)               291,711 tokens
   ├─ vs JSON compact  (+14.7%)               198,546 tokens
   ├─ vs YAML          (−5.7%)                241,474 tokens
   └─ vs XML           (−31.0%)               330,206 tokens
```

#### Flat-Only Track

Datasets with flat tabular structures where CSV is applicable.

```
👥 Uniform employee records  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░    47,102 tokens
   TOON                ████████████████████    49,919 tokens   (+6.0% vs CSV)
   ├─ vs JSON          (−60.7%)               127,063 tokens
   ├─ vs JSON compact  (−36.9%)                79,059 tokens
   ├─ vs YAML          (−50.1%)               100,011 tokens
   └─ vs XML           (−65.9%)               146,579 tokens

📈 Time-series analytics data  ┊  Tabular: 100%
   │
   CSV                 ██████████████████░░     8,383 tokens
   TOON                ████████████████████     9,115 tokens   (+8.7% vs CSV)
   ├─ vs JSON          (−59.0%)                22,245 tokens
   ├─ vs JSON compact  (−35.9%)                14,211 tokens
   ├─ vs YAML          (−49.0%)                17,858 tokens
   └─ vs XML           (−65.8%)                26,616 tokens

⭐ Top 100 GitHub repositories  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░     8,512 tokens
   TOON                ████████████████████     8,744 tokens   (+2.7% vs CSV)
   ├─ vs JSON          (−42.3%)                15,144 tokens
   ├─ vs JSON compact  (−23.7%)                11,454 tokens
   ├─ vs YAML          (−33.4%)                13,128 tokens
   └─ vs XML           (−48.9%)                17,095 tokens

──────────────────────────────────── Total ────────────────────────────────────
   CSV                 ███████████████████░    63,997 tokens
   TOON                ████████████████████    67,778 tokens   (+5.9% vs CSV)
   ├─ vs JSON          (−58.8%)               164,452 tokens
   ├─ vs JSON compact  (−35.3%)               104,724 tokens
   ├─ vs YAML          (−48.3%)               130,997 tokens
   └─ vs XML           (−64.4%)               190,290 tokens
```

<details>
<summary><strong>Show detailed examples</strong></summary>

#### 📈 Time-series analytics data

**Savings:** 13,130 tokens (59.0% reduction vs JSON)

**JSON** (22,245 tokens):

```json
{
  "metrics": [
    {
      "date": "2025-01-01",
      "views": 6138,
      "clicks": 174,
      "conversions": 12,
      "revenue": 2712.49,
      "bounceRate": 0.35
    },
    {
      "date": "2025-01-02",
      "views": 4616,
      "clicks": 274,
      "conversions": 34,
      "revenue": 9156.29,
      "bounceRate": 0.56
    },
    {
      "date": "2025-01-03",
      "views": 4460,
      "clicks": 143,
      "conversions": 8,
      "revenue": 1317.98,
      "bounceRate": 0.59
    },
    {
      "date": "2025-01-04",
      "views": 4740,
      "clicks": 125,
      "conversions": 13,
      "revenue": 2934.77,
      "bounceRate": 0.37
    },
    {
      "date": "2025-01-05",
      "views": 6428,
      "clicks": 369,
      "conversions": 19,
      "revenue": 1317.24,
      "bounceRate": 0.3
    }
  ]
}
```

**TOON** (9,115 tokens):

```
metrics[5]{date,views,clicks,conversions,revenue,bounceRate}:
  2025-01-01,6138,174,12,2712.49,0.35
  2025-01-02,4616,274,34,9156.29,0.56
  2025-01-03,4460,143,8,1317.98,0.59
  2025-01-04,4740,125,13,2934.77,0.37
  2025-01-05,6428,369,19,1317.24,0.3
```

---

#### ⭐ Top 100 GitHub repositories

**Savings:** 6,400 tokens (42.3% reduction vs JSON)

**JSON** (15,144 tokens):

```json
{
  "repositories": [
    {
      "id": 28457823,
      "name": "freeCodeCamp",
      "repo": "freeCodeCamp/freeCodeCamp",
      "description": "freeCodeCamp.org's open-source codebase and curriculum. Learn math, programming,…",
      "createdAt": "2014-12-24T17:49:19Z",
      "updatedAt": "2025-10-28T11:58:08Z",
      "pushedAt": "2025-10-28T10:17:16Z",
      "stars": 430886,
      "watchers": 8583,
      "forks": 42146,
      "defaultBranch": "main"
    },
    {
      "id": 132750724,
      "name": "build-your-own-x",
      "repo": "codecrafters-io/build-your-own-x",
      "description": "Master programming by recreating your favorite technologies from scratch.",
      "createdAt": "2018-05-09T12:03:18Z",
      "updatedAt": "2025-10-28T12:37:11Z",
      "pushedAt": "2025-10-10T18:45:01Z",
      "stars": 430877,
      "watchers": 6332,
      "forks": 40453,
      "defaultBranch": "master"
    },
    {
      "id": 21737465,
      "name": "awesome",
      "repo": "sindresorhus/awesome",
      "description": "😎 Awesome lists about all kinds of interesting topics",
      "createdAt": "2014-07-11T13:42:37Z",
      "updatedAt": "2025-10-28T12:40:21Z",
      "pushedAt": "2025-10-27T17:57:31Z",
      "stars": 410052,
      "watchers": 8017,
      "forks": 32029,
      "defaultBranch": "main"
    }
  ]
}
```

**TOON** (8,744 tokens):

```
repositories[3]{id,name,repo,description,createdAt,updatedAt,pushedAt,stars,watchers,forks,defaultBranch}:
  28457823,freeCodeCamp,freeCodeCamp/freeCodeCamp,"freeCodeCamp.org's open-source codebase and curriculum. Learn math, programming,…","2014-12-24T17:49:19Z","2025-10-28T11:58:08Z","2025-10-28T10:17:16Z",430886,8583,42146,main
  132750724,build-your-own-x,codecrafters-io/build-your-own-x,Master programming by recreating your favorite technologies from scratch.,"2018-05-09T12:03:18Z","2025-10-28T12:37:11Z","2025-10-10T18:45:01Z",430877,6332,40453,master
  21737465,awesome,sindresorhus/awesome,😎 Awesome lists about all kinds of interesting topics,"2014-07-11T13:42:37Z","2025-10-28T12:40:21Z","2025-10-27T17:57:31Z",410052,8017,32029,main
```

</details>

<!-- /automd -->

## Installation & Quick Start

### CLI (No Installation Required)

Try TOON instantly with npx:

```bash
# Convert JSON to TOON
npx @toon-format/cli input.json -o output.toon

# Pipe from stdin
echo '{"name": "Ada", "role": "dev"}' | npx @toon-format/cli
```

See the [CLI section](#cli) for all options and examples.

### TypeScript Library

```bash
# npm
npm install @toon-format/toon

# pnpm
pnpm add @toon-format/toon

# yarn
yarn add @toon-format/toon
```

**Example usage:**

```ts
import { encode } from '@toon-format/toon'

const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
}

console.log(encode(data))
// users[2]{id,name,role}:
//   1,Alice,admin
//   2,Bob,user
```

**Streaming large datasets:**

```ts
import { encodeLines } from '@toon-format/toon'

const largeData = await fetchThousandsOfRecords()

// Memory-efficient streaming for large data
for (const line of encodeLines(largeData)) {
  process.stdout.write(`${line}\n`)
}
```

> [!TIP]
> For streaming decode APIs, see [`decodeFromLines()`](https://toonformat.dev/reference/api#decodefromlines-lines-options) and [`decodeStream()`](https://toonformat.dev/reference/api#decodestream-source-options).

**Transforming values with replacer:**

```ts
import { encode } from '@toon-format/toon'

// Remove sensitive fields
const user = { name: 'Alice', password: 'secret', email: 'alice@example.com' }
const safe = encode(user, {
  replacer: (key, value) => key === 'password' ? undefined : value
})
// name: Alice
// email: alice@example.com

// Transform values
const data = { status: 'active', count: 5 }
const transformed = encode(data, {
  replacer: (key, value) =>
    typeof value === 'string' ? value.toUpperCase() : value
})
// status: ACTIVE
// count: 5
```

> [!TIP]
> The `replacer` function provides fine-grained control over encoding, similar to `JSON.stringify`'s replacer but with path tracking. See the [API Reference](https://toonformat.dev/reference/api#replacer-function) for more examples.

## Playgrounds

Experiment with TOON format interactively using these tools for token comparison, format conversion, and validation.

### Official Playground

The [TOON Playground](https://toonformat.dev/playground) lets you convert JSON to TOON in real-time, compare token counts, and share your experiments via URL.

### Community Playgrounds

- [Format Tokenization Playground](https://www.curiouslychase.com/playground/format-tokenization-exploration)
- [TOON Tools](https://toontools.vercel.app/)

## Editor Support

### VS Code

[TOON Language Support](https://marketplace.visualstudio.com/items?itemName=vishalraut.vscode-toon) – Syntax highlighting, validation, conversion, and token analysis.

```bash
code --install-extension vishalraut.vscode-toon
```

### Tree-sitter Grammar

[tree-sitter-toon](https://github.com/3swordman/tree-sitter-toon) – Grammar for Tree-sitter-compatible editors (Neovim, Helix, Emacs, Zed).

### Neovim

[toon.nvim](https://github.com/thalesgelinger/toon.nvim) – Lua-based plugin.

### Other Editors

Use YAML syntax highlighting as a close approximation.

## CLI

Command-line tool for quick JSON↔TOON conversions, token analysis, and pipeline integration. Auto-detects format from file extension, supports stdin/stdout workflows, and offers delimiter options for maximum efficiency.

```bash
# Encode JSON to TOON (auto-detected)
npx @toon-format/cli input.json -o output.toon

# Decode TOON to JSON (auto-detected)
npx @toon-format/cli data.toon -o output.json

# Pipe from stdin (no argument needed)
cat data.json | npx @toon-format/cli
echo '{"name": "Ada"}' | npx @toon-format/cli

# Output to stdout
npx @toon-format/cli input.json

# Show token savings
npx @toon-format/cli data.json --stats
```

> [!TIP]
> See the full [CLI documentation](https://toonformat.dev/cli/) for all options, examples, and advanced usage.

## Format Overview

Detailed syntax references, implementation guides, and quick lookups for understanding and using the TOON format.

- [Format Overview](https://toonformat.dev/guide/format-overview) – Complete syntax documentation
- [Syntax Cheatsheet](https://toonformat.dev/reference/syntax-cheatsheet) – Quick reference
- [API Reference](https://toonformat.dev/reference/api) – Encode/decode usage (TypeScript)

## Using TOON with LLMs

TOON works best when you show the format instead of describing it. The structure is self-documenting – models parse it naturally once they see the pattern. Wrap data in ` ```toon` code blocks for input, and show the expected header template when asking models to generate TOON. Use tab delimiters for even better token efficiency.

Follow the detailed [LLM integration guide](https://toonformat.dev/guide/llm-prompts) for strategies, examples, and validation techniques.

## Documentation

Comprehensive guides, references, and resources to help you get the most out of the TOON format and tools.

### Getting Started

- [Introduction & Installation](https://toonformat.dev/guide/getting-started) – What TOON is, when to use it, first steps
- [Format Overview](https://toonformat.dev/guide/format-overview) – Complete syntax with examples
- [Benchmarks](https://toonformat.dev/guide/benchmarks) – Accuracy & token efficiency results

### Tools & Integration

- [CLI](https://toonformat.dev/cli/) – Command-line tool for JSON↔TOON conversions
- [Using TOON with LLMs](https://toonformat.dev/guide/llm-prompts) – Prompting strategies & validation
- [Playgrounds](https://toonformat.dev/ecosystem/tools-and-playgrounds) – Interactive tools

### References

- [API Reference](https://toonformat.dev/reference/api) – TypeScript/JavaScript encode/decode API
- [Syntax Cheatsheet](https://toonformat.dev/reference/syntax-cheatsheet) – Quick format lookup
- [Specification](https://github.com/toon-format/spec/blob/main/SPEC.md) – Normative rules for implementers

## Other Implementations

TOON has official and community implementations across multiple languages including Python, Rust, Go, Java, Swift, .NET, and many more.

See the full list of implementations in the [documentation](https://toonformat.dev/ecosystem/implementations).

## Credits

- Logo design by [鈴木ックス(SZKX)](https://x.com/szkx_art)

## License

[MIT](./LICENSE) License © 2025-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
