# Using TOON with LLMs

TOON is designed for passing structured data to Large Language Models with reduced token costs and improved reliability. This guide shows how to use TOON effectively in prompts, both for input (sending data to models) and output (getting models to generate TOON).

This guide is about the TOON format itself. Code examples use the TypeScript library for demonstration, but the same patterns and techniques apply regardless of which programming language you're using.

## Why TOON for LLMs

LLM tokens cost money, and JSON is verbose – repeating every field name for every record in an array. TOON minimizes tokens especially for uniform arrays by declaring fields once and streaming data as rows, typically saving 30-60% compared to formatted JSON.

TOON adds structure guardrails: explicit `[N]` lengths and `{fields}` headers make it easier for models to track rows and for you to validate output. Strict mode helps detect truncation and malformed TOON when decoding model responses.

## Sending TOON as Input

TOON works best when you show the format instead of describing it. The structure is self-documenting – models parse it naturally once they see the pattern.

Wrap your encoded data in a fenced code block (label it ` ```toon` for clarity):

````md
Data is in TOON format (2-space indent, arrays show length and fields).

```toon
users[3]{id,name,role,lastLogin}:
  1,Alice,admin,2025-01-15T10:30:00Z
  2,Bob,user,2025-01-14T15:22:00Z
  3,Charlie,user,2025-01-13T09:45:00Z
```

Task: Summarize the user roles and their last activity.
````

The indentation and headers are usually enough – models treat TOON like familiar YAML or CSV. The explicit array lengths (`[N]`) and field headers (`{fields}`) help the model track structure, especially for large tables.

> [!NOTE]
> Most models don't have built-in TOON syntax highlighting, so ` ```toon` or ` ```yaml` both work fine. The structure is what matters.

## Generating TOON from LLMs

For output, be more explicit. When you want the model to **generate** TOON:

- **Show the expected header** (e.g., `users[N]{id,name,role}:`). The model fills rows instead of repeating keys, reducing generation errors.
- **State the rules**: 2-space indent, no trailing spaces, `[N]` matches row count.

Here's a prompt that works for both reading and generating:

````md
Data is in TOON format (2-space indent, arrays show length and fields).

```toon
users[3]{id,name,role,lastLogin}:
  1,Alice,admin,2025-01-15T10:30:00Z
  2,Bob,user,2025-01-14T15:22:00Z
  3,Charlie,user,2025-01-13T09:45:00Z
```

Task: Return only users with role "user" as TOON. Use the same header format. Set [N] to match the row count. Output only the code block.
````

**Expected output:**

```toon
users[2]{id,name,role,lastLogin}:
  2,Bob,user,2025-01-14T15:22:00Z
  3,Charlie,user,2025-01-13T09:45:00Z
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

Strict mode checks counts, indentation, and escaping so you can detect truncation or malformed TOON. For complete details, see the [API reference](/reference/api#decode).

## Delimiter Choices for Token Efficiency

Use `delimiter: '\t'` for tab-separated tables if you want even fewer tokens. Tabs are single characters, often tokenize more efficiently than commas, and rarely appear in natural text (reducing quote-escaping).

```ts
const toon = encode(data, { delimiter: '\t' })
```

Tell the model "fields are tab-separated" when using tabs. For more on delimiters, see the [Format Overview](/guide/format-overview#delimiter-options).

## Tips and Pitfalls

**Show, don't describe.** Don't explain TOON syntax in detail – just show an example. Models learn the pattern from context. A simple code block with 2-5 rows is more effective than paragraphs of explanation.

**Keep examples small.** Use 2-5 rows in your examples, not hundreds. The model generalizes from the pattern. Large examples waste tokens without improving accuracy.

**Always validate output.** Decode generated TOON with `strict: true` (default) to catch errors early. Don't assume model output is valid TOON without checking.

## Real-World Example

Here's a complete workflow: send data to a model and validate its TOON response.

**Prompt with TOON input:**

````md
System logs in TOON format (tab-separated):

```toon
events[4	]{id	level	message	timestamp}:
  1	error	Connection timeout	2025-01-15T10:00:00Z
  2	warn	Slow query	2025-01-15T10:05:00Z
  3	info	User login	2025-01-15T10:10:00Z
  4	error	Database error	2025-01-15T10:15:00Z
```

Task: Return only error-level events as TOON. Use the same format.
````

**Validate the response:**

```ts
import { decode } from '@toon-format/toon'

const modelResponse = `
events[2	]{id	level	message	timestamp}:
  1	error	Connection timeout	2025-01-15T10:00:00Z
  4	error	Database error	2025-01-15T10:15:00Z
`

const filtered = decode(modelResponse, { strict: true })
// ✓ Validated – model correctly filtered and adjusted [N] to 2
```
