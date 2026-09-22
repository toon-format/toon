---
description: What changed from TOON v3 to v4 – nested field groups, keyed tabular form, comments, removed key folding, and how to upgrade.
---

# What's New in v4

TOON v4 is the first release where nesting stops costing you lines. Every example on this page encodes the same weather document.

::: tip Version numbering
The `@toon-format/toon` package jumped from `2.3.1` straight to `4.0.0` to realign with the spec. When this page says "v3 output", it means what `@toon-format/toon@2.3.1` produced.
:::

## The Example

```json
{
  "location": { "city": "Berlin", "country": "DE", "units": "metric" },
  "alerts": ["frost", "wind"],
  "forecast": [
    { "day": "Mon", "temp": { "min": -2, "max": 4 }, "condition": "snow", "rainChance": 80 },
    { "day": "Tue", "temp": { "min": 1, "max": 7 }, "condition": "cloudy", "rainChance": 20 },
    { "day": "Wed", "temp": { "min": 3, "max": 11 }, "condition": "sunny", "rainChance": 5 }
  ],
  "stations": {
    "tempelhof": { "lat": 52.47, "lon": 13.4, "active": true },
    "tegel": { "lat": 52.55, "lon": 13.29, "active": false },
    "dahlem": { "lat": 52.46, "lon": 13.3, "active": true }
  }
}
```

Reformatted for reading – both JSON rows below are measured on real `JSON.stringify` output.

::: code-group

```toon [TOON v4]
location:
  city: Berlin
  country: DE
  units: metric
alerts[2]: frost,wind
forecast[3]{day,temp{min,max},condition,rainChance}:
  Mon,-2,4,snow,80
  Tue,1,7,cloudy,20
  Wed,3,11,sunny,5
stations[3:]{lat,lon,active}:
  tempelhof: 52.47,13.4,true
  tegel: 52.55,13.29,false
  dahlem: 52.46,13.3,true
```

```toon [TOON v3]
location:
  city: Berlin
  country: DE
  units: metric
alerts[2]: frost,wind
forecast[3]:
  - day: Mon
    temp:
      min: -2
      max: 4
    condition: snow
    rainChance: 80
  - day: Tue
    temp:
      min: 1
      max: 7
    condition: cloudy
    rainChance: 20
  - day: Wed
    temp:
      min: 3
      max: 11
    condition: sunny
    rainChance: 5
stations:
  tempelhof:
    lat: 52.47
    lon: 13.4
    active: true
  tegel:
    lat: 52.55
    lon: 13.29
    active: false
  dahlem:
    lat: 52.46
    lon: 13.3
    active: true
```

:::

| Encoding | Tokens | Lines |
| --- | --- | --- |
| JSON, compact | 162 | 1 |
| JSON, 2-space indent | 301 | 57 |
| TOON v3 | 204 | 37 |
| **TOON v4** | **128** | **13** |

Counted with `gpt-tokenizer` on `o200k_base`.

On this document, v3 was worse than compact JSON. TOON's savings always came from the table header, and v3 lost that header the moment a value was an object. Both new tabular forms exist to win it back.

## Nested Field Groups

In v3, one nested object was enough to knock an array out of tabular form and back into indentation. `temp` is an object, so all three forecast entries paid full key overhead.

v4 lets the header describe nesting: a field followed by a brace group expands into its own columns:

```diff
- forecast[3]:
-   - day: Mon
-     temp:
-       min: -2
-       max: 4
-     condition: snow
-     rainChance: 80
-   … 12 more lines for Tue and Wed
+ forecast[3]{day,temp{min,max},condition,rainChance}:
+   Mon,-2,4,snow,80
+   Tue,1,7,cloudy,20
+   Wed,3,11,sunny,5
```

