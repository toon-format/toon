# Tools & Playgrounds

Experiment with TOON format interactively using these community-built tools for token comparison, format conversion, and validation.

## Playgrounds

Experiment with TOON format interactively using these community-built tools for token comparison, format conversion, and validation:

- [Format Tokenization Playground](https://www.curiouslychase.com/playground/format-tokenization-exploration)
- [TOON Tools](https://toontools.vercel.app/)

## CLI Tool

The official TOON CLI provides command-line conversion, token statistics, and all encoding/decoding features. See the [CLI reference](/cli/) for full documentation.

```bash
npx @toon-format/cli input.json --stats -o output.toon
```

## Editor Support

TOON syntax highlighting is available for popular editors:

- **VS Code**: Use YAML syntax highlighting as a close approximation (`.toon` files can be associated with YAML language mode).
- **Vim/Neovim**: [toon.nvim](https://github.com/thalesgelinger/toon.nvim)

> [!NOTE]
> Native TOON syntax highlighting extensions are in development. Contributions welcome!

## Web APIs

If you're building web applications that work with TOON, you can use the TypeScript library in the browser:

```ts
import { decode, encode } from '@toon-format/toon'

// Works in browsers, Node.js, Deno, and Bun
const toon = encode(data)
const data = decode(toon)
```

See the [API reference](/reference/api) for details.
