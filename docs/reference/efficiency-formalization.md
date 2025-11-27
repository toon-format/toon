# Efficiency Formalization

A mathematical analysis of TOON's byte efficiency compared to JSON across different data structures.

::: info Scope of This Document
This page presents a theoretical, character-based comparison between TOON and JSON. For practical benchmarks and token counts, see [Benchmarks](/guide/benchmarks). It is an **advanced, non-normative** reference: it explains TOON's design from a mathematical angle but does not change the TOON specification.
:::

## Overview

Large Language Models increasingly rely on structured data for inference and function calling. However, standard formats like JSON introduce significant verbosity that inflates token usage and inference costs. This analysis presents a formal mathematical comparison between TOON and JSON to evaluate whether TOON achieves quantifiable efficiency gains by eliminating structural redundancy.

Under the assumptions described below (compact JSON, canonical TOON, ASCII keys and punctuation, shallow to moderate nesting, and mostly unquoted TOON strings), TOON's **structural overhead is lower than compact JSON** for the structure families analyzed here, except arrays of arrays.

### Key Findings

- **Tabular arrays** represent TOON's optimal use case, with efficiency gains scaling linearly with both row count and field count.
- **Simple objects and primitive arrays** show consistent byte reduction, with savings proportional to the number of fields or elements.
- **Nested objects** benefit from reduced overhead, though efficiency decreases with depth due to indentation costs; at sufficient depth, compact JSON can become smaller.
- **Arrays of arrays** are the only structure where TOON is less efficient than JSON in this analysis, due to TOON's explicit list markers and inner array headers.

## Methodology

We define recursive byte-length functions $L_{\text{json}}$ and $L_{\text{toon}}$ for both formats, then derive the efficiency delta:

$$
\Delta = L_{\text{json}}(\Omega) - L_{\text{toon}}(\Omega)
$$

Where $\Omega$ represents the data structure under comparison. If $\Delta > 0$, TOON uses fewer bytes than JSON for that structure.

::: info Scope & Assumptions
- **Compact JSON**: JSON is assumed to be compact (no spaces or newlines outside strings). Byte counts are computed on this compact form.
- **Canonical TOON**: TOON is assumed to follow canonical formatting (indent = 2 spaces, exactly one space after `:`, no spaces after commas in arrays/field lists, no trailing spaces).
- **Keys and strings**: All keys are "simple" ASCII identifier-style keys that:
  - must be quoted in JSON, and
  - can be left unquoted in TOON (no characters that would force quoting).
  Many examples assume values are numbers, booleans, null, or TOON-safe strings that can be unquoted in TOON but must be quoted in JSON.
- **Numbers**: Both formats are assumed to use the same canonical decimal representation (no exponent notation), matching TOON's requirement. JSON could use exponent forms; we ignore that here to isolate structural differences.
- **ASCII/UTF-8**: Keys and structural tokens are assumed ASCII, so byte length equals character count ($|x|_{\text{utf8}} = |x|_{\text{char}}$). Non-ASCII content affects both formats similarly and does not change the structural conclusions.
- **Nesting depth**: Closed-form expressions are given for flat structures and a single level of nesting. Each additional nesting level in TOON adds 2 bytes of indentation per nested line. At sufficient depth, the braces of compact JSON can win over TOON's indentation (as seen in [When Not to Use TOON](/guide/getting-started#when-not-to-use-toon)).
- **Byte vs token count**: Modern LLM tokenizers operate over UTF-8 bytes, so byte length is a good upper bound and first-order proxy for token count, even though the mapping is not exactly linear.

Think of this as a simplified structural model: we strip away real-world noise and ask, "if you only count structural characters, how do JSON and TOON compare?"

## Formal Notation

### Data Model

Let $\omega$ be a primitive value such that $\omega \in \{\text{string, number, boolean, null}\}$.

Let $\mathcal{O}$ be an object composed of $n$ key-value pairs:

$$
\mathcal{O} = \{(k_1, v_1), (k_2, v_2), \dots, (k_n, v_n)\}
$$

Let $\mathcal{A}$ be an array composed of $n$ elements:

$$
\mathcal{A} = \{v_1, v_2, \dots, v_n\}
$$

Where:
- $k_i$ is a key (string)
- $v_i$ can be a primitive value $\omega$, an object $\mathcal{O}$, or an array $\mathcal{A}$

Therefore: $v_i \in \{\omega, \mathcal{O}, \mathcal{A}\}$

### String Length

