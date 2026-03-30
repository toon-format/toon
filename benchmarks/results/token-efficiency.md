#### Mixed-Structure Track

Datasets with nested or semi-uniform structures. CSV excluded as it cannot properly represent these structures.

```
🛒 E-commerce orders with nested structures  ┊  Tabular: 33%
   │
   TOON                █████████████░░░░░░░    73,126 tokens
   ├─ vs JSON          (−33.3%)               109,599 tokens
   ├─ vs JSON compact  (+5.3%)                 69,459 tokens
   ├─ vs YAML          (−14.4%)                85,415 tokens
   └─ vs XML           (−40.7%)               123,344 tokens

🧾 Semi-uniform event logs  ┊  Tabular: 50%
   │
   TOON                █████████████████░░░   154,084 tokens
   ├─ vs JSON          (−15.0%)               181,201 tokens
   ├─ vs JSON compact  (+19.9%)               128,529 tokens
   ├─ vs YAML          (−0.8%)                155,397 tokens
   ├─ vs XML           (−25.2%)               205,859 tokens
   └─ vs TOON (normalized) (+61.0%)                95,675 tokens

🧩 Deeply nested configuration  ┊  Tabular: 0%
   │
   TOON                ██████████████░░░░░░       620 tokens
   ├─ vs JSON          (−31.9%)                   911 tokens
   ├─ vs JSON compact  (+11.1%)                   558 tokens
   ├─ vs YAML          (−6.3%)                    662 tokens
   ├─ vs XML           (−38.2%)                 1,003 tokens
   └─ vs TOON (normalized) (−0.0%)                    620 tokens

🛍️ Semi-uniform orders with optional discount and shipping  ┊  Tabular: 40%
   │
   TOON                ███████████████░░░░░    31,467 tokens
   ├─ vs JSON          (−25.3%)                42,124 tokens
   ├─ vs JSON compact  (+22.6%)                25,674 tokens
   ├─ vs YAML          (+0.0%)                 31,466 tokens
   ├─ vs XML           (−35.0%)                48,414 tokens
   └─ vs TOON (normalized) (+81.1%)                17,375 tokens

🚨 Incidents with deep optional resolution  ┊  Tabular: 30%
   │
   TOON                ████████████████░░░░    37,031 tokens
   ├─ vs JSON          (−19.0%)                45,721 tokens
   ├─ vs JSON compact  (+12.6%)                32,893 tokens
   ├─ vs YAML          (−0.1%)                 37,051 tokens
   ├─ vs XML           (−29.3%)                52,414 tokens
   └─ vs TOON (normalized) (+43.3%)                25,846 tokens

📋 Grafana/Loki-style logs with multi-extras  ┊  Tabular: 45%
   │
   TOON                █████████████████░░░   226,609 tokens
   ├─ vs JSON          (−17.0%)               273,073 tokens
   ├─ vs JSON compact  (+18.0%)               192,070 tokens
   ├─ vs YAML          (+0.2%)                226,095 tokens
   ├─ vs XML           (−26.8%)               309,612 tokens
   └─ vs TOON (normalized) (+76.5%)               128,372 tokens

──────────────────────────────────── Total ────────────────────────────────────
   TOON                ████████████████░░░░   522,937 tokens
   ├─ vs JSON          (−19.9%)               652,629 tokens
   ├─ vs JSON compact  (+16.4%)               449,183 tokens
   ├─ vs YAML          (−2.5%)                536,086 tokens
   ├─ vs XML           (−29.4%)               740,646 tokens
   └─ vs TOON (normalized) (+95.2%)               267,888 tokens
```

#### Flat-Only Track

Datasets with flat tabular structures where CSV is applicable.

```
👥 Uniform employee records  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░    47,102 tokens
   TOON                ████████████████████    49,919 tokens   (+6.0% vs CSV)
   ├─ vs JSON          (−60.7%)               127,063 tokens
   ├─ vs JSON compact  (−36.9%)                79,059 tokens
   ├─ vs YAML          (−50.1%)               100,011 tokens
   └─ vs XML           (−65.9%)               146,579 tokens

📈 Time-series analytics data  ┊  Tabular: 100%
   │
   CSV                 ██████████████████░░     8,383 tokens
   TOON                ████████████████████     9,115 tokens   (+8.7% vs CSV)
   ├─ vs JSON          (−59.0%)                22,245 tokens
   ├─ vs JSON compact  (−35.9%)                14,211 tokens
   ├─ vs YAML          (−49.0%)                17,858 tokens
   └─ vs XML           (−65.8%)                26,616 tokens

⭐ Top 100 GitHub repositories  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░     8,512 tokens
   TOON                ████████████████████     8,744 tokens   (+2.7% vs CSV)
   ├─ vs JSON          (−42.3%)                15,144 tokens
   ├─ vs JSON compact  (−23.7%)                11,454 tokens
   ├─ vs YAML          (−33.4%)                13,128 tokens
   └─ vs XML           (−48.9%)                17,095 tokens

──────────────────────────────────── Total ────────────────────────────────────
   CSV                 ███████████████████░    63,997 tokens
   TOON                ████████████████████    67,778 tokens   (+5.9% vs CSV)
   ├─ vs JSON          (−58.8%)               164,452 tokens
   ├─ vs JSON compact  (−35.3%)               104,724 tokens
   ├─ vs YAML          (−48.3%)               130,997 tokens
   └─ vs XML           (−64.4%)               190,290 tokens
```

