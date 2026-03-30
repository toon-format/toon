## Real-World Complex JSON Benchmark

> Single deeply-nested infrastructure monitoring document with mixed structures:
> nested objects (5+ depth), short semi-uniform arrays, heterogeneous districts.

### Source Data Characteristics

| Property | Value |
|----------|-------|
| Total depth | 7+ levels (regions → districts → infrastructure → power_grid → substations → metrics → history) |
| Array count | 6 arrays (regions, districts, substations, history, authentication_attempts, external_apis) |
| Max array length | 3 (external_apis) |
| Structure class | deep / heterogeneous |
| Semi-uniform arrays | 1 (external_apis: 2/3 share {provider, active}, extras: latency_ms, api_key_expiry, reason) |

### Token Comparison

| Format | Tokens | vs JSON compact |
|--------|--------|-----------------|
| JSON pretty | 1,208 | +56.3% |
| JSON compact | 773 | baseline |
| TOON | 883 | +14.2% |
| **TOON (normalized)** | **833** | **+7.8%** |

### Analysis

This data is **not the ideal case** for semi-uniform normalization. Key reasons:

1. **Few arrays, all short** — longest array is 3 elements (external_apis). Tabular compression saves key repetition proportional to row count, so short arrays yield minimal savings.
2. **Heterogeneous array elements** — districts (SEOUL vs TOKYO) have fundamentally different field sets (demographics, water_management), making base field intersection very small.
3. **Dominated by deep nesting** — most of the data is deeply nested single objects (orchestrator_node, global_metrics, security_logs), where TOON's indentation-based format is the primary compression mechanism, not tabular.

The only array that benefits from normalization is `external_apis`:

```
// Before: list format with key repetition
external_apis[3]:
  - provider: Weather-Service
    latency_ms: 12
    active: true
  - provider: Stock-Market-Data
    latency_ms: 45
    active: true
    api_key_expiry: 2027-12-31
  - provider: Satellite-Imagery
    active: false
    reason: Connection Lost

// After: tabular base + extras would apply if arrays were longer
external_apis[3]{provider,active}:
  Weather-Service,true
  Stock-Market-Data,true
  Satellite-Imagery,false
```

### When Normalization Shines vs When It Doesn't

| Data Shape | Normalization Benefit | Example |
|------------|----------------------|---------|
| Large uniform arrays (100+ rows) | ✅ High (tabular compression) | Employee records, time-series |
| Large semi-uniform arrays (100+ rows, ~50% extras) | ✅✅ Very High (base+extras split) | Event logs, orders with optional fields |
| Short arrays (< 10 rows) | ⚠️ Minimal | This benchmark's arrays |
| Deep nested single objects | ❌ None | orchestrator_node, global_metrics |
| Heterogeneous arrays (each element different) | ❌ None | districts with different schemas |
