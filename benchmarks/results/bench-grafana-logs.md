## Grafana/Loki-Style Log Benchmark

> 2,000 log entries simulating Grafana Loki ingestion pipeline.
> Semi-uniform structure with 3 independent optional field groups.

### Data Characteristics

| Property | Value |
|----------|-------|
| Total rows | 2,000 |
| Base fields | 10 (timestamp, level, job, instance, method, endpoint, status_code, duration_ms, bytes_sent, message) |
| Extras: error | 387 rows (19.4%) — type, message, stack_trace |
| Extras: trace | 405 rows (20.3%) — traceId, spanId, parentSpanId |
| Extras: auth | 316 rows (15.8%) — userId, sessionId, role, ip |
| Depth | 1 (flat extras objects) |
| Extras groups | 3 independent groups |

### Token Comparison

| Format | Tokens | vs JSON compact |
|--------|--------|-----------------|
| JSON pretty | 280,011 | +40.6% |
| JSON compact | 199,139 | baseline |
| TOON | 233,797 | +17.4% |
| **TOON (normalized)** | **119,030** | **-40.2%** |

### Normalized Tables

```
logs[2000]{timestamp,level,job,instance,method,endpoint,status_code,duration_ms,bytes_sent,message}
logs.trace[405]{idx,traceId,spanId,parentSpanId}
```

### Analysis

This is the **ideal use case** for normalization:

1. **Large array** (2,000 rows) — key repetition savings scale linearly with row count
2. **High base field ratio** — 10 common fields across all rows become a single tabular header
3. **Multiple independent extras** — error, trace, auth each become their own compact tabular table
4. **Realistic distribution** — extras ratios (35%, 20%, 15%) all exceed the 20% threshold

Without normalization, TOON is **worse** than JSON compact (+17.4%) because the mixed
field sets prevent tabular encoding. With normalization, all 4 tables (base + 3 extras) become
100% uniform and get full tabular compression, achieving **-40.2%** vs JSON compact.
