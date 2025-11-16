# Testing Guide for CodeLens-TOON

This guide will help you test your research ideas and validate the CodeLens-TOON implementation.

## 🎯 Quick Start Testing

### Step 1: Install Dependencies

```bash
# From the repository root
cd /home/user/toon
pnpm install

# Navigate to codelens-toon
cd codelens-toon
```

### Step 2: Run Basic Tests

```bash
# Run the test suite
pnpm test

# Expected output:
# ✓ TypeScriptParser > should parse a simple class
# ✓ TypeScriptParser > should parse functions
# ✓ CodeLensGenerator > should generate L1 output
# ✓ TOONEncoder > should encode L1 output to TOON format
```

### Step 3: Test on Sample File

```bash
# Analyze the sample TypeScript file
pnpm dev examples/sample.ts --level 2 --stats

# Expected output:
# Analyzing codebase...
#
# Statistics:
#   Characters: ~1500-2000
#   Estimated tokens: ~400-500
#   Analysis level: L2
```

## 🔬 Research Testing Scenarios

### Scenario 1: Token Efficiency Comparison

**Hypothesis:** CodeLens L2 uses 50-70% fewer tokens than full-file inclusion

**Test:**

```bash
# 1. Count tokens in full file
wc -c examples/sample.ts
# Output: 3842 characters → ~960 tokens (÷4)

# 2. Generate L2 output and count tokens
pnpm dev examples/sample.ts --level 2 --stats --output l2-output.toon
# Check the stats output

# 3. Calculate reduction
# Reduction = (1 - L2_tokens / Full_tokens) × 100%
# Example: (1 - 450/960) × 100% = 53% reduction
```

**Expected Results:**
- L1: 85-95% reduction
- L2: 50-70% reduction
- L3: 30-50% reduction

### Scenario 2: Comprehension Accuracy

**Hypothesis:** LLMs can answer code questions accurately using L2 output

**Test:**

1. **Generate L2 output:**
   ```bash
   pnpm dev examples/sample.ts --level 2 > sample-l2.toon
   ```

2. **Prepare questions:**
   - Q1: "How many classes are defined in this code?"
   - Q2: "What methods does the AuthService class have?"
   - Q3: "How many functions take 2 or more parameters?"
   - Q4: "Which classes and functions are exported?"
   - Q5: "What is the cyclomatic complexity of createAuthRoutes?"

3. **Test with LLM:**
   - Paste `sample-l2.toon` into Claude/GPT-4
   - Ask each question
   - Record answers

4. **Ground truth (from source):**
   - A1: 2 classes (AuthService, SessionManager)
   - A2: 4 methods (login, verifyPassword, generateToken, validateToken)
   - A3: 1 function (login method has 2 params)
   - A4: Both classes + 6 functions exported
   - A5: Complexity 3 (from TOON output)

5. **Calculate accuracy:**
   ```
   Accuracy = Correct answers / Total questions
   ```

**Expected:** 80-95% accuracy for L2

### Scenario 3: Multi-File Analysis

**Hypothesis:** CodeLens correctly aggregates multi-file projects

**Test:**

```bash
# 1. Create test project
mkdir -p test-project/src
cp examples/sample.ts test-project/src/auth.ts
cat > test-project/src/user.ts << 'EOF'
export class User {
  constructor(public id: number, public name: string) {}
}

export function createUser(name: string): User {
  return new User(Date.now(), name)
}
EOF

# 2. Analyze directory
pnpm dev test-project --level 1 --stats

# 3. Verify output
# - Should show 2 files
# - Should aggregate LOC
# - Should count all classes/functions
```

**Expected Results:**
- `totalFiles: 2`
- `modules` array with 2 entries
- Correct aggregate counts

### Scenario 4: Format Comparison

**Hypothesis:** TOON is more compact than JSON for code metadata

**Test:**

```bash
# This test requires creating a JSON baseline
# You'll need to implement this manually or write a script
```

**Manual approach:**

1. Extract the same data as L2 but serialize to JSON
2. Compare token counts

**Expected:** TOON should use 20-40% fewer tokens than JSON for tabular data

### Scenario 5: Real-World Codebase

**Hypothesis:** CodeLens scales to real projects

**Test:**

```bash
# Analyze a real project (e.g., the TOON package itself)
pnpm dev ../packages/toon/src --level 2 --stats --output toon-l2.toon

# Verify:
# 1. Completes without errors
# 2. Token count is reasonable
# 3. Output is valid TOON
# 4. Comprehension quality is maintained
```

