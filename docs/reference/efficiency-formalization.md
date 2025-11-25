# Efficiency Formalization

A mathematical analysis of TOON's byte efficiency compared to JSON across different data structures.

> [!NOTE]
> This page presents formal mathematical comparisons between TOON and JSON. For practical benchmarks and token counts, see [Benchmarks](/guide/benchmarks). This is an **advanced** reference.

## Overview

Large Language Models increasingly rely on structured data for inference and function calling. However, standard formats like JSON introduce significant verbosity that inflates token usage and inference costs. This analysis presents a formal mathematical comparison between TOON and JSON to evaluate whether TOON achieves quantifiable efficiency gains by eliminating structural redundancy.

Within this simplified model, and for the structure families analyzed here, **TOON is strictly shorter than compact JSON in all cases except arrays of arrays**.

### Key Findings

- **Tabular arrays** represent TOON's optimal use case, with efficiency gains scaling linearly with both row count and field count.
- **Simple and primitive arrays** show consistent byte reduction, with savings proportional to the number of elements.
- **Nested objects** benefit from reduced overhead, though efficiency decreases with depth due to indentation costs.
- **Arrays of arrays** are the only structure where TOON is less efficient than JSON, due to TOON's explicit list markers and array length declarations.

## Methodology

We define recursive byte-length functions $L_{\text{json}}$ and $L_{\text{toon}}$ for both formats, then derive the efficiency delta:

$$
\Delta = L_{\text{json}}(\Omega) - L_{\text{toon}}(\Omega)
$$

Where $\Omega$ represents the data structure under comparison. If $\Delta > 0$, TOON is more efficient in absolute terms.

> [!NOTE] Assumptions
> *   **Compact JSON**: In this analysis, JSON is assumed to be compact (no spaces or newlines outside strings). So, byte counts are computed on the compact form.
> *   **Canonical TOON**: We assume canonical TOON formatting (indent=2, one space after `:`, no spaces after commas in arrays/field lists).
> *   **ASCII/UTF-8**: For simplicity, we assume keys and structural tokens are ASCII, so byte length equals character count ($|x|_{\text{utf8}} = |x|_{\text{char}}$). Non-ASCII characters affect both formats similarly and don't change the structural conclusions.
> *   **Byte vs Token Count**: Modern LLM tokenizers operate over UTF-8 bytes, so byte length is a good upper bound and first-order proxy for token count, even though the mapping isn't exactly linear.

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

Let $n \in \mathbb{Z}$ be an integer. The number of bytes required to represent $n$ in decimal format is:

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
| String | $L_{\text{str}}(v_i) = \|v_i\|_{\text{utf8}} + 2$ |
| Number | $L_{\text{num}}(v_i) = \|v_i\|_{\text{utf8}}$ |
| Boolean | $L_{\text{bool}}(v_i) = \|v_i\|_{\text{utf8}}$ |
| Null | $L_{\text{null}}(v_i) = \|v_i\|_{\text{utf8}}$ |

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
| String (normal) | $L_{\text{str}}(v_i) = \|v_i\|_{\text{utf8}}$ |
| String (looks like number/boolean) | $L_{\text{str}}(v_i) = \|v_i\|_{\text{utf8}} + 2$ |
| Number | $L_{\text{num}}(v_i) = \|v_i\|_{\text{utf8}}$ |
| Boolean | $L_{\text{bool}}(v_i) = \|v_i\|_{\text{utf8}}$ |
| Null | $L_{\text{null}}(v_i) = \|v_i\|_{\text{utf8}}$ |

### Simple Arrays in TOON

In this section, $L_{\text{toon}}(\mathcal{A})$ refers to the length of the whole field line `key[N]: ...`, not just the array value.

When $v_i$ is a simple array $\mathcal{A}$:

$$
L_{\text{toon}}(\mathcal{A}) = L_{\text{str}}(k_i) + \underbrace{1}_{\text{[}} + L_{\text{num}}(n) + \underbrace{1}_{\text{]}} + \underbrace{1}_{:} + \sum_{i=1}^{n} L_{\text{toon}}(v_i) + \underbrace{(n-1)}_{\text{commas}}
$$

