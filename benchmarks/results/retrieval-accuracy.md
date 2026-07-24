Benchmarks test LLM comprehension across different input formats using 244 data retrieval questions on 4 models.

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
| Deeply nested configuration | 1 | deep | ✗ | 0% |
| Valid complete dataset (control) | 20 | uniform | ✓ | 100% |
| Array truncated: 3 rows removed from end | 20 | uniform | ✓ | 100% |
| Extra rows added beyond declared length | 20 | uniform | ✓ | 100% |
| Inconsistent field count (missing salary in row 10) | 20 | uniform | ✓ | 100% |
| Missing required fields (no email in multiple rows) | 20 | uniform | ✓ | 100% |
| Feature flags keyed by name | 40 | uniform | ✗ | 100% |
| Contacts with nested address and plan groups | 50 | nested | ✗ | 100% |

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
TOON           ████████████████████   29.2 acc%/1K tok  │  72.2% acc  │  2,474 tokens
JSON compact   ████████████████░░░░   23.8 acc%/1K tok  │  69.0% acc  │  2,892 tokens
YAML           ██████████████░░░░░░   20.1 acc%/1K tok  │  70.1% acc  │  3,487 tokens
JSON           ███████████░░░░░░░░░   16.6 acc%/1K tok  │  71.4% acc  │  4,308 tokens
XML            ██████████░░░░░░░░░░   14.4 acc%/1K tok  │  70.7% acc  │  4,909 tokens
```

*Efficiency score = (Accuracy % ÷ Tokens) × 1,000. Higher is better.*

> [!TIP]
> TOON achieves **72.2%** accuracy (vs JSON's 71.4%) while using **42.6% fewer tokens**.

> [!NOTE]
> CSV is excluded from the ranking as it only supports 109 of 244 questions (flat tabular data only). While CSV is highly token-efficient for simple tabular data, it cannot represent nested structures that other formats handle.

#### Accuracy by Format

##### All Datasets

CSV is excluded here – it cannot represent the nested datasets.

| Format | Accuracy | Correct/Total | Avg Tokens |
| ------ | -------- | ------------- | ---------- |
| `toon` | 72.2% ±2.8 | 705/976 | 2,474 |
| `json-pretty` | 71.4% ±2.8 | 697/976 | 4,308 |
| `xml` | 70.7% ±2.9 | 690/976 | 4,909 |
| `yaml` | 70.1% ±2.9 | 684/976 | 3,487 |
| `json-compact` | 69.0% ±2.9 | 673/976 | 2,892 |

##### Flat Datasets Only

Every format answers the same 109 flat-dataset questions per model.

| Format | Accuracy | Correct/Total | Avg Tokens |
| ------ | -------- | ------------- | ---------- |
| `toon` | 63.1% ±4.5 | 275/436 | 1,994 |
| `csv` | 62.2% ±4.5 | 271/436 | 1,851 |
| `json-pretty` | 60.3% ±4.6 | 263/436 | 3,950 |
| `xml` | 60.1% ±4.6 | 262/436 | 4,516 |
| `yaml` | 59.9% ±4.6 | 261/436 | 3,270 |
| `json-compact` | 58.0% ±4.6 | 253/436 | 2,718 |

#### Per-Model Accuracy

Accuracy across 4 LLMs on 244 data retrieval questions:

```
claude-haiku-4-5-20251001
→ TOON           █████████████░░░░░░░    65.6% ±5.9 (160/244)
  JSON           █████████████░░░░░░░    63.5% ±6.0 (155/244)
  XML            ████████████░░░░░░░░    62.3% ±6.0 (152/244)
  YAML           ████████████░░░░░░░░    62.3% ±6.0 (152/244)
  JSON compact   ████████████░░░░░░░░    61.9% ±6.0 (151/244)
  CSV            ██████████░░░░░░░░░░    49.5% ±9.2 (54/109)

gemini-3.6-flash
→ TOON           ██████████████░░░░░░    69.3% ±5.8 (169/244)
  JSON           ██████████████░░░░░░    68.4% ±5.8 (167/244)
  YAML           ██████████████░░░░░░    67.6% ±5.8 (165/244)
  XML            █████████████░░░░░░░    65.2% ±5.9 (159/244)
  JSON compact   █████████████░░░░░░░    63.5% ±6.0 (155/244)
  CSV            ████████████░░░░░░░░    57.8% ±9.1 (63/109)

gpt-5.4-nano
  XML            ████████████░░░░░░░░    59.4% ±6.1 (145/244)
  JSON           ███████████░░░░░░░░░    57.4% ±6.2 (140/244)
