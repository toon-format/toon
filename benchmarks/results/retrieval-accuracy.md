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
