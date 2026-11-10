# Benchmark Formats

The published benchmarks compare TOON with the formats a user would realistically weigh for putting bulk data into an LLM prompt. Niche formats, config languages, presentational formats, and an author's own format are out of scope.

## Why this is out of scope

Each format multiplies the matrix that has to stay current on every regeneration, so a format earns its place by being a real alternative for this job. KDL is a configuration format ([toon#301](https://github.com/toon-format/toon/pull/301#issuecomment-5082642912)), Markdown tables are presentational and CSV already covers flat data ([toon#124](https://github.com/toon-format/toon/issues/124#issuecomment-3528627844)), and a format benchmarked through its author's own package yields numbers the project can't vouch for ([toon#319](https://github.com/toon-format/toon/pull/319#issuecomment-5082643700)).

Run the harness in `benchmarks/` against your format locally and publish the comparison with your format's docs.

## Prior requests

- toon#301 – KDL
- toon#319 – GCF (Graph Compact Format)
- toon#124 – Markdown tables in the retrieval benchmark
