---
name: calzone
description: Compress verbose plans, specifications, and documentation into ultra-compact ASCII-safe pseudocode with zero fidelity loss
license: MIT
---

# CALZONE (Compressed Algorithm Layout Zone for Optimized Notation Encoding)

Fold verbose plans into highly distilled ASCII-safe pseudocode with zero fidelity loss.

## Core Principle

Transform verbose documentation into structured pseudocode that:
- Reduces tokens by 60-85%
- Preserves all critical details
- Enhances clarity through systematic notation
- Remains ASCII-safe and parseable
- Supports bidirectional translation (fold ↔ unfold)

## Notation System

### Primary Symbols

```
→   Leads to, results in, transforms to
←   Derives from, depends on
⊕   Add, include, combine
⊗   Remove, exclude, subtract
∧   AND condition
∨   OR condition
¬   NOT, negation
≡   Equivalent to, same as
∴   Therefore, conclusion
∵   Because, reason
↔   Bidirectional relationship
⇒   Implies, requires
△   Change, delta, modification
◆   Critical item, milestone
○   Optional item
●   Required item
[?] Conditional, needs decision
[!] Warning, important note
[@] Reference to external item
[#] Numbered identifier
```

### Structure Notation

```
§   Section marker
¶   Paragraph/block marker
├   Branch item
└   Terminal branch item
│   Continuation
▸   Sub-item, nested element
»   Further nested element
```

### Status Indicators

```
[✓] Complete
[○] In progress
[□] Not started
[×] Blocked
[~] Partially complete
[?] Needs clarification
```

## Folding Workflow

When folding a plan:

1. **Analyze structure**: Identify hierarchies, dependencies, conditionals, sequences
2. **Apply notation**: Map verbose content to compact symbols consistently
3. **Preserve context**: Use inline comments for critical details
4. **Validate**: Ensure unfolding is unambiguous

## Common Folding Patterns

### Sequential Steps

**Verbose:**
```
First, fetch user data from database.
Then, validate permissions.
After that, load UI components.
Finally, render the page.
```

**Folded:**
```
1. fetch_user_data(db)
2. validate_perms(user)
3. load_ui_components(perms)
4. render_page() → user
```

### Hierarchical Requirements

**Verbose:**
```
The system must implement user authentication, which includes:
- Email/password login functionality
- OAuth integration with Google and GitHub
- Two-factor authentication support
  - SMS-based verification
  - App-based TOTP codes
```

**Folded:**
```
●AUTH_SYS
  ├email_pwd_login
  ├oauth_integration
  │ ├google
  │ └github
  └2fa_support
    ├sms_verify
    └totp_app
```

### Dependencies and Conditions

**Verbose:**
```
Module A depends on Module B and Module C.
Module B requires the Database Connection utility.
Module C is optional but enhances performance.
Database Connection must be initialized first.
```

**Folded:**
```
ModA ← (ModB ∧ ModC)
ModB ⇒ DBConn
ModC [○] perf_enhance
DBConn → INIT_FIRST ⇒ [all_modules]
```

### State Transitions

**Verbose:**
```
Order starts in "pending" state.
When payment received, transitions to "processing".
After processing completes, moves to "completed".
If payment fails, goes to "failed" and can retry.
If user cancels, goes to "cancelled" (final).
```

**Folded:**
```
order_state_machine:
  pending → [payment_rcvd] → processing
         → [payment_fail] → failed → [retry] → pending
         → [user_cancel] → cancelled [FINAL]
  processing → [complete] → completed [FINAL]
```

### Error Handling

**Verbose:**
```
Process payment with the given amount and method.
If successful, return transaction ID.
If insufficient funds, notify user and suggest alternatives.
If network error, retry 3 times or queue for later.
If invalid method, log error and return error code.
```

**Folded:**
```
process_payment(amount, method):
  TRY:
    validate_amount(amount) [!amount>0]
    charge_method(method, amount)
    ∴ [✓] txn_id
  CATCH:
    InsufficientFunds → notify_user ∧ suggest_alt
    NetworkErr → retry(3x) ∨ queue_later
    InvalidMethod → [×] log_err ∧ return_err_code
```

## Advanced Features

### Inline Documentation

Preserve critical context without verbosity:

