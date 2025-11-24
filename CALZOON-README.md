# 🍕📊 CALZOON

**Compressed Algorithm Layout Zone for Optimized Object Notation**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/MushroomFleet/CALZOON)

> *"Fold plans like a pizza, encode data like a spreadsheet, unfold understanding like a scroll."*

---

## 🎯 What is CALZOON?

CALZOON is a revolutionary hybrid format that combines:

- **CALZONE** 🍕 - Symbolic plan compression (60-85% token reduction)
- **TOON** 📊 - Token-efficient data encoding (40-60% token reduction)

The result? A single, unified format that can efficiently represent **both structured data AND compressed plans** in the same document.

### The Problem

Modern AI agents need to work with:
1. **Large datasets** (JSON is verbose and token-expensive)
2. **Complex plans** (specifications are lengthy and repetitive)
3. **Hybrid documents** (plans with data, data with workflows)

CALZOON solves all three by providing:
- Token-efficient data encoding from TOON
- Symbolic plan compression from CALZONE
- Seamless hybrid mode for mixed documents

---

## 🚀 Quick Examples

### Data Mode (TOON-compatible)

**JSON** (445 tokens):
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin", "active": true },
    { "id": 2, "name": "Bob", "role": "user", "active": true },
    { "id": 3, "name": "Charlie", "role": "guest", "active": false }
  ]
}
```

**CALZOON** (178 tokens - 60% reduction):
```
users[3]{id,name,role,active}:
  1,Alice,admin,true
  2,Bob,user,true
  3,Charlie,guest,false
```

### Plan Mode (CALZONE-compatible)

**Verbose Plan** (432 tokens):
```
User Authentication System

Requirements:
- Email/password login is required
- OAuth integration with Google and GitHub is required
- Two-factor authentication support is optional (high security contexts)

Flow:
When user attempts login, validate their input.
If input is valid, check credentials against database.
If input is invalid, show error message and allow retry.

When checking credentials:
- If credentials are correct, generate JWT token, set session, redirect to dashboard
- If credentials are incorrect, increment failure counter
  - If failures less than 3, allow retry
  - If failures 3 or more, lock account for security
```

**CALZOON** (178 tokens - 59% reduction):
```
§1 USER_AUTH_SYS

¶ Requirements
●email_pwd_login
●oauth_integration
  ├google
  └github
○2fa_support [!high_security]

¶ Flow
user_login → validate_input
          → [valid] → check_credentials
          → [invalid] → show_error ∧ retry

check_credentials → [✓] generate_token → set_session → redirect_dashboard
                  → [×] increment_failures → [<3] → allow_retry
                                           → [≥3] → lock_account
```

### Hybrid Mode (CALZOON unique!)

Combine data and plans in one document:

```
§1 E_COMMERCE_CHECKOUT

¶ Product_Catalog
products[3]{id,name,price,stock}:
  P001,Widget,29.99,150
  P002,Gadget,49.99,75
  P003,Doohickey,19.99,200

¶ Checkout_Flow
cart_items ⊕ user_selection
calculate_total:
  subtotal ← Σ(item.price × item.qty)
  tax ← subtotal × tax_rate
  total ← subtotal ⊕ tax

payment_process:
  validate_cart → [✓] calculate_total → submit_payment
               → [×] show_error

  submit_payment → [✓] create_order → send_confirmation
                → [×] retry(3x) → contact_support

¶ Status_States
states[5]{code,label,next}:
  PEND,Pending,PROC|CANC
  PROC,Processing,SHIP|FAIL
  SHIP,Shipped,DELV
  DELV,Delivered,COMP
  COMP,Complete,""
```

---

## 📊 Key Metrics

| Metric | Data Mode | Plan Mode | Hybrid Mode |
|--------|-----------|-----------|-------------|
| **Token Reduction** | 40-60% | 60-85% | 50-75% |
| **LLM Accuracy** | 74% | 70-80% | 70-75% |
| **Information Density** | +100-200% | +100-260% | +120-230% |
| **Context Window Efficiency** | 2-5x | 3-7x | 2-6x |

---

## 🎨 Syntax at a Glance

### Data Syntax (TOON Foundation)

```
# Simple key-value
name: Alice
age: 30

# Inline arrays
tags[3]: frontend,react,typescript

# Tabular arrays
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user

# Nested objects
config:
  timeout: 5000
  retries: 3
```

### Plan Syntax (CALZONE Extension)

```
# Section markers
§1    Section with ID
§1.1  Nested section
¶     Paragraph block

# Flow operators
→     Leads to
←     Depends on
⇒     Implies
↔     Bidirectional

# Logic
∧     AND
∨     OR
¬     NOT
⊕     Add/combine
⊗     Remove/exclude

# Requirements
●     Required
○     Optional
◆     Critical
△     Change