Let $\mathcal{S}$ be the set of valid Unicode strings. For any string $x \in \mathcal{S}$, we denote $|x|_{\text{utf8}}$ as the byte-length of $x$ under UTF-8 encoding.

### Integer Length

Let $n \in \mathbb{Z}_{\ge 0}$ be a non-negative integer. The number of bytes required to represent $n$ in decimal format is:

$$
L_{\text{num}}(n) = \begin{cases}
1 & \text{if } n = 0 \\
\lfloor \log_{10}(|n|) \rfloor + 1 & \text{if } n > 0
\end{cases}
$$

## JSON Size Functions

For a flat object of $n$ keys:

$$
L_{\text{json}}(\mathcal{O}) = \underbrace{2}_{\{\}} + \sum_{i=1}^{n} (L_{\text{str}}(k_i) + \underbrace{1}_{:} + L_{\text{json}}(v_i)) + \underbrace{(n-1)}_{\text{commas}}
$$

Where $L_{\text{str}}(k)$ is the length of the key including its mandatory quotes:

$$
L_{\text{str}}(k) = |k|_{\text{utf8}} + \underbrace{2}_{\text{quotes}}
$$

### Primitive Values in JSON

When $v_i$ is a primitive data type $\omega$:

| Type | Formula |
|------|---------|
| String | $L_{\text{str}}(v_i) = \lvert v_i\rvert_{\text{utf8}} + 2$ |
| Number | $L_{\text{num}}(v_i) = \lvert v_i\rvert_{\text{utf8}}$ |
| Boolean | $L_{\text{bool}}(v_i) = \lvert v_i\rvert_{\text{utf8}}$ |
| Null | $L_{\text{null}}(v_i) = \lvert v_i\rvert_{\text{utf8}}$ |

### Arrays in JSON

When $v_i$ is an array $\mathcal{A}$:

$$
L_{\text{json}}(\mathcal{A}) = \underbrace{2}_{\text{[]}} + \sum_{i=1}^{n} L_{\text{json}}(v_i) + \underbrace{(n-1)}_{\text{commas}}
$$

## TOON Size Functions

For a flat object of $n$ keys:

$$
L_{\text{toon}}(\mathcal{O}) = \sum_{i=1}^{n} (L_{\text{str}}(k_i) + \underbrace{1}_{:} + \underbrace{1}_{\text{space}} + L_{\text{toon}}(v_i)) + \underbrace{(n-1)}_{\text{newlines}}
$$

Where $L_{\text{str}}(k)$ is the length of the key (no quotes required for simple keys):

$$
L_{\text{str}}(k) = |k|_{\text{utf8}}
$$

### Primitive Values in TOON

When $v_i$ is a primitive data type $\omega$:

| Type | Formula |
|------|---------|
| String (normal) | $L_{\text{str}}(v_i) = \lvert v_i\rvert_{\text{utf8}}$ |
| String (looks like number/boolean) | $L_{\text{str}}(v_i) = \lvert v_i\rvert_{\text{utf8}} + 2$ |
| Number | $L_{\text{num}}(v_i) = \lvert v_i\rvert_{\text{utf8}}$ |
| Boolean | $L_{\text{bool}}(v_i) = \lvert v_i\rvert_{\text{utf8}}$ |
| Null | $L_{\text{null}}(v_i) = \lvert v_i\rvert_{\text{utf8}}$ |

### Simple Arrays in TOON

Here $L_{\text{toon}}(\mathcal{A})$ refers to the length of the whole field line `key[N]: ...`, not just the array value.

When $v_i$ is a simple array $\mathcal{A}$:

$$
L_{\text{toon}}(\mathcal{A}) = L_{\text{str}}(k_i) + \underbrace{1}_{\text{[}} + L_{\text{num}}(n) + \underbrace{1}_{\text{]}} + \underbrace{1}_{:} + \underbrace{1}_{\text{space}} + \sum_{i=1}^{n} L_{\text{toon}}(v_i) + \underbrace{(n-1)}_{\text{commas}}
$$

### Tabular Arrays in TOON

When $v_i$ is an array of objects with $m$ fields:

$$
\begin{split}
L_{\text{toon}}(\mathcal{A}') = L_{\text{str}}(k_i) + \underbrace{1}_{\text{[}} + L_{\text{num}}(n) + \underbrace{1}_{\text{]}} + \underbrace{1}_{\{} + \\
\sum_{i=1}^{m} L_{\text{str}}(k_i) + \underbrace{(m-1)}_{\text{commas}} + \underbrace{1}_{\}} + \underbrace{1}_{:} + \\
\underbrace{2n}_{\text{indents}} + \sum_{i=1}^{n}\sum_{j=1}^{m} L_{\text{toon}}(v_{ij}) + \underbrace{(m-1)n}_{\text{commas}} + \underbrace{n}_{\text{newlines}}
\end{split}
$$

