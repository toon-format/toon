# Implementation Listings

The [implementations page](https://toonformat.dev/ecosystem/implementations) lists implementations people can use today. It doesn't list one that only encodes or only decodes, or one that doesn't run the conformance fixtures.

## Why this is out of scope

A row on the page reads as a recommendation. More than one implementation per language is fine, as long as each follows the [listing steps](https://toonformat.dev/ecosystem/implementations#contributing-an-implementation). An encoder or a decoder alone doesn't round-trip, and an implementation that fails part of the fixtures doesn't track the spec yet.

Open a PR again once the implementation does both and runs the fixtures in CI.

## Prior requests

- toon#337 – simd-toon, decode-only and failing part of the fixtures
- toon#342 – toon-fu, encoder-only
