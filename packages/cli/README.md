# @toon-format/cli

Command-line tool for converting JSON to TOON and back, with token analysis and streaming support.

[TOON (Token-Oriented Object Notation)](https://toonformat.dev) is a compact, human-readable encoding of the JSON data model that minimizes tokens for LLM input. The CLI lets you test conversions, analyze token savings, and integrate TOON into shell pipelines with stdin/stdout support.

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

# Show token savings
toon data.json --stats
```

## Options

| Option | Description |
| ------ | ----------- |
| `-o, --output <file>` | Output file path (prints to stdout if omitted) |
| `-e, --encode` | Force encode mode (overrides auto-detection) |
| `-d, --decode` | Force decode mode (overrides auto-detection) |
| `--delimiter <char>` | Array delimiter: `,` (comma), tab character, `\|` (pipe). Pass tab as `$'\t'` in bash/zsh |
| `--indent <number>` | Indentation size (default: `2`) |
| `--stats` | Show token count estimates and savings (encode only) |
| `--no-strict` | Skip decode validation (array counts, indentation, header delimiter); last-write-wins on duplicate keys |
| `--verbose` | Show full stack traces and cause chains for errors (default: `false`) |

For token statistics output, delimiter guidance, lenient decoding, decode error rendering, and streaming behavior, see the [CLI documentation](https://toonformat.dev/cli/).

## Related

- [@toon-format/toon](https://www.npmjs.com/package/@toon-format/toon) – JavaScript/TypeScript library
- [Full specification](https://github.com/toon-format/spec) – Complete format documentation
- [Website](https://toonformat.dev) – Interactive examples and guides

## License

[MIT](https://github.com/toon-format/toon/blob/main/LICENSE) License © 2025-PRESENT [Johann Schopplich](https://github.com/johannschopplich)
