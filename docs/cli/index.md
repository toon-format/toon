---
description: Convert JSON to TOON and back from the command line, with token statistics, streaming, and delimiter options.
---

# Command Line Interface

The `@toon-format/cli` package converts JSON to TOON and TOON to JSON. Use it to measure token savings before integrating TOON into your application, or to pipe JSON through TOON in shell workflows alongside tools like `curl` and `jq`. The CLI supports stdin/stdout, token statistics, streaming for large datasets, and every encoding option in the library.

The CLI is built on the `@toon-format/toon` TypeScript implementation and follows the [latest specification](/reference/spec).

## Usage

### Without Installation

Use `npx` to run the CLI without installing:

::: code-group

```bash [Encode]
npx @toon-format/cli input.json -o output.toon
```

```bash [Decode]
npx @toon-format/cli data.toon -o output.json
```

```bash [Stdin]
echo '{"name": "Ada"}' | npx @toon-format/cli
```

:::

### Global Installation

Or install globally for repeated use:

::: code-group

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

After global installation, use the `toon` command:

```bash
toon input.json -o output.toon
```

## Basic Usage

### Auto-Detection

The CLI automatically detects the operation based on file extension:
- `.json` files → encode (JSON to TOON)
- `.toon` files → decode (TOON to JSON)

When reading from stdin, use `--encode` or `--decode` flags to specify the operation (defaults to encode).

::: code-group

```bash [Encode JSON to TOON]
toon input.json -o output.toon
```

```bash [Decode TOON to JSON]
toon data.toon -o output.json
```

```bash [Output to stdout]
toon input.json
```

```bash [Pipe from stdin]
cat data.json | toon
echo '{"name": "Ada"}' | toon
```

```bash [Decode from stdin]
cat data.toon | toon --decode
```

:::

