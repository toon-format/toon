# CLI Scope

`@toon-format/cli` converts between JSON and TOON. Interactive REPLs, file watchers, batch processors, progress UIs, conversion to or from other formats, and timing flags are out of scope.

## Why this is out of scope

Every workflow feature grows the surface that has to be documented, tested, and kept in step with each spec release:

> The goal here is a small, predictable tool that does JSON↔TOON conversion very well
> – [toon#178](https://github.com/toon-format/toon/pull/178#issuecomment-3565989510)

A general file converter isn't a design goal ([toon#194](https://github.com/toon-format/toon/issues/194#issuecomment-3551850373)), and encoding time is too small to need a flag ([toon#91](https://github.com/toon-format/toon/pull/91#issuecomment-3500959360)). Convert other formats to JSON and pipe the result in; for watch mode, batch runs, or a REPL, wrap the CLI or the library in your own tool.

## Prior requests

- toon#178 – interactive mode and file watching
- toon#165, toon#168 – interactive REPL, file watcher, batch processing
- toon#194 – XML, Markdown, and CSV support
- toon#91 – `--time` flag
