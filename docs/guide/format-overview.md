---
description: TOON syntax with concrete examples – objects, arrays, tabular headers, comments, and quoting rules.
---

# Format Overview

TOON syntax reference with concrete examples. See [Getting Started](/guide/getting-started) for an introduction.

## The Four Forms

A **form** is one rendering of a value. Which form you get follows from the data's shape and where it sits – you never choose by hand. Everything below is a variation on these four:

| Form | Applies to | Looks like |
| ---- | ---------- | ---------- |
| [Inline](#primitive-arrays-inline-form) | Arrays of primitives | `tags[3]: admin,ops,dev` |
| [List](#mixed-and-non-uniform-arrays-list-form) | Arrays that fit neither inline nor tabular form | `items[2]:` then `- ` per element |
| [Tabular](#arrays-of-objects-tabular-form) | Arrays of uniform objects | `items[2]{sku,qty}:` then one row per element |
| [Keyed tabular](#keyed-tabular-objects) | Objects whose values are uniform objects | `users[2:]{age,city}:` then one entry row per entry |

"Form" is deliberate: these are shapes *within* TOON, not sibling formats to JSON or YAML.

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

```toon
id: 123
name: Ada
active: true
```

Indentation replaces braces. One space follows the colon.

### Nested Objects

Nested objects add one indentation level (default: 2 spaces):

```toon
user:
  id: 123
  name: Ada
```

When a key ends with `:` and has no value on the same line, it opens a nested object. All lines at the next indentation level belong to that object.

### Empty Objects

An empty object at the root yields an empty document (no lines). A nested empty object is `key:` alone, with no children.

### Keyed Tabular Objects

When an object has at least two entries whose values are uniform objects (same keys, primitive or nested-uniform values), it collapses into a keyed tabular form: the shared field structure appears once in the header, and each entry becomes one row that carries its own key:

```toon
users[2:]{age,city}:
  alice: 30,Berlin
  bob: 25,Oslo
```

The colon immediately after the length (`[2:]`) marks the keyed header, and `[N]` declares the entry count. Each entry row is `entrykey: cell,cell,…` – the entry key followed by the entry value's leaf values in field order.

When the root object itself is eligible, the key is omitted:

```text
[2:]{age,city}:
  alice: 30,Berlin
  bob: 25,Oslo
```

Objects that don't qualify keep the nested form unchanged: single-entry objects, objects whose values mix shapes or include primitives, arrays, or empty objects. In practice this leaves most configuration-style maps as they are ([spec §9.5](https://github.com/toon-format/spec/blob/main/SPEC.md#95-objects-of-uniform-objects--keyed-tabular-form)).

## Arrays

TOON detects array structure and chooses the most efficient representation. Arrays always declare their length in brackets: `[N]`.

### Primitive Arrays (Inline Form)

Arrays of primitives (strings, numbers, booleans, null) are rendered inline:

```toon
tags[3]: admin,ops,dev
```

The delimiter (comma by default) separates values. Strings containing the active delimiter must be quoted.

### Arrays of Objects (Tabular Form)

When all objects in an array share the same set of primitive-valued keys, TOON uses tabular form:

::: code-group

```toon [Basic Tabular]
items[2]{sku,qty,price}:
  A1,2,9.99
  B2,1,14.5
```

```toon [Spaces and Quoting]
users[2]{id,name,role}:
  1,Ada Lovelace,admin
  2,"Smith, Bob",user
```

:::

The header `items[2]{sku,qty,price}:` declares:
- **Array length**: `[2]` means 2 rows
- **Field names**: `{sku,qty,price}` defines the columns
- **Active delimiter**: comma (default)

Each row contains values in the same order as the field list. Values are encoded as primitives (strings, numbers, booleans, null) and separated by the delimiter.

> [!NOTE]
> Tabular form requires identical field sets across all objects (same keys, order per object may vary), at least one key per object, and every column either primitive-valued or a uniform nested object (see below) – arrays that contain an empty `{}` element or mix value shapes within a column fall back to list form.

### Nested Field Groups

A column whose values are uniform sub-objects (same keys in every element, recursively primitive or nested-uniform) folds into the header as a nested field group, while rows stay flat:

```toon
orders[2]{id,customer{name,country},total}:
  1,Ada,DK,99
  2,Bob,UK,149
```

The header `customer{name,country}` declares a nested-object column; each row's cells follow a depth-first walk of the field list, so `Ada,DK` fills `customer.name` and `customer.country` of the first order. Nesting depth is unbounded ([spec §9.3](https://github.com/toon-format/spec/blob/main/SPEC.md#93-arrays-of-objects--tabular-form)).

### Mixed and Non-Uniform Arrays (List Form)

Arrays that don't meet the tabular requirements use list form with hyphen markers:

```toon
items[3]:
  - 1
  - a: 1
  - text
```

Each element starts with `- ` at one indentation level deeper than the parent array header.

### Objects as List Items

When an array element is an object, it appears as a list item:

```toon
items[2]:
  - id: 1
    name: First
  - id: 2
    name: Second
    extra: true
```

When a tabular array is the first field of a list-item object, the tabular header appears on the hyphen line, with rows indented two levels deeper and other fields indented one level deeper:

```toon
items[1]:
  - users[2]{id,name}:
      1,Ada
      2,Bob
    status: active
```

When the object has only a single tabular field, the same pattern applies:

```toon
items[1]:
  - users[2]{id,name}:
      1,Ada
      2,Bob
```

This is the canonical encoding for list-item objects whose first field is a tabular array.

### Arrays of Arrays (List Form)

When you have arrays containing primitive inner arrays:

```toon
pairs[2]:
  - [2]: 1,2
  - [2]: 3,4
```

Each inner array gets its own header on the list-item line.

When the inner arrays are themselves arrays of objects or non-uniform arrays, the same `- [N]:` header appears on the hyphen line and the nested items follow one indent deeper:

```toon
items[3]:
  - summary
  - id: 1
    name: Ada
  - [2]:
    - id: 2
    - status: draft
```

### Empty Arrays

Empty arrays render as `key: []` for fields and `[]` at the root:

```toon
items: []
```

The legacy `items[0]:` form is still decoded for backward compatibility.

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

> [!NOTE]
> The array length `[N]` helps LLMs validate structure. If you ask a model to generate TOON output, explicit lengths let you detect truncation or malformed data.

### Delimiter Options

TOON supports three delimiters: comma (default), tab, and pipe. The delimiter is scoped to the array header that declares it.

::: code-group

```toon [Comma (default)]
items[2]{sku,name,qty,price}:
  A1,Widget,2,9.99
  B2,Gadget,1,14.5
```

```toon [Tab]
items[2	]{sku	name	qty	price}:
  A1	Widget	2	9.99
  B2	Gadget	1	14.5
```

```toon [Pipe]
items[2|]{sku|name|qty|price}:
  A1|Widget|2|9.99
  B2|Gadget|1|14.5
```

:::

Tab and pipe delimiters are explicitly encoded in the header brackets and field braces. Inside an array scope, only the active delimiter triggers quoting – the others are literal data. Object field values (`key: value`) follow the document delimiter (§11.1) regardless of any surrounding array's active delimiter.

> [!TIP]
> Tab delimiters often tokenize more efficiently than commas, especially for data with few quoted strings. Use `encode(data, { delimiter: '\t' })` for additional token savings.

## Comments

Decoders strip every line whose first non-space character is `#` in a lexical pre-pass, before anything else:

```toon
# Server configuration
host: example.com
port: 8080
```

Comments are full-line only – a `#` anywhere else on a line is ordinary content – and decode-side only: encoders never emit them, and string values starting with `#` are always quoted so encoder output never contains a line that reads as a comment. A comment between tabular rows or entry rows does not end them ([spec §5.1](https://github.com/toon-format/spec/blob/main/SPEC.md#51-comment-lines)).

## Quoting and Types

### When Strings Need Quotes

TOON quotes strings **only when necessary** to maximize token efficiency. A string must be quoted if:

- It's empty (`""`)
- It has leading or trailing whitespace
- It equals `true`, `false`, or `null` (case-sensitive)
- It looks like a number (e.g., `"42"`, `"-3.14"`, `"1e-6"`, `"05"`, `"+1"`)
- It contains special characters: colon (`:`), quote (`"`), backslash (`\`), brackets, braces, or any control character in U+0000–U+001F
- It contains the relevant delimiter (the active delimiter inside an array scope, or the document delimiter elsewhere)
- It equals `"-"` or starts with `"-"` followed by any character
- It equals `"#"` or starts with `"#"` (the line would read as a comment)

Otherwise, strings can be unquoted. Unicode, emoji, and strings with internal (non-leading/trailing) spaces are safe unquoted:

```toon
message: Hello 世界 👋
note: This has inner spaces
```

### Escape Sequences

In quoted strings and keys, six escape sequences are valid:

| Character | Escape |
|-----------|--------|
| Backslash (`\`) | `\\` |
| Double quote (`"`) | `\"` |
| Newline (U+000A) | `\n` |
| Carriage return (U+000D) | `\r` |
| Tab (U+0009) | `\t` |
| Any other U+0000–U+001F control character | `\uXXXX` |

Other escapes (e.g., `\x`, `\0`, `\b`) are always rejected, as are lone-surrogate `\uXXXX` values (U+D800–U+DFFF).

### Type Conversions

Numbers are emitted in canonical decimal form for values in the §2 carve-out range; exponent notation is permitted outside. Non-JSON types (`NaN`, `Infinity`, `BigInt`, `Date`, `Set`, `Map`, `undefined`, etc.) are normalized before encoding – see [API Reference – Type Normalization](/reference/api#type-normalization) for the full mapping.

Decoders accept both decimal and exponent forms on input (e.g., `42`, `-3.14`, `1e-6`), and treat tokens with forbidden leading zeros (e.g., `"05"`) as strings, not numbers.

### Custom Serialization with toJSON

Objects with a `toJSON()` method are serialized by calling the method and normalizing its result before encoding, similar to `JSON.stringify`:

```ts
const obj = {
  data: 'example',
  toJSON() {
    return { info: this.data }
  }
}

encode(obj)
// info: example
```

The `toJSON()` method:

- Takes precedence over built-in normalization (Date, Array, Set, Map)
- Results are recursively normalized
- Is called for objects with `toJSON` in their prototype chain

---

For complete rules on quoting, escaping, type conversions, and strict-mode decoding, see [spec §2–4 (data model), §7 (strings and keys), and §14 (strict mode)](https://github.com/toon-format/spec/blob/main/SPEC.md).
