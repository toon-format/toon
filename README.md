![TOON logo with step‑by‑step guide](./.github/og.png)

# Token-Oriented Object Notation (TOON)

[![CI](https://github.com/toon-format/toon/actions/workflows/ci.yml/badge.svg)](https://github.com/toon-format/toon/actions)
[![npm version](https://img.shields.io/npm/v/@toon-format/toon.svg)](https://www.npmjs.com/package/@toon-format/toon)
[![SPEC v2.0](https://img.shields.io/badge/spec-v2.0-lightgray)](https://github.com/toon-format/spec)
[![npm downloads (total)](https://img.shields.io/npm/dt/@toon-format/toon.svg)](https://www.npmjs.com/package/@toon-format/toon)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

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

- 📊 **Token-Efficient & Accurate:** TOON reaches 74% accuracy (vs JSON's 70%) while using ~40% fewer tokens in mixed-structure benchmarks across 4 models.
- 🔁 **JSON Data Model:** Encodes the same objects, arrays, and primitives as JSON with deterministic, lossless round-trips.
- 🛤️ **LLM-Friendly Guardrails:** Explicit [N] lengths and {fields} headers give models a clear schema to follow, improving parsing reliability.
- 📐 **Minimal Syntax:** Uses indentation instead of braces and minimizes quoting, giving YAML-like readability with CSV-style compactness.
- 🧺 **Tabular Arrays:** Uniform arrays of objects collapse into tables that declare fields once and stream row values line by line.
- 🌐 **Multi-Language Ecosystem:** Spec-driven implementations in TypeScript, Python, Go, Rust, .NET, and other languages.

## When Not to Use TOON

TOON excels with uniform arrays of objects, but there are cases where other formats are better:

- **Deeply nested or non-uniform structures** (tabular eligibility ≈ 0%): JSON-compact often uses fewer tokens. Example: complex configuration objects with many nested levels.
- **Semi-uniform arrays** (~40–60% tabular eligibility): Token savings diminish. Prefer JSON if your pipelines already rely on it.
- **Pure tabular data**: CSV is smaller than TOON for flat tables. TOON adds minimal overhead (~5-10%) to provide structure (array length declarations, field headers, delimiter scoping) that improves LLM reliability.
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

Each format's overall performance, balancing accuracy against token cost:

```
TOON           ████████████████████   26.9  │  73.9% acc  │  2,744 tokens
JSON compact   █████████████████░░░   22.9  │  70.7% acc  │  3,081 tokens
YAML           ██████████████░░░░░░   18.6  │  69.0% acc  │  3,719 tokens
JSON           ███████████░░░░░░░░░   15.3  │  69.7% acc  │  4,545 tokens
XML            ██████████░░░░░░░░░░   13.0  │  67.1% acc  │  5,167 tokens
```

TOON achieves **73.9%** accuracy (vs JSON's 69.7%) while using **39.6% fewer tokens**.

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

gemini-2.5-flash
→ TOON           ██████████████████░░    87.6% (183/209)
  CSV            █████████████████░░░    86.2% (94/109)
  JSON compact   ████████████████░░░░    82.3% (172/209)
  YAML           ████████████████░░░░    79.4% (166/209)
  XML            ████████████████░░░░    79.4% (166/209)
  JSON           ███████████████░░░░░    77.0% (161/209)

gpt-5-nano
→ TOON           ██████████████████░░    90.9% (190/209)
  JSON compact   ██████████████████░░    90.9% (190/209)
  JSON           ██████████████████░░    89.0% (186/209)
  CSV            ██████████████████░░    89.0% (97/109)
  YAML           █████████████████░░░    87.1% (182/209)
  XML            ████████████████░░░░    80.9% (169/209)

grok-4-fast-non-reasoning
→ TOON           ███████████░░░░░░░░░    57.4% (120/209)
  JSON           ███████████░░░░░░░░░    55.5% (116/209)
  JSON compact   ███████████░░░░░░░░░    54.5% (114/209)
  YAML           ███████████░░░░░░░░░    53.6% (112/209)
  XML            ███████████░░░░░░░░░    52.6% (110/209)
  CSV            ██████████░░░░░░░░░░    52.3% (57/109)
```

> [!TIP] Results Summary
> TOON achieves **73.9% accuracy** (vs JSON's 69.7%) while using **39.6% fewer tokens** on these datasets.

<details>
<summary><strong>Performance by dataset, model, and question type</strong></summary>

#### Performance by Question Type

| Question Type | TOON | JSON compact | JSON | CSV | YAML | XML |
| ------------- | ---- | ---- | ---- | ---- | ---- | ---- |
| Field Retrieval | 99.6% | 99.3% | 99.3% | 100.0% | 98.2% | 98.9% |
| Aggregation | 54.4% | 47.2% | 48.8% | 44.0% | 47.6% | 41.3% |
| Filtering | 56.3% | 57.3% | 50.5% | 49.1% | 51.0% | 47.9% |
| Structure Awareness | 88.0% | 83.0% | 83.0% | 85.9% | 80.0% | 80.0% |
| Structural Validation | 70.0% | 45.0% | 50.0% | 80.0% | 60.0% | 80.0% |

#### Performance by Dataset

##### Uniform employee records

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 72.0% | 2,352 | 118/164 |
| `toon` | 73.8% | 2,518 | 121/164 |
| `json-compact` | 69.5% | 3,953 | 114/164 |
| `yaml` | 68.3% | 4,982 | 112/164 |
| `json-pretty` | 68.3% | 6,360 | 112/164 |
| `xml` | 69.5% | 7,324 | 114/164 |

##### E-commerce orders with nested structures

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `toon` | 81.1% | 7,232 | 133/164 |
| `json-compact` | 76.8% | 6,794 | 126/164 |
| `yaml` | 75.6% | 8,347 | 124/164 |
| `json-pretty` | 76.2% | 10,713 | 125/164 |
| `xml` | 74.4% | 12,023 | 122/164 |

##### Time-series analytics data

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 73.3% | 1,406 | 88/120 |
| `toon` | 72.5% | 1,548 | 87/120 |
| `json-compact` | 71.7% | 2,349 | 86/120 |
| `yaml` | 71.7% | 2,949 | 86/120 |
| `json-pretty` | 68.3% | 3,676 | 82/120 |
| `xml` | 68.3% | 4,384 | 82/120 |

##### Top 100 GitHub repositories

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `toon` | 62.9% | 8,779 | 83/132 |
| `csv` | 61.4% | 8,527 | 81/132 |
| `yaml` | 59.8% | 13,141 | 79/132 |
| `json-compact` | 55.3% | 11,464 | 73/132 |
| `json-pretty` | 56.1% | 15,157 | 74/132 |
| `xml` | 48.5% | 17,105 | 64/132 |

##### Semi-uniform event logs

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `json-compact` | 63.3% | 4,819 | 76/120 |
| `toon` | 57.5% | 5,799 | 69/120 |
| `json-pretty` | 59.2% | 6,797 | 71/120 |
| `yaml` | 48.3% | 5,827 | 58/120 |
| `xml` | 46.7% | 7,709 | 56/120 |

##### Deeply nested configuration

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `json-compact` | 92.2% | 574 | 107/116 |
| `toon` | 95.7% | 666 | 111/116 |
| `yaml` | 91.4% | 686 | 106/116 |
| `json-pretty` | 94.0% | 932 | 109/116 |
| `xml` | 92.2% | 1,018 | 107/116 |

##### Valid complete dataset (control)

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `toon` | 100.0% | 544 | 4/4 |
| `json-compact` | 100.0% | 795 | 4/4 |
| `yaml` | 100.0% | 1,003 | 4/4 |
| `json-pretty` | 100.0% | 1,282 | 4/4 |
| `csv` | 25.0% | 492 | 1/4 |
| `xml` | 0.0% | 1,467 | 0/4 |

##### Array truncated: 3 rows removed from end

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 425 | 4/4 |
| `xml` | 100.0% | 1,251 | 4/4 |
| `toon` | 0.0% | 474 | 0/4 |
| `json-compact` | 0.0% | 681 | 0/4 |
| `json-pretty` | 0.0% | 1,096 | 0/4 |
| `yaml` | 0.0% | 859 | 0/4 |

##### Extra rows added beyond declared length

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 566 | 4/4 |
| `toon` | 75.0% | 621 | 3/4 |
| `xml` | 100.0% | 1,692 | 4/4 |
| `yaml` | 75.0% | 1,157 | 3/4 |
| `json-compact` | 50.0% | 917 | 2/4 |
| `json-pretty` | 50.0% | 1,476 | 2/4 |

##### Inconsistent field count (missing salary in row 10)

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 75.0% | 489 | 3/4 |
| `yaml` | 100.0% | 996 | 4/4 |
| `toon` | 100.0% | 1,019 | 4/4 |
| `json-compact` | 75.0% | 790 | 3/4 |
| `xml` | 100.0% | 1,458 | 4/4 |
| `json-pretty` | 75.0% | 1,274 | 3/4 |

##### Missing required fields (no email in multiple rows)

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 329 | 4/4 |
| `xml` | 100.0% | 1,411 | 4/4 |
| `toon` | 75.0% | 983 | 3/4 |
| `yaml` | 25.0% | 960 | 1/4 |
| `json-pretty` | 25.0% | 1,230 | 1/4 |
| `json-compact` | 0.0% | 755 | 0/4 |

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

##### gemini-2.5-flash

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `toon` | 87.6% | 183/209 |
| `csv` | 86.2% | 94/109 |
| `json-compact` | 82.3% | 172/209 |
| `yaml` | 79.4% | 166/209 |
| `xml` | 79.4% | 166/209 |
| `json-pretty` | 77.0% | 161/209 |

##### gpt-5-nano

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `toon` | 90.9% | 190/209 |
| `json-compact` | 90.9% | 190/209 |
| `json-pretty` | 89.0% | 186/209 |
| `csv` | 89.0% | 97/109 |
| `yaml` | 87.1% | 182/209 |
| `xml` | 80.9% | 169/209 |

##### grok-4-fast-non-reasoning

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `toon` | 57.4% | 120/209 |
| `json-pretty` | 55.5% | 116/209 |
| `json-compact` | 54.5% | 114/209 |
| `yaml` | 53.6% | 112/209 |
| `xml` | 52.6% | 110/209 |
| `csv` | 52.3% | 57/109 |

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

1. **Format conversion**: Each dataset is converted to all 6 formats (TOON, JSON compact, JSON, CSV, YAML, XML).
2. **Query LLM**: Each model receives formatted data + question in a prompt and extracts the answer.
3. **Validate deterministically**: Answers are validated using type-aware comparison (e.g., `50000` = `$50,000`, `Engineering` = `engineering`, `2025-01-01` = `January 1, 2025`) without requiring an LLM judge.

#### Models & Configuration

- **Models tested**: `claude-haiku-4-5-20251001`, `gemini-2.5-flash`, `gpt-5-nano`, `grok-4-fast-non-reasoning`
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
   TOON                █████████████░░░░░░░    72,771 tokens
   ├─ vs JSON          (−33.1%)               108,806 tokens
   ├─ vs JSON compact  (+5.5%)                 68,975 tokens
   ├─ vs YAML          (−14.2%)                84,780 tokens
   └─ vs XML           (−40.5%)               122,406 tokens

🧾 Semi-uniform event logs  ┊  Tabular: 50%
   │
   TOON                █████████████████░░░   153,211 tokens
   ├─ vs JSON          (−15.0%)               180,176 tokens
   ├─ vs JSON compact  (+19.9%)               127,731 tokens
   ├─ vs YAML          (−0.8%)                154,505 tokens
   └─ vs XML           (−25.2%)               204,777 tokens

🧩 Deeply nested configuration  ┊  Tabular: 0%
   │
   TOON                ██████████████░░░░░░       631 tokens
   ├─ vs JSON          (−31.3%)                   919 tokens
   ├─ vs JSON compact  (+11.9%)                   564 tokens
   ├─ vs YAML          (−6.2%)                    673 tokens
   └─ vs XML           (−37.4%)                 1,008 tokens

──────────────────────────────────── Total ────────────────────────────────────
   TOON                ████████████████░░░░   226,613 tokens
   ├─ vs JSON          (−21.8%)               289,901 tokens
   ├─ vs JSON compact  (+14.9%)               197,270 tokens
   ├─ vs YAML          (−5.6%)                239,958 tokens
   └─ vs XML           (−31.0%)               328,191 tokens
```

#### Flat-Only Track

Datasets with flat tabular structures where CSV is applicable.

```
👥 Uniform employee records  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░    46,954 tokens
   TOON                ████████████████████    49,831 tokens   (+6.1% vs CSV)
   ├─ vs JSON          (−60.7%)               126,860 tokens
   ├─ vs JSON compact  (−36.8%)                78,856 tokens
   ├─ vs YAML          (−50.0%)                99,706 tokens
   └─ vs XML           (−66.0%)               146,444 tokens

📈 Time-series analytics data  ┊  Tabular: 100%
   │
   CSV                 ██████████████████░░     8,388 tokens
   TOON                ████████████████████     9,120 tokens   (+8.7% vs CSV)
   ├─ vs JSON          (−59.0%)                22,250 tokens
   ├─ vs JSON compact  (−35.8%)                14,216 tokens
   ├─ vs YAML          (−48.9%)                17,863 tokens
   └─ vs XML           (−65.7%)                26,621 tokens

⭐ Top 100 GitHub repositories  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░     8,513 tokens
   TOON                ████████████████████     8,745 tokens   (+2.7% vs CSV)
   ├─ vs JSON          (−42.3%)                15,145 tokens
   ├─ vs JSON compact  (−23.7%)                11,455 tokens
   ├─ vs YAML          (−33.4%)                13,129 tokens
   └─ vs XML           (−48.8%)                17,095 tokens

──────────────────────────────────── Total ────────────────────────────────────
   CSV                 ███████████████████░    63,855 tokens
   TOON                ████████████████████    67,696 tokens   (+6.0% vs CSV)
   ├─ vs JSON          (−58.8%)               164,255 tokens
   ├─ vs JSON compact  (−35.2%)               104,527 tokens
   ├─ vs YAML          (−48.2%)               130,698 tokens
   └─ vs XML           (−64.4%)               190,160 tokens
```

<details>
<summary><strong>Show detailed examples</strong></summary>

#### 📈 Time-series analytics data

**Savings:** 13,130 tokens (59.0% reduction vs JSON)

**JSON** (22,250 tokens):

```json
{
  "metrics": [
    {
      "date": "2025-01-01",
      "views": 5715,
      "clicks": 211,
      "conversions": 28,
      "revenue": 7976.46,
      "bounceRate": 0.47
    },
    {
      "date": "2025-01-02",
      "views": 7103,
      "clicks": 393,
      "conversions": 28,
      "revenue": 8360.53,
      "bounceRate": 0.32
    },
    {
      "date": "2025-01-03",
      "views": 7248,
      "clicks": 378,
      "conversions": 24,
      "revenue": 3212.57,
      "bounceRate": 0.5
    },
    {
      "date": "2025-01-04",
      "views": 2927,
      "clicks": 77,
      "conversions": 11,
      "revenue": 1211.69,
      "bounceRate": 0.62
    },
    {
      "date": "2025-01-05",
      "views": 3530,
      "clicks": 82,
      "conversions": 8,
      "revenue": 462.77,
      "bounceRate": 0.56
    }
  ]
}
```

**TOON** (9,120 tokens):

```
metrics[5]{date,views,clicks,conversions,revenue,bounceRate}:
  2025-01-01,5715,211,28,7976.46,0.47
  2025-01-02,7103,393,28,8360.53,0.32
  2025-01-03,7248,378,24,3212.57,0.5
  2025-01-04,2927,77,11,1211.69,0.62
  2025-01-05,3530,82,8,462.77,0.56
```

---

#### ⭐ Top 100 GitHub repositories

**Savings:** 6,400 tokens (42.3% reduction vs JSON)

**JSON** (15,145 tokens):

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

**TOON** (8,745 tokens):

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

## Playgrounds

Experiment with TOON format interactively using these community-built tools for token comparison, format conversion, and validation:

- [Format Tokenization Playground](https://www.curiouslychase.com/playground/format-tokenization-exploration)
- [TOON Tools](https://toontools.vercel.app/)

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

**Getting Started**
- [Introduction & Installation](https://toonformat.dev/guide/getting-started) – What TOON is, when to use it, first steps
- [Format Overview](https://toonformat.dev/guide/format-overview) – Complete syntax with examples
- [Benchmarks](https://toonformat.dev/guide/benchmarks) – Accuracy & token efficiency results

**Tools & Integration**
- [CLI](https://toonformat.dev/cli/) – Command-line tool for  JSON↔TOON conversions
- [Using TOON with LLMs](https://toonformat.dev/guide/llm-prompts) – Prompting strategies & validation
- [Playgrounds](https://toonformat.dev/ecosystem/tools-and-playgrounds) – Interactive tools

**Reference**
- [API Reference](https://toonformat.dev/reference/api) – TypeScript/JavaScript encode/decode API
- [Syntax Cheatsheet](https://toonformat.dev/reference/syntax-cheatsheet) – Quick format lookup
- [Specification v2.0](https://github.com/toon-format/spec/blob/main/SPEC.md) – Normative rules for implementers

## Other Implementations

> [!NOTE]
> When implementing TOON in other languages, please follow the [specification](https://github.com/toon-format/spec/blob/main/SPEC.md) (currently v2.0) to ensure compatibility across implementations. The [conformance tests](https://github.com/toon-format/spec/tree/main/tests) provide language-agnostic test fixtures that validate your implementations.

### Official Implementations

> [!TIP]
> These implementations are actively being developed by dedicated teams. Contributions are welcome! Join the effort by opening issues, submitting PRs, or discussing implementation details in the respective repositories.

- **.NET:** [toon_format](https://github.com/toon-format/toon-dotnet) *(in development)*
- **Dart:** [toon](https://github.com/toon-format/toon-dart) *(in development)*
- **Go:** [toon-go](https://github.com/toon-format/toon-go) *(in development)*
- **Python:** [toon_format](https://github.com/toon-format/toon-python) *(in development)*
- **Rust:** [toon_format](https://github.com/toon-format/toon-rust) *(in development)*

### Community Implementations

- **C++:** [ctoon](https://github.com/mohammadraziei/ctoon)
- **Clojure:** [toon](https://github.com/vadelabs/toon)
- **Crystal:** [toon-crystal](https://github.com/mamantoha/toon-crystal)
- **Elixir:** [toon_ex](https://github.com/kentaro/toon_ex)
- **Gleam:** [toon_codec](https://github.com/axelbellec/toon_codec)
- **Go:** [gotoon](https://github.com/alpkeskin/gotoon)
- **Java:** [JToon](https://github.com/felipestanzani/JToon)
- **Scala:** [toon4s](https://github.com/vim89/toon4s)
- **Lua/Neovim:** [toon.nvim](https://github.com/thalesgelinger/toon.nvim)
- **OCaml:** [ocaml-toon](https://github.com/davesnx/ocaml-toon)
- **PHP:** [toon-php](https://github.com/HelgeSverre/toon-php)
- **Laravel Framework:** [laravel-toon](https://github.com/jobmetric/laravel-toon)
- **R**: [toon](https://github.com/laresbernardo/toon)
- **Ruby:** [toon-ruby](https://github.com/andrepcg/toon-ruby)
- **Swift:** [TOONEncoder](https://github.com/mattt/TOONEncoder)
- **Kotlin:** [Kotlin-Toon Encoder/Decoder](https://github.com/vexpera-br/kotlin-toon)

## Credits

- Logo design by [鈴木ックス(SZKX)](https://x.com/szkx_art)

## License

[MIT](./LICENSE) License © 2025-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