→ TOON           ███████████░░░░░░░░░    57.0% ±6.2 (139/244)
  JSON compact   ███████████░░░░░░░░░    54.9% ±6.2 (134/244)
  YAML           ███████████░░░░░░░░░    54.5% ±6.2 (133/244)
  CSV            █████████░░░░░░░░░░░    46.8% ±9.2 (51/109)

grok-4.5
→ TOON           ███████████████████░    97.1% ±2.2 (237/244)
  JSON           ███████████████████░    96.3% ±2.5 (235/244)
  XML            ███████████████████░    95.9% ±2.6 (234/244)
  YAML           ███████████████████░    95.9% ±2.6 (234/244)
  JSON compact   ███████████████████░    95.5% ±2.7 (233/244)
  CSV            ███████████████████░    94.5% ±4.5 (103/109)
```

> [!NOTE]
> Accuracy figures include Wilson 95% confidence intervals (±); when two formats' intervals overlap, the difference between them is not statistically meaningful. CSV answers only the 109 flat-dataset questions, so its per-model cells cover a smaller, easier population than the other formats.

<details>
<summary><strong>Performance by dataset, model, and question type</strong></summary>

#### Performance by Question Type

| Question Type | TOON | JSON | XML | YAML | JSON compact | CSV |
| ------------- | ---- | ---- | ---- | ---- | ---- | ---- |
| Field Retrieval | 97.8% | 99.2% | 99.2% | 99.7% | 98.9% | 100.0% |
| Aggregation | 48.4% | 48.4% | 46.0% | 46.0% | 45.2% | 32.8% |
| Filtering | 38.0% | 41.1% | 37.5% | 40.1% | 38.0% | 33.3% |
| Structure Awareness | 90.3% | 84.0% | 84.0% | 79.2% | 78.5% | 82.8% |
| Structural Validation | 100.0% | 50.0% | 80.0% | 50.0% | 45.0% | 80.0% |

#### Performance by Dataset

##### Uniform employee records

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 64.6% | 2,336 | 106/164 |
| `toon` | 62.8% | 2,537 | 103/164 |
| `json-compact` | 62.2% | 3,919 | 102/164 |
| `yaml` | 64.0% | 4,982 | 105/164 |
| `json-pretty` | 62.2% | 6,326 | 102/164 |
| `xml` | 61.0% | 7,286 | 100/164 |

##### E-commerce orders with nested structures

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `json-compact` | 70.7% | 6,875 | 116/164 |
| `toon` | 71.3% | 7,344 | 117/164 |
| `yaml` | 72.0% | 8,456 | 118/164 |
| `json-pretty` | 71.3% | 10,842 | 117/164 |
| `xml` | 74.4% | 12,180 | 122/164 |

##### Time-series analytics data

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 64.2% | 1,408 | 77/120 |
| `toon` | 63.3% | 1,595 | 76/120 |
| `json-compact` | 59.2% | 2,351 | 71/120 |
| `yaml` | 62.5% | 2,951 | 75/120 |
| `json-pretty` | 65.0% | 3,678 | 78/120 |
| `xml` | 62.5% | 4,386 | 75/120 |

##### Top 100 GitHub repositories

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `toon` | 57.6% | 9,017 | 76/132 |
| `csv` | 54.5% | 8,726 | 72/132 |
| `json-compact` | 53.8% | 11,650 | 71/132 |
| `yaml` | 53.8% | 13,350 | 71/132 |
| `json-pretty` | 55.3% | 15,350 | 73/132 |
| `xml` | 53.8% | 17,304 | 71/132 |

##### Semi-uniform event logs

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `json-compact` | 56.7% | 4,793 | 68/120 |
| `toon` | 60.8% | 5,814 | 73/120 |
| `json-pretty` | 60.0% | 6,759 | 72/120 |
| `yaml` | 55.0% | 5,798 | 66/120 |
| `xml` | 50.8% | 7,668 | 61/120 |

##### Deeply nested configuration

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `json-compact` | 91.4% | 562 | 106/116 |
| `yaml` | 93.1% | 675 | 108/116 |
| `toon` | 91.4% | 669 | 106/116 |
| `json-pretty` | 94.8% | 918 | 110/116 |
| `xml` | 94.0% | 1,007 | 109/116 |

##### Valid complete dataset (control)

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `toon` | 100.0% | 566 | 4/4 |
| `json-compact` | 100.0% | 772 | 4/4 |
| `yaml` | 100.0% | 984 | 4/4 |
| `json-pretty` | 100.0% | 1,259 | 4/4 |
| `xml` | 0.0% | 1,441 | 0/4 |
| `csv` | 0.0% | 473 | 0/4 |

##### Array truncated: 3 rows removed from end

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 408 | 4/4 |
| `toon` | 100.0% | 498 | 4/4 |
| `xml` | 100.0% | 1,229 | 4/4 |
| `json-pretty` | 0.0% | 1,075 | 0/4 |
| `yaml` | 0.0% | 841 | 0/4 |
| `json-compact` | 0.0% | 660 | 0/4 |

##### Extra rows added beyond declared length

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 547 | 4/4 |
| `toon` | 100.0% | 644 | 4/4 |
| `xml` | 100.0% | 1,663 | 4/4 |
| `json-pretty` | 0.0% | 1,452 | 0/4 |
| `yaml` | 0.0% | 1,135 | 0/4 |
| `json-compact` | 0.0% | 893 | 0/4 |

##### Inconsistent field count (missing salary in row 10)

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 470 | 4/4 |
| `toon` | 100.0% | 563 | 4/4 |
| `json-compact` | 75.0% | 767 | 3/4 |
| `xml` | 100.0% | 1,432 | 4/4 |
| `yaml` | 75.0% | 977 | 3/4 |
| `json-pretty` | 75.0% | 1,251 | 3/4 |

##### Missing required fields (no email in multiple rows)

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `csv` | 100.0% | 442 | 4/4 |
| `toon` | 100.0% | 535 | 4/4 |
| `xml` | 100.0% | 1,386 | 4/4 |
| `yaml` | 75.0% | 941 | 3/4 |
| `json-pretty` | 75.0% | 1,207 | 3/4 |
| `json-compact` | 50.0% | 732 | 2/4 |

##### Feature flags keyed by name

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `toon` | 97.1% | 931 | 66/68 |
| `json-compact` | 94.1% | 1,264 | 64/68 |
| `yaml` | 92.6% | 1,443 | 63/68 |
| `json-pretty` | 95.6% | 1,873 | 65/68 |
| `xml` | 95.6% | 2,306 | 65/68 |

##### Contacts with nested address and plan groups

| Format | Accuracy | Tokens | Correct/Total |
| ------ | -------- | ------ | ------------- |
| `toon` | 94.4% | 1,444 | 68/72 |
| `json-compact` | 91.7% | 2,357 | 66/72 |
| `yaml` | 94.4% | 2,797 | 68/72 |
| `json-pretty` | 97.2% | 4,014 | 70/72 |
| `xml` | 98.6% | 4,534 | 71/72 |

#### Performance by Model

##### claude-haiku-4-5-20251001

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `toon` | 65.6% | 160/244 |
| `json-pretty` | 63.5% | 155/244 |
| `xml` | 62.3% | 152/244 |
| `yaml` | 62.3% | 152/244 |
| `json-compact` | 61.9% | 151/244 |
| `csv` | 49.5% | 54/109 |

##### gemini-3.6-flash

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `toon` | 69.3% | 169/244 |
| `json-pretty` | 68.4% | 167/244 |
| `yaml` | 67.6% | 165/244 |
| `xml` | 65.2% | 159/244 |
| `json-compact` | 63.5% | 155/244 |
| `csv` | 57.8% | 63/109 |

##### gpt-5.4-nano

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `xml` | 59.4% | 145/244 |
| `json-pretty` | 57.4% | 140/244 |
| `toon` | 57.0% | 139/244 |
| `json-compact` | 54.9% | 134/244 |
| `yaml` | 54.5% | 133/244 |
| `csv` | 46.8% | 51/109 |

##### grok-4.5

| Format | Accuracy | Correct/Total |
| ------ | -------- | ------------- |
| `toon` | 97.1% | 237/244 |
| `json-pretty` | 96.3% | 235/244 |
| `xml` | 95.9% | 234/244 |
| `yaml` | 95.9% | 234/244 |
| `json-compact` | 95.5% | 233/244 |
| `csv` | 94.5% | 103/109 |

</details>

#### What's Being Measured

This benchmark tests **LLM comprehension and data retrieval accuracy** across different input formats. Each LLM receives formatted data and must answer questions about it. This does **not** test the model's ability to generate TOON output – only to read and understand it.

#### Datasets Tested

Thirteen datasets designed to test different structural patterns and validation capabilities:

**Primary datasets:**

1. **Tabular** (100 employee records): Uniform objects with identical fields – optimal for TOON's tabular format.
2. **Nested** (50 e-commerce orders): Complex structures with nested customer objects and item arrays.
3. **Analytics** (60 days of metrics): Time-series data with dates and numeric values.
4. **GitHub** (100 repositories): Real-world data from top GitHub repos by stars.
5. **Event Logs** (75 logs): Semi-uniform data with ~50% flat logs and ~50% with nested error objects.
6. **Nested Config** (1 configuration): Deeply nested configuration with minimal tabular eligibility.
7. **Keyed** (40 feature flags): Map of uniform flat objects – exercises TOON's [keyed tabular form](https://github.com/toon-format/spec/blob/main/SPEC.md#95-keyed-objects--tabular-form) (`key[N:]{fields}:`).
8. **Nested Group** (50 contacts): Uniform records with nested address and plan objects – exercises TOON's [nested field groups](https://github.com/toon-format/spec/blob/main/SPEC.md#93-arrays-of-objects--tabular-form).

**Structural validation datasets:**

Each carries the same valid 20-row dataset; the corruption is applied to the encoded text after it is emitted, so TOON's `[N]` length and `{fields}` width still declare the original shape while JSON, YAML, XML, and CSV render the lossy-pipeline outcome.

9. **Control**: Valid complete dataset, text passed through untouched (baseline for validation)
10. **Truncated**: Last 3 row lines removed – TOON still declares `[20]`, so the shortfall is detectable; formats without length metadata stay valid and undetectable in principle
11. **Extra rows**: 3 rows appended past the declared `[20]` – detectable in TOON, valid and undetectable elsewhere
12. **Width mismatch**: One cell dropped from row 10 – TOON's row is narrower than its `{fields}` header (CSV narrower than its column row); JSON/YAML/XML only drop the property, a schema-level signal
13. **Missing fields**: The email value removed from every 5th record, surfacing the same way as width mismatch

#### Question Types

244 questions are generated dynamically across five categories:

- **Field retrieval (38%)**: Direct value lookups or values that can be read straight off a record (including booleans and simple counts such as array lengths)
  - Example: "What is Alice's salary?" → `75000`
  - Example: "How many items are in order ORD-0042?" → `3`
  - Example: "What is the customer name for order ORD-0042?" → `John Doe`

- **Aggregation (26%)**: Dataset-level totals and averages plus single-condition filters (counts, sums, min/max comparisons)
  - Example: "How many employees work in Engineering?" → `17`
  - Example: "What is the total revenue across all orders?" → `45123.50`
  - Example: "How many employees have salary > 80000?" → `23`

- **Filtering (20%)**: Multi-condition queries requiring compound logic (AND constraints across fields)
  - Example: "How many employees in Sales have salary > 80000?" → `5`
  - Example: "How many active employees have more than 10 years of experience?" → `8`
  - Note: With reasoning disabled, multi-row arithmetic is hard in every format – aggregation and filtering scores mostly measure computation under format friction and sit near the floor for all formats.

- **Structure awareness (15%)**: Tests format-native structural affordances (TOON's `[N]` count and `{fields}`, CSV's header row)
  - Example: "How many employees are in the dataset?" → `100`
  - Example: "List the field names for employees" → `id, name, email, department, salary, yearsExperience, active`
  - Example: "What is the department of the last employee?" → `Sales`

- **Structural validation (2%)**: Tests ability to detect incomplete, truncated, or corrupted data from the encoded text alone
  - Example: "Is this data complete and valid?" → `YES` (control dataset) or `NO` (corrupted datasets)
  - The text is corrupted post-encode: TOON's `[N]` length and `{fields}` width still declare the original shape, so truncation, extra rows, and width drops are detectable
  - JSON, YAML, XML, and CSV carry no length metadata, so their truncated and extra-row variants stay syntactically valid and cannot be flagged in principle – that contrast is the demonstration

#### Evaluation Process

1. **Format conversion**: Each dataset is converted to all 6 formats (TOON, JSON, XML, YAML, JSON compact, CSV).
2. **Query LLM**: Each model receives formatted data + question in a prompt and extracts the answer.
3. **Validate deterministically**: Answers are validated using type-aware comparison (e.g., `50000` = `$50,000`, `Engineering` = `engineering`, `2025-01-01` = `January 1, 2025`) without requiring an LLM judge.

#### Models & Configuration

- **Models tested**: `claude-haiku-4-5-20251001`, `gemini-3.6-flash`, `gpt-5.4-nano`, `grok-4.5`
- **Token counting**: Using `gpt-tokenizer` with `o200k_base` encoding (GPT-5 tokenizer). Other providers tokenize differently, so absolute counts are tokenizer-specific; relative differences between formats hold directionally.
- **Reasoning**: Disabled via the AI SDK's universal `reasoning: 'none'` (Gemini 3 floors at minimal thinking, `grok-4.5` at `low`)
- **Temperature**: Not set (models use their defaults)
- **Total evaluations**: 244 questions × 6 formats × 4 models = 5,856 LLM calls
