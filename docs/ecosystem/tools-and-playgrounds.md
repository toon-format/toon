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

### VS Code

**[TOON Language Support](https://marketplace.visualstudio.com/items?itemName=vishalraut.vscode-toon)** - Full-featured extension providing comprehensive tooling for working with TOON files.

**Features:**
- 🎨 Syntax highlighting with color-coded support for arrays, objects, and values
- ✅ Real-time validation with error highlighting and detailed messages
- 🔄 Bidirectional conversion (TOON ↔ JSON) with format options
- 📝 Code snippets for common TOON patterns
- 💰 Token optimization with visual feedback on savings
- ⚙️ Configurable indentation and delimiters (comma, tab, pipe)

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=vishalraut.vscode-toon) or via command line:

```bash
code --install-extension vishalraut.vscode-toon
```

### Other Editors

- **Vim/Neovim**: [toon.nvim](https://github.com/thalesgelinger/toon.nvim)
- **Other editors**: Use YAML syntax highlighting as a close approximation (`.toon` files can be associated with YAML language mode).

## Web APIs

If you're building web applications that work with TOON, you can use the TypeScript library in the browser:

```ts
import { decode, encode } from '@toon-format/toon'

// Works in browsers, Node.js, Deno, and Bun
const toon = encode(data)
const data = decode(toon)
```

See the [API reference](/reference/api) for details.