<details>
<summary><strong>Show detailed examples</strong></summary>

#### 📈 Time-series analytics data

**Savings:** 13,130 tokens (59.0% reduction vs JSON)

**JSON** (22,245 tokens):

```json
{
  "metrics": [
    {
      "date": "2025-01-01",
      "views": 6138,
      "clicks": 174,
      "conversions": 12,
      "revenue": 2712.49,
      "bounceRate": 0.35
    },
    {
      "date": "2025-01-02",
      "views": 4616,
      "clicks": 274,
      "conversions": 34,
      "revenue": 9156.29,
      "bounceRate": 0.56
    },
    {
      "date": "2025-01-03",
      "views": 4460,
      "clicks": 143,
      "conversions": 8,
      "revenue": 1317.98,
      "bounceRate": 0.59
    },
    {
      "date": "2025-01-04",
      "views": 4740,
      "clicks": 125,
      "conversions": 13,
      "revenue": 2934.77,
      "bounceRate": 0.37
    },
    {
      "date": "2025-01-05",
      "views": 6428,
      "clicks": 369,
      "conversions": 19,
      "revenue": 1317.24,
      "bounceRate": 0.3
    }
  ]
}
```

**TOON** (9,115 tokens):

```
metrics[5]{date,views,clicks,conversions,revenue,bounceRate}:
  2025-01-01,6138,174,12,2712.49,0.35
  2025-01-02,4616,274,34,9156.29,0.56
  2025-01-03,4460,143,8,1317.98,0.59
  2025-01-04,4740,125,13,2934.77,0.37
  2025-01-05,6428,369,19,1317.24,0.3
```

---

#### ⭐ Top 100 GitHub repositories

**Savings:** 6,400 tokens (42.3% reduction vs JSON)

**JSON** (15,144 tokens):

```json
{
  "repositories": [
    {
      "id": 28457823,
      "name": "freeCodeCamp",
      "repo": "freeCodeCamp/freeCodeCamp",
      "description": "freeCodeCamp.org's open-source codebase and curriculum. Learn math, programming,…",
      "createdAt": "2014-12-24T17:49:19Z",
      "updatedAt": "2025-10-28T11:58:08Z",
      "pushedAt": "2025-10-28T10:17:16Z",
      "stars": 430886,
      "watchers": 8583,
      "forks": 42146,
      "defaultBranch": "main"
    },
    {
      "id": 132750724,
      "name": "build-your-own-x",
      "repo": "codecrafters-io/build-your-own-x",
      "description": "Master programming by recreating your favorite technologies from scratch.",
      "createdAt": "2018-05-09T12:03:18Z",
      "updatedAt": "2025-10-28T12:37:11Z",
      "pushedAt": "2025-10-10T18:45:01Z",
      "stars": 430877,
      "watchers": 6332,
      "forks": 40453,
      "defaultBranch": "master"
    },
    {
      "id": 21737465,
      "name": "awesome",
      "repo": "sindresorhus/awesome",
      "description": "😎 Awesome lists about all kinds of interesting topics",
      "createdAt": "2014-07-11T13:42:37Z",
      "updatedAt": "2025-10-28T12:40:21Z",
      "pushedAt": "2025-10-27T17:57:31Z",
      "stars": 410052,
      "watchers": 8017,
      "forks": 32029,
      "defaultBranch": "main"
    }
  ]
}
```

**TOON** (8,744 tokens):

```
repositories[3]{id,name,repo,description,createdAt,updatedAt,pushedAt,stars,watchers,forks,defaultBranch}:
  28457823,freeCodeCamp,freeCodeCamp/freeCodeCamp,"freeCodeCamp.org's open-source codebase and curriculum. Learn math, programming,…","2014-12-24T17:49:19Z","2025-10-28T11:58:08Z","2025-10-28T10:17:16Z",430886,8583,42146,main
  132750724,build-your-own-x,codecrafters-io/build-your-own-x,Master programming by recreating your favorite technologies from scratch.,"2018-05-09T12:03:18Z","2025-10-28T12:37:11Z","2025-10-10T18:45:01Z",430877,6332,40453,master
  21737465,awesome,sindresorhus/awesome,😎 Awesome lists about all kinds of interesting topics,"2014-07-11T13:42:37Z","2025-10-28T12:40:21Z","2025-10-27T17:57:31Z",410052,8017,32029,main
```

</details>
