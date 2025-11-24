# CALZOON Specification v1.0

**Compressed Algorithm Layout Zone for Optimized Object Notation**

A hybrid format combining TOON's token-efficient data encoding with CALZONE's symbolic plan compression.

---

## 🎯 Overview

CALZOON is a unified format that bridges two worlds:

1. **Data Representation** (TOON foundation): Token-efficient encoding of JSON data with tabular arrays
2. **Plan Compression** (CALZONE extension): Symbolic notation for plans, specifications, and workflows

The result is a single format that can efficiently represent both structured data AND compressed plans, with seamless transitions between modes.

---

## 🏗️ Architecture

CALZOON operates in three modes:

### 1. Data Mode (TOON-compatible)
Pure data representation using TOON's syntax:
```
users[3]{id,name,role}:
  1,Alice,admin
  2,Bob,user
  3,Charlie,guest
```

### 2. Plan Mode (CALZONE-compatible)
Compressed plans using symbolic notation:
```
§1 AUTH_FLOW
¶ Login
  user_input → validate_creds
  validate_creds → [✓] load_dashboard
                 → [×] show_error
```

### 3. Hybrid Mode (CALZOON unique)
Plans with embedded data and data with embedded plans:
```
§1 DEPLOYMENT_PLAN
¶ Infrastructure
  regions[3]: us-east,eu-west,ap-south

  servers[3]{id,region,status}:
    srv-001,us-east,active
    srv-002,eu-west,active
    srv-003,ap-south,pending

  deployment_flow:
    provision → [✓] configure → [✓] deploy → [✓] verify
              → [×] rollback ← [error_detected]
```

---

## 📖 Core Syntax

### TOON Foundation (Data Layer)

#### Objects
```
name: Alice
age: 30
active: true
```

#### Arrays (Inline Primitives)
```
tags[3]: backend,api,nodejs
```

#### Arrays (Tabular Objects)
```
employees[2]{id,name,dept}:
  1,Alice,Engineering
  2,Bob,Sales
```

#### Arrays (Expanded)
```
items[2]:
  - id: 1
    name: Widget
  - id: 2
    name: Gadget
```

### CALZONE Extension (Semantic Layer)

#### Section Markers
```
§1   Section with numeric ID
§2.1 Nested section
¶    Paragraph/block marker
```

#### Flow Operators
```
→    Leads to, transforms to, results in
←    Depends on, derives from
⇒    Implies, requires
↔    Bidirectional relationship
```

#### Logic Operators
```
∧    AND condition
∨    OR condition
¬    NOT, negation
⊕    Add, include, combine
⊗    Remove, exclude, subtract
≡    Equivalent to
∴    Therefore, conclusion
∵    Because, reason
```

#### Requirement Indicators
```
●    Required item
○    Optional item
◆    Critical item, milestone
△    Change, delta, modification
```

#### Status Indicators
```
[✓]  Complete
[○]  In progress
[□]  Not started
[×]  Blocked
[~]  Partially complete
[?]  Needs clarification/conditional
[!]  Warning, critical note
[@]  Reference to external item
[#]  Numbered identifier
```

#### Structural Elements
```
├    Branch item
└    Terminal branch item
│    Continuation
▸    Sub-item
»    Further nested
```

---

## 🔀 Mode Detection

CALZOON parsers automatically detect the mode based on content:

### Data Mode Indicators
- Starts with key-value pairs or arrays
- Uses TOON array headers `[N]` or `[N]{fields}`
- No section markers (§, ¶)
- Minimal symbolic notation

### Plan Mode Indicators
- Contains section markers (§, ¶)
- Uses flow operators (→, ←, ⇒)
- Contains requirement indicators (●, ○, ◆)
- Status indicators present ([✓], [×], etc.)

### Hybrid Mode Indicators
- Contains both TOON arrays AND section markers
- Mixes tabular data with flow notation
- Embeds data within plan sections

---

## 📋 Examples

### Example 1: Pure Data Mode
```
context:
  task: Deployment metrics
  environment: production
  date: 2025-11-24

metrics[4]{timestamp,requests,errors,latency}:
  10:00,1250,3,45.2
  10:15,1340,1,43.8
  10:30,1180,0,42.1
  10:45,1420,2,46.5
```

