# Syntax Cheatsheet

Quick reference for mapping JSON to TOON format. For rigorous, normative syntax rules and edge cases, see the [specification](/reference/spec).

## Objects

::: code-group

```json [JSON]
{
  "id": 1,
  "name": "Ada"
}
```

```yaml [TOON]
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

```yaml [TOON]
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

```yaml [TOON]
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

```yaml [TOON]
items[2]{id,qty}:
  1,5
  2,3
```

:::

## Mixed / Non-Uniform Arrays

::: code-group

```json [JSON]
{
  "items": [1, { "a": 1 }, "x"]
}
```

```yaml [TOON]
items[3]:
  - 1
  - a: 1
  - x
```

:::

## Arrays of Arrays

::: code-group

```json [JSON]
{
  "pairs": [[1, 2], [3, 4]]
}
```

```yaml [TOON]
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

```yaml [TOON]
[3]: x,y,z
```

:::

## Empty Containers

::: code-group

```json [Empty Object]
{}
```

```yaml [Empty Object]
(empty output)
```

:::

::: code-group

```json [Empty Array]
{
  "items": []
}
```

```yaml [Empty Array]
items[0]:
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

```yaml [TOON]
version: "123"
enabled: "true"
```

:::

These strings must be quoted because they look like numbers/booleans.

### Strings with Active Delimiter

::: code-group

```json [JSON]
{
  "note": "hello, world"
}
```

```yaml [TOON]
note: "hello, world"
```

:::

Strings containing the active delimiter (comma by default) must be quoted.

### Strings with Leading/Trailing Spaces

::: code-group

```json [JSON]
{
  "message": " padded "
}
```

```yaml [TOON]
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

```yaml [TOON]
name: ""
```

:::

## Quoting Rules Summary

Strings **must** be quoted if they:

- Are empty (`""`)
- Have leading or trailing whitespace
- Equal `true`, `false`, or `null` (case-sensitive)
- Look like numbers (e.g., `"42"`, `"-3.14"`, `"1e-6"`, `"05"`)
- Contain special characters: `:`, `"`, `\`, `[`, `]`, `{`, `}`, newline, tab, carriage return
- Contain the active delimiter (comma by default, or tab/pipe if declared in header)
- Equal `"-"` or start with `"-"` followed by any character

Otherwise, strings can be unquoted. Unicode and emoji are safe:

```yaml
message: Hello 世界 👋
note: This has inner spaces
```

## Escape Sequences

Only five escape sequences are valid in quoted strings:

| Character | Escape |
|-----------|--------|
| Backslash (`\`) | `\\` |
| Double quote (`"`) | `\"` |
| Newline | `\n` |
| Carriage return | `\r` |
| Tab | `\t` |

All other escapes (e.g., `\x`, `\u`) are invalid.

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
- `{fields}` = column names
- Default delimiter: comma

### Alternative Delimiters

::: code-group

```yaml [Tab Delimiter]
items[2	]{id	name}:
  1	Alice
  2	Bob
```

```yaml [Pipe Delimiter]
items[2|]{id|name}:
  1|Alice
  2|Bob
```

:::

The delimiter symbol appears inside the brackets and braces.

## Key Folding (Optional)

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

See [Format Overview – Key Folding](/guide/format-overview#key-folding-optional) for details.

## Type Conversions

| Input | Output |
|-------|--------|
| Finite number | Canonical decimal (no exponent, no trailing zeros) |
| `NaN`, `Infinity`, `-Infinity` | `null` |
| `BigInt` (safe range) | Number |
| `BigInt` (out of range) | Quoted decimal string |
| `Date` | ISO string (quoted) |
| `undefined`, `function`, `symbol` | `null` |