**Metrics to collect:**
- Total files analyzed
- Total LOC
- Token count (full files vs L2)
- Parsing time
- Memory usage

## 📊 Benchmark Protocol

For publishable research results, follow this benchmark protocol:

### Dataset Selection

Choose 3-5 open-source projects:

1. **Small** (~1K-5K LOC): Example - a npm utility library
2. **Medium** (~10K-50K LOC): Example - express.js
3. **Large** (~100K+ LOC): Example - vscode codebase

### Baseline Implementations

Implement these baselines for comparison:

#### Baseline 1: Full-File

```bash
# Concatenate all files
find project -name "*.ts" -exec cat {} \; > full-files.txt
wc -c full-files.txt  # Count characters
# Tokens ≈ chars / 4
```

#### Baseline 2: RAG Chunks

```python
# Pseudo-code - implement RAG baseline
from langchain import TextSplitter

splitter = TextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_files(project_files)

# For each question:
relevant_chunks = retriever.retrieve(question, chunks, k=3)
context = "\n".join(relevant_chunks)
tokens = count_tokens(context)
```

#### Baseline 3: AST-JSON

```javascript
// Generate AST as JSON
const parser = new Parser()
const tree = parser.parse(code)
const json = JSON.stringify(tree.rootNode, null, 2)
const tokens = count_tokens(json)
```

#### CodeLens Levels

```bash
# Generate L1, L2, L3 outputs
pnpm dev project --level 1 --output l1.toon
pnpm dev project --level 2 --output l2.toon
pnpm dev project --level 3 --output l3.toon
```

### Question Sets

Create questions for each project:

1. **Structure questions** (30%)
   - "How many classes are defined?"
   - "What are the main modules?"
   - "What is exported from module X?"

2. **Relationship questions** (30%)
   - "What does class X depend on?"
   - "What functions call method Y?"
   - "What are the imports of file Z?"

3. **Metrics questions** (20%)
   - "What is the total LOC?"
   - "Which functions have complexity > 5?"
   - "How many async functions are there?"

4. **Semantic questions** (20%)
   - "What is the purpose of module X?"
   - "How does authentication work?"
   - "What error handling is used?"

### Evaluation Metrics

For each format and question:

1. **Token count**: Use tiktoken or gpt-tokenizer
2. **Accuracy**: Compare LLM answer to ground truth
3. **Cost**: Tokens × price per token
4. **Latency**: Measure response time

### Statistical Analysis

```python
# Calculate means and std dev
import numpy as np

results = {
    'full_file': {'tokens': [...], 'accuracy': [...]},
    'rag': {'tokens': [...], 'accuracy': [...]},
    'ast_json': {'tokens': [...], 'accuracy': [...]},
    'codelens_l1': {'tokens': [...], 'accuracy': [...]},
    'codelens_l2': {'tokens': [...], 'accuracy': [...]}
}

for method, data in results.items():
    print(f"{method}:")
    print(f"  Avg tokens: {np.mean(data['tokens']):.1f} (±{np.std(data['tokens']):.1f})")
    print(f"  Avg accuracy: {np.mean(data['accuracy']):.1%} (±{np.std(data['accuracy']):.1%})")
```

## 🐛 Debugging Tests

### Common Issues

#### Issue 1: Tree-sitter not installed

**Error:**
```
Cannot find module 'tree-sitter-typescript'
```

**Solution:**
```bash
cd codelens-toon
pnpm install
```

#### Issue 2: Parser fails on certain syntax

**Error:**
```
SyntaxError: Unexpected token
```

**Solution:**
- Check that the file is valid TypeScript/JavaScript
- Tree-sitter is generally robust, but very new syntax might not be supported
- Try updating tree-sitter-typescript: `pnpm update tree-sitter-typescript`

#### Issue 3: Generated TOON is empty

**Symptoms:**
- Output file is nearly empty
- No classes/functions detected

**Debug:**
```bash
# Add verbose logging
# Edit src/parsers/typescript.ts and add console.logs

# Or test parsing directly
node -e "
const Parser = require('tree-sitter');
const TS = require('tree-sitter-typescript');
const fs = require('fs');

const parser = new Parser();
parser.setLanguage(TS.typescript);

const code = fs.readFileSync('examples/sample.ts', 'utf-8');
const tree = parser.parse(code);

console.log(tree.rootNode.toString());
"
```

#### Issue 4: Token count seems wrong

