# Implementation Listings

The [implementations page](https://toonformat.dev/ecosystem/implementations) doesn't take a second general-purpose port for a language that already has one, and it doesn't take implementations that aren't usable yet – decode-only or encode-only work in progress, or ports that fail the conformance fixtures.

## Why this is out of scope

**One port per language.** Several libraries for the same language split contributors and leave users guessing which one tracks the spec. That's why the official ports under `toon-format` exist in the first place:

> In the end, I feel like more TOON implementations in the same language only hurt the dev/user and leads to ecosystem fragmentation... I'd appreciate if you could improve the existing implementation.
> – [toon#132](https://github.com/toon-format/toon/pull/132#issuecomment-3532615012)

Where an official port exists, contributions belong there ([toon#243](https://github.com/toon-format/toon/pull/243#issuecomment-3690194080), [toon#300](https://github.com/toon-format/toon/pull/300#issuecomment-4471445638)). Where several community ports compete, the list consolidates around one ([toon#265](https://github.com/toon-format/toon/pull/265#issuecomment-4162847645), [toon#291](https://github.com/toon-format/toon/pull/291#issuecomment-4162851611)).

The table does carry a few second rows. Most tie TOON into a different runtime, framework, or host library – `toons` (Rust backend for Python), `laravel-toon`, `t3-toon`, `Corvus.JsonSchema`, `json-io` – and `gotoon` and `ToonEncoder` are older listings.

**Usable today.** A row on the page reads as a recommendation. An implementation that only decodes, only runs on one CPU feature set, or fails part of the [conformance fixtures](https://github.com/toon-format/spec/tree/main/tests) isn't one yet. The page's "Contributing an Implementation" steps ask for the spec and the reference test suite for that reason.

Improve the existing port for your language, or come back once the implementation encodes, decodes, and passes the fixtures.

## Prior requests

- toon#342 – toon-fu, a second Ruby entry (encoder only)
- toon#337 – simd-toon (decode-only, AVX2-only, about 12% of fixtures failing)
- toon#132 – toon-my-json, a second Ruby entry
- toon#68, toon#243 – further .NET implementations
- toon#89 – a further Rust implementation
- toon#95, toon#184 – further Python implementations
- toon#117 – a second Swift implementation before the official port
- toon#144 – TOON-PHP, a second PHP implementation
- toon#265, toon#291 – competing Zig implementations
- toon#300, toon#304 – Go rows next to the official `toon-go`
