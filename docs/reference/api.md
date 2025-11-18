# API Reference

TypeScript/JavaScript API documentation for the `@toon-format/toon` package. For format rules, see the [Format Overview](/guide/format-overview) or the [Specification](/reference/spec). For other languages, see [Implementations](/ecosystem/implementations).

## Installation

::: code-group

```bash [npm]
npm install @toon-format/toon
```

```bash [pnpm]
pnpm add @toon-format/toon
```

```bash [yarn]
yarn add @toon-format/toon
```

:::

## `encode(value, options?)`

Converts any JSON-serializable value to TOON format.

```ts
import { encode } from '@toon-format/toon'

const toon = encode(data, {
  indent: 2,
  delimiter: ',',
  keyFolding: 'off',
  flattenDepth: Infinity
})
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `unknown` | Any JSON-serializable value (object, array, primitive, or nested structure) |
| `options` | `EncodeOptions?` | Optional encoding options (see below) |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `indent` | `number` | `2` | Number of spaces per indentation level |
| `delimiter` | `','` \| `'\t'` \| `'\|'` | `','` | Delimiter for array values and tabular rows |
| `keyFolding` | `'off'` \| `'safe'` | `'off'` | Enable key folding to collapse single-key wrapper chains into dotted paths |
| `flattenDepth` | `number` | `Infinity` | Maximum number of segments to fold when `keyFolding` is enabled (values 0-1 have no practical effect) |

### Return Value

Returns a TOON-formatted string with no trailing newline or spaces.

### Type Normalization

Non-JSON-serializable values are normalized before encoding:

| Input | Output |
|-------|--------|
| Finite number | Canonical decimal (no exponent, no leading/trailing zeros: `1e6` → `1000000`, `-0` → `0`) |
| `NaN`, `Infinity`, `-Infinity` | `null` |
| `BigInt` (within safe range) | Number |
| `BigInt` (out of range) | Quoted decimal string (e.g., `"9007199254740993"`) |
| `Date` | ISO string in quotes (e.g., `"2025-01-01T00:00:00.000Z"`) |
| `undefined`, `function`, `symbol` | `null` |

### Example

```ts
import { encode } from '@toon-format/toon'

const items = [
  { sku: 'A1', qty: 2, price: 9.99 },
  { sku: 'B2', qty: 1, price: 14.5 }
]

console.log(encode({ items }))
```

**Output:**

```yaml
items[2]{sku,qty,price}:
  A1,2,9.99
  B2,1,14.5
```

### Delimiter Options

::: code-group

```ts [Comma (default)]
encode(data, { delimiter: ',' })
```

```ts [Tab]
encode(data, { delimiter: '\t' })
```

```ts [Pipe]
encode(data, { delimiter: '|' })
```

:::

::: details Why Use Tab Delimiters?
Tab delimiters (`\t`) often tokenize more efficiently than commas:
- Tabs are single characters
- Tabs rarely appear in natural text, reducing quote-escaping
- The delimiter is explicitly encoded in the array header

Example:

```yaml
items[2	]{sku	name	qty	price}:
  A1	Widget	2	9.99
  B2	Gadget	1	14.5
```

For maximum token savings on large tabular data, combine tab delimiters with key folding:
```ts
encode(data, { delimiter: '\t', keyFolding: 'safe' })
```
:::

## `decode(input, options?)`

Converts a TOON-formatted string back to JavaScript values.

```ts
import { decode } from '@toon-format/toon'

const data = decode(toon, {
  indent: 2,
  strict: true,
  expandPaths: 'off'
})
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `string` | A TOON-formatted string to parse |
| `options` | `DecodeOptions?` | Optional decoding options (see below) |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `indent` | `number` | `2` | Expected number of spaces per indentation level |
| `strict` | `boolean` | `true` | Enable strict validation (array counts, indentation, delimiter consistency) |
| `expandPaths` | `'off'` \| `'safe'` | `'off'` | Enable path expansion to reconstruct dotted keys into nested objects (pairs with `keyFolding: 'safe'`) |

### Return Value

Returns a JavaScript value (object, array, or primitive) representing the parsed TOON data.

### Strict Mode

By default (`strict: true`), the decoder validates input strictly:

- **Invalid escape sequences**: Throws on `\x`, unterminated strings
- **Syntax errors**: Throws on missing colons, malformed headers
- **Array length mismatches**: Throws when declared length doesn't match actual count
- **Delimiter mismatches**: Throws when row delimiters don't match header
- **Indentation errors**: Throws when leading spaces aren't exact multiples of `indentSize`

Set `strict: false` to skip validation for lenient parsing.

### Example

```ts
import { decode } from '@toon-format/toon'

const toon = `
items[2]{sku,qty,price}:
  A1,2,9.99
  B2,1,14.5
`

const data = decode(toon)
console.log(data)
```

**Output:**

```json
{
  "items": [
    { "sku": "A1", "qty": 2, "price": 9.99 },
    { "sku": "B2", "qty": 1, "price": 14.5 }
  ]
}
```

### Path Expansion

When `expandPaths: 'safe'` is enabled, dotted keys are split into nested objects:

```ts
import { decode } from '@toon-format/toon'

const toon = 'data.metadata.items[2]: a,b'

const data = decode(toon, { expandPaths: 'safe' })
console.log(data)
// { data: { metadata: { items: ['a', 'b'] } } }
```

This pairs with `keyFolding: 'safe'` for lossless round-trips.

::: details Expansion Conflict Resolution
When multiple expanded keys construct overlapping paths, the decoder merges them recursively:
- **Object + Object**: Deep merge recursively
- **Object + Non-object** (array or primitive): Conflict
  - With `strict: true` (default): Error
  - With `strict: false`: Last-write-wins (LWW)

Example conflict (strict mode):

```ts
const toon = 'a.b: 1\na: 2'
decode(toon, { expandPaths: 'safe', strict: true })
// Error: "Expansion conflict at path 'a' (object vs primitive)"
```

Example conflict (lenient mode):

```ts
const toon = 'a.b: 1\na: 2'
decode(toon, { expandPaths: 'safe', strict: false })
// { a: 2 } (last write wins)
```
:::

## Round-Trip Compatibility

TOON provides lossless round-trips after normalization:

```ts
import { decode, encode } from '@toon-format/toon'

const original = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
}

const toon = encode(original)
const restored = decode(toon)

console.log(JSON.stringify(original) === JSON.stringify(restored))
// true
```

### With Key Folding

```ts
import { decode, encode } from '@toon-format/toon'

const original = { data: { metadata: { items: ['a', 'b'] } } }

// Encode with folding
const toon = encode(original, { keyFolding: 'safe' })
// → "data.metadata.items[2]: a,b"

// Decode with expansion
const restored = decode(toon, { expandPaths: 'safe' })
// → { data: { metadata: { items: ['a', 'b'] } } }

console.log(JSON.stringify(original) === JSON.stringify(restored))
// true
```

## Types

```ts
interface EncodeOptions {
  indent?: number
  delimiter?: ',' | '\t' | '|'
  keyFolding?: 'off' | 'safe'
  flattenDepth?: number
}

interface DecodeOptions {
  indent?: number
  strict?: boolean
  expandPaths?: 'off' | 'safe'
}
```
