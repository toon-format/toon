# CLI Scope

`@toon-format/cli` converts between JSON and TOON. Interactive REPLs, file watchers, batch processors, progress UIs, conversion to and from other formats (CSV, XML, Markdown), and timing flags are out of scope.

## Why this is out of scope

The CLI is a thin, predictable wrapper around `encode` and `decode`. Every workflow feature grows the surface that has to be documented, tested, and kept in step with each spec release:

> The goal here is a small, predictable tool that does JSON↔TOON conversion very well; adding a full REPL, watcher, batch processor, progress UI, etc. makes the CLI much heavier to maintain and significantly increases its surface area.
> – [toon#178](https://github.com/toon-format/toon/pull/178#issuecomment-3565989510)

A general file converter is not a design goal either ([toon#194](https://github.com/toon-format/toon/issues/194#issuecomment-3551850373)). For other formats, convert to JSON first and pipe the result in – the CLI reads stdin.

Wrap the CLI or the library in your own tool for watch mode, batch runs, or a REPL.

## Prior requests

- toon#178 – interactive mode and file watching
- toon#165, toon#168 – interactive REPL, file watcher, batch processing
- toon#194 – CLI support for XML, Markdown, and CSV
- toon#91 – `--time` flag
