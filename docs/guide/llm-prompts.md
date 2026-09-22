---
description: Prompting strategies for sending TOON to LLMs and validating TOON they generate, with examples.
---

# Using TOON with LLMs

TOON is designed for passing structured data to Large Language Models with reduced token costs and improved reliability. This guide shows how to use TOON effectively in prompts, both for input (sending data to models) and output (getting models to generate TOON).

## Why TOON for LLMs

Beyond token savings (see [Benchmarks](/guide/benchmarks)), TOON adds structure guardrails: explicit `[N]` lengths and `{fields}` headers make it easier for models to track rows and for you to validate output. Strict mode helps detect truncation and malformed TOON when decoding model responses.

## Sending TOON as Input

TOON works best when you show the format instead of describing it. The structure is self-documenting – models parse it naturally once they see the pattern.

Wrap your encoded data in a fenced code block (label it ` ```toon` for clarity):

````md
Data is in TOON format (2-space indent, arrays show length and fields).

```toon
users[3]{id,name,role,lastLogin}:
  1,Ada,admin,"2025-01-15T10:30:00Z"
  2,Bob,user,"2025-01-14T15:22:00Z"
  3,Cleo,user,"2025-01-13T09:45:00Z"
```

Task: Summarize the user roles and their last activity.
````

The indentation and headers are usually enough – models treat TOON like familiar YAML or CSV. The explicit array lengths (`[N]`) and field lists (`{fields}`) help the model track structure, especially for large tables.

> [!NOTE]
> Most models don't have built-in TOON syntax highlighting, so ` ```toon` or ` ```yaml` both work fine. The structure is what matters.

### Nested and Keyed Data

Uniform nested objects don't break the tabular form: a nested-object column folds into the header as a [nested field group](/guide/format-overview#nested-field-groups), and rows stay flat:

```toon
orders[2]{id,customer{name,country},total}:
  1,Ada,DK,99
  2,Bob,UK,149
```

Maps of uniform objects – feature flags, users by ID, per-environment config – collapse into the [keyed tabular form](/guide/format-overview#keyed-tabular-objects), where each entry row carries its own key:

```toon
environments[2:]{region,replicas,debug}:
  production: eu-central-1,6,false
  staging: eu-central-1,2,true
```

The same prompting rules apply: one example is enough, the header tells the model how to read the rows.

### Annotating Data with Comments

Decoders strip full-line `#` [comment lines](/guide/format-overview#comments) before parsing, so you can annotate prompt data by hand – and model output that includes `#` explainer lines still decodes cleanly. Encoders never emit comments, so round-trips stay canonical.

```toon
# Only active users, exported 2025-01-15
users[2]{id,name,role}:
  1,Ada,admin
  2,Bob,user
```

## Generating TOON from LLMs

For output, be more explicit. When you want the model to **generate** TOON:

- **Show the expected header** (e.g., `users[N]{id,name,role}:`). The model fills rows instead of repeating keys, reducing generation errors.
- **State the rules**: 2-space indent, no trailing spaces, `[N]` matches row count.

Here's a prompt that works for both reading and generating:

````md
Data is in TOON format (2-space indent, arrays show length and fields).

```toon
users[3]{id,name,role,lastLogin}:
  1,Ada,admin,"2025-01-15T10:30:00Z"
  2,Bob,user,"2025-01-14T15:22:00Z"
  3,Cleo,user,"2025-01-13T09:45:00Z"
```

Task: Return only users with role "user" as TOON. Use the same header format. Set [N] to match the row count. Output only the code block.
````

**Expected output:**

```toon
users[2]{id,name,role,lastLogin}:
  2,Bob,user,"2025-01-14T15:22:00Z"
  3,Cleo,user,"2025-01-13T09:45:00Z"
```

The model adjusts `[N]` to `2` and generates two rows.

### Validation with Strict Mode

When decoding model-generated TOON, use strict mode (default) to catch errors:

```ts
import { decode } from '@toon-format/toon'

try {
  const data = decode(modelOutput, { strict: true })
  // Success – data is valid
}
catch (error) {
  // Model output was malformed (count mismatch, invalid escapes, etc.)
  console.error('Validation failed:', error.message)
}
```

Strict mode checks counts, indentation, and escaping so you can detect truncation or malformed TOON. For complete details, see the [API Reference](/reference/api#decode-input-options).

## Delimiter Choices for Token Efficiency

Use `delimiter: '\t'` for tab-separated tables if you want even fewer tokens. Tabs are single characters, often tokenize more efficiently than commas, and rarely appear in natural text (reducing quote-escaping).

```ts
const toon = encode(data, { delimiter: '\t' })
```

Tell the model "fields are tab-separated" when using tabs. For more on delimiters, see the [Format Overview](/guide/format-overview#delimiter-options).

## Streaming Large Outputs

When working with large datasets (thousands of records or deeply nested structures), use `encodeLines()` to stream TOON output line-by-line instead of building the full string in memory.

```ts
import { encodeLines } from '@toon-format/toon'

const largeData = await fetchThousandsOfRecords()

// Stream large dataset without loading full string in memory
for (const line of encodeLines(largeData, { delimiter: '\t' })) {
  process.stdout.write(`${line}\n`)
}
```

The CLI also supports streaming for memory-efficient JSON-to-TOON conversion:

```bash
toon large-dataset.json -o output.toon
```

This streaming approach prevents out-of-memory errors when preparing large context windows for LLMs. For complete details on `encodeLines()`, see the [API Reference](/reference/api#encodelines-input-options).

**Consuming streaming LLM outputs:** If your LLM client exposes streaming text and you buffer by lines, you can decode TOON incrementally:

```ts
import { decodeFromLines } from '@toon-format/toon'

// Buffer streaming response into lines
const lines: string[] = []
let buffer = ''

for await (const chunk of modelStream) {
  buffer += chunk
  let index: number

  while ((index = buffer.indexOf('\n')) !== -1) {
    lines.push(buffer.slice(0, index))
    buffer = buffer.slice(index + 1)
  }
}

// Decode buffered lines
const data = decodeFromLines(lines)
```

For streaming decode APIs, see [`decodeFromLines()`](/reference/api#decodefromlines-lines-options) and [`decodeStream()`](/reference/api#decodestream-source-options).

## Tips and Pitfalls

**Show, don't describe.** Don't explain TOON syntax in detail – just show an example. Models learn the pattern from context. A simple code block with 2–5 rows is more effective than paragraphs of explanation.

**Keep examples small.** Use 2–5 rows in your examples, not hundreds. The model generalizes from the pattern. Large examples waste tokens without improving accuracy.

**Always validate output.** Decode generated TOON with `strict: true` (default) to catch errors early. Don't assume model output is valid TOON without checking.

## Real-World Example

Here's a complete workflow: send data to a model and validate its TOON response.

**Prompt with TOON input:**

````md
System logs in TOON format (tab-separated):

```toon
events[4	]{id	level	message	timestamp}:
  1	error	Connection timeout	"2025-01-15T10:00:00Z"
  2	warn	Slow query	"2025-01-15T10:05:00Z"
  3	info	User login	"2025-01-15T10:10:00Z"
  4	error	Database error	"2025-01-15T10:15:00Z"
```

Task: Return only error-level events as TOON. Use the same format.
````

**Validate the response:**

```ts
import { decode } from '@toon-format/toon'

const modelResponse = `
events[2	]{id	level	message	timestamp}:
  1	error	Connection timeout	"2025-01-15T10:00:00Z"
  4	error	Database error	"2025-01-15T10:15:00Z"
`

const filtered = decode(modelResponse, { strict: true })
// ✓ Validated – model correctly filtered and adjusted [N] to 2
```
