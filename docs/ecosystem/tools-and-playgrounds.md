# Tools & Playgrounds

Experiment with TOON format interactively using these tools for token comparison, format conversion, and validation.

## Playgrounds

### Official Playground

The [TOON Playground](/playground) lets you convert JSON to TOON in real-time, compare token counts, and share your experiments via URL.

### Community Playgrounds

- [Format Tokenization Playground](https://www.curiouslychase.com/playground/format-tokenization-exploration)
- [TOON Tools](https://toontools.vercel.app/)

## CLI Tool

The official TOON CLI provides command-line conversion, token statistics, and all encoding/decoding features. See the [CLI reference](/cli/) for full documentation.

```bash
npx @toon-format/cli input.json --stats -o output.toon
```

## Editor Support

### VS Code

[TOON Language Support](https://marketplace.visualstudio.com/items?itemName=vishalraut.vscode-toon) - Syntax highlighting, validation, conversion, and token analysis.

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=vishalraut.vscode-toon) or via command line:

```bash
code --install-extension vishalraut.vscode-toon
```

### Tree-sitter Grammar

[tree-sitter-toon](https://github.com/3swordman/tree-sitter-toon) - Grammar for Tree-sitter-compatible editors (Neovim, Helix, Emacs, Zed).

### Neovim

[toon.nvim](https://github.com/thalesgelinger/toon.nvim) - Lua-based plugin for Neovim.

### Other Editors

Use YAML syntax highlighting as a close approximation. Most editors allow associating `.toon` files with YAML language mode.

## Web APIs

If you're building web applications that work with TOON, you can use the TypeScript library in the browser:

```ts
import { decode, encode } from '@toon-format/toon'

// Works in browsers, Node.js, Deno, and Bun
const toon = encode(data)
const data = decode(toon)
```

See the [API Reference](/reference/api) for details.
