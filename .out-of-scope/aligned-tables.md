# Aligned Tables

The encoder and CLI don't pad tabular cells into aligned columns – no `--pretty` flag and no alignment option.

## Why this is out of scope

Padded rows decode fine, because decoders trim spaces around each cell (§12). But conforming encoder output joins cells with the bare delimiter (§9.3), and the padding spends tokens on every row of exactly the arrays where TOON saves the most:

> Neat idea, but doesn't align with the core idea of TOON – a transport format. If you want pretty tables, another format like YAML is probably better.
> – [toon#338](https://github.com/toon-format/toon/pull/338#issuecomment-5709864231)

For a human-readable view, render the decoded data with a table formatter.

## Prior requests

- toon#338 – `--pretty` flag for aligned tables
