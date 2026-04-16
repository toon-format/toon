# TOON Nested Tables — Benchmark Results

## Token Count Comparison

| Dataset | TOON | TOON + Nested | JSON Compact | Nested Savings | Nested vs JSON |
|---------|------|---------------|-------------|----------------|---------------|
| tabular | 49.919 | 49.919 | 79.059 | 0.0% | 36.9% |
| nested | 73.126 | 73.126 | 69.459 | 0.0% | -5.3% |
| analytics | 9.115 | 9.115 | 14.211 | 0.0% | 35.9% |
| github | 8.744 | 8.744 | 11.454 | 0.0% | 23.7% |
| event-logs | 154.084 | 154.084 | 128.529 | 0.0% | -19.9% |
| nested-config | 620 | 591 | 558 | 4.7% | -5.9% |
| uniform-nested | 58.701 | 27.111 | 46.697 | 53.8% | 41.9% |

## Key Findings

- **Nested tables** save tokens when data contains uniform nested objects by flattening them into the tabular format instead of falling back to list items.
- For datasets without nested structures, output is identical to standard TOON.
- The feature is opt-in and backwards-compatible.
