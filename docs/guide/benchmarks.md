# Benchmarks

## 1. Comprehension Benchmarks
The benchmarks in this section measure TOON's performance across two key dimensions:

- **Retrieval Accuracy**: How well LLMs understand and extract information from different input formats.
- **Token Efficiency**: How many tokens each format requires to represent the same data.

Benchmarks are organized into two tracks to ensure fair comparisons:

- **Mixed-Structure Track**: Datasets with nested or semi-uniform structures (TOON vs JSON, YAML, XML). CSV excluded as it cannot properly represent these structures.
- **Flat-Only Track**: Datasets with flat tabular structures where CSV is applicable (CSV vs TOON vs JSON, YAML, XML).

## Retrieval Accuracy

<!-- automd:file src="../../benchmarks/results/retrieval-accuracy.md" -->

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

## Token Efficiency

Token counts are measured using the GPT-5 `o200k_base` tokenizer via [`gpt-tokenizer`](https://github.com/niieani/gpt-tokenizer). Savings are calculated against formatted JSON (2-space indentation) as the primary baseline, with additional comparisons to compact JSON (minified), YAML, and XML. Actual savings vary by model and tokenizer.

The benchmarks test datasets across different structural patterns (uniform, semi-uniform, nested, deeply nested) to show where TOON excels and where other formats may be better.

<!-- automd:file src="../../benchmarks/results/token-efficiency.md" -->

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

## 2. Generation Benchmarks

We also evaluate formats as model output targets for structured data generation. While TOON is primarily designed for input, its token efficiency makes it a candidate for LLM output in specific high-volume scenarios. 

[Token-Oriented Object Notation vs JSON: a benchmark of plain and constrained decoding generation](https://github.com/vetertann/TOON-generation-benchmark) is a structured generation benchmark comparing plain JSON, JSON with constrained decoding (structured output), and TOON in-context learning across 21 models and 4 test cases of increasing complexity (flat tabular, nested uniform,  deep hierarchies), measuring accuracy, token efficiency, and repair costs.


### Benchmark design

**Gold standard:** Created from Pydantic models and serialized to `*.gold.json` (canonical JSON) and `*.gold.toon` (via `@toon-format/cli`).

**Test cases:**
1.  **users**: Simple tabular structure.
2.  **order**: Nested structure with array.
3.  **company**: Department and employee hierarchy (deep nesting).
4.  **invoice**: Items and totals.

**Test tracks:**
*   **JSON track (J):** Plain JSON generation with Pydantic validation.
*   **JSON-SO track (JSO):** Structured output (`response_format="json_object"`) with constrained decoding. The inference engine compiles constraints (schema/grammar) into a state machine (e.g., xgrammar) to mask illegal tokens during generation, enforcing valid syntax.
*   **TOON track (T):** TOON output followed by CLI decoding. Prompts used **universal examples** (not custom-tailored to the specific schema) to ensure a fair comparison with JSON.

**Sampling & evaluation:**
*   **Parameters:** Temperature 0 for deterministic output.
*   **Runs:** 10 iterations per test case per model (21 models via [Nebius API](https://tokenfactory.nebius.com/)).
*   **Process:**
    1.  Model generates output (J, JSO, or T).
    2.  (TOON only) CLI decodes to JSON. CLI errors trigger a **repair cycle**.
    3.  Validation via Pydantic & Data canonicalization.
    4.  Comparison with Gold Standard.
    5.  **Repair cycle:** If validation/comparison fails, the previous output and error text are inserted into the prompt (up to 3 attempts).

### Key findings

*   **Aligned data ("sweet spot"):** TOON excels in tabular and uniform nested structures (e.g., invoices, orders), achieving **90.5%** accuracy in 1-shot tests while offering significant token savings.
*   **Prompt tax:** Unlike JSON, which is native to model training, TOON requires instructional prompting. For short outputs, this overhead reduces efficiency; for larger outputs (batches/logs), the syntax savings amortize the cost.
*   **Structured output trade-off:** Constrained decoding (CD) acts as a safety net for smaller models (preventing syntax errors) but was found to degrade reasoning/accuracy in some larger models ("structured output paradox"). This result hints that TOON enforcing via CD may not yield the desired results.

### Results by data topology

Performance varies significantly based on how well the data aligns with TOON's design (e.g., uniform arrays vs. deep recursive nesting).

| Case | J (1-S) | J (Fin) | J (Tok) | JSO (1-S) | JSO (Fin) | JSO (Tok) | T (1-S) | T (Fin) | T (Tok) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **users** | 94.8% | 94.8% | 1078 | 92.9% | **100%** | 556 | **90.5%** | 90.5% | 840 |
| **order** | 81.9% | 81.9% | 1746 | 78.6% | 83.3% | 1255 | 74.3% | 78.6% | 1585 |
| **company** | 18.6% | 43.8% | 3575 | **21.9%** | **48.1%** | 2592 | 0.0% | 48.6% | 2567 |
| **invoice** | 90.0% | 90.0% | 1723 | 87.6% | **95.2%** | 1349 | 0.0% | 52.4% | 3626 |

### Full results by model

The following table compares **1-shot accuracy (1-S)**, **final accuracy (Fin)** after repair loops, and the total **token budget (Tok)** required for successful generation.

| Model | J (1-S) | J (Fin) | J (Tok) | JSO (1-S) | JSO (Fin) | JSO (Tok) | T (1-S) | T (Fin) | T (Tok) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **NousResearch/Hermes-4-405B** | 92.5% | 92.5% | 3252 | 35.0% | **100%** | 4759 | 50.0% | 60.0% | 4671 |
| **NousResearch/Hermes-4-70B** | 75.0% | 75.0% | 4414 | 37.5% | 75.0% | 5594 | 50.0% | 50.0% | 4738 |
| **PrimeIntellect/INTELLECT-3** | 72.5% | 75.0% | 10682 | 72.5% | 77.5% | 10103 | 40.0% | 65.0% | 13315 |
| **Qwen/Qwen2.5-Coder-7B-fast** | 0.0% | 0.0% | 37705 | 75.0% | 75.0% | 4440 | 27.5% | 27.5% | 32715 |
| **Qwen/Qwen3-235B-A22B-Inst** | **100%** | **100%** | 2772 | **100%** | **100%** | 2772 | 50.0% | **100%** | 4715 |
| **Qwen/Qwen3-235B-A22B-Thk** | 82.5% | 82.5% | 11425 | 87.5% | 97.5% | 7899 | 50.0% | 97.5% | 17457 |
| **Qwen/Qwen3-30B-A3B-Inst** | 75.0% | 75.0% | 4436 | 75.0% | 75.0% | 4436 | 50.0% | 70.0% | 5505 |
| **Qwen/Qwen3-32B** | 75.0% | 77.5% | 10196 | 75.0% | 75.0% | 4120 | 47.5% | 80.0% | 9101 |
| **Qwen/Qwen3-Coder-30B-A3B** | 75.0% | 75.0% | 4206 | 75.0% | 75.0% | 4206 | 50.0% | **100%** | 4719 |
| **Qwen/Qwen3-Coder-480B** | 75.0% | 75.0% | 4462 | 75.0% | 75.0% | 4447 | 50.0% | 75.0% | 4515 |
| **deepseek-ai/DeepSeek-R1** | 55.0% | 70.0% | 13811 | 65.0% | 80.0% | 4149 | 25.0% | 50.0% | 19047 |
| **deepseek-ai/DeepSeek-V3-fast** | 75.0% | **100%** | 3600 | 75.0% | **100%** | 3584 | 25.0% | 80.0% | 4734 |
| **google/gemma-2-2b-it** | 75.0% | **100%** | 4721 | 77.5% | **100\%** | 4566 | 0.0% | 0.0% | 5955 |
| **google/gemma-2-9b-it-fast** | 75.0% | 75.0% | 6086 | 75.0% | 75.0% | 6056 | 50.0% | 75.0% | 5419 |
| **meta-llama/Llama-3.3-70B** | 75.0% | 75.0% | 4551 | 75.0% | 75.0% | 4447 | 50.0% | 50.0% | 5148 |
| **meta-llama/Llama-3.1-8B** | 72.5% | 72.5% | 7235 | 75.0% | 75.0% | 6941 | 22.5\% | 25.0% | 4915 |
| **moonshotai/Kimi-K2-Instruct** | 50.0% | 75.0% | 4284 | 50.0% | 75.0% | 4283 | 50.0\% | **100\%** | 3937 |
| **nvidia/Llama-3_1-Nemotron** | 75.0% | 75.0% | 4426 | 50.0% | 50.0% | 5714 | 50.0% | 82.5% | 4368 |
| **openai/gpt-oss-120b** | **97.5%** | **100%** | 3685 | **100%** | **100%** | 3545 | 50.0% | 87.5% | 8223 |
| **openai/gpt-oss-20b** | 50.0% | 72.5% | 14943 | 50.0% | 67.5% | 15601 | 50.0% | 90.0% | 9678 |
| **zai-org/GLM-4.5** | 75.0% | 87.5% | 9677 | 75.0\% | 92.5\% | 9135 | 27.5\% | 52.5\% | 8110 |

### Observations

**1. The "Structured Output Paradox"**
Constrained decoding is not always superior. For `Hermes-4-405B`, applying constraints dropped 1-shot accuracy from **92.5%** (Plain JSON) to **35.0%** (Structured Output). This suggests that for some high-reasoning models, forcing specific grammar paths can actively interfere with the model's logic capabilities.  This result also hints that TOON enforcing via frameworks such as xgrammar may not yield the desired results.

**2. Guardrails for smaller models**
Conversely, for smaller models like `Qwen/Qwen2.5-Coder-7B-fast`, structured output is essential. It raised performance from a catastrophic **0%** (Plain JSON) to a viable **75%**.

**3. TOON repair potential**
While TOON often has lower initial 1-shot accuracy due to the novelty of the format, several models (`Qwen/Qwen3-Coder-30B`, `Kimi-K2-Instruct`, `Qwen/Qwen3-235B`) achieved **100% final accuracy** after repair loops. This indicates that while the format may be unfamiliar initially, the error messages provided by the TOON CLI are highly effective for self-correction.

**4. Token efficiency scaling**
In cases like `Qwen3-235B-A22B-Inst`, TOON consumed significantly more tokens (~4700) than JSON (~2700). This confirms the "prompt tax" hypothesis: for short tasks, the instructional overhead outweighs the syntax savings. TOON becomes efficient primarily in high-volume generation where the output length justifies the system prompt.

### Analysis & recommendations

1.  **Aligned data streams:** Use TOON generation for data structures like **SQL dumps, logs, and transactional documents**. The token savings on high-volume, uniform data outweigh the prompt overhead.
2.  **Avoid deep nesting:** For deeply nested or recursive state trees stick to **JSON** or **JSO**. TOON's indentation tracking is less robust for these structures in one-shot generation.
3.  **Repair loops:** TOON generation benefits disproportionately from repair loops (feeding errors back to context), often correcting format issues that initial constrained decoding cannot fix.
4.  **Validate scaling and drift:** Current benchmarks cover small-scale structures (< 50 items). Test larger datasets (100+ items, 10K+ output tokens) to determine where TOON's syntax savings offset prompt overhead and assess susceptibility to indentation drift in long-context generation—whitespace-based formats may accumulate errors over extended outputs.


## Related Resources

- [Formal Byte-Level Model](/reference/efficiency-formalization) – Mathematical analysis of byte efficiency compared to JSON
- [Specification](/reference/spec) – Formal TOON specification
