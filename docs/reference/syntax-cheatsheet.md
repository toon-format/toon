---
description: JSON-to-TOON mappings at a glance for objects, arrays, tabular forms, quoting, and type conversions.
---

# Syntax Cheatsheet

Quick reference for mapping JSON to TOON format. For rigorous, normative syntax rules and edge cases, see the [Specification](/reference/spec).

## Objects

::: code-group

```json [JSON]
{
  "id": 1,
  "name": "Ada"
}
```

```toon [TOON]
id: 1
name: Ada
```

:::

## Nested Objects

::: code-group

```json [JSON]
{
  "user": {
    "id": 1,
    "name": "Ada"
  }
}
```

```toon [TOON]
user:
  id: 1
  name: Ada
```

:::

## Primitive Arrays

::: code-group

```json [JSON]
{
  "tags": ["foo", "bar", "baz"]
}
```

```toon [TOON]
tags[3]: foo,bar,baz
```

:::

## Tabular Arrays

::: code-group

```json [JSON]
{
  "items": [
    { "id": 1, "qty": 5 },
    { "id": 2, "qty": 3 }
  ]
}
```

```toon [TOON]
items[2]{id,qty}:
  1,5
  2,3
```

:::

## Mixed and Non-Uniform Arrays

::: code-group

```json [JSON]
{
  "items": [1, { "a": 1 }, "x"]
}
```

```toon [TOON]
items[3]:
  - 1
  - a: 1
  - x
```

:::

> [!NOTE]
> When a list-item object has a tabular array as its first field, the tabular header appears on the hyphen line. Rows are indented two levels deeper than the hyphen, and other fields are indented one level deeper. This is the canonical encoding for this pattern.

::: code-group

```toon [Multi-field object]
items[1]:
  - users[2]{id,name}:
      1,Ada
      2,Bob
    status: active
```

```toon [Single-field object]
items[1]:
  - users[2]{id,name}:
      1,Ada
      2,Bob
```

:::

## Arrays of Arrays (List Form)

::: code-group

```json [JSON]
{
  "pairs": [[1, 2], [3, 4]]
}
```

```toon [TOON]
pairs[2]:
  - [2]: 1,2
  - [2]: 3,4
```

:::

## Root Arrays

::: code-group

```json [JSON]
["x", "y", "z"]
```

```toon [TOON]
[3]: x,y,z
```

:::

## Empty Containers

::: code-group

```json [Empty Object]
{}
```

```toon [Empty Object]
(empty output)
```

:::

::: code-group

```json [Empty Array]
{
  "items": []
}
```

```toon [Empty Array]
items: []
```

:::

## Quoting Special Cases

### Strings That Look Like Literals

::: code-group

```json [JSON]
{
  "version": "123",
  "enabled": "true"
}
```

```toon [TOON]
version: "123"
enabled: "true"
```

:::

These strings must be quoted because they look like numbers/booleans.

### Strings Containing Delimiters

::: code-group

```json [JSON]
{
  "note": "hello, world"
}
```

```toon [TOON]
note: "hello, world"
```

:::

Strings must be quoted when they contain the active delimiter (inside an array scope) or the document delimiter (object field values, comma by default).

### Strings with Leading/Trailing Spaces

::: code-group

```json [JSON]
{
  "message": " padded "
}
```

```toon [TOON]
message: " padded "
```

:::

### Empty String

::: code-group

```json [JSON]
{
  "name": ""
}
```

```toon [TOON]
name: ""
```

:::

## Quoting Rules Summary

Strings **must** be quoted if they:

- Are empty (`""`)
- Have leading or trailing whitespace
- Equal `true`, `false`, or `null` (case-sensitive)
- Look like numbers (e.g., `"42"`, `"-3.14"`, `"1e-6"`, `"05"`, `"+1"`)
- Contain special characters: `:`, `"`, `\`, `[`, `]`, `{`, `}`, or any control character (U+0000–U+001F, including newline/tab/CR)
- Contain the relevant delimiter – the active delimiter inside an array scope, or the document delimiter (comma by default) for object field values
- Equal `"-"` or start with `"-"` followed by any character
- Equal `"#"` or start with `"#"` (the line would read as a comment)

Otherwise, strings can be unquoted. Unicode and emoji are safe:

```toon
message: Hello 世界 👋
note: This has inner spaces
```

## Escape Sequences

Six escape sequences are valid in quoted strings:

| Character | Escape |
|-----------|--------|
| Backslash (`\`) | `\\` |
| Double quote (`"`) | `\"` |
| Newline | `\n` |
| Carriage return | `\r` |
| Tab | `\t` |
| Any other U+0000–U+001F control character | `\uXXXX` |

Other escapes (e.g., `\x`, `\0`, `\b`) are invalid, and lone-surrogate `\uXXXX` values (U+D800–U+DFFF) are rejected.

## Array Headers

### Basic Header

```
key[N]:
```

- `N` = array length
- Default delimiter: comma

### Tabular Header

```
key[N]{field1,field2,field3}:
```

- `N` = array length
- `{fields}` = the field list, one leaf field per row cell
- Default delimiter: comma

### Nested Field Groups

```
key[N]{id,customer{name,country},total}:
```

- `customer{…}` = a column of uniform sub-objects folded into the header
- Rows stay flat: cells follow a depth-first walk of the field list

See [Format Overview – Nested Field Groups](/guide/format-overview#nested-field-groups) for details.

### Alternative Delimiters

::: code-group

```toon [Tab Delimiter]
items[2	]{id	name}:
  1	Ada
  2	Bob
```

```toon [Pipe Delimiter]
items[2|]{id|name}:
  1|Ada
  2|Bob
```

:::

The delimiter symbol appears inside the brackets and braces.

## Keyed Tabular Objects

An object of uniform objects collapses into a keyed header with one entry row per entry:

```toon
users[2:]{age,city}:
  alice: 30,Berlin
  bob: 25,Oslo
```

See [Format Overview – Keyed Tabular Objects](/guide/format-overview#keyed-tabular-objects) for details.

## Comments

Lines whose first non-space character is `#` are stripped before decoding:

```toon
# Full-line comments only; encoders never emit them
host: example.com
```

## Type Conversions

| Input | Output |
|-------|--------|
| Finite number in `[1e-6, 1e21)` (or zero) | Canonical decimal |
| Finite number outside that range | Exponent form permitted |
| `NaN`, `Infinity`, `-Infinity` | `null` |
| `BigInt` (safe range) | Number |
| `BigInt` (out of range) | Quoted decimal string |
| `Date` | ISO string (quoted) |
| `Set` | Array of normalized values |
| `Map` | Object with `String(key)` keys |
| `undefined`, `function`, `symbol` | `null` |

::: info
TOON itself doesn't specify how `Date` should be encoded – the spec leaves this to implementations. This library emits an ISO 8601 string in quotes; other implementations may choose differently.
:::