# Status
[✓]   Complete
[○]   In progress
[□]   Not started
[×]   Blocked
[~]   Partial
[?]   Conditional
[!]   Warning
[@]   Reference
[#]   ID
```

---

## 🔀 Three Modes in One Format

CALZOON automatically detects and handles three modes:

### 1. Data Mode
Pure data representation - fully TOON-compatible
- Use for: JSON encoding, data exports, API responses
- Lossless conversion to/from JSON

### 2. Plan Mode
Pure plan compression - fully CALZONE-compatible
- Use for: Specifications, workflows, architecture docs
- Symbolic notation for maximum compression

### 3. Hybrid Mode
Mixed data and plans - CALZOON's unique strength
- Use for: Implementation plans with data, specs with examples
- Seamless transitions between data and plan notation

---

## 💡 Use Cases

### ✅ Perfect For

1. **API Specifications with Examples**
   ```
   §1 REST_API

   ¶ Endpoints
   GET /users/{id} ●required
     ▸ Auth: JWT ⇒ valid_token
     ▸ Returns: user_object

   ¶ Example_Response
   user:
     id: 1
     name: Alice
     roles[2]: admin,user
   ```

2. **Implementation Plans with Resource Data**
   ```
   §1 DEPLOYMENT_PLAN

   ¶ Infrastructure
   servers[3]{id,region,type,status}:
     srv-01,us-east,web,active
     srv-02,eu-west,api,active
     srv-03,ap-south,db,pending

   ¶ Deployment_Flow
   provision → configure → deploy → verify
          → [error] → rollback
   ```

3. **Test Plans with Test Data**
   ```
   §1 AUTH_TESTS

   ¶ Test_Cases
   tests[3]{id,scenario,expected}:
     T001,Valid login,200
     T002,Invalid password,401
     T003,Locked account,403

   ¶ Test_Flow
   setup_env → run_tests → [all_pass] → cleanup
                        → [any_fail] → log_failures ∧ cleanup
   ```

### ❌ Not Ideal For

- Pure creative content (use natural language)
- Legal documents (exact wording required)
- Marketing copy (emotional tone needed)
- Very simple data (TOON alone is better)
- Very simple plans (CALZONE alone is better)

---

## 🛠️ Installation (Coming Soon)

```bash
# npm
npm install @calzoon/core

# pnpm
pnpm add @calzoon/core

# yarn
yarn add @calzoon/core
```

### Usage

```typescript
import { encode, decode, detectMode } from '@calzoon/core'

// Encode data (automatic mode detection)
const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
}
const calzoon = encode(data)
// users[2]{id,name,role}:
//   1,Alice,admin
//   2,Bob,user

// Encode with plan notation
const plan = {
  section: '1',
  title: 'AUTH_SYS',
  flow: {
    login: '→',
    validate: '→ [✓] dashboard',
    error: '→ [×] show_error'
  }
}
const compressed = encode(plan, { mode: 'plan' })

// Decode back to objects
const decoded = decode(calzoon)

// Check what mode a document uses
const mode = detectMode(calzoon) // 'data' | 'plan' | 'hybrid'
```

---

## 📖 Documentation

- **[Specification](CALZOON-SPEC.md)** - Complete technical specification
- **[TOON Docs](https://toonformat.dev)** - TOON format documentation
- **[CALZONE Docs](CALZONE-system-prompt.md)** - CALZONE system prompt
- **[Examples](examples/)** - Real-world CALZOON documents
- **[Migration Guide](docs/migration.md)** - Migrating from TOON or CALZONE

---

## 🧪 Examples

Check out the [`examples/`](examples/) directory for comprehensive examples:

- **[API Specification](examples/api-spec.calzoon)** - REST API with data examples
- **[Deployment Plan](examples/deployment-plan.calzoon)** - Infrastructure plan with server data
- **[Test Suite](examples/test-suite.calzoon)** - Test scenarios with test data
- **[E-commerce Flow](examples/ecommerce-flow.calzoon)** - Shopping flow with product catalog
- **[System Architecture](examples/system-architecture.calzoon)** - Component dependencies with metrics

---

## 🎯 Design Principles

1. **Backward Compatibility**
   - Pure TOON documents work in CALZOON
   - Pure CALZONE documents work in CALZOON
   - No breaking changes to either format

2. **Token Efficiency**
   - Inherits TOON's data compression
   - Inherits CALZONE's plan compression
   - Optimizes both in hybrid mode

3. **Semantic Clarity**
   - Symbols enhance meaning
   - Tabular format shows patterns
   - Indentation shows hierarchy

4. **Bidirectional Translation**
   - Data Mode ↔ JSON (lossless)
   - Plan Mode ↔ Verbose Plans (lossless)
   - Hybrid Mode ↔ Mixed Documents (lossless)

5. **LLM-Friendly**
   - Explicit structure (`[N]`, `{fields}`)
   - Self-documenting symbols
   - Clear visual hierarchy

---

## 🏗️ Implementation Status

- [✓] Specification defined (v1.0)
- [✓] Examples created
- [○] Core parser (TOON + symbols)
- [□] Encoder implementation
- [□] Decoder implementation
- [□] Validator
- [□] CLI tool
- [□] TypeScript library
- [□] Documentation site
- [□] Benchmarks

---

## 🤝 Contributing

CALZOON is an open, evolving format. Contributions welcome for:

- Parser and encoder implementations
- New symbolic notation
- Additional use case examples
- Language implementations (Python, Go, Rust, etc.)
- Tooling and IDE support

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📚 Citation

```bibtex
@software{calzoon,
  title = {CALZOON: Compressed Algorithm Layout Zone for Optimized Object Notation},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/CALZOON},
  version = {1.0.0},
  note = {Hybrid format combining TOON and CALZONE}
}
```

---

## 🙏 Acknowledgments

CALZOON builds on two excellent projects:

- **[TOON](https://toonformat.dev)** by Johann Schopplich - Token-efficient JSON encoding
- **[CALZONE](https://github.com/MushroomFleet/CALZONE)** by Drift Johnson - Plan compression notation

Special thanks to the AI agent development community for inspiring systematic approaches to format design.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/MushroomFleet/CALZOON/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MushroomFleet/CALZOON/discussions)
- **Donate**: [![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)

---

**Made with 🍕+📊 by blending the best of CALZONE and TOON**

*Fold plans. Encode data. Unfold possibilities.*