*Note: The term $2n$ assumes an indentation size of 2 spaces.*

## Efficiency Analysis by Structure

Each subsection below focuses on a particular structure family, states the resulting formula, and shows a small example. Intuitively, TOON tends to win when it can:

- avoid repeating keys (tabular arrays),
- avoid quoting keys and many values,
- and replace braces with indentation,

and tends to lose when it pays a fixed overhead per element (arrays of arrays) or deep indentation (heavily nested configs).

### Simple Objects

Flat objects with primitive string values are the easiest win: JSON pays for braces and quoted keys and strings, while TOON drops braces at the root, omits quotes on simple keys, and uses one line per field.

For objects with only string primitives:

$$
\Delta_{\text{obj}} = 2 + n + \sum_{i=1}^{n}(L_{\text{json}}(v_i)) - \sum_{i=1}^{n}(L_{\text{toon}}(v_i))
$$

If all values are strings that can be unquoted in TOON, this simplifies to:

$$
f(n) = 2 + 3n
$$

**Example:** For 1,000,000 objects, TOON saves **3,000,002 bytes ≈ 2.86 MB**.

#### Empirical Validation

::: code-group

```json [JSON (21 bytes)]
{ "id": 1, "name": "Ada" }
```

```yaml [TOON (15 bytes)]
id: 1
name: Ada
```

:::

$$
\Delta_{\text{obj}} = 2 + \underbrace{2}_{n} + \underbrace{6}_{\sum L_{\text{json}}(v_i)} - \underbrace{4}_{\sum L_{\text{toon}}(v_i)} = 6
$$

### Nested Objects

Adding a wrapper object (one extra level of nesting) introduces extra braces for JSON and extra indentation and newlines for TOON. For a single level of nesting with primitive values, TOON still comes out ahead, but the net advantage is smaller.

For a single level of nesting with primitives:

$$
f(n) = 5 + n
$$

**Example:** For 1,000,000 nested objects (depth 1), TOON saves **1,000,005 bytes ≈ 0.95 MB**.

