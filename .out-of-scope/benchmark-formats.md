# Benchmark Formats

The published benchmarks compare TOON with formats a user would realistically weigh for putting bulk data into an LLM prompt: JSON (pretty and compact), YAML, XML, and CSV. Adding niche formats, config languages, presentational formats, or an author's own format is out of scope.

## Why this is out of scope

Each format multiplies the matrix – datasets × tokenizers × models × formats – that has to stay current on every regeneration, so a format earns its place by being a real alternative for this job:

> KDL is a configuration format; its own positioning is against JSON5/TOML for config files, not for serializing bulk data into LLM prompts. The benchmark compares formats a user would realistically weigh for that job.
> – [toon#301](https://github.com/toon-format/toon/pull/301#issuecomment-5082642912)

Markdown tables are presentational: no nesting, several non-canonical variants, no structural guardrails, and CSV already covers flat data ([toon#124](https://github.com/toon-format/toon/issues/124#issuecomment-3528627844)). A format benchmarked through a runtime dependency on its author's own package produces numbers the project can't vouch for ([toon#319](https://github.com/toon-format/toon/pull/319#issuecomment-5082643700)).

Run the harness in `benchmarks/` against any format locally – adding one is a single registry entry – and publish the comparison with your format's own docs.

## Prior requests

- toon#301 – KDL
- toon#319 – GCF (Graph Compact Format)
- toon#124 – Markdown tables in the retrieval benchmark
