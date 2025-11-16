# TOON-AST Research Proposal: Critical Analysis & Recommendations

## Executive Summary

After thoroughly analyzing the TOON codebase and your proposed TOON-AST research project, I've identified several **fundamental misalignments** between what TOON actually is and how the proposal intends to use it. However, the core insight—**applying TOON's principles to code representation**—has significant potential if redirected appropriately.

**Bottom Line**: The original proposal has conceptual flaws, but I'll present **3 better alternatives** that are more achievable, publishable, and build on TOON's actual strengths.

---

## 🔍 Understanding TOON (What It Actually Is)

### Core Facts

1. **TOON is a data serialization format** - It's an alternative to JSON/YAML/CSV for representing structured data
2. **NOT a parsing tool** - TOON doesn't parse anything; it encodes/decodes data structures
3. **Optimized for uniform arrays** - Best for tabular data (e.g., database results, API responses)
4. **Token efficiency focus** - 30-60% fewer tokens than JSON for uniform data
5. **No Tree-sitter** - TOON doesn't use Tree-sitter or any AST parsing; it works with plain JavaScript objects

### What TOON Does

```typescript
// Input: JavaScript object
const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
}

// Output: TOON format (compact serialization)
encode(data)
// users[2]{id,name,role}:
//   1,Alice,admin
//   2,Bob,user
```

### What TOON Does NOT Do

- ❌ Parse code files
- ❌ Analyze ASTs
- ❌ Extract code structure
- ❌ Generate summaries
- ❌ Build dependency graphs

---

## ❌ Critical Flaws in Original Proposal

### Flaw #1: Misunderstanding TOON's Purpose

**The Proposal Says:**
> "Fork TOON's codebase and create `toon-ast`"
> "Use Tree-sitter (like TOON uses for parsing) to parse code"

**Reality:**
- TOON is a **data format**, not a code analysis tool
- TOON doesn't use Tree-sitter anywhere in its codebase
- Forking TOON to build a code analyzer is like forking JSON to build a compiler

**Impact:** The proposed architecture doesn't make sense. You'd be building a completely different tool.

### Flaw #2: Naming Confusion

**The Proposal:** "TOON-AST: Hierarchical Code Summarization"

**Problem:**
- The name suggests TOON is being extended to ASTs
- In reality, you'd be building a code analyzer that *outputs* TOON
- This creates confusion about what TOON is

**Better Framing:** "CodeMap: A code analysis tool that outputs structured data in TOON format"

### Flaw #3: Misaligned Value Proposition

**The Proposal:**
> "TOON compresses data tables. You'll compress code structure using the same principles."

**Problem:**
- TOON excels at **uniform data** (same fields, repeated rows)
- Code structure is **inherently non-uniform** (different functions, classes, signatures)
- TOON's tabular format won't provide significant compression for code metadata

**Example:**
```toon
# This works well (uniform data):
functions[100]{name,loc,complexity}:
  login,45,12
  logout,23,5
  validateUser,67,18

# This doesn't work well (non-uniform):
classes[3]:
  - name: AuthService
    methods[5]{name,params,returns}:
      login,2,Promise<User>
      logout,0,void
  - name: Database
    methods[2]{name,params,returns}:
      connect,1,void
```

Code metadata is often nested and variable, which reduces TOON's compression benefits.

### Flaw #4: Research Novelty Concerns

**The Proposal:** "Extending TOON to code compression"

**Problem:**
- The actual research contribution is about **code summarization/RAG**, not format design
- Using TOON as output format is an implementation detail
- Reviewers may question: "Why not just use JSON? What does TOON add?"

**Better Angle:** Focus on the code analysis methodology, use TOON as evidence of token efficiency

---

## ✅ Three Better Research Directions

I've designed three alternatives that are achievable, novel, and properly aligned with TOON's strengths:

### Option A: **CodeLens-TOON** (Recommended)
**Tagline:** "Hierarchical Codebase Documentation for LLM Context"

**What it is:**
A tool that analyzes codebases and generates multi-level documentation in TOON format for efficient LLM consumption.

**Why it's better:**
- ✅ Clear separation: Code analysis tool + TOON as output format
- ✅ Plays to TOON's strength: Structured, partially-uniform metadata
- ✅ Immediate utility: Developers can query their codebase efficiently
- ✅ Novel contribution: Hierarchical analysis + token-efficient representation