### Example 2: Pure Plan Mode
```
§1 USER_AUTH_SYS

¶ Requirements
●email_pwd_login
●oauth_integration
  ├google
  ├github
  └microsoft
○2fa_support [!high_security]

¶ Flow
user_login → validate_input
          → [input_valid] → check_credentials
          → [input_invalid] → show_error ∧ retry

check_credentials → [✓] generate_token → set_session → redirect_dashboard
                  → [×] increment_failures → [failures<3] → allow_retry
                                           → [failures≥3] → lock_account
```

### Example 3: Hybrid Mode
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
  validate_cart → [✓] calculate_total
               → [×] show_error

  calculate_total → submit_payment
  submit_payment → [✓] create_order → send_confirmation
                → [×] retry(3x) → [still_failing] → contact_support

¶ Order_Status_Map
statuses[5]{code,label,next_states}:
  PEND,Pending,"PROC|CANC"
  PROC,Processing,"SHIP|FAIL"
  SHIP,Shipped,DELV
  DELV,Delivered,COMP
  COMP,Complete,""
```

### Example 4: Implementation Plan with Dependencies
```
§1 API_IMPLEMENTATION

¶ Phase_1_Foundation [#1]
timeline: 2025-11-24 → 2025-11-30

tasks[4]{id,task,status,owner}:
  T001,Setup project structure,[✓],Alice
  T002,Configure database,[○],Bob
  T003,Setup auth middleware,[□],Alice
  T004,Write API docs,[□],Charlie

dependencies:
  T002 ← T001
  T003 ← T002
  T004 ← (T002 ∧ T003)

¶ Phase_2_Core_Features [#2] [@depends #1]
api_endpoints:
  POST /auth/login ●required
    ▸ validates credentials
    ▸ generates JWT token
    ▸ returns user profile

  GET /users/{id} ●required
    ▸ requires auth ⇒ JWT_valid
    ▸ returns user data

  PUT /users/{id} ○optional
    ▸ requires auth ∧ (owner ∨ admin)
    ▸ validates payload
    ▸ updates user ∴ returns updated_data

error_handling:
  validation_err → 400 ∧ error_details
  auth_err → 401 ∧ www_authenticate
  forbidden → 403 ∧ reason
  not_found → 404 ∧ resource_id
  server_err → 500 ∧ error_log
```

---

## 🎨 Design Principles

### 1. **Backward Compatibility**
- Pure TOON documents remain valid CALZOON (Data Mode)
- Pure CALZONE documents remain valid CALZOON (Plan Mode)
- No breaking changes to either format

### 2. **Token Efficiency**
- Inherit TOON's ~40-60% token reduction for data
- Inherit CALZONE's ~60-85% token reduction for plans
- Hybrid documents optimize both aspects

### 3. **Semantic Clarity**
- Symbolic notation enhances meaning without verbosity
- Tabular format makes data patterns obvious
- Consistent indentation shows hierarchy

### 4. **Bidirectional Translation**
- Data Mode ↔ JSON (lossless via TOON)
- Plan Mode ↔ Verbose Plans (lossless via CALZONE)
- Hybrid Mode ↔ Mixed Documents (lossless via CALZOON)

### 5. **LLM-Friendly**
- Explicit structure with `[N]` lengths and `{fields}` headers
- Self-documenting symbolic notation
- Clear visual hierarchy through indentation

---

## 🔧 Implementation Strategy

### Phase 1: Core Parser (Extend TOON)
1. Parse TOON syntax (already implemented)
2. Recognize CALZONE symbols as special values
3. Detect mode based on content patterns

### Phase 2: Semantic Layer
1. Symbol recognition and validation
2. Flow diagram construction
3. Dependency graph building

### Phase 3: Encoder Extension
1. Extend TOON encoder with symbol support
2. Add section marker formatting
3. Implement hybrid mode layout

### Phase 4: Validator
1. Validate array lengths and field counts (TOON)
2. Validate symbol usage (CALZONE)
3. Check cross-references and dependencies

---

## 📏 Grammar Rules

### Token Precedence (from highest to lowest)
1. **Section markers**: `§`, `¶` (always semantic)
2. **Array headers**: `[N]`, `[N]{fields}` (TOON syntax)
3. **Status indicators**: `[✓]`, `[×]`, `[!]`, etc. (in flow contexts)
4. **Flow operators**: `→`, `←`, `⇒`, `↔` (in flow contexts)
5. **Logic operators**: `∧`, `∨`, `¬`, `⊕`, `⊗` (in expression contexts)
6. **Requirement markers**: `●`, `○`, `◆`, `△` (prefix markers)
7. **Tree branches**: `├`, `└`, `│`, `▸`, `»` (prefix markers)

### Context-Sensitive Parsing
```
# Array header (TOON) - has colon
items[3]: value1,value2,value3

# Status indicator (CALZONE) - no colon, in flow
process → [✓] success_path
       → [×] failure_path

# Array with length (TOON) - explicit length
users[2]{id,name}:
  1,Alice
  2,Bob

# Conditional (CALZONE) - no length, no fields
validate_input → [valid] → proceed
              → [invalid] → retry
```

---

## 🧪 Validation Rules

### Data Mode Validation (TOON)
- ✓ Array lengths match declared `[N]`
- ✓ Tabular rows have correct field counts
- ✓ Indentation is consistent
- ✓ Delimiters are uniform within arrays

### Plan Mode Validation (CALZONE)
- ✓ Section markers are properly nested (§1, §1.1, §1.2, §2)
- ✓ Flow operators form valid directed graphs
- ✓ Status indicators use recognized symbols
- ✓ Cross-references point to valid sections

### Hybrid Mode Validation (CALZOON)
- ✓ All Data Mode rules within data sections
- ✓ All Plan Mode rules within plan sections
- ✓ Clean transitions between modes
- ✓ References between data and plans are valid

---

## 🎯 Use Cases

### ✅ Ideal for CALZOON

1. **API Specifications with Examples**
   - Endpoints defined with CALZONE notation
   - Request/response examples as TOON tables

2. **Implementation Plans with Data**
   - Phased plans with CALZONE flows
   - Resource allocations as TOON tables

3. **System Architecture with Metrics**
   - Component dependencies with CALZONE
   - Performance data as TOON tables

4. **Test Plans with Test Data**
   - Test scenarios with CALZONE notation
   - Test cases and expected results as TOON tables

5. **Deployment Plans with Configurations**
   - Deployment flows with CALZONE
   - Server configs and inventory as TOON tables

### ❌ Not Ideal for CALZOON

1. **Pure Creative Content** - Use natural language
2. **Legal Documents** - Require exact wording
3. **Marketing Copy** - Needs emotional tone
4. **Simple JSON** - TOON alone is sufficient
5. **Simple Plans** - CALZONE alone is sufficient

---

## 📊 Metrics

### Expected Token Savings
- **Data Mode**: 40-60% vs JSON (TOON baseline)
- **Plan Mode**: 60-85% vs verbose plans (CALZONE baseline)
- **Hybrid Mode**: 50-75% vs mixed documents (compound savings)

### Expected Accuracy
- **Data Mode**: 74% LLM accuracy (TOON benchmark)
- **Plan Mode**: Expected 70-80% plan comprehension
- **Hybrid Mode**: Expected 70-75% mixed comprehension

---

## 📄 File Extension and Media Type

- **File Extension**: `.calzoon`
- **Media Type**: `text/calzoon; charset=utf-8`
- **Fallback Extensions**:
  - `.toon` for data-heavy documents
  - `.calzone` for plan-heavy documents

---

## 🔄 Version

**Version**: 1.0.0
**Date**: 2025-11-24
**Status**: Draft Specification

---

## 📚 References

- [TOON Specification v2.1](https://github.com/toon-format/spec)
- [CALZONE System Prompt](CALZONE-system-prompt.md)
- [CALZONE README](CALZONE_README.md)

---

## 🤝 Contributing

CALZOON is an evolving specification. Contributions welcome for:
- Additional symbolic notation
- New use case examples
- Parser optimizations
- Validation rules
- Tooling support

---

**Made with 🍕+📊 by combining the best of CALZONE and TOON**

*Fold plans. Encode data. Unfold possibilities.*