::: warning
This formula is for a single nesting level. Each additional nesting level adds 2 spaces of indentation per nested line; at sufficient depth, compact JSON can become smaller, especially when tabular opportunities disappear (see [When Not to Use TOON](/guide/getting-started#when-not-to-use-toon) and the "Deeply nested configuration" dataset in [Benchmarks](/guide/benchmarks)).
:::

#### Empirical Validation

::: code-group

```json [JSON (30 bytes)]
{ "user": { "id": 1, "name": "Ada" } }
```

```yaml [TOON (25 bytes)]
user:
  id: 1
  name: Ada
```

:::

$$
\Delta_{\text{nested}} = 5
$$

### Primitive Arrays

For arrays of string primitives, JSON writes `["foo","bar","baz"]`, quoting every string and using `[]` for the array. TOON writes `key[N]: foo,bar,baz`, paying once for the length marker but omitting most quotes.

For arrays of $n$ string primitives:

$$
\Delta_{\text{arr}} = 3 - L_{\text{num}}(n) + \sum_{i=1}^{n}(L_{\text{json}}(v_i)) - \sum_{i=1}^{n}(L_{\text{toon}}(v_i))
$$

With string values that can be unquoted in TOON, this simplifies to:

$$
f(n) = 2 + 2n - \lfloor \log_{10}(|n|) \rfloor
$$

**Example:** For 1,000,000 elements, TOON saves **1,999,996 bytes ≈ 1.91 MB**.

#### Empirical Validation

::: code-group

```json [JSON (28 bytes)]
{ "tags": ["foo", "bar", "baz"] }
```

```yaml [TOON (20 bytes)]
tags[3]: foo,bar,baz
```

:::

$$
\Delta_{\text{arr}} = 3 - \underbrace{1}_{L_{\text{num}}(3)} + \underbrace{15}_{\sum L_{\text{json}}} - \underbrace{9}_{\sum L_{\text{toon}}} = 8
$$

### Root Arrays

At the root, JSON writes `["x","y","z"]`; TOON writes `[3]: x,y,z`. There is no object key cost, so the advantage mainly comes from not quoting TOON-safe strings and from replacing `[]` with `[N]:`.

For root-level arrays of $n$ string primitives:

$$
f(n) = -3 + 2n - \lfloor \log_{10}(|n|) \rfloor
$$

**Example:** For 1,000,000 elements, TOON saves **1,999,991 bytes ≈ 1.91 MB**.

#### Empirical Validation

::: code-group

```json [JSON (13 bytes)]
["x", "y", "z"]
```

```yaml [TOON (10 bytes)]
[3]: x,y,z
```

:::

$$
\Delta_{\text{root}} = \underbrace{9}_{\sum L_{\text{json}}} - 2 - \underbrace{1}_{L_{\text{num}}(3)} - \underbrace{3}_{\sum L_{\text{toon}}} = 3
$$

### Tabular Arrays

Uniform arrays of objects are TOON's sweet spot. JSON repeats every key for every row, while TOON declares the length and column names once (`key[N]{id,qty,...}:`) and streams rows as bare values.

For arrays of objects with $n$ rows and $m$ fields, assuming numeric values and $|k| = 3$:

$$
f(n) = 1 + nm(3 + |k|) - m(1 + |k|) - \lfloor \log_{10}(|n|) \rfloor
$$

**Example:** For 1,000,000 rows with 2 fields and 3-character field names, TOON saves **11,999,987 bytes ≈ 11.44 MB**.

This is where TOON's design (declare fields once, stream rows) pays off most strongly: savings grow linearly with both row count and field count.

#### Empirical Validation

::: code-group

```json [JSON (45 bytes)]
{ "items": [{ "id": 1, "qty": 5 }, { "id": 2, "qty": 3 }] }
```

```yaml [TOON (29 bytes)]
items[2]{id,qty}:
  1,5
  2,3
```

:::

$$
\Delta_{\text{tab}} = 2 + \underbrace{4}_{nm} - \underbrace{2}_{m} + \underbrace{22}_{\Sigma L_{\text{json}}} - \underbrace{1}_{L_{\text{num}}(n)} - \underbrace{5}_{\Sigma L_{\text{toon}}(k)} - \underbrace{4}_{\Sigma L_{\text{toon}}(v)} = 16
$$

### Arrays of Arrays

Arrays of arrays of primitives are where TOON structurally loses: each inner array becomes a list item with its own header, so TOON pays a fixed overhead per inner array (`"- "` plus `"[m]: "`), while JSON just uses commas.

::: tip
For arrays of arrays of primitives, this model predicts that JSON is more byte-efficient than TOON, because TOON pays ~6 extra bytes per inner array (2 for `"- "`, 4 for `"[m]: "`), plus the length marker.
:::

For arrays of arrays with $n$ outer elements and $m$ inner elements:

$$
\begin{split}
\Delta_{\text{arrarr}} = 2 - 6n - \sum_{i=1}^{n}\sum_{j=1}^{m} L_{\text{num}}(m) + \\
\sum_{i=1}^{n}\sum_{j=1}^{m} L_{\text{json}}(v_{ij}) - \sum_{i=1}^{n}\sum_{j=1}^{m} L_{\text{toon}}(v_{ij})
\end{split}
$$

With string primitives and $m = 2$:

$$
f(n) = 2 - 6n - \sum_{i=1}^{n}\sum_{j=1}^{m} (\lfloor \log_{10}(|m|) \rfloor + 1) + 2nm
$$

**Example:** For 1,000,000 arrays with $m = 2$, TOON **wastes 2,999,998 bytes ≈ 2.86 MB** relative to JSON under this model.

#### Empirical Validation

::: code-group

```json [JSON (23 bytes)]
{ "pairs": [[1, 2], [3, 4]] }
```

```yaml [TOON (35 bytes)]
pairs[2]:
  - [2]: 1,2
  - [2]: 3,4
```

:::

$$
\Delta_{\text{arrarr}} = 2 - \underbrace{12}_{6n} - \underbrace{2}_{\sum L_{\text{num}}(m)} + \underbrace{4}_{\sum L_{\text{json}}} - \underbrace{4}_{\sum L_{\text{toon}}} = -12
$$

### Strings That Look Like Literals

Strings that look like numbers or booleans (e.g. `"123"`, `"true"`) must be quoted in both JSON and TOON, slightly reducing TOON's advantage because it no longer saves quotes on those values.

For objects containing such strings:

$$
\Delta_{\text{strlit}} = 2 + n
$$

**Example:** For 1,000,000 objects, TOON saves **2,000,002 bytes ≈ 1.91 MB**.

#### Empirical Validation

::: code-group

```json [JSON (34 bytes)]
{ "version": "123", "enabled": "true" }
```

```yaml [TOON (30 bytes)]
version: "123"
enabled: "true"
```

:::

$$
\Delta_{\text{str}} = 2 + \underbrace{2}_{n} = 4
$$

### Empty Structures

Empty containers reveal structural differences even at minimal sizes.

**Empty Object:**

$$
\Delta_{\text{EmptyObject}} = 2
$$

JSON requires `{}` (2 bytes), whereas a completely empty root object in TOON is represented as an empty document (0 bytes).

**Empty Array (field):**

$$
\Delta_{\text{EmptyArray}} = 3
$$

For a field named `key`, JSON uses `{"key":[]}` in compact form, while TOON uses:

```yaml
key[0]:
```

Under this model, that yields a constant 3-byte advantage for TOON.

## Summary Table

The table below summarizes the formulas and which side wins under the modeling assumptions.

| Structure | Efficiency Formula | TOON Advantage? |
|-----------|-------------------|-----------------|
| Simple Objects | $f(n) = 2 + 3n$ | ✅ Yes |
| Nested Objects (1 level) | $f(n) = 5 + n$ | ✅ Yes (shrinks with depth) |
| Primitive Arrays | $f(n) = 2 + 2n - \lfloor \log_{10}(n) \rfloor$ | ✅ Yes |
| Root Arrays | $f(n) = -3 + 2n - \lfloor \log_{10}(n) \rfloor$ | ✅ Yes |
| Tabular Arrays | $f(n) = 1 + nm(3+\lvert k\rvert) - m(1+\lvert k\rvert) - \lfloor \log_{10}(n) \rfloor$ | ✅ **Best case** |
| Arrays of Arrays | $f(n) = 2 - 6n + 2nm - \text{overhead}$ | ❌ JSON wins here |
| String Literals | $f(n) = 2 + n$ | ✅ Yes (smaller gain) |
| Empty Structures | $\Delta = 2$ or $3$ | ✅ Yes |

In short:

- TOON's gains are **linear in the number of fields** for flat objects.
- For arrays, gains grow **linearly in the number of elements**, and for tabular arrays **linearly in both rows and fields**.
- Arrays of arrays are the main structural case where JSON is smaller.
- Deep nesting and heavy quoting can erode or reverse these advantages in real data.

## Conclusion

This simplified theoretical model supports TOON's design goal: structurally, it reduces overhead compared to compact JSON in many common patterns by:

- avoiding repeated keys in tabular arrays,
- omitting quotes on many keys and values,
- and replacing braces with indentation at shallow depths.

For the structure families examined here and under the stated assumptions, the structural overhead of TOON is lower than that of compact JSON except for arrays of arrays. Since UTF-8 byte length is a reasonable first-order proxy for tokens, these structural savings usually translate into lower token counts in those patterns.

At the same time, this is deliberately a simplified model. In real datasets, additional factors – deeper or irregular nesting, heavily quoted strings, exponent notation in JSON, and tokenizer idiosyncrasies – can reduce or even reverse these gains. Our [Benchmarks](/guide/benchmarks) and [When Not to Use TOON](/guide/getting-started#when-not-to-use-toon) show that compact JSON can be more efficient for deeply nested or low-tabularity data. Use this page as intuition for *why* TOON behaves the way it does, not as a universal guarantee.

## Related Resources

- [Benchmarks](/guide/benchmarks) – Empirical token count and accuracy comparisons across formats
- [Specification](/reference/spec) – Formal TOON specification
- [Getting Started](/guide/getting-started) – Introduction to TOON format and when to use it

## References

This analysis is based on:

- **Original Research**: [TOON vs. JSON: A Mathematical Evaluation of Byte Efficiency in Structured Data](https://www.researchgate.net/publication/397903673_TOON_vs_JSON_A_Mathematical_Evaluation_of_Byte_Efficiency_in_Structured_Data)
- **TOON Specification**: [toon-format/spec](https://github.com/toon-format/spec)
- **JSON Specification**: [RFC 8259](https://datatracker.ietf.org/doc/html/rfc8259), [ECMA-404](https://www.ecma-international.org/publications-and-standards/standards/ecma-404/)

---

*Have questions or found an error in the formalization? Open an issue on [GitHub](https://github.com/toon-format/spec) or contribute improvements to this analysis.*
