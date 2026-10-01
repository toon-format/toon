# Purpose-Built Helpers

`@toon-format/toon` grows through general mechanisms, not helpers for one use case. Dedicated flags and functions like `quoteStrings` or `detectTruncation()` are out of scope when the format or an existing option already covers the need.

## Why this is out of scope

Every public option and export is API that the reference keeps forever, and that ports tend to mirror. A general mechanism covers many shapes at once: the `replacer` option, with `rawString` for controlled raw output, handles forced quoting, value rewriting, and omission without a flag per case ([toon#161](https://github.com/toon-format/toon/pull/161#issuecomment-4162853674)).

Truncation is the same: detecting it is already the format's guarantee. A strict decode throws at the first count mismatch (§14.1), and `strict: false` returns what actually arrived. What a report function adds is a fixed shape for policy that varies by caller:

> Truncation *policy* varies by caller (throw, retry, re-prompt, accept partial), and the issue itself still carries five open design questions, including the function's name. Freezing an unsettled shape into the public API is the wrong trade.
> – [toon#312](https://github.com/toon-format/toon/issues/312#issuecomment-5082645034)

Build the helper on top of `encode`, `decode`, or `replacer` in your own code or as a separate package.

## Prior requests

- toon#312 – `detectTruncation()` public API
- toon#313 – `detectTruncation()` implementation PR
- toon#161 – `quoteStrings` option (superseded by `replacer`)
