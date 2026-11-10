# Purpose-Built Helpers

`@toon-format/toon` grows through general mechanisms, not helpers for one use case. Dedicated options and functions like `quoteStrings` or `detectTruncation()` are out of scope when the format or an existing option already covers the need.

## Why this is out of scope

Every public option and export is API the reference keeps forever and ports tend to mirror. The `replacer` option already forces quoting without a dedicated flag ([toon#161](https://github.com/toon-format/toon/pull/161#issuecomment-4162853674)). Truncation detection is the format's own guarantee – a strict decode throws at the first count mismatch (§14.1), and `strict: false` returns what arrived – while truncation policy varies by caller, so a fixed report shape doesn't belong in core ([toon#312](https://github.com/toon-format/toon/issues/312#issuecomment-5082645034)).

Build such helpers on top of `encode`, `decode`, or `replacer`, in your own code or a separate package.

## Prior requests

- toon#312 – `detectTruncation()` public API
- toon#313 – `detectTruncation()` implementation
- toon#161 – `quoteStrings` option
