### Historical Generation Baseline

These are the original Python benchmark results, preserved for reference. They are not a rerun with the current TypeScript harness or TOON v4. The historical TOON prompts omitted schema field information, so these scores are not comparable to the corrected harness.

21 models; 210 model-runs; 10 runs per model; four cases and three formats per run.

JSON-object means JSON object mode, not schema-constrained decoding. 1-S is first-attempt accuracy; Fin includes up to two repairs; Tok is mean prompt plus completion tokens across all attempts for a case.

| Case | JSON 1-S | JSON Fin | JSON Tok | JSON-object 1-S | JSON-object Fin | JSON-object Tok | TOON 1-S | TOON Fin | TOON Tok |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| users | 94.8% | 94.8% | 1,078 | 92.9% | 100.0% | 556 | 90.5% | 90.5% | 840 |
| order | 81.9% | 81.9% | 1,746 | 78.6% | 83.3% | 1,255 | 74.3% | 78.6% | 1,585 |
| company | 18.6% | 43.8% | 3,575 | 21.9% | 48.1% | 2,592 | 0.0% | 48.6% | 2,567 |
| invoice | 90.0% | 90.0% | 1,723 | 87.6% | 95.2% | 1,349 | 0.0% | 52.4% | 3,626 |

The users, order, and invoice cases cover tabular or mixed structures; company covers nested arrays. Scores are specific to these prompts and model versions, not a general ranking of formats.

Historical run numbers restart within the DeepSeek-R1 batches. All 210 distinct measurement rows are retained; model/run is not a unique key. The archived CSVs contain per-run metrics, not raw model responses or immutable provider version metadata.

Regenerate this table locally with `pnpm -C benchmarks report:generation --historical`. The source is `benchmarks/results/generation/eval-runs.csv`; no API key is required.
