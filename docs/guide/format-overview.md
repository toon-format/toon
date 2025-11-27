# Format Overview

TOON syntax reference with concrete examples. See [Getting Started](/guide/getting-started) for introduction.

## Data Model

TOON models data the same way as JSON:

- **Primitives**: strings, numbers, booleans, and `null`
- **Objects**: mappings from string keys to values
- **Arrays**: ordered sequences of values

### Root Forms

A TOON document can represent different root forms:

- **Root object** (most common): Fields appear at depth 0 with no parent key
- **Root array**: Begins with `[N]:` or `[N]{fields}:` at depth 0
- **Root primitive**: A single primitive value (string, number, boolean, or null)

Most examples in these docs use root objects, but the format supports all three forms equally ([spec §5](https://github.com/toon-format/spec/blob/main/SPEC.md#5-concrete-syntax-and-root-form)).

## Objects

### Simple Objects

Objects with primitive values use `key: value` syntax, with one field per line:

```yaml
id: 123
name: Ada
active: true
```

Indentation replaces braces. One space follows the colon.

### Nested Objects

Nested objects add one indentation level (default: 2 spaces):

```yaml
user:
  id: 123
  name: Ada
```

When a key ends with `:` and has no value on the same line, it opens a nested object. All lines at the next indentation level belong to that object.

### Empty Objects

An empty object at the root yields an empty document (no lines). A nested empty object is `key:` alone, with no children.

## Arrays

TOON detects array structure and chooses the most efficient representation. Arrays always declare their length in brackets: `[N]`.

### Primitive Arrays (Inline)

Arrays of primitives (strings, numbers, booleans, null) are rendered inline:

```yaml
tags[3]: admin,ops,dev
```

The delimiter (comma by default) separates values. Strings containing the active delimiter must be quoted.

### Arrays of Objects (Tabular)

When all objects in an array share the same set of primitive-valued keys, TOON uses tabular format:

::: code-group

```yaml [Basic Tabular]
items[2]{sku,qty,price}:
  A1,2,9.99
  B2,1,14.5
```

```yaml [With Spaces in Values]
users[2]{id,name,role}:
  1,Alice Admin,admin
  2,"Bob Smith",user
```

:::

The header `items[2]{sku,qty,price}:` declares:
- **Array length**: `[2]` means 2 rows
- **Field names**: `{sku,qty,price}` defines the columns
- **Active delimiter**: comma (default)

Each row contains values in the same order as the field list. Values are encoded as primitives (strings, numbers, booleans, null) and separated by the delimiter.

> [!NOTE]
> Tabular format requires identical field sets across all objects (same keys, order per object may vary) and primitive values only (no nested arrays/objects).

### Mixed and Non-Uniform Arrays

Arrays that don't meet the tabular requirements use list format with hyphen markers:

```yaml
items[3]:
  - 1
  - a: 1
  - text
```

Each element starts with `- ` at one indentation level deeper than the parent array header.

### Objects as List Items

When an array element is an object, it appears as a list item:

```yaml
items[2]:
  - id: 1
    name: First
  - id: 2
    name: Second
    extra: true
```

When a tabular array is the first field of a list-item object, the tabular header appears on the hyphen line, with rows indented two levels deeper and other fields indented one level deeper:

```yaml
items[1]:
  - users[2]{id,name}:
      1,Ada
      2,Bob
    status: active
```

When the object has only a single tabular field, the same pattern applies:

```yaml
items[1]:
  - users[2]{id,name}:
      1,Ada
      2,Bob
```

This is the canonical encoding for list-item objects whose first field is a tabular array.

### Arrays of Arrays

When you have arrays containing primitive inner arrays:

```yaml
pairs[2]:
  - [2]: 1,2
  - [2]: 3,4
```

Each inner array gets its own header on the list-item line.

### Empty Arrays

Empty arrays have special representations:

```yaml
items[0]:
```

The header declares length zero, with no elements following.

## Array Headers

### Header Syntax

Array headers follow this pattern:

```
key[N<delimiter?>]<{fields}>:
```

Where:
- **N** is the non-negative integer length
- **delimiter** (optional) explicitly declares the active delimiter:
  - Absent → comma (`,`)
  - `\t` (tab character) → tab delimiter
  - `|` → pipe delimiter
- **fields** (optional) for tabular arrays: `{field1,field2,field3}`

> [!TIP]
> The array length `[N]` helps LLMs validate structure. If you ask a model to generate TOON output, explicit lengths let you detect truncation or malformed data.

### Delimiter Options

TOON supports three delimiters: comma (default), tab, and pipe. The delimiter is scoped to the array header that declares it.

::: code-group

```yaml [Comma (default)]
items[2]{sku,name,qty,price}:
  A1,Widget,2,9.99
  B2,Gadget,1,14.5
```

```yaml [Tab]
items[2	]{sku	name	qty	price}:
  A1	Widget	2	9.99
  B2	Gadget	1	14.5
```

```yaml [Pipe]
items[2|]{sku|name|qty|price}:
  A1|Widget|2|9.99
  B2|Gadget|1|14.5
```

:::

Tab and pipe delimiters are explicitly encoded in the header brackets and field braces. Commas don't require quoting when tab or pipe is active, and vice versa.

> [!TIP]
> Tab delimiters often tokenize more efficiently than commas, especially for data with few quoted strings. Use `encode(data, { delimiter: '\t' })` for additional token savings.

## Key Folding (Optional)

Key folding is an optional encoder feature (since spec v1.5) that collapses chains of single-key objects into dotted paths, reducing tokens for deeply nested data.

### Basic Folding

Standard nesting:

```yaml
data:
  metadata:
    items[2]: a,b
```

With key folding (`keyFolding: 'safe'`):

```yaml
data.metadata.items[2]: a,b
```

The three nested objects collapse into a single dotted key `data.metadata.items`.

### When Folding Applies

A chain of objects is foldable when:
- Each object in the chain has exactly one key (leading to the next object or a leaf value)
- The leaf value is a primitive, array, or empty object
- All segments are valid identifier segments (letters, digits, underscores only; no dots within segments)
- The resulting folded key doesn't collide with existing keys

::: details Advanced Folding Rules
**Segment Requirements (safe mode):**
- All folded segments must match `^[A-Za-z_][A-Za-z0-9_]*$` (no dots, hyphens, or other special characters)
- No segment may require quoting per §7.3 of the spec
- The resulting folded key must not equal any existing sibling literal key at the same depth (collision avoidance)

**Depth Limit:**
- The `flattenDepth` option (default: `Infinity`) controls how many segments to fold
- `flattenDepth: 2` folds only two-segment chains: `{a: {b: val}}` → `a.b: val`
- Values less than 2 have no practical effect

**Round-Trip with Path Expansion:**
To reconstruct the original structure when decoding, use `expandPaths: 'safe'`. This splits dotted keys back into nested objects using the same safety rules ([spec §13.4](https://github.com/toon-format/spec/blob/main/SPEC.md#134-key-folding-and-path-expansion)).
:::

### Round-Trip with Path Expansion

When decoding TOON that used key folding, enable path expansion to restore the nested structure:

```ts
import { decode, encode } from '@toon-format/toon'

const original = { data: { metadata: { items: ['a', 'b'] } } }

// Encode with folding
const toon = encode(original, { keyFolding: 'safe' })
// → "data.metadata.items[2]: a,b"

// Decode with expansion
const restored = decode(toon, { expandPaths: 'safe' })
// → { data: { metadata: { items: ['a', 'b'] } } }
```

Path expansion is off by default, so dotted keys are treated as literal keys unless explicitly enabled.

## Quoting and Types

### When Strings Need Quotes

TOON quotes strings **only when necessary** to maximize token efficiency. A string must be quoted if:

- It's empty (`""`)
- It has leading or trailing whitespace
- It equals `true`, `false`, or `null` (case-sensitive)
- It looks like a number (e.g., `"42"`, `"-3.14"`, `"1e-6"`, or `"05"` with leading zeros)
- It contains special characters: colon (`:`), quote (`"`), backslash (`\`), brackets, braces, or control characters (newline, tab, carriage return)
- It contains the relevant delimiter (the active delimiter inside an array scope, or the document delimiter elsewhere)
- It equals `"-"` or starts with `"-"` followed by any character

Otherwise, strings can be unquoted. Unicode, emoji, and strings with internal (non-leading/trailing) spaces are safe unquoted:

```yaml
message: Hello 世界 👋
note: This has inner spaces
```

### Escape Sequences

In quoted strings and keys, only five escape sequences are valid:

| Character | Escape |
|-----------|--------|
| Backslash (`\`) | `\\` |
| Double quote (`"`) | `\"` |
| Newline (U+000A) | `\n` |
| Carriage return (U+000D) | `\r` |
| Tab (U+0009) | `\t` |

All other escape sequences (e.g., `\x`, `\u`) are invalid and will cause an error in strict mode.

### Type Conversions

Numbers are emitted in canonical decimal form (no exponent notation, no trailing zeros). Non-JSON types are normalized before encoding:

| Input | Output |
|-------|--------|
| Finite number | Canonical decimal (e.g., `1e6` → `1000000`, `1.5000` → `1.5`, `-0` → `0`) |
| `NaN`, `Infinity`, `-Infinity` | `null` |
| `BigInt` (within safe range) | Number |
| `BigInt` (out of range) | Quoted decimal string (e.g., `"9007199254740993"`) |
| `Date` | ISO string in quotes (e.g., `"2025-01-01T00:00:00.000Z"`) |
| `undefined`, `function`, `symbol` | `null` |

Decoders accept both decimal and exponent forms on input (e.g., `42`, `-3.14`, `1e-6`), and treat tokens with forbidden leading zeros (e.g., `"05"`) as strings, not numbers.

For complete rules on quoting, escaping, type conversions, and strict-mode decoding, see [spec §2–4 (data model), §7 (strings and keys), and §14 (strict mode)](https://github.com/toon-format/spec/blob/main/SPEC.md).
