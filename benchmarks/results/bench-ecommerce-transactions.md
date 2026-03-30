## E-commerce Transactions

> 500 rows, multi-extras (shipping/discount/giftWrap), 2-3 depth

### Token Comparison

| Format | Tokens | vs JSON compact |
|--------|--------|-----------------|
| JSON pretty | 55,996 | +60.4% |
| JSON compact | 34,908 | baseline |
| TOON | 42,782 | +22.6% |
| **TOON (normalized)** | **21,604** | **-38.1%** |

### Normalized Structure

```
transactions[500]{txId,userId,amount,currency,status,createdAt}
transactions.shipping[283]{idx,carrier,tracking,address.city,address.state,address.zip,address.country}
transactions.discount[124]{idx,code,amount,type}
```

### TOON Normalized (first 20 lines)

```
transactions[500]{txId,userId,amount,currency,status,createdAt}:
  TX-00001,5512,241.05,EUR,failed,2026-03-23
  TX-00002,5106,178.89,EUR,refunded,2026-03-04
  TX-00003,9439,912.22,JPY,completed,2026-03-03
  TX-00004,9135,327.13,KRW,completed,2026-03-01
  TX-00005,2713,672.59,USD,failed,2026-03-02
  TX-00006,2426,492.11,EUR,refunded,2026-03-03
  TX-00007,2937,862.15,JPY,refunded,2026-03-10
  TX-00008,5084,544.66,JPY,pending,2026-03-11
  TX-00009,1590,693.02,KRW,pending,2026-03-10
  TX-00010,2741,218.06,USD,failed,2026-03-06
  TX-00011,6527,340.47,JPY,completed,2026-03-26
  TX-00012,7018,546.91,JPY,completed,2026-03-03
  TX-00013,7311,790.36,EUR,pending,2026-03-11
  TX-00014,1075,176.74,KRW,refunded,2026-03-27
  TX-00015,1011,128.83,KRW,refunded,2026-03-12
  TX-00016,2884,21.65,JPY,pending,2026-03-20
  TX-00017,9110,752.41,EUR,refunded,2026-03-09
  TX-00018,4944,269.8,USD,refunded,2026-03-15
  TX-00019,5658,581.52,KRW,failed,2026-03-02
...
```


### Sample Data (5 rows)

<details>
<summary><strong>JSON (source)</strong></summary>

```json
{
  "transactions": [
    {
      "txId": "TX-00001",
      "userId": 4370,
      "amount": 950.26,
      "currency": "KRW",
      "status": "refunded",
      "createdAt": "2026-03-04"
    },
    {
      "txId": "TX-00002",
      "userId": 2403,
      "amount": 67.44,
      "currency": "JPY",
      "status": "refunded",
      "createdAt": "2026-03-21",
      "shipping": {
        "carrier": "FedEx",
        "tracking": "YPDBBIWQIB8I",
        "address": {
          "city": "South Ozella",
          "state": "GA",
          "zip": "50610-9983",
          "country": "US"
        }
      }
    },
    {
      "txId": "TX-00003",
      "userId": 7158,
      "amount": 445.31,
      "currency": "USD",
      "status": "pending",
      "createdAt": "2026-03-01",
      "discount": {
        "code": "SAVE10",
        "amount": 15,
        "type": "fixed"
      }
    },
    {
      "txId": "TX-00004",
      "userId": 9183,
      "amount": 265.93,
      "currency": "KRW",
      "status": "pending",
      "createdAt": "2026-03-15",
      "shipping": {
        "carrier": "UPS",
        "tracking": "BYMWTBV5C2KO",
        "address": {
          "city": "Port Fletcher",
          "state": "IA",
          "zip": "18097-1087",
          "country": "JP"
        }
      },
      "discount": {
        "code": "VIP20",
        "amount": 20,
        "type": "percentage"
      }
    },
    {
      "txId": "TX-00005",
      "userId": 7941,
      "amount": 83.23,
      "currency": "EUR",
      "status": "completed",
      "createdAt": "2026-03-25",
      "shipping": {
        "carrier": "UPS",
        "tracking": "K3JKJDTT7ILY",
        "address": {
          "city": "Kundestad",
          "state": "MI",
          "zip": "10635",
          "country": "JP"
        }
      }
    }
  ]
}
```

</details>

<details>
<summary><strong>TOON (before)</strong></summary>

```
transactions[5]:
  - txId: TX-00001
    userId: 4370
    amount: 950.26
    currency: KRW
    status: refunded
    createdAt: 2026-03-04
  - txId: TX-00002
    userId: 2403
    amount: 67.44
    currency: JPY
    status: refunded
    createdAt: 2026-03-21
    shipping:
      carrier: FedEx
      tracking: YPDBBIWQIB8I
      address:
        city: South Ozella
        state: GA
        zip: 50610-9983
        country: US
  - txId: TX-00003
    userId: 7158
    amount: 445.31
    currency: USD
    status: pending
    createdAt: 2026-03-01
    discount:
      code: SAVE10
      amount: 15
      type: fixed
  - txId: TX-00004
    userId: 9183
    amount: 265.93
    currency: KRW
    status: pending
    createdAt: 2026-03-15
    shipping:
      carrier: UPS
      tracking: BYMWTBV5C2KO
      address:
        city: Port Fletcher
        state: IA
        zip: 18097-1087
        country: JP
    discount:
      code: VIP20
      amount: 20
      type: percentage
  - txId: TX-00005
    userId: 7941
    amount: 83.23
    currency: EUR
    status: completed
    createdAt: 2026-03-25
    shipping:
      carrier: UPS
      tracking: K3JKJDTT7ILY
      address:
        city: Kundestad
        state: MI
        zip: "10635"
        country: JP
```

</details>

<details>
<summary><strong>TOON normalized (after)</strong></summary>

```
transactions[5]{txId,userId,amount,currency,status,createdAt}:
  TX-00001,4370,950.26,KRW,refunded,2026-03-04
  TX-00002,2403,67.44,JPY,refunded,2026-03-21
  TX-00003,7158,445.31,USD,pending,2026-03-01
  TX-00004,9183,265.93,KRW,pending,2026-03-15
  TX-00005,7941,83.23,EUR,completed,2026-03-25
transactions.shipping[3]{idx,carrier,tracking,address.city,address.state,address.zip,address.country}:
  1,FedEx,YPDBBIWQIB8I,South Ozella,GA,50610-9983,US
  3,UPS,BYMWTBV5C2KO,Port Fletcher,IA,18097-1087,JP
  4,UPS,K3JKJDTT7ILY,Kundestad,MI,"10635",JP
transactions.discount[2]{idx,code,amount,type}:
  2,SAVE10,15,fixed
  3,VIP20,20,percentage
```

</details>