**Architecture:**
```
┌─────────────────┐
│  Source Code    │
│  (TypeScript,   │
│   Python, Go)   │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Parser  │ (Tree-sitter, babel, etc.)
    └────┬────┘
         │
    ┌────▼─────────┐
    │  Analyzer    │ Extract: modules, classes, functions,
    │              │         dependencies, complexity
    └────┬─────────┘
         │
    ┌────▼─────────┐
    │  Hierarchical│ L1: Project overview
    │  Generator   │ L2: Module/class signatures
    │              │ L3: Function implementations
    └────┬─────────┘
         │
    ┌────▼─────────┐
    │ TOON Encoder │ Serialize to TOON format
    └────┬─────────┘
         │
    ┌────▼─────────┐
    │  Output      │
    │  .toon files │
    └──────────────┘
```

**Example Output (L2 - Module/Class Signatures):**

```toon
project: my-auth-app
language: typescript
totalFiles: 47
totalLOC: 8932

modules[3]{name,path,purpose,loc,exports}:
  auth,src/auth,User authentication and session management,450,5
  api,src/api,REST endpoints and request handling,890,12
  db,src/db,Database models and queries,320,8

classes[5]{module,name,methods,dependencies,complexity}:
  auth,AuthService,7,"UserModel,TokenService,bcrypt",medium
  auth,SessionManager,5,"Redis,TokenService",low
  api,UserController,9,"AuthService,UserModel",medium
  db,UserModel,12,"Sequelize",low
  db,TokenService,4,"jsonwebtoken",low
```

**Research Contribution:**
1. **Methodology:** How to extract hierarchical code structure efficiently
2. **Token optimization:** Demonstrate TOON's advantages for code metadata
3. **Benchmark:** Compare against full-file RAG, chunk-based RAG
4. **Practical tool:** Publishable npm package

**Timeline:** 4-6 weeks (realistic)

---

### Option B: **TOON-Test**
**Tagline:** "Property-Based Test Data Generation in TOON Format"

**What it is:**
A testing library that generates test fixtures and expected outputs in TOON format, making test data more readable and token-efficient for AI-assisted testing.

**Why it's novel:**
- Test frameworks generate verbose JSON fixtures
- TOON format makes test data more readable and LLM-friendly
- Property-based testing + efficient serialization is understudied

**Example:**
```typescript
// Test case definition
test('user authentication flow', async () => {
  const testData = generateTOONFixture('auth-users')
  const result = await authService.login(testData)
  expect(result).toMatchTOONSnapshot()
})
```

**Generated fixture (auth-users.toon):**
```toon
users[100]{id,email,password,role,active}:
  1,alice@example.com,$2a$10$...,admin,true
  2,bob@example.com,$2a$10$...,user,true
  ...
```

**Research Angle:**
- Test data compression for LLM-based test generation
- TOON as interchange format for test oracles
- Token efficiency in test documentation

---

### Option C: **API-TOON**
**Tagline:** "RESTful API Documentation and Mocking in TOON"

**What it is:**
A tool that generates API documentation and mock data in TOON format, optimizing for LLM-based API consumption.

**Why it's useful:**
- API docs (OpenAPI/Swagger) are verbose JSON
- TOON representation is more compact and LLM-readable
- Enables efficient API discovery for AI agents

**Example Output:**
```toon
api: GitHub REST API v3
baseUrl: https://api.github.com

endpoints[5]{method,path,auth,rateLimit}:
  GET,/users/{username},optional,60/hour
  GET,/repos/{owner}/{repo},optional,60/hour
  POST,/repos/{owner}/{repo}/issues,required,5000/hour

responses.users.get{field,type,description}:
  id,integer,Unique user identifier
  login,string,Username
  avatar_url,string,Profile image URL
```

---

## 🎯 Recommended Path Forward: CodeLens-TOON

I recommend **Option A (CodeLens-TOON)** because:

1. ✅ **Achievable in 4-6 weeks**
2. ✅ **Clear research contribution** (hierarchical code analysis + TOON efficiency)
3. ✅ **Practical utility** (developers will actually use it)
4. ✅ **Properly leverages TOON** (as output format, not core functionality)
5. ✅ **Publishable** (workshops, arxiv, npm package)

---

## 📋 Detailed Implementation Plan (CodeLens-TOON)

### Phase 1: Foundation (Week 1)

**Goal:** Build basic code parser and TOON serializer

**Tasks:**
- [ ] Set up TypeScript project with Tree-sitter
- [ ] Implement basic AST parser (start with TypeScript/JavaScript)
- [ ] Create data models for code structure (Module, Class, Function)
- [ ] Implement TOON encoder integration (use existing `@toon-format/toon`)
- [ ] Test on small codebase (10-20 files)

**Deliverable:** CLI tool that generates L1 (project overview) TOON output

### Phase 2: Hierarchical Analysis (Week 2)

**Goal:** Implement L2 (signatures) and L3 (implementations)