### Tabular Arrays in TOON

When $v_i$ is an array of objects with $m$ fields:

$$
\begin{split}
L_{\text{toon}}(\mathcal{A}') = L_{\text{str}}(k_i) + \underbrace{1}_{\text{[}} + L_{\text{num}}(n) + \underbrace{1}_{\text{]}} + \underbrace{1}_{\{} + \\
\sum_{i=1}^{m} L_{\text{toon}}(k_i) + \underbrace{(m-1)}_{\text{commas}} + \underbrace{1}_{\}} + \underbrace{1}_{:} + \\
\underbrace{2n}_{\text{indents}} + \sum_{i=1}^{n}\sum_{j=1}^{m} L_{\text{toon}}(v_{ij}) + \underbrace{(m-1)n}_{\text{commas}} + \underbrace{n}_{\text{newlines}}
\end{split}
$$

*Note: The term $2n$ assumes an indentation size of 2 spaces.*

## Efficiency Analysis by Structure

### Simple Objects

For objects with only string primitives:

$$
\Delta_{\text{obj}} = 2 + n + \sum_{i=1}^{n}(L_{\text{json}}(v_i)) - \sum_{i=1}^{n}(L_{\text{toon}}(v_i))
$$

If all values are strings, TOON saves 2 bytes from removing braces and an additional byte per field from removing quotes on keys, yielding:

$$
f(n) = 2 + 3n
$$

**Example:** For 1,000,000 objects, TOON saves **3,000,002 bytes ≈ 2.86 MB**.

#### Empirical Validation

::: code-group

```json [JSON (21 bytes)]
{"id":1,"name":"Ada"}
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

For nested objects with depth $d$ and primitives:

$$
f(n) = 5 + n
$$

**Example:** For 1,000,000 nested objects (depth 1), TOON saves **1,000,005 bytes ≈ 0.95 MB**.

> [!WARNING]
> TOON becomes less efficient with increasing depth $d$ due to the cumulative cost of indentation. This formula is for a single nesting level; deeper nesting adds 2 spaces per indented line (assuming indentSize=2).

#### Empirical Validation

::: code-group

```json [JSON (30 bytes)]
{"user":{"id":1,"name":"Ada"}}
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

For arrays of $n$ string primitives:

$$
\Delta_{\text{arr}} = 3 - L_{\text{num}}(n) + \sum_{i=1}^{n}(L_{\text{json}}(v_i)) - \sum_{i=1}^{n}(L_{\text{toon}}(v_i))
$$

With string values:

$$
f(n) = 2 + 2n - \lfloor \log_{10}(|n|) \rfloor
$$

**Example:** For 1,000,000 elements, TOON saves **1,999,996 bytes ≈ 1.91 MB**.

#### Empirical Validation

::: code-group

```json [JSON (28 bytes)]
{"tags":["foo","bar","baz"]}
```

```yaml [TOON (20 bytes)]
tags[3]: foo,bar,baz
```

:::

$$
\Delta_{\text{arr}} = 3 - \underbrace{1}_{L_{\text{num}}(3)} + \underbrace{15}_{\sum L_{\text{json}}} - \underbrace{9}_{\sum L_{\text{toon}}} = 8
$$

### Root Arrays

For root-level arrays:

$$
f(n) = -3 + 2n - \lfloor \log_{10}(|n|) \rfloor
$$

**Example:** For 1,000,000 elements, TOON saves **1,999,991 bytes ≈ 1.91 MB**.

#### Empirical Validation

::: code-group

```json [JSON (13 bytes)]
["x","y","z"]
```

```yaml [TOON (10 bytes)]
[3]: x,y,z
```

:::

$$
\Delta_{\text{root}} = \underbrace{9}_{\sum L_{\text{json}}} - 2 - \underbrace{1}_{L_{\text{num}}(3)} - \underbrace{3}_{\sum L_{\text{toon}}} = 3
$$

### Tabular Arrays

For arrays of objects with $n$ rows and $m$ fields, assuming numeric values and $|k| = 3$:

