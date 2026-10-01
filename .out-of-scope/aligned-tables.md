# Aligned Tables

The encoder and CLI don't pad tabular cells into aligned columns – no `--pretty` flag, no alignment option.

## Why this is out of scope

Padding spends tokens on every row of exactly the arrays where TOON saves the most, and conforming encoders join cells with just the delimiter (§9.3):

> Neat idea, but doesn't align with the core idea of TOON – a transport format. If you want pretty tables, another format like YAML is probably better.
> – [toon#338](https://github.com/toon-format/toon/pull/338#issuecomment-5709864231)

## Prior requests

- toon#338 – `--pretty` flag for aligned tables
