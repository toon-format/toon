# Normalization Benchmark Results

> Generated: 2026-03-30T10:09:00Z

## Summary

| Dataset | Rows | JSON compact | TOON | TOON normalized | norm vs JSON |
|---------|------|-------------|------|-----------------|-------------|
| IoT Sensor Readings | 1000 | 56,883 | 69,563 (+22.3%) | **41,341** (-27.3%) | **-27.3%** |
| E-commerce Transactions | 500 | 34,908 | 42,782 (+22.6%) | **21,604** (-38.1%) | **-38.1%** |
| Incident Reports | 300 | 28,291 | 30,622 (+8.2%) | **21,531** (-23.9%) | **-23.9%** |

## Key Findings

- All three datasets show **significant token savings** with normalization vs JSON compact
- Without normalization, TOON is **worse** than JSON compact on semi-uniform data
- Normalization converts TOON from worse-than-JSON to better-than-JSON
- Multi-extras (e-commerce) and deep extras (incidents) both benefit substantially

See individual benchmark files for details:
- [bench-iot-sensors.md](./bench-iot-sensors.md)
- [bench-ecommerce-transactions.md](./bench-ecommerce-transactions.md)
- [bench-incident-reports.md](./bench-incident-reports.md)
- [complex-json-benchmark.md](./complex-json-benchmark.md) (limitation case)