**Tasks:**
- [ ] Extract function signatures, parameters, return types
- [ ] Build dependency graph (imports, function calls)
- [ ] Calculate code metrics (LOC, complexity)
- [ ] Implement hierarchical TOON generation (L1, L2, L3)
- [ ] Test on medium codebase (100-500 files)

**Deliverable:** Multi-level TOON output with adjustable depth

### Phase 3: Benchmarking (Week 3-4)

**Goal:** Demonstrate token efficiency and accuracy gains

**Tasks:**
- [ ] Select benchmark tasks (code Q&A, bug localization, API usage)
- [ ] Implement baselines (full files, RAG chunks, AST-JSON)
- [ ] Run LLM evaluations (Claude, GPT-4, etc.)
- [ ] Collect metrics (tokens, accuracy, cost, latency)
- [ ] Create visualizations and comparison tables

**Deliverable:** Benchmark results showing TOON advantages

### Phase 4: Polish & Documentation (Week 5-6)

**Goal:** Make it publishable and usable

**Tasks:**
- [ ] Write comprehensive README with examples
- [ ] Create demo repository with sample outputs
- [ ] Add support for Python, Go (multi-language)
- [ ] Write research paper draft (arxiv format)
- [ ] Create blog post and demo video
- [ ] Publish npm package

**Deliverable:** Published tool + research paper draft

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('CodeLens-TOON', () => {
  test('parses TypeScript file and extracts classes', () => {
    const code = `class AuthService { login() {} }`
    const result = parseFile(code, 'typescript')
    expect(result.classes).toHaveLength(1)
    expect(result.classes[0].name).toBe('AuthService')
  })

  test('generates L1 TOON output', () => {
    const metadata = { modules: [...], classes: [...] }
    const toon = generateL1(metadata)
    expect(toon).toContain('modules[')
    expect(toon).toContain('{name,path,loc}')
  })
})
```

### Integration Tests
```typescript
test('end-to-end: analyze real codebase', async () => {
  const result = await analyzeCodebase('./test-fixtures/sample-project')
  expect(result.levels).toHaveLength(3) // L1, L2, L3
  expect(result.tokenCount).toBeLessThan(expectedTokens * 0.5)
})
```

### Benchmark Tests
```typescript
test('benchmark: token efficiency vs JSON', () => {
  const sampleCode = loadFixture('large-codebase')
  const toonOutput = generateTOON(sampleCode)
  const jsonOutput = generateJSON(sampleCode)

  const toonTokens = countTokens(toonOutput)
  const jsonTokens = countTokens(jsonOutput)

  expect(toonTokens).toBeLessThan(jsonTokens * 0.7) // 30%+ savings
})
```

---

## 📦 Project Structure

```
codelens-toon/
├── src/
│   ├── parsers/
│   │   ├── typescript.ts    # Tree-sitter TypeScript parser
│   │   ├── python.ts        # Tree-sitter Python parser
│   │   └── index.ts
│   ├── analyzers/
│   │   ├── modules.ts       # Module-level analysis
│   │   ├── classes.ts       # Class extraction
│   │   ├── functions.ts     # Function signatures
│   │   └── dependencies.ts  # Dependency graph
│   ├── generators/
│   │   ├── l1-overview.ts   # Project overview generator
│   │   ├── l2-signatures.ts # Signature-level generator
│   │   └── l3-impl.ts       # Implementation-level generator
│   ├── encoders/
│   │   └── toon.ts          # TOON format encoder (uses @toon-format/toon)
│   ├── cli.ts               # Command-line interface
│   └── index.ts
├── tests/
│   ├── fixtures/            # Sample codebases for testing
│   ├── parsers.test.ts
│   ├── analyzers.test.ts
│   └── integration.test.ts
├── benchmarks/
│   ├── datasets/            # Code Q&A datasets
│   ├── baselines/           # Full-file, RAG, AST-JSON
│   └── evaluate.ts
├── examples/                # Example outputs
│   ├── express-app/
│   ├── react-component/
│   └── python-service/
├── package.json
├── tsconfig.json
├── README.md
└── RESEARCH.md             # Research methodology and results
```

---

## 🚀 Getting Started (What to Build First)

I recommend building a **minimal working prototype** in the next 2-3 days:

### Prototype Scope

**Input:** Single TypeScript file
**Output:** L1 TOON representation
**Features:**
- Parse file with Tree-sitter
- Extract: classes, functions, LOC
- Serialize to TOON using `@toon-format/toon`

### Example Code

```typescript
// src/prototype.ts
import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import { encode } from '@toon-format/toon'
import fs from 'fs'

interface FunctionInfo {
  name: string
  loc: number
  params: number
}