The forecast array alone drops from 102 tokens to 49. Groups nest arbitrarily deep. Where no group applies, v4 output matches v3 byte for byte. Full rules in [Format Overview](/guide/format-overview#nested-field-groups).

Proposed in [spec#46](https://github.com/toon-format/spec/issues/46) by [@Turtle-dev3](https://github.com/Turtle-dev3).

## Keyed Tabular Form

The other half of the problem: an object whose *values* are uniform objects. `stations` is a lookup table, but v3 wrote it out one key at a time.

v4 collapses it into a table whose rows carry their own keys. A colon directly after the length – `[3:]` – marks the keyed form, and the field list is required:

```diff
- stations:
-   tempelhof:
-     lat: 52.47
-     lon: 13.4
-     active: true
-   … 8 more lines for tegel and dahlem
+ stations[3:]{lat,lon,active}:
+   tempelhof: 52.47,13.4,true
+   tegel: 52.55,13.29,false
+   dahlem: 52.46,13.3,true
```

76 tokens to 53. It needs at least two entries, and applies to object fields and the document root but never inside a column. A keyed header can carry nested field groups: `stations[3:]{coords{lat,lon},active}:`. Full rules in [Format Overview](/guide/format-overview#keyed-tabular-objects).

Specified in [spec#57](https://github.com/toon-format/spec/issues/57), building on earlier proposals from [@cstroliadavis](https://github.com/cstroliadavis) ([spec#32](https://github.com/toon-format/spec/issues/32)) and [@metafishTV](https://github.com/metafishTV) ([spec#45](https://github.com/toon-format/spec/issues/45)).

## Comments

A line whose first non-space character is `#` is a comment. It is removed in a lexical pre-pass, in both strict and non-strict mode, so it never terminates a scope and never counts toward a declared length:

```toon
# Weekly export, generated 2026-08-22
forecast[2]{day,condition}:
  # Monday was revised after the frost warning
  Mon,snow
  Tue,cloudy
```

Decodes to two rows. There is no inline or trailing comment form – `#` only starts a comment at the beginning of a line, and only after spaces, not tabs.

Encoders never emit comments, and they now always quote a string that begins with `#`, so encoder output can never be read back as one. See [Format Overview](/guide/format-overview#comments).

Requested in [spec#1](https://github.com/toon-format/spec/issues/1) by [@osjimenez](https://github.com/osjimenez) and [spec#3](https://github.com/toon-format/spec/issues/3); the quoting rule came out of [toon#328](https://github.com/toon-format/toon/issues/328).

## Removed: Key Folding

The `keyFolding` and `flattenDepth` encoder options and the `expandPaths` decoder option are gone, along with the CLI flags `--key-folding`, `--flatten-depth` and `--expand-paths`. A dotted key is now unconditionally a single literal key:

```toon
# v4 reads this as one key named "data.meta.items"
data.meta.items[2]{id,name}:
```

Only documents encoded with key folding turned on are affected; default v3 output never used it. To migrate stored documents, decode once with a v3 decoder using `expandPaths: "safe"`, then re-encode with v4.

## Also in v4.0

Decoder-side rules that do not change how documents look:

- **A normative number grammar.** An unquoted token decodes as a number only in plain JSON number form, so `.5`, `1.`, `+5`, `01`, `Infinity`, `NaN`, `0x10` and `1_000` are strings, and decoders must not hand tokens to a wider host parser. On the encode side the same rule means signed-number lookalikes such as `+1` are now quoted on output.
- **Prototype-key safety.** `__proto__`, `constructor` and `prototype` are ordinary own entries in every key position, and decoding must not touch the host object model.
- **Ill-formed UTF-8 is rejected.** Byte-input decoders error in strict mode instead of substituting U+FFFD.
- **A looser unquoted-key rule.** An unquoted key is everything before the first unquoted colon, so strict decoders now accept keys like `foo-bar` and `2key`.

## Upgrading

Three things to check, in this order:

1. **Update decoders before encoders.** Nested field groups fail loudly on a v3 decoder in either mode. Keyed tabular output is the dangerous one: a strict v3 decoder fails cleanly, but a non-strict v3 decoder mis-decodes it *silently*.
2. **Scan stored v3 documents for `/^ *#/` and for skipped indentation levels.** Comments are the only v4 change that alters the decoded meaning of otherwise-valid v3 output: a `#`-leading line now reads as a comment. A `#`-leading root scalar disappears silently; inside a tabular array the row count no longer matches, so you get an error instead. The fix for both: re-encode under v4, which quotes the string and decodes identically under both versions. Separately, a document that skips an indentation level is now a strict-mode error – hand-authored files only, since no encoder ever produced one.
3. **Remove the deleted options** from encoder and decoder calls and from CLI invocations.

## v4.1

No syntax changes, and `@toon-format/toon` output is byte-identical between v4.0 and v4.1.

What changed is what the spec *requires* of an encoder, which matters if you maintain your own. Tabular form is now mandatory wherever detection succeeds and the position permits a fields-bearing header, and empty arrays must be written `key: []`, never the legacy `key[0]:`. Decoders still accept everything a v4.0 encoder could produce.

**New API.** `rawString()` marks a value to be emitted verbatim from a replacer, bypassing quoting and number detection; `escapeString()` is now exported. See the [API reference](/reference/api). Contributed by [@yilmazhasan](https://github.com/yilmazhasan) in [toon#321](https://github.com/toon-format/toon/pull/321).

**Options.** `indentSize` is accepted on both `EncodeOptions` and `DecodeOptions`; `indent` still works but is deprecated.

Beyond that, v4.1 is conformance work: unstated error conditions made explicit, BOM handling specified, and a set of section renames in the spec.