**Debug:**
```bash
# Compare with actual tokenizer
npm install gpt-tokenizer

node -e "
const { encode } = require('gpt-tokenizer');
const fs = require('fs');

const toon = fs.readFileSync('l2-output.toon', 'utf-8');
const tokens = encode(toon);

console.log('Actual tokens:', tokens.length);
console.log('Estimated:', Math.ceil(toon.length / 4));
"
```

## ✅ Test Checklist

Before claiming results, verify:

- [ ] Parser correctly extracts classes and functions
- [ ] L1/L2/L3 outputs are valid TOON format
- [ ] Token counts are accurate (use real tokenizer)
- [ ] LLM comprehension is tested on multiple models
- [ ] Baselines are implemented correctly
- [ ] Statistical significance is calculated
- [ ] Edge cases are handled (empty files, syntax errors)
- [ ] Tests are reproducible (seed random state, version pins)

## 📈 Example Benchmark Results

Here's what you might expect to see (hypothetical):

### Token Efficiency

| Method | Avg Tokens | Reduction | Std Dev |
|--------|-----------|-----------|---------|
| Full-file | 8,430 | - | ±2,150 |
| RAG (k=3) | 4,220 | 50% | ±980 |
| AST-JSON | 12,340 | -46% | ±3,200 |
| **CodeLens L1** | **1,250** | **85%** | ±320 |
| **CodeLens L2** | **3,680** | **56%** | ±890 |
| **CodeLens L3** | **5,120** | **39%** | ±1,240 |

### Comprehension Accuracy

| Method | Structure | Relationships | Metrics | Semantic | Overall |
|--------|-----------|---------------|---------|----------|---------|
| Full-file | 98% | 92% | 95% | 88% | 93% |
| RAG (k=3) | 85% | 76% | 72% | 80% | 78% |
| AST-JSON | 82% | 68% | 88% | 45% | 71% |
| **CodeLens L1** | **72%** | **58%** | **85%** | **52%** | **67%** |
| **CodeLens L2** | **95%** | **82%** | **92%** | **78%** | **87%** |
| **CodeLens L3** | **97%** | **89%** | **94%** | **85%** | **91%** |

### Cost-Benefit Analysis

| Method | Cost/Query | Accuracy | Cost-Efficiency |
|--------|-----------|----------|-----------------|
| Full-file | $0.126 | 93% | 7.38 acc/$ |
| RAG (k=3) | $0.063 | 78% | 12.38 acc/$ |
| **CodeLens L2** | **$0.055** | **87%** | **15.82 acc/$** |

**Finding:** CodeLens L2 provides the best cost-efficiency (accuracy per dollar).

## 📝 Reporting Results

When writing up results:

### Tables

```markdown
### Token Efficiency Comparison

| Format | Tokens | vs Full-File | vs JSON |
|--------|--------|--------------|---------|
| Full-file | 8,430 | - | - |
| JSON (compact) | 10,250 | +21.6% | - |
| **TOON L2** | **3,680** | **-56.3%** | **-64.1%** |
```

### Visualizations

Create graphs showing:
1. Token count comparison (bar chart)
2. Accuracy vs token cost (scatter plot)
3. Cost-efficiency (accuracy/$ bar chart)
4. Question-type breakdown (stacked bar chart)

### Statistical Tests

```python
from scipy import stats

# T-test comparing CodeLens L2 vs RAG
t_stat, p_value = stats.ttest_ind(codelens_l2_accuracy, rag_accuracy)

if p_value < 0.05:
    print(f"CodeLens L2 is significantly better (p={p_value:.4f})")
```

## 🎓 Research Questions to Answer

Use your tests to answer:

1. **RQ1:** How much token reduction does hierarchical analysis achieve?
   - Measure: Token counts across levels and baselines

2. **RQ2:** What is the accuracy trade-off?
   - Measure: LLM comprehension accuracy on benchmark questions

3. **RQ3:** Which analysis level is optimal?
   - Measure: Accuracy vs token cost for L1, L2, L3

4. **RQ4:** Does TOON format improve over JSON?
   - Measure: TOON vs JSON for same data

5. **RQ5:** What types of questions benefit most?
   - Measure: Accuracy breakdown by question category

## 🚀 Next Steps

After testing:

1. **Collect data** from multiple projects
2. **Analyze results** statistically
3. **Write paper** with findings
4. **Create visualizations** for presentation
5. **Publish** to arxiv/workshop
6. **Share** prototype on GitHub

---

**Happy testing! 🧪**

For questions or issues, refer to the main [README.md](README.md) or [RESEARCH_ANALYSIS.md](../RESEARCH_ANALYSIS.md).