$$
f(n) = 1 + nm(3 + |k|) - m(1 + |k|) - \lfloor \log_{10}(|n|) \rfloor
$$

**Example:** For 1,000,000 rows with 2 fields, TOON saves **11,999,987 bytes ≈ 11.44 MB**.

This is TOON's sweet spot—the structure where it achieves maximum efficiency gains.

#### Empirical Validation

::: code-group

```json [JSON (45 bytes)]
{"items":[{"id":1,"qty":5},{"id":2,"qty":3}]}
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

> [!CAUTION]
> In this structure, TOON is less efficient than JSON.

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

**Example:** For 1,000,000 arrays with $m = 2$, TOON **wastes 2,999,998 bytes ≈ 2.86 MB**.

#### Empirical Validation

::: code-group

```json [JSON (23 bytes)]
{"pairs":[[1,2],[3,4]]}
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

For objects containing strings that look like numbers or booleans:

$$
\Delta_{\text{strlit}} = 2 + n
$$

**Example:** For 1,000,000 objects, TOON saves **2,000,002 bytes ≈ 1.91 MB**.

#### Empirical Validation

::: code-group

```json [JSON (34 bytes)]
{"version":"123","enabled":"true"}
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

**Empty Object:**

$$
\Delta_{\text{EmptyObject}} = 2
$$

JSON requires `{}` (2 bytes), while TOON requires nothing (0 bytes).

**Empty Array:**

$$
\Delta_{\text{EmptyArray}} = 3
$$

JSON: `{"key":[]}` requires 5 bytes for the wrapper plus key.
TOON: `key[0]:` requires 2 bytes for the header plus key.

## Summary Table

| Structure | Efficiency Formula | TOON Advantage? |
|-----------|-------------------|-----------------|
| Simple Objects | $f(n) = 2 + 3n$ | ✅ Yes |
| Nested Objects | $f(n) = 5 + n$ | ✅ Yes (decreases with depth) |
| Primitive Arrays | $f(n) = 2 + 2n - \lfloor \log_{10}(n) \rfloor$ | ✅ Yes |
| Root Arrays | $f(n) = -3 + 2n - \lfloor \log_{10}(n) \rfloor$ | ✅ Yes |
| Tabular Arrays | $f(n) = 1 + nm(3+\|k\|) - m(1+\|k\|) - \lfloor \log_{10}(n) \rfloor$ | ✅ **Best case** |
| Arrays of Arrays | $f(n) = 2 - 6n + 2nm - \text{overhead}$ | ❌ **No** |
| String Literals | $f(n) = 2 + n$ | ✅ Yes |
| Empty Structures | $\Delta = 2$ or $3$ | ✅ Yes |

## Conclusion

The formal mathematical comparison between TOON and JSON demonstrates that **TOON successfully achieves its design goal of minimizing tokenization overhead** through structural optimization.

Since UTF-8 byte length serves as the base unit for tokenization, the reduction in $L_{\text{toon}}$ directly correlates to a decrease in token count. Therefore, excluding the "arrays of arrays" edge case, **TOON provides an objective improvement in the economic efficiency of AI systems** by lowering inference and serialization costs.

## Related Resources

- [Benchmarks](/guide/benchmarks) - Empirical token count comparisons
- [Specification](/reference/spec) - Formal TOON specification
- [Getting Started](/guide/getting-started) - Introduction to TOON format

## References

This analysis is based on:

- **Original Research**: [TOON vs. JSON: A Mathematical Evaluation of Byte Efficiency in Structured Data](https://www.researchgate.net/publication/397903673_TOON_vs_JSON_A_Mathematical_Evaluation_of_Byte_Efficiency_in_Structured_Data)
- **TOON Specification**: [toon-format/spec](https://github.com/toon-format/spec)
- **JSON Specification**: [RFC 8259](https://datatracker.ietf.org/doc/html/rfc8259), [ECMA-404](https://www.ecma-international.org/publications-and-standards/standards/ecma-404/)

---

*Have questions or found an error in the formalization? Open an issue on [GitHub](https://github.com/toon-format/spec) or contribute improvements to this analysis.*
