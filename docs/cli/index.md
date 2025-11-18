# Command Line Interface

The `@toon-format/cli` package provides a command-line interface for encoding JSON to TOON and decoding TOON back to JSON. Use it for quick conversions without writing code, estimating token savings before sending data to LLMs, or integrating TOON into shell pipelines with tools like curl and jq. It supports stdin/stdout workflows, multiple delimiter options, token statistics, and all encoding/decoding features available in the library.

The CLI is built on top of the `@toon-format/toon` TypeScript implementation and adheres to the [latest specification](/reference/spec).

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

## Options

| Option | Description |
| ------ | ----------- |
| `-o, --output <file>` | Output file path (prints to stdout if omitted) |
| `-e, --encode` | Force encode mode (overrides auto-detection) |
| `-d, --decode` | Force decode mode (overrides auto-detection) |
| `--delimiter <char>` | Array delimiter: `,` (comma), `\t` (tab), `\|` (pipe) |
| `--indent <number>` | Indentation size (default: `2`) |
| `--stats` | Show token count estimates and savings (encode only) |
| `--no-strict` | Disable strict validation when decoding |
| `--key-folding <mode>` | Key folding mode: `off`, `safe` (default: `off`) |
| `--flatten-depth <number>` | Maximum segments to fold (default: `Infinity`) – requires `--key-folding safe` |
| `--expand-paths <mode>` | Path expansion mode: `off`, `safe` (default: `off`) |

## Advanced Examples

### Token Statistics

Show token savings when encoding:

```bash
toon data.json --stats -o output.toon
```

This helps you estimate token cost savings before sending data to LLMs.

### Alternative Delimiters

TOON supports three delimiters: comma (default), tab, and pipe. Alternative delimiters can provide additional token savings in specific contexts.

::: code-group

```bash [Tab-separated]
toon data.json --delimiter "\t" -o output.toon
```

```bash [Pipe-separated]
toon data.json --delimiter "|" -o output.toon
```

:::

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

> [!TIP]
> Tab delimiters often tokenize more efficiently than commas and reduce the need for quote-escaping. Use `--delimiter "\t"` for maximum token savings on large tabular data.

### Lenient Decoding

Skip validation for faster processing:

```bash
toon data.toon --no-strict -o output.json
```

Lenient mode (`--no-strict`) disables strict validation checks like array count matching, indentation multiples, and delimiter consistency. Use this when you trust the input and want faster decoding.

### Stdin Workflows

The CLI integrates seamlessly with Unix pipes and other command-line tools:

```bash
# Convert API response to TOON
curl https://api.example.com/data | toon --stats

# Process large dataset
cat large-dataset.json | toon --delimiter "\t" > output.toon

# Chain with jq
jq '.results' data.json | toon > filtered.toon
```

### Key Folding

Collapse nested wrapper chains to reduce tokens (since spec v1.5):

::: code-group

```bash [Basic key folding]
toon input.json --key-folding safe -o output.toon
```

```bash [Limit folding depth]
toon input.json --key-folding safe --flatten-depth 2 -o output.toon
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

With `--key-folding safe`, output becomes:

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
toon data.toon --expand-paths safe -o output.json
```

This pairs with `--key-folding safe` for lossless round-trips.

### Round-Trip Workflow

```bash
# Encode with folding
toon input.json --key-folding safe -o compressed.toon

# Decode with expansion (restores original structure)
toon compressed.toon --expand-paths safe -o output.json

# Verify round-trip
diff input.json output.json
```

### Combined Options

Combine multiple options for maximum efficiency:

```bash
# Key folding + tab delimiter + stats
toon data.json --key-folding safe --delimiter "\t" --stats -o output.toon
```