function analyzeTypeScriptFile(filePath: string) {
  const parser = new Parser()
  parser.setLanguage(TypeScript.typescript)

  const sourceCode = fs.readFileSync(filePath, 'utf-8')
  const tree = parser.parse(sourceCode)

  const functions: FunctionInfo[] = []

  // Walk the tree and extract functions
  const cursor = tree.walk()

  function visit(node: Parser.SyntaxNode) {
    if (node.type === 'function_declaration') {
      const nameNode = node.childForFieldName('name')
      const paramsNode = node.childForFieldName('parameters')

      functions.push({
        name: nameNode?.text || 'anonymous',
        loc: node.endPosition.row - node.startPosition.row + 1,
        params: paramsNode?.namedChildCount || 0
      })
    }

    for (const child of node.children) {
      visit(child)
    }
  }

  visit(tree.rootNode)

  return { functions }
}

// Generate TOON output
const result = analyzeTypeScriptFile('./sample.ts')
const toon = encode({ functions: result.functions })

console.log(toon)
// Output:
// functions[5]{name,loc,params}:
//   login,12,2
//   logout,5,0
//   validateUser,8,1
```

---

## 🎓 Research Paper Outline

**Title:** "CodeLens: Hierarchical Codebase Representation for Token-Efficient LLM Context"

**Abstract:**
> Large Language Models (LLMs) are increasingly used for code understanding tasks, but context window limitations and token costs remain significant challenges. We present CodeLens, a tool that generates hierarchical codebase representations in TOON (Token-Oriented Object Notation) format, achieving 40-65% token reduction compared to full-file inclusion while maintaining or improving task accuracy. Our evaluation on code Q&A, bug localization, and API discovery tasks demonstrates that structured, level-aware code representation outperforms both full-file and RAG-based approaches.

**Sections:**
1. Introduction
   - LLM context costs and limitations
   - Existing approaches (full-file, RAG, AST-JSON)
   - Our contribution: Hierarchical analysis + TOON serialization

2. Related Work
   - Code summarization techniques
   - LLM-based code understanding
   - Data serialization formats (TOON, JSON, YAML)

3. Method
   - CodeLens architecture
   - Hierarchical analysis (L1, L2, L3)
   - TOON encoding strategy
   - Multi-language support

4. Experimental Setup
   - Benchmark tasks and datasets
   - Baselines and metrics
   - LLM models evaluated

5. Results
   - Token efficiency analysis
   - Task accuracy comparison
   - Cost-benefit analysis
   - Qualitative examples

6. Discussion
   - When to use each level (L1 vs L2 vs L3)
   - Limitations (non-uniform code, deeply nested)
   - Future work (incremental updates, IDE integration)

7. Conclusion

**Target Venues:**
- ICSE Workshop on Natural Language-based Software Engineering (NLBSE)
- ArXiv (immediate publication)
- Mining Software Repositories (MSR)
- Conference on Software Maintenance and Evolution (ICSME)

---

## 💡 Key Success Factors

1. **Start small:** Single language, simple analysis, working prototype in Week 1
2. **Iterate quickly:** Get feedback early, adjust based on real usage
3. **Measure everything:** Token counts, accuracy, cost, latency
4. **Make it useful:** Developers should want to use this for their own projects
5. **Document thoroughly:** README, examples, research paper, blog post

---

## ❓ FAQ

### Q: Why not just fork TOON and extend it?

**A:** TOON is a data serialization library. Adding code analysis to it would be like adding HTTP server functionality to JSON. They're orthogonal concerns. Instead, build a code analyzer that *uses* TOON for output.

### Q: Is TOON really the best output format?

**A:** For uniform metadata (function lists, dependency tables), yes. For deeply nested code structures, JSON-compact might be better. The research will benchmark both.

### Q: Can this be done in 4-6 weeks?

**A:** Yes, if scoped properly:
- Week 1: Basic parser + TOON encoder
- Week 2: Hierarchical generation
- Week 3-4: Benchmarking
- Week 5-6: Polish + paper

### Q: What if I want to support Python/Go/Rust?

**A:** Start with TypeScript/JavaScript (most Tree-sitter support). Add other languages incrementally. Multi-language support is a nice-to-have, not critical for initial publication.

---

## 🎯 Next Steps

**Option 1: Build the Prototype (Recommended)**
I can help you build the minimal working prototype right now. We'll:
1. Set up the project structure
2. Implement basic TypeScript parser
3. Integrate TOON encoder
4. Generate example output
5. Create testing guide

**Option 2: Refine the Plan**
If you want to adjust the scope or explore alternatives (TOON-Test, API-TOON), I can help design those in detail.

**Option 3: Start with Paper Draft**
Write the introduction and related work sections first to clarify the research contribution, then build the tool.

---

**What would you like to do?**

I recommend Option 1 - let's build a working prototype that you can test and iterate on. This gives you something concrete to demo and validate the idea quickly.
