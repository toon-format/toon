#### Mixed-Structure Track

Datasets with nested or semi-uniform structures. CSV excluded as it cannot properly represent these structures.

```
🛒 E-commerce orders with nested structures  ┊  Tabular: 33%
   │
   TOON                █████████████░░░░░░░    72,832 tokens
   ├─ vs JSON          (−32.9%)               108,611 tokens
   ├─ vs JSON compact  (+5.6%)                 68,944 tokens
   ├─ vs YAML          (−14.0%)                84,701 tokens
   └─ vs XML           (−40.4%)               122,119 tokens

🧾 Semi-uniform event logs  ┊  Tabular: 50%
   │
   TOON                █████████████████░░░   154,084 tokens
   ├─ vs JSON          (−15.0%)               181,201 tokens
   ├─ vs JSON compact  (+19.9%)               128,529 tokens
   ├─ vs YAML          (−0.8%)                155,397 tokens
   └─ vs XML           (−25.2%)               205,859 tokens

🧩 Deeply nested configuration  ┊  Tabular: 0%
   │
   TOON                █████████████░░░░░░░       589 tokens
   ├─ vs JSON          (−34.9%)                   905 tokens
   ├─ vs JSON compact  (+6.7%)                    552 tokens
   ├─ vs YAML          (−11.0%)                   662 tokens
   └─ vs XML           (−40.9%)                   997 tokens

📊 Feature flags keyed by name  ┊  Tabular: 100%
   │
   TOON                █████████░░░░░░░░░░░    10,503 tokens
   ├─ vs JSON          (−54.6%)                23,141 tokens
   ├─ vs JSON compact  (−32.8%)                15,635 tokens
   ├─ vs YAML          (−41.3%)                17,905 tokens
   └─ vs XML           (−63.3%)                28,655 tokens

📊 Contacts with nested address and plan groups  ┊  Tabular: 100%
   │
   TOON                ███████░░░░░░░░░░░░░    26,726 tokens
   ├─ vs JSON          (−66.5%)                79,779 tokens
   ├─ vs JSON compact  (−42.9%)                46,791 tokens
   ├─ vs YAML          (−51.8%)                55,475 tokens
   └─ vs XML           (−70.4%)                90,306 tokens

──────────────────────────────────── Total ────────────────────────────────────
   TOON                █████████████░░░░░░░   264,734 tokens
   ├─ vs JSON          (−32.7%)               393,637 tokens
   ├─ vs JSON compact  (+1.6%)                260,451 tokens
   ├─ vs YAML          (−15.7%)               314,140 tokens
   └─ vs XML           (−40.9%)               447,936 tokens
```

#### Flat-Only Track

Datasets with flat tabular structures where CSV is applicable.

```
👥 Uniform employee records  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░    47,153 tokens
   TOON                ████████████████████    49,978 tokens   (+6.0% vs CSV)
   ├─ vs JSON          (−60.7%)               127,061 tokens
   ├─ vs JSON compact  (−36.8%)                79,057 tokens
   ├─ vs YAML          (−50.0%)               100,054 tokens
   └─ vs XML           (−65.9%)               146,605 tokens

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
   CSV                 ███████████████████░     8,711 tokens
   TOON                ████████████████████     8,937 tokens   (+2.6% vs CSV)
   ├─ vs JSON          (−41.7%)                15,337 tokens
   ├─ vs JSON compact  (−23.2%)                11,640 tokens
   ├─ vs YAML          (−33.0%)                13,337 tokens
   └─ vs XML           (−48.3%)                17,294 tokens

──────────────────────────────────── Total ────────────────────────────────────
   CSV                 ███████████████████░    64,247 tokens
   TOON                ████████████████████    68,030 tokens   (+5.9% vs CSV)
   ├─ vs JSON          (−58.7%)               164,643 tokens
   ├─ vs JSON compact  (−35.2%)               104,908 tokens
   ├─ vs YAML          (−48.2%)               131,249 tokens
   └─ vs XML           (−64.3%)               190,515 tokens
```

Token counts use `gpt-tokenizer` with `o200k_base` encoding (GPT-5 tokenizer). Other providers tokenize differently, so absolute counts are tokenizer-specific; relative differences between formats hold directionally.

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

**Savings:** 6,400 tokens (41.7% reduction vs JSON)

**JSON** (15,337 tokens):

```json
{
  "repositories": [
    {
      "id": 132750724,
      "name": "build-your-own-x",
      "repo": "codecrafters-io/build-your-own-x",
      "description": "Master programming by recreating your favorite technologies from scratch.",
      "createdAt": "2018-05-09T12:03:18Z",
      "updatedAt": "2026-07-23T18:57:15Z",
      "pushedAt": "2026-07-14T19:25:58Z",
      "stars": 530712,
      "watchers": 6778,
      "forks": 50205,
      "defaultBranch": "master"
    },
    {
      "id": 21737465,
      "name": "awesome",
      "repo": "sindresorhus/awesome",
      "description": "😎 Awesome lists about all kinds of interesting topics",
      "createdAt": "2014-07-11T13:42:37Z",
      "updatedAt": "2026-07-23T18:57:24Z",
      "pushedAt": "2026-06-30T18:21:16Z",
      "stars": 488074,
      "watchers": 8292,
      "forks": 36010,
      "defaultBranch": "main"
    },
    {
      "id": 28457823,
      "name": "freeCodeCamp",
      "repo": "freeCodeCamp/freeCodeCamp",
      "description": "freeCodeCamp.org's open-source codebase and curriculum. Learn math, programming,…",
      "createdAt": "2014-12-24T17:49:19Z",
      "updatedAt": "2026-07-22T07:01:33Z",
      "pushedAt": "2026-07-21T18:00:51Z",
      "stars": 452380,
      "watchers": 8590,
      "forks": 45624,
      "defaultBranch": "main"
    }
  ]
}
```

**TOON** (8,937 tokens):

```
repositories[3]{id,name,repo,description,createdAt,updatedAt,pushedAt,stars,watchers,forks,defaultBranch}:
  132750724,build-your-own-x,codecrafters-io/build-your-own-x,Master programming by recreating your favorite technologies from scratch.,"2018-05-09T12:03:18Z","2026-07-23T18:57:15Z","2026-07-14T19:25:58Z",530712,6778,50205,master
  21737465,awesome,sindresorhus/awesome,😎 Awesome lists about all kinds of interesting topics,"2014-07-11T13:42:37Z","2026-07-23T18:57:24Z","2026-06-30T18:21:16Z",488074,8292,36010,main
  28457823,freeCodeCamp,freeCodeCamp/freeCodeCamp,"freeCodeCamp.org's open-source codebase and curriculum. Learn math, programming,…","2014-12-24T17:49:19Z","2026-07-22T07:01:33Z","2026-07-21T18:00:51Z",452380,8590,45624,main
```

</details>
