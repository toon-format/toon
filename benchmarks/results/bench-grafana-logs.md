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


### Sample Data (5 rows)

<details>
<summary><strong>JSON (source)</strong></summary>

```json
{
  "logs": [
    {
      "timestamp": "2026-03-29T08:38:36.623Z",
      "level": "info",
      "job": "api-gateway",
      "instance": "pod-g7h8i9",
      "method": "PATCH",
      "endpoint": "/api/v1/search",
      "status_code": 204,
      "duration_ms": 385,
      "bytes_sent": 13533,
      "message": "request completed successfully",
      "auth": {
        "userId": "usr-4AlZCGyg",
        "sessionId": "sess-ndbobBSCfbOd",
        "role": "service-account",
        "ip": "132.188.36.90"
      }
    },
    {
      "timestamp": "2026-03-29T14:10:11.196Z",
      "level": "debug",
      "job": "api-gateway",
      "instance": "pod-g7h8i9",
      "method": "PATCH",
      "endpoint": "/metrics",
      "status_code": 200,
      "duration_ms": 148,
      "bytes_sent": 30640,
      "message": "request completed successfully"
    },
    {
      "timestamp": "2026-03-29T03:41:40.805Z",
      "level": "info",
      "job": "api-gateway",
      "instance": "pod-d4e5f6",
      "method": "GET",
      "endpoint": "/api/v1/orders",
      "status_code": 204,
      "duration_ms": 44,
      "bytes_sent": 40005,
      "message": "request completed successfully"
    },
    {
      "timestamp": "2026-03-29T19:49:33.524Z",
      "level": "warn",
      "job": "api-gateway",
      "instance": "pod-j0k1l2",
      "method": "PUT",
      "endpoint": "/api/v1/orders",
      "status_code": 408,
      "duration_ms": 21268,
      "bytes_sent": 17644,
      "message": "upstream connect timeout",
      "error": {
        "type": "AuthenticationError",
        "message": "connection refused to db-primary:5432",
        "stack_trace": "at handleRequest (api-gateway/src/handler.ts:394)"
      },
      "trace": {
        "traceId": "6818bfeCA5e8c14e034C96fD8b2fdBc0",
        "spanId": "b29C9D27e8Da2695",
        "parentSpanId": "520f60152f91109E"
      }
    },
    {
      "timestamp": "2026-03-29T09:32:13.883Z",
      "level": "info",
      "job": "notification-service",
      "instance": "pod-d4e5f6",
      "method": "POST",
      "endpoint": "/metrics",
      "status_code": 200,
      "duration_ms": 84,
      "bytes_sent": 37962,
      "message": "request completed successfully"
    }
  ]
}
```

</details>

<details>
<summary><strong>TOON (before normalization)</strong></summary>

```
logs[5]:
  - timestamp: "2026-03-29T08:38:36.623Z"
    level: info
    job: api-gateway
    instance: pod-g7h8i9
    method: PATCH
    endpoint: /api/v1/search
    status_code: 204
    duration_ms: 385
    bytes_sent: 13533
    message: request completed successfully
    auth:
      userId: usr-4AlZCGyg
      sessionId: sess-ndbobBSCfbOd
      role: service-account
      ip: 132.188.36.90
  - timestamp: "2026-03-29T14:10:11.196Z"
    level: debug
    job: api-gateway
    instance: pod-g7h8i9
    method: PATCH
    endpoint: /metrics
    status_code: 200
    duration_ms: 148
    bytes_sent: 30640
    message: request completed successfully
  - timestamp: "2026-03-29T03:41:40.805Z"
    level: info
    job: api-gateway
    instance: pod-d4e5f6
    method: GET
    endpoint: /api/v1/orders
    status_code: 204
    duration_ms: 44
    bytes_sent: 40005
    message: request completed successfully
  - timestamp: "2026-03-29T19:49:33.524Z"
    level: warn
    job: api-gateway
    instance: pod-j0k1l2
    method: PUT
    endpoint: /api/v1/orders
    status_code: 408
    duration_ms: 21268
    bytes_sent: 17644
    message: upstream connect timeout
    error:
      type: AuthenticationError
      message: "connection refused to db-primary:5432"
      stack_trace: "at handleRequest (api-gateway/src/handler.ts:394)"
    trace:
      traceId: 6818bfeCA5e8c14e034C96fD8b2fdBc0
      spanId: b29C9D27e8Da2695
      parentSpanId: 520f60152f91109E
  - timestamp: "2026-03-29T09:32:13.883Z"
    level: info
    job: notification-service
    instance: pod-d4e5f6
    method: POST
    endpoint: /metrics
    status_code: 200
    duration_ms: 84
    bytes_sent: 37962
    message: request completed successfully
```

</details>

<details>
<summary><strong>TOON normalized (after)</strong></summary>

```
logs[5]{timestamp,level,job,instance,method,endpoint,status_code,duration_ms,bytes_sent,message}:
  "2026-03-29T08:38:36.623Z",info,api-gateway,pod-g7h8i9,PATCH,/api/v1/search,204,385,13533,request completed successfully
  "2026-03-29T14:10:11.196Z",debug,api-gateway,pod-g7h8i9,PATCH,/metrics,200,148,30640,request completed successfully
  "2026-03-29T03:41:40.805Z",info,api-gateway,pod-d4e5f6,GET,/api/v1/orders,204,44,40005,request completed successfully
  "2026-03-29T19:49:33.524Z",warn,api-gateway,pod-j0k1l2,PUT,/api/v1/orders,408,21268,17644,upstream connect timeout
  "2026-03-29T09:32:13.883Z",info,notification-service,pod-d4e5f6,POST,/metrics,200,84,37962,request completed successfully
logs.auth[1]{idx,userId,sessionId,role,ip}:
  0,usr-4AlZCGyg,sess-ndbobBSCfbOd,service-account,132.188.36.90
```

</details>
