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

**Eligibility:** Percentage of arrays and keyed maps that qualify for TOON's tabular forms (uniform records whose fields are primitives or uniform nested objects folded into nested field groups)

</details>

#### Efficiency Ranking (Accuracy per 1K Tokens)

Each format ranked by efficiency (accuracy percentage per 1,000 tokens):

```
TOON           ████████████████████   29.2 acc%/1K tok  │  72.2%  ±2.8 acc  │  2,474 tokens
JSON compact   ████████████████░░░░   23.8 acc%/1K tok  │  69.0%  ±2.9 acc  │  2,892 tokens
YAML           ██████████████░░░░░░   20.1 acc%/1K tok  │  70.1%  ±2.9 acc  │  3,487 tokens
JSON           ███████████░░░░░░░░░   16.6 acc%/1K tok  │  71.4%  ±2.8 acc  │  4,308 tokens
XML            ██████████░░░░░░░░░░   14.4 acc%/1K tok  │  70.7%  ±2.9 acc  │  4,909 tokens
```

*Efficiency score = (Accuracy % ÷ Tokens) × 1,000. Higher is better.*

> [!TIP]
> TOON achieves **72.2%** accuracy (vs JSON's 71.4%) while using **42.6% fewer tokens**.

> [!NOTE]
> CSV is excluded from the ranking as it only supports 109 of 244 questions (flat tabular data only). While CSV is highly token-efficient for simple tabular data, it cannot represent nested structures that other formats handle.

#### Accuracy on Flat Datasets

Every format answers the same 109 flat-dataset questions per model, so CSV can be compared on equal footing here.

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
<summary><strong>Performance by dataset and question type</strong></summary>

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

</details>

#### Run Configuration

- **Models tested**: `claude-haiku-4-5-20251001`, `gemini-3.6-flash`, `gpt-5.4-nano`, `grok-4.5`
- **Formats compared**: TOON, JSON, XML, YAML, JSON compact, CSV
- **Token counting**: Using `gpt-tokenizer` with `o200k_base` encoding (GPT-5 tokenizer). Other providers tokenize differently, so absolute counts are tokenizer-specific; relative differences between formats hold directionally.
- **Reasoning**: Disabled via the AI SDK's universal `reasoning: 'none'` (Gemini 3 floors at minimal thinking, `grok-4.5` at `low`)
- **Temperature**: Not set (models use their defaults)
- **Total evaluations**: 244 questions × 6 formats × 4 models = 5,856 LLM calls

What the datasets contain, how the questions are generated, and how answers are validated is documented in [the benchmark README](https://github.com/toon-format/toon/tree/main/benchmarks#retrieval-accuracy-benchmark).
