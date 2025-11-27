# @toon-format/cli

Command-line tool for converting JSON to TOON and back, with token analysis and streaming support.

[TOON (Token-Oriented Object Notation)](https://toonformat.dev) is a compact, human-readable encoding of the JSON data model that minimizes tokens for LLM input. The CLI lets you test conversions, analyze token savings, and integrate TOON into shell pipelines with stdin/stdout support—no code required.

## Installation

```bash
# npm
npm install -g @toon-format/cli

# pnpm
pnpm add -g @toon-format/cli

# yarn
yarn global add @toon-format/cli
```

Or use directly with `npx`:

```bash
npx @toon-format/cli [options] [input]
```

## Usage

```bash
toon [options] [input]
```

**Standard input:** Omit the input argument or use `-` to read from stdin. This enables piping data directly from other commands.

**Auto-detection:** The CLI automatically detects the operation based on file extension (`.json` → encode, `.toon` → decode). When reading from stdin, use `--encode` or `--decode` flags to specify the operation (defaults to encode).

### Basic Examples

```bash
# Encode JSON to TOON (auto-detected)
toon input.json -o output.toon

# Decode TOON to JSON (auto-detected)
toon data.toon -o output.json

# Output to stdout
toon input.json

# Pipe from stdin
cat data.json | toon
echo '{"name": "Ada"}' | toon

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
| `--key-folding <mode>` | Enable key folding: `off`, `safe` (default: `off`) |
| `--flatten-depth <number>` | Maximum folded segment count when key folding is enabled (default: `Infinity`) |
| `--expand-paths <mode>` | Enable path expansion: `off`, `safe` (default: `off`) |

## Advanced Examples

### Token Statistics

Show token savings when encoding:

```bash
toon data.json --stats -o output.toon
```

Example output:

```
✔ Encoded data.json → output.toon

ℹ Token estimates: ~15,145 (JSON) → ~8,745 (TOON)
✔ Saved ~6,400 tokens (-42.3%)
```

### Alternative Delimiters

#### Tab-separated (often more token-efficient)

```bash
toon data.json --delimiter "\t" -o output.toon
```

### Lenient Decoding

Skip validation for faster processing:

```bash
toon data.toon --no-strict -o output.json
```

### Stdin Workflows

```bash
# Convert API response to TOON
curl https://api.example.com/data | toon --stats

# Process large dataset
cat large-dataset.json | toon --delimiter "\t" > output.toon

# Chain with other tools
jq '.results' data.json | toon > filtered.toon
```

### Large Dataset Processing

The CLI uses streaming output for both encoding and decoding, writing incrementally without building the full output string in memory:

```bash
# Encode large JSON file with minimal memory usage
toon huge-dataset.json -o output.toon

# Decode large TOON file with streaming JSON output
toon huge-dataset.toon -o output.json

# Process millions of records efficiently via stdin
cat million-records.json | toon > output.toon
cat million-records.toon | toon --decode > output.json
```

**Memory efficiency:**
- **Encode (JSON → TOON)**: Streams TOON lines to output without full string in memory
- **Decode (TOON → JSON)**: Uses the same event-based streaming decoder as the `decodeStream` API in `@toon-format/toon`, streaming JSON tokens to output without full string in memory
- Peak memory usage scales with data depth, not total size
- When `--expand-paths safe` is enabled, decode falls back to non-streaming mode internally to apply deep-merge expansion before writing JSON

> [!NOTE]
> When using `--stats` with encode, the full output string is kept in memory for token counting. Omit `--stats` for maximum memory efficiency with very large datasets.

### Key Folding (Since v1.5)

Collapse nested wrapper chains to reduce tokens:

#### Basic key folding

```bash
# Encode with key folding
toon input.json --key-folding safe -o output.toon
```

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

Output becomes:
```
data.metadata.items[2]: a,b
```

Instead of:
```
data:
  metadata:
    items[2]: a,b
```

#### Limit folding depth

```bash
# Fold maximum 2 levels deep
toon input.json --key-folding safe --flatten-depth 2 -o output.toon
```

#### Path expansion on decode

```bash
# Reconstruct nested structure from folded keys
toon data.toon --expand-paths safe -o output.json
```

#### Round-trip workflow

```bash
# Encode with folding
toon input.json --key-folding safe -o compressed.toon

# Decode with expansion (restores original structure)
toon compressed.toon --expand-paths safe -o output.json

# Verify round-trip
diff input.json output.json
```

#### Combined with other options

```bash
# Key folding + tab delimiter + stats
toon data.json --key-folding safe --delimiter "\t" --stats -o output.toon
```

## Why Use the CLI?

- **Quick conversions** between formats without writing code
- **Token analysis** to see potential savings before sending to LLMs
- **Pipeline integration** with existing JSON-based workflows
- **Flexible formatting** with delimiter and indentation options
- **Key folding** to collapse nested wrappers for additional token savings
- **Memory-efficient streaming** for both encode and decode operations - process large datasets without loading entire outputs into memory

## Related

- [@toon-format/toon](https://www.npmjs.com/package/@toon-format/toon) - JavaScript/TypeScript library
- [Full specification](https://github.com/toon-format/spec) - Complete format documentation
- [Website](https://toonformat.dev) - Interactive examples and guides

## License

[MIT](https://github.com/toon-format/toon/blob/main/LICENSE) License © 2025-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
