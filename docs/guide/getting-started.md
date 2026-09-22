---
description: What TOON is, when to use it, and a first encode/decode example with the TypeScript library.
---

# Getting Started

## What Is TOON?

**Token-Oriented Object Notation** is a compact, human-readable encoding of the JSON data model that minimizes tokens and makes structure easy for models to follow.

TOON combines YAML's indentation-based structure for nested objects with CSV-style tabular forms for uniform data. Its sweet spot is uniform objects – same fields across items, whether in an array or keyed by ID – reaching CSV-like compactness while adding explicit structure that helps LLMs parse and validate data reliably.

Think of it as a translation layer: use JSON programmatically, and encode it as TOON for LLM input – a drop-in, lossless representation of the JSON you already have.

### Why TOON?

LLM tokens cost money – and standard JSON is verbose. A weather forecast in TOON:

```toon
location:
  city: Berlin
  country: DE
  units: metric
alerts[2]: frost,wind
forecast[3]{day,temp{min,max},condition,rainChance}:
  Mon,-2,4,snow,80
  Tue,1,7,cloudy,20
  Wed,3,11,sunny,5
```

The same data as JSON – ~117 tokens against TOON's ~66:

```json
{
  "location": {
    "city": "Berlin",
    "country": "DE",
    "units": "metric"
  },
  "alerts": [
    "frost",
    "wind"
  ],
  "forecast": [
    {
      "day": "Mon",
      "temp": {
        "min": -2,
        "max": 4
      },
      "condition": "snow",
      "rainChance": 80
    },
    {
      "day": "Tue",
      "temp": {
        "min": 1,
        "max": 7
      },
      "condition": "cloudy",
      "rainChance": 20
    },
    {
      "day": "Wed",
      "temp": {
        "min": 3,
        "max": 11
      },
      "condition": "sunny",
      "rainChance": 5
    }
  ]
}
```

TOON combines YAML's indentation for the `location` object, inline form for the primitive `alerts` array, and tabular form for the `forecast` array: `[3]` declares the array length (letting LLMs answer dataset-size questions and detect truncation), `{day,…}` declares the field names once, and each row streams comma-separated values. The uniform nested `temp` objects fold into the header as a [nested field group](/guide/format-overview#nested-field-groups) (`temp{min,max}`) while rows stay flat. Each form is chosen automatically from the data's shape.

The pattern is the same throughout TOON: declare structure once, stream data compactly – landing close to CSV density with explicit structure preserved.

Maps of uniform objects collapse as well: the [keyed tabular form](/guide/format-overview#keyed-tabular-objects) turns them into tables whose rows carry their own keys.

### Design Goals

TOON is optimized for specific use cases. It aims to:

- Make arrays of uniform objects as compact as possible by declaring structure once and streaming data.
- Stay fully lossless and deterministic – round-trips preserve all data and structure.
- Keep parsing simple and robust for both LLMs and humans through explicit structure markers.
- Provide validation guardrails (array lengths, field counts) that help detect truncation and malformed output.

## When to Use TOON

TOON excels with arrays of uniform objects – data with the same structure across items. For LLM prompts, the format produces deterministic, minimally quoted text with built-in validation. Explicit array lengths (`[N]`) and field lists (`{fields}`) help detect truncation and malformed data, while tabular form declares the field list once rather than repeating it in every row.

::: tip
The TOON format is stable, but also an idea in progress. Nothing's set in stone – help shape where it goes by contributing to the [spec](https://github.com/toon-format/spec) or sharing feedback.
:::

## When Not to Use TOON

TOON is not always the best choice. Consider alternatives when:

- **Deeply nested or non-uniform structures** (tabular eligibility ≈ 0%): JSON-compact often uses fewer tokens. Example: complex configuration objects with many nested levels.
- **Semi-uniform arrays** (~40–60% tabular eligibility): Token savings diminish. Prefer JSON if your pipelines already rely on it.
- **Pure tabular data**: CSV is smaller than TOON for flat tables. TOON adds minimal overhead (~5–10%) to provide structure (array length declarations, field lists, delimiter scoping) that improves LLM reliability.
- **Latency-critical applications**: Benchmark on your exact setup. Some deployments (especially local/quantized models) may process compact JSON faster despite TOON's lower token count.

::: info
For data-driven comparisons across different structures, see [Benchmarks](/guide/benchmarks). When optimizing for latency, measure TTFT, tokens/sec, and total time for both TOON and JSON-compact, and use whichever is faster in your specific environment.
:::

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

## Media Type & File Extension

TOON files conventionally use the `.toon` extension. For HTTP transmission, the provisional media type is `text/toon`, always with UTF-8 encoding. While you may specify `charset=utf-8` explicitly, it's optional – UTF-8 is the default assumption. This follows the registration process outlined in [spec §17](https://github.com/toon-format/spec/blob/main/SPEC.md#17-iana-considerations).

## Your First Example

The examples below use the TypeScript library for demonstration, but the same operations work in any language with a TOON implementation.

Let's encode a simple dataset with the TypeScript library:

```ts
import { encode } from '@toon-format/toon'

const data = {
  users: [
    { id: 1, name: 'Ada', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
}

console.log(encode(data))
```

**Output:**

```toon
users[2]{id,name,role}:
  1,Ada,admin
  2,Bob,user
```

### Decoding Back to JSON

Decoding is just as simple:

```ts
import { decode } from '@toon-format/toon'

const toon = `
users[2]{id,name,role}:
  1,Ada,admin
  2,Bob,user
`

const data = decode(toon)
console.log(JSON.stringify(data, null, 2))
```

**Output:**

```json
{
  "users": [
    { "id": 1, "name": "Ada", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" }
  ]
}
```

Round-tripping is lossless: `decode(encode(x))` always equals `x` (after normalization of non-JSON types like `Date`, `NaN`, etc.).

## Where to Go Next

Now that you've seen your first TOON document, read the [Format Overview](/guide/format-overview) for complete syntax details (objects, arrays, tabular forms, quoting rules), then explore [Using TOON with LLMs](/guide/llm-prompts) to see how to use it effectively in prompts. For implementation details, check the [API Reference](/reference/api) (TypeScript) or the [Specification](/reference/spec) (language-agnostic normative rules).
