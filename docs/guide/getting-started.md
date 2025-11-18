# Getting Started

## What is TOON?

**Token-Oriented Object Notation** is a compact, human-readable encoding of the JSON data model for LLM prompts. It provides a lossless serialization of the same objects, arrays, and primitives as JSON, but in a syntax that minimizes tokens and makes structure easy for models to follow.

TOON combines YAML's indentation-based structure for nested objects with a CSV-style tabular layout for uniform arrays. TOON's sweet spot is uniform arrays of objects (multiple fields per row, same structure across items), achieving CSV-like compactness while adding explicit structure that helps LLMs parse and validate data reliably.

Think of it as a translation layer: use JSON programmatically, and encode it as TOON for LLM input.

###  Why TOON?

Standard JSON is verbose and token-expensive. For uniform arrays of objects, JSON repeats every field name for every record:

```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" }
  ]
}
```

YAML already reduces some redundancy with indentation instead of braces:

```yaml
users:
  - id: 1
    name: Alice
    role: admin
  - id: 2
    name: Bob
    role: user
```

TOON goes further by declaring fields once and streaming data as rows:

```yaml
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user
```

The `[2]` declares the array length, enabling LLMs to answer dataset size questions and detect truncation. The `{id,name,role}` declares the field names. Each row is then a compact, comma-separated list of values. This is the core pattern: declare structure once, stream data compactly. The format approaches CSV's efficiency while adding explicit structure.

For a more realistic example, here's how TOON handles a dataset with both nested objects and tabular arrays:

::: code-group

```json [JSON (235 tokens)]
{
  "context": {
    "task": "Our favorite hikes together",
    "location": "Boulder",
    "season": "spring_2025"
  },
  "friends": ["ana", "luis", "sam"],
  "hikes": [
    {
      "id": 1,
      "name": "Blue Lake Trail",
      "distanceKm": 7.5,
      "elevationGain": 320,
      "companion": "ana",
      "wasSunny": true
    },
    {
      "id": 2,
      "name": "Ridge Overlook",
      "distanceKm": 9.2,
      "elevationGain": 540,
      "companion": "luis",
      "wasSunny": false
    },
    {
      "id": 3,
      "name": "Wildflower Loop",
      "distanceKm": 5.1,
      "elevationGain": 180,
      "companion": "sam",
      "wasSunny": true
    }
  ]
}
```

```yaml [TOON (106 tokens)]
context:
  task: Our favorite hikes together
  location: Boulder
  season: spring_2025
friends[3]: ana,luis,sam
hikes[3]{id,name,distanceKm,elevationGain,companion,wasSunny}:
  1,Blue Lake Trail,7.5,320,ana,true
  2,Ridge Overlook,9.2,540,luis,false
  3,Wildflower Loop,5.1,180,sam,true
```

:::

Notice how TOON combines YAML's indentation for the `context` object with inline format for the primitive `friends` array and tabular format for the structured `hikes` array. Each format is chosen automatically based on the data structure.

### Design Goals

TOON is optimized for specific use cases. It aims to:

- Make uniform arrays of objects as compact as possible by declaring structure once and streaming data.
- Stay fully lossless and deterministic – round-trips preserve all data and structure.
- Keep parsing simple and robust for both LLMs and humans through explicit structure markers.
- Provide validation guardrails (array lengths, field counts) that help detect truncation and malformed output.

## When to Use TOON

TOON excels with uniform arrays of objects – data with the same structure across items. For LLM prompts, the format produces deterministic, minimally quoted text with built-in validation. Explicit array lengths (`[N]`) and field headers (`{fields}`) help detect truncation and malformed data, while the tabular structure declares fields once rather than repeating them in every row.

::: tip
The TOON format is stable, but also an idea in progress. Nothing's set in stone – help shape where it goes by contributing to the [spec](https://github.com/toon-format/spec) or sharing feedback.
:::

## When Not to Use TOON

TOON is not always the best choice. Consider alternatives when:

- **Deeply nested or non-uniform structures** (tabular eligibility ≈ 0%): JSON-compact often uses fewer tokens. Example: complex configuration objects with many nested levels.
- **Semi-uniform arrays** (~40–60% tabular eligibility): Token savings diminish. Prefer JSON if your pipelines already rely on it.
- **Pure tabular data**: CSV is smaller than TOON for flat tables. TOON adds minimal overhead (~5-10%) to provide structure (array length declarations, field headers, delimiter scoping) that improves LLM reliability.
- **Latency-critical applications**: Benchmark on your exact setup. Some deployments (especially local/quantized models) may process compact JSON faster despite TOON's lower token count.

> [!NOTE]
> For data-driven comparisons across different structures, see [benchmarks](/guide/benchmarks). When optimizing for latency, measure TTFT, tokens/sec, and total time for both TOON and JSON-compact and use whichever performs better in your specific environment.

## Installation

### TypeScript Library

Install the library via your preferred package manager:

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

### CLI

The CLI can be used without installation via `npx`, or installed globally:

::: code-group

```bash [npx (no install)]
npx @toon-format/cli input.json -o output.toon
```

```bash [npm]
npm install -g @toon-format/cli
```

```bash [pnpm]
pnpm add -g @toon-format/cli
```

```bash [yarn]
yarn global add @toon-format/cli
```

:::

For full CLI documentation, see the [CLI reference](/cli/).

## Your First Example

The examples below use the TypeScript library for demonstration, but the same operations work in any language with a TOON implementation.

Let's encode a simple dataset with the TypeScript library:

```ts
import { encode } from '@toon-format/toon'

const data = {
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
}

console.log(encode(data))
```

**Output:**

```yaml
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user
```

### Decoding Back to JSON

Decoding is just as simple:

```ts
import { decode } from '@toon-format/toon'

const toon = `
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user
`

const data = decode(toon)
console.log(JSON.stringify(data, null, 2))
```

**Output:**

```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" }
  ]
}
```

Round-tripping is lossless: `decode(encode(x))` always equals `x` (after normalization of non-JSON types like `Date`, `NaN`, etc.).

## Where to Go Next

Now that you've seen your first TOON document, read the [Format Overview](/guide/format-overview) for complete syntax details (objects, arrays, quoting rules, key folding), then explore [Using TOON with LLMs](/guide/llm-prompts) to see how to use it effectively in prompts. For implementation details, check the [API reference](/reference/api) (TypeScript) or the [specification](/reference/spec) (language-agnostic normative rules).
