---
## Token-Oriented Object Notation vs JSON: a benchmark of plain and constrained decoding generation"

[Token-Oriented Object Notation](https://github.com/toon-format) is a compact, human-readable encoding of the JSON data model that minimizes tokens and makes structure easy for models to follow. It's intended for LLM input as a drop-in, lossless representation of your existing JSON.

While TOON is primarily designed for input, its token efficiency makes it a candidate for LLM output in specific high-volume scenarios. This benchmark compares three generation strategies across 21 models.

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
*   **Structured output trade-off:** Constrained decoding (JSO) acts as a safety net for smaller models (preventing syntax errors) but was found to degrade reasoning/accuracy in some larger models ("structured output paradox").

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
Constrained decoding is not always superior. For `Hermes-4-405B`, applying constraints dropped 1-shot accuracy from **92.5%** (Plain JSON) to **35.0%** (Structured Output). This suggests that for some high-reasoning models, forcing specific grammar paths can actively interfere with the model's logic capabilities.

**2. Guardrails for smaller models**
Conversely, for smaller models like `Qwen/Qwen2.5-Coder-7B-fast`, structured output is essential. It raised performance from a catastrophic **0%** (Plain JSON) to a viable **75%**.

**3. TOON repair potential**
While TOON often has lower initial 1-shot accuracy due to the novelty of the format, several models (`Qwen/Qwen3-Coder-30B`, `Kimi-K2-Instruct`, `Qwen/Qwen3-235B`) achieved **100% final accuracy** after repair loops. This indicates that while the format may be unfamiliar initially, the error messages provided by the TOON CLI are highly effective for self-correction.

**4. Token efficiency scaling**
In cases like `Qwen3-235B-A22B-Inst`, TOON consumed significantly more tokens (~4700) than JSON (~2700). This confirms the "prompt tax" hypothesis: for short tasks, the instructional overhead outweighs the syntax savings. TOON becomes efficient primarily in high-volume generation where the output length justifies the system prompt.

### Analysis & recommendations

1.  **Aligned data streams:** Use TOON generation for **SQL dumps, logs, and transactional documents**. The token savings on high-volume, uniform data outweigh the prompt overhead.
2.  **Avoid deep nesting:** For deeply nested or recursive state trees (like DOMs), stick to **JSON** or **JSO**. TOON's indentation tracking is less robust for these structures in one-shot generation.
3.  **Repair loops:** TOON generation benefits disproportionately from repair loops (feeding errors back to context), often correcting format issues that initial constrained decoding cannot fix.

<details>
<summary><strong>Installation & Usage (click to expand)</strong></summary>

<br>

This repository contains two main scripts:

- **`generate.py`** – builds the gold-standard reference outputs used for evaluation.  
- **`eval.py`** – runs the full benchmark across all models and decoding strategies.

Before running the benchmark, install dependencies and create the gold files.

### **1. Install Python dependencies**

```bash
pip install -r requirements.txt
```

### **2. Install the TOON CLI (required for encoding/decoding)**

```bash
npm install -g @toon-format/cli
```

Alternatively, you can rely on `npx` without a global install.

### **3. Generate the gold reference outputs**

This step must be run **once**, or whenever you modify the schemas in `generate.py`:

```bash
python generate.py
```

This will create:

```
gold/users.gold.json       gold/users.gold.toon
gold/order.gold.json       gold/order.gold.toon
gold/company.gold.json     gold/company.gold.toon
gold/invoice.gold.json     gold/invoice.gold.toon
```

### **4. Set your model API key**

The benchmark uses the Nebius Token Factory API. Set:

```bash
export LLM_API_KEY="your_nebius_api_key"
```

### **5. Run the full benchmark**

```bash
python eval.py
```

This will:

- Run all test cases for 21 models  
- Perform JSON, JSON-SO, and TOON generation  
- Decode TOON outputs via CLI  
- Validate against the gold standard  
- Apply repair loops  
- Write per-run statistics to:

```
eval_runs.csv
```

### **Repository structure**

```
├── generate.py          # Defines schemas, builds gold objects, writes gold/*.json + *.toon
├── eval.py       # Full benchmark runner
├── gold/                # Auto-generated canonical reference data
│   ├── *.gold.json
│   ├── *.gold.toon
├── requirements.txt
└── README.md
```

</details>
