#### Mixed-Structure Track

Datasets with nested or semi-uniform structures. CSV excluded as it cannot properly represent these structures.

```
🛒 E-commerce orders with nested structures  ┊  Tabular: 33%
   │
   TOON                █████████████░░░░░░░    73,246 tokens
   ├─ vs JSON          (−33.2%)               109,574 tokens
   ├─ vs JSON compact  (+5.3%)                 69,528 tokens
   ├─ vs YAML          (−14.3%)                85,451 tokens
   ├─ vs XML           (−40.6%)               123,272 tokens
   └─ vs KDL           (+2.8%)                 71,260 tokens

🧾 Semi-uniform event logs  ┊  Tabular: 50%
   │
   TOON                █████████████████░░░   154,032 tokens
   ├─ vs JSON          (−15.0%)               181,141 tokens
   ├─ vs JSON compact  (+19.9%)               128,480 tokens
   ├─ vs YAML          (−0.8%)                155,346 tokens
   ├─ vs XML           (−25.2%)               205,796 tokens
   └─ vs KDL           (+21.8%)               126,484 tokens

🧩 Deeply nested configuration  ┊  Tabular: 0%
   │
   TOON                ██████████████░░░░░░       620 tokens
   ├─ vs JSON          (−31.5%)                   905 tokens
   ├─ vs JSON compact  (+12.3%)                   552 tokens
   ├─ vs YAML          (−6.3%)                    662 tokens
   ├─ vs XML           (−37.8%)                   997 tokens
   └─ vs KDL           (−1.0%)                    626 tokens

──────────────────────────────────── Total ────────────────────────────────────
   TOON                ████████████████░░░░   227,898 tokens
   ├─ vs JSON          (−21.9%)               291,620 tokens
   ├─ vs JSON compact  (+14.8%)               198,560 tokens
   ├─ vs YAML          (−5.6%)                241,459 tokens
   ├─ vs XML           (−31.0%)               330,065 tokens
   └─ vs KDL           (+14.9%)               198,370 tokens
```

#### Flat-Only Track

Datasets with flat tabular structures where CSV is applicable.

```
👥 Uniform employee records  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░    47,137 tokens
   TOON                ████████████████████    49,966 tokens   (+6.0% vs CSV)
   ├─ vs JSON          (−60.7%)               127,050 tokens
   ├─ vs JSON compact  (−36.8%)                79,046 tokens
   ├─ vs YAML          (−50.1%)               100,033 tokens
   ├─ vs XML           (−65.9%)               146,596 tokens
   └─ vs KDL           (−33.4%)                75,049 tokens

📈 Time-series analytics data  ┊  Tabular: 100%
   │
   CSV                 ██████████████████░░     8,395 tokens
   TOON                ████████████████████     9,127 tokens   (+8.7% vs CSV)
   ├─ vs JSON          (−59.0%)                22,257 tokens
   ├─ vs JSON compact  (−35.8%)                14,223 tokens
   ├─ vs YAML          (−48.9%)                17,870 tokens
   ├─ vs XML           (−65.7%)                26,628 tokens
   └─ vs KDL           (−26.4%)                12,401 tokens

⭐ Top 100 GitHub repositories  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░     8,512 tokens
   TOON                ████████████████████     8,744 tokens   (+2.7% vs CSV)
   ├─ vs JSON          (−42.3%)                15,144 tokens
   ├─ vs JSON compact  (−23.7%)                11,454 tokens
   ├─ vs YAML          (−33.4%)                13,128 tokens
   ├─ vs XML           (−48.9%)                17,095 tokens
   └─ vs KDL           (−20.1%)                10,947 tokens

──────────────────────────────────── Total ────────────────────────────────────
   CSV                 ███████████████████░    64,044 tokens
   TOON                ████████████████████    67,837 tokens   (+5.9% vs CSV)
   ├─ vs JSON          (−58.7%)               164,451 tokens
   ├─ vs JSON compact  (−35.2%)               104,723 tokens
   ├─ vs YAML          (−48.2%)               131,031 tokens
   ├─ vs XML           (−64.4%)               190,319 tokens
   └─ vs KDL           (−31.1%)                98,397 tokens
```

<details>
<summary><strong>Show detailed examples</strong></summary>

#### 📈 Time-series analytics data

**Savings:** 13,130 tokens (59.0% reduction vs JSON)

**JSON** (22,257 tokens):

```json
{
  "metrics": [
    {
      "date": "2025-01-01",
      "views": 4369,
      "clicks": 278,
      "conversions": 22,
      "revenue": 2108.75,
      "bounceRate": 0.48
    },
    {
      "date": "2025-01-02",
      "views": 5958,
      "clicks": 193,
      "conversions": 27,
      "revenue": 7353.88,
      "bounceRate": 0.61
    },
    {
      "date": "2025-01-03",
      "views": 6958,
      "clicks": 349,
      "conversions": 43,
      "revenue": 5512.87,
      "bounceRate": 0.41
    },
    {
      "date": "2025-01-04",
      "views": 6520,
      "clicks": 388,
      "conversions": 47,
      "revenue": 9381.99,
      "bounceRate": 0.42
    },
    {
      "date": "2025-01-05",
      "views": 4158,
      "clicks": 110,
      "conversions": 15,
      "revenue": 3849.04,
      "bounceRate": 0.35
    }
  ]
}
```

**TOON** (9,127 tokens):

```
metrics[5]{date,views,clicks,conversions,revenue,bounceRate}:
  2025-01-01,4369,278,22,2108.75,0.48
  2025-01-02,5958,193,27,7353.88,0.61
  2025-01-03,6958,349,43,5512.87,0.41
  2025-01-04,6520,388,47,9381.99,0.42
  2025-01-05,4158,110,15,3849.04,0.35
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