```
calc_discount(base, user_tier):
  # tier: bronze=5%, silver=10%, gold=15%, platinum=20%
  discount_rate ← tier_map[user_tier]
  ∴ base * (1 - discount_rate)
```

### Cross-References

Link related sections efficiently:

```
§1 User_Auth [@see §4.2 for security_policy]
§2 Data_Model [@refs §1 for user_entity]
§3 API_Layer [@consumes §2]
```

### Timing Constraints

```
fetch_data():
  ◆ timeout: 5s [!]
  ◆ retry: 3x w/ exp_backoff
  ◆ cache: 15min TTL
```

## When to Use CALZONE

**Ideal for:**
- Large project plans (>10,000 tokens)
- Repetitive documentation structures
- Multi-phase implementation guides
- Architecture decision records with dependencies
- Detailed API specifications
- Complex state machine definitions

**Avoid for:**
- User-facing documentation (needs natural language)
- Marketing or creative content
- Short plans (<1,000 tokens)
- Content requiring emotional tone
- Legal or compliance documents

## Quality Validation

Before delivering a folded plan, verify:

- [✓] All critical information preserved
- [✓] ASCII-safe characters only
- [✓] Consistent notation usage
- [✓] Cross-references resolvable
- [✓] Hierarchies properly nested
- [✓] Conditionals clearly expressed
- [✓] Status indicators accurate
- [✓] Can be unfolded without ambiguity
- [✓] Token reduction ≥40%

## Usage Instructions

### Folding a Plan

When user provides verbose documentation:

1. Confirm scope and identify sections to fold
2. Apply notation system systematically
3. Preserve all critical details through symbols, hierarchy, and inline comments
4. Create artifact with folded content
5. Include folding metrics (original tokens, folded tokens, compression %, fidelity %)

### Unfolding a Plan

When user provides folded pseudocode:

1. Parse notation symbols and structure
2. Expand into natural language
3. Preserve logical relationships and dependencies
4. Create artifact with unfolded content

### Multi-Artifact Handling

For plans >30,000 characters, split into logical sections:

```
CALZONE_PART_1.md  # Foundation (§1-§5)
CALZONE_PART_2.md  # Implementation (§6-§10)
CALZONE_PART_3.md  # Deployment (§11-§15)

# Include manifest at top of first file
Manifest:
  §1-5  → CALZONE_PART_1.md
  §6-10 → CALZONE_PART_2.md
  §11-15→ CALZONE_PART_3.md
```

## Example Transformation

### Input (432 tokens)

```markdown
# E-Commerce Checkout System

## Phase 1: Foundation
Build a checkout system handling cart management, price calculations,
and tax computations. Support multiple payment methods: credit cards,
PayPal, and Apple Pay.

Cart should persist across sessions using local storage, with database
backup when users logged in. Show real-time inventory status.

## Phase 2: Payment Processing
Integrate Stripe for credit card processing. Implement error handling
for declined cards, network timeouts, invalid card data. Add retry
mechanism with exponential backoff for transient failures.

## Phase 3: Order Management
After successful payment, create order record with unique ID. Send
confirmation emails via SendGrid. Update inventory atomically to
prevent overselling. Generate PDF invoices using templates.
```

### Output (178 tokens - 59% reduction)

```
§1 CHECKOUT_SYS

¶ Foundation
●cart_mgmt ⊕ price_calc ⊕ tax_compute
  payment_methods: [credit_card, paypal, apple_pay]
  
●cart_persistence:
  primary: localStorage
  backup: db ← [user_logged_in]
  inventory_status: real_time_check

¶ Payment_Processing
stripe_integration:
  handle_errors:
    ├declined_card → notify_user
    ├network_timeout → retry(3x, exp_backoff)
    └invalid_data → validation_err
  
¶ Order_Management
payment_success →:
  1. create_order(db) → unique_order_id
  2. send_email(sendgrid, confirmation)
  3. update_inventory(atomic) [!prevent_oversell]
  4. gen_invoice(pdf, template)
```

## Output Format

Always deliver folded plans as markdown artifacts with:

1. Clear section markers (§)
2. Consistent indentation for hierarchy
3. Inline comments for critical context
4. Validation confirmation at end
5. Metrics summary (token counts, compression %, fidelity)

Remember: The goal is enhanced clarity through systematic distillation, not just compression.