By convention, TOON files use the `.toon` extension and the provisional media type `text/toon` (see [spec §18.2](https://github.com/toon-format/spec/blob/main/SPEC.md#182-provisional-media-type)).

### Standard Input

Omit the input argument or use `-` to read from stdin. This enables piping data directly from other commands:

```bash
# No argument needed
cat data.json | toon

# Explicit stdin with hyphen (equivalent)
cat data.json | toon -

# Decode from stdin
cat data.toon | toon --decode
```

## Performance

### Streaming Output

Both encoding and decoding operations use streaming output, writing incrementally without building the full output string in memory. This makes the CLI efficient for large datasets without requiring additional configuration.

**JSON → TOON (Encode)**:

- Streams TOON lines to output.
- No full TOON string in memory.

**TOON → JSON (Decode)**:

- Uses the same event-based streaming decoder as the `decodeStream` API in `@toon-format/toon`.
- Streams JSON tokens to output.
- No full JSON string in memory.
- When `--expandPaths safe` is enabled, falls back to non-streaming decode internally to apply deep-merge expansion before writing JSON.

Process large files with minimal memory usage:

```bash
# Encode large JSON file
toon huge-dataset.json -o output.toon

# Decode large TOON file
toon huge-dataset.toon -o output.json

# Process millions of records efficiently via stdin
cat million-records.json | toon > output.toon
cat million-records.toon | toon --decode > output.json
```

Peak memory usage scales with data depth, not total size. This allows processing arbitrarily large files as long as individual nested structures fit in memory.

::: tip Token Statistics
When using the `--stats` flag with encode, the CLI builds the full TOON string once to compute accurate token counts. For maximum memory efficiency on very large files, omit `--stats`.
:::

## Options

| Option | Description |
| ------ | ----------- |
| `-o, --output <file>` | Output file path (prints to stdout if omitted) |
| `-e, --encode` | Force encode mode (overrides auto-detection) |
| `-d, --decode` | Force decode mode (overrides auto-detection) |
| `--delimiter <char>` | Array delimiter: `,` (comma), tab character, `\|` (pipe). Pass tab as `$'\t'` in bash/zsh |
| `--indent <number>` | Indentation size (default: `2`) |
| `--stats` | Show token count estimates and savings (encode only) |
| `--no-strict` | Disable strict validation when decoding |
| `--keyFolding <mode>` | Key folding mode: `off`, `safe` (default: `off`) |
| `--flattenDepth <number>` | Maximum segments to fold (default: `Infinity`) – requires `--keyFolding safe` |
| `--expandPaths <mode>` | Path expansion mode: `off`, `safe` (default: `off`) |
| `--verbose` | Show full stack traces and cause chains for errors (default: `false`) |

## Advanced Examples

### Token Statistics

Show token savings when encoding:

```bash
toon data.json --stats -o output.toon
```

This helps you estimate token cost savings before sending data to LLMs.

Example output:

```
✔ Encoded data.json → output.toon

ℹ Token estimates: ~15,145 (JSON) → ~8,745 (TOON)
✔ Saved ~6,400 tokens (-42.3%)
```

### Alternative Delimiters

TOON supports three delimiters: comma (default), tab, and pipe. Alternative delimiters can save additional tokens depending on the data.

::: code-group

```bash [Tab-separated (bash/zsh)]
toon data.json --delimiter $'\t' -o output.toon
```

```bash [Pipe-separated]
toon data.json --delimiter "|" -o output.toon
```

:::

The `--delimiter` value must be the actual delimiter character. In bash/zsh, use `$'\t'` to pass a real tab; literal `"\t"` is rejected as an invalid delimiter.

**Tab delimiter example:**

::: code-group

```yaml [Tab]
items[2	]{id	name	qty	price}:
  A1	Widget	2	9.99
  B2	Gadget	1	14.5
```

```yaml [Comma (default)]
items[2]{id,name,qty,price}:
  A1,Widget,2,9.99
  B2,Gadget,1,14.5
```

:::

::: tip
Tab delimiters often tokenize more efficiently than commas and reduce the need for quote-escaping. Use `--delimiter $'\t'` (bash/zsh) for maximum token savings on large tabular data. See [Delimiter Strategies](/reference/api#delimiter-strategies) for full guidance.
:::

### Lenient Decoding

Skip validation for faster processing:

```bash
toon data.toon --no-strict -o output.json
```

Lenient mode (`--no-strict`) disables strict validation checks like array count matching, indentation multiples, and delimiter consistency. Use this when you trust the input and want faster decoding.

### Decode Error Output

When a TOON document fails to parse, the CLI renders the offending line with a caret pointing at the first non-whitespace character. Tabs are shown as `→` so the caret column reflects what the decoder actually saw.

For an input file that uses a tab to indent the second line (rendered here with `→`):

```
a:
→b: 1
```

The CLI prints:

```
 ERROR  Failed to decode TOON at line 2: Tabs are not allowed in indentation in strict mode

  2 | →b: 1
      ^
```

The exit code is `1` on any error. Stack traces are suppressed by default. Pass `--verbose` to include the full stack and the underlying cause chain – useful when filing a bug report or diagnosing an unexpected error path:

```bash
cat broken.toon | toon --decode --verbose
```

::: tip Programmatic Access
Decode errors are thrown as `ToonDecodeError` instances by the library. The CLI's caret rendering is built on the structured `line` and `source` fields exposed on that class. See the [Error Handling](/reference/api#error-handling) section of the API reference if you want the same diagnostic detail in your own code.
:::

### Stdin Workflows

The CLI integrates seamlessly with Unix pipes and other command-line tools:

```bash
# Convert API response to TOON
curl https://api.example.com/data | toon --stats

# Process large dataset
cat large-dataset.json | toon --delimiter $'\t' > output.toon

# Chain with jq
jq '.results' data.json | toon > filtered.toon
```

### Key Folding

Collapse nested wrapper chains to reduce tokens (since spec v1.5):

::: code-group

```bash [Basic key folding]
toon input.json --keyFolding safe -o output.toon
```

```bash [Limit folding depth]
toon input.json --keyFolding safe --flattenDepth 2 -o output.toon
```

:::

**Example:**

For data like:

```json
{
  "data": {
    "metadata": {
      "items": ["a", "b"]
    }
  }
}
```

With `--keyFolding safe`, output becomes:

```yaml
data.metadata.items[2]: a,b
```

Instead of:

```yaml
data:
  metadata:
    items[2]: a,b
```

### Path Expansion

Reconstruct nested structure from folded keys when decoding:

```bash
toon data.toon --expandPaths safe -o output.json
```

This pairs with `--keyFolding safe` for lossless round-trips.

### Round-Trip Workflow

```bash
# Encode with folding
toon input.json --keyFolding safe -o compressed.toon

# Decode with expansion (restores original structure)
toon compressed.toon --expandPaths safe -o output.json

# Verify round-trip
diff input.json output.json
```

### Combined Options

Combine multiple options for maximum efficiency:

```bash
# Key folding + tab delimiter + stats
toon data.json --keyFolding safe --delimiter $'\t' --stats -o output.toon
```
