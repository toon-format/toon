# Normalization Benchmark

Token counts for semi-uniform and deep datasets comparing JSON compact, TOON, and TOON with normalization.

## Summary

| Dataset | Rows | JSON compact | TOON (vs JSON) | TOON normalized (vs JSON) |
| --- | ---: | ---: | ---: | ---: |
| event-logs | 2,000 | 128,529 | 154,084 (+19.9%) | 95,675 (-25.6%) |
| nested-config | 1 | 558 | 620 (+11.1%) | 620 (+11.1%) |
| semi-uniform-orders | 500 | 25,674 | 31,467 (+22.6%) | 17,375 (-32.3%) |
| deep-incidents | 500 | 32,893 | 37,031 (+12.6%) | 25,846 (-21.4%) |
| grafana-logs | 2,000 | 192,070 | 226,609 (+18.0%) | 128,372 (-33.2%) |
| **Total** | 5,001 | 379,724 | 449,811 (+18.5%) | 267,888 (-29.5%) |

## Key Findings

- **Best normalization gain:** semi-uniform-orders — TOON normalized saves 44.8% tokens vs plain TOON
- **Overall TOON normalized vs JSON compact:** -29.5% tokens
- **Overall TOON normalized vs plain TOON:** -40.4% tokens
