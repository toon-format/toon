---
description: Official and community TOON implementations across languages, plus contribution pointers.
---

# Implementations

TOON has official and community implementations across multiple programming languages. All implementations are intended to conform to the same [Specification](https://github.com/toon-format/spec) to ensure compatibility and interoperability.

The code examples throughout this documentation site use the TypeScript implementation by default, but the format and concepts apply equally to all languages.

## Official Implementations

| Language | Repository | Spec | Status |
|----------|------------|------|--------|
| **.NET** | [toon-dotnet](https://github.com/toon-format/toon-dotnet) | 3.0 | In Development |
| **Dart** | [toon-dart](https://github.com/toon-format/toon-dart) | 1.4 | In Development |
| **Go** | [toon-go](https://github.com/toon-format/toon-go) | – | In Development |
| **Java** | [toon-java](https://github.com/toon-format/toon-java) | 4.1 | ✅ Stable |
| **Julia** | [ToonFormat.jl](https://github.com/toon-format/ToonFormat.jl) | 3.0 | ✅ Stable |
| **Python** | [toon-python](https://github.com/toon-format/toon-python) | – | Beta |
| **Rust** | [toon-rust](https://github.com/toon-format/toon-rust) | 3.0 | ✅ Stable |
| **Swift** | [toon-swift](https://github.com/toon-format/toon-swift) | 4.1 | ✅ Stable |
| **TypeScript/JavaScript** | [toon](https://github.com/toon-format/toon/tree/main/packages/toon) | 4.4 | ✅ Stable |

## Community Implementations

Community members have created implementations in additional languages:

| Language | Repository | Spec | Maintainer |
|----------|------------|------|------------|
| **Apex** | [ApexToon](https://github.com/Eacaw/ApexToon) | – | [@Eacaw](https://github.com/Eacaw) |
| **C** | [TOONc](https://github.com/UsboKirishima/TOONc) | – | [@UsboKirishima](https://github.com/UsboKirishima) |
| **C** (bindings for C++, Go, Julia, MATLAB, Python, Rust, Zig) | [ctoon](https://github.com/MohammadRaziei/ctoon) | 4.1 | [@MohammadRaziei](https://github.com/MohammadRaziei) |
| **C#** | [ToonEncoder](https://github.com/Cysharp/ToonEncoder) | – | [@Cysharp](https://github.com/Cysharp) |
| **C#** | [Corvus.JsonSchema](https://github.com/corvus-dotnet/Corvus.JsonSchema/blob/main/docs/Toon.md) | – | [@mwadams](https://github.com/mwadams) |
| **Clojure** | [toon](https://github.com/vadelabs/toon) | 3.0 | [@vadelabs](https://github.com/vadelabs) |
| **Crystal** | [toon-crystal](https://github.com/mamantoha/toon-crystal) | 4.1 | [@mamantoha](https://github.com/mamantoha) |
| **Delphi** | [delphi-toon](https://github.com/ernestoalconada/delphi-toon) | – | [@ernestoalconada](https://github.com/ernestoalconada) |
| **Elixir** | [toon_ex](https://github.com/kentaro/toon_ex) | 1.3 | [@kentaro](https://github.com/kentaro) |
| **Gleam** | [toon_codec](https://github.com/axelbellec/toon_codec) | 1.2 | [@axelbellec](https://github.com/axelbellec) |
| **Go** | [gotoon](https://github.com/alpkeskin/gotoon) | – | [@alpkeskin](https://github.com/alpkeskin) |
| **Java** | [json-io](https://github.com/jdereg/json-io) | 3.3 | [@jdereg](https://github.com/jdereg) |
| **Kotlin** | [ktoon](https://github.com/lukelast/ktoon) | 4.1 | [@lukelast](https://github.com/lukelast) |
| **Laravel Framework** | [laravel-toon](https://github.com/mischasigtermans/laravel-toon) | 3.0 | [@mischasigtermans](https://github.com/mischasigtermans) |
| **Lua/Neovim** | [toon.nvim](https://github.com/thalesgelinger/toon.nvim) | 1.3 | [@thalesgelinger](https://github.com/thalesgelinger) |
| **OCaml** | [ocaml-toon](https://github.com/davesnx/ocaml-toon) | – | [@davesnx](https://github.com/davesnx) |
| **Perl** | [Data::TOON](https://github.com/ytnobody/p5-Data-TOON) | 1.0 | [@ytnobody](https://github.com/ytnobody) |
| **PHP** | [toon-php](https://github.com/HelgeSverre/toon-php) | 3.3 | [@HelgeSverre](https://github.com/HelgeSverre) |
| **PHP / TYPO3** | [t3-toon](https://github.com/therohanparmar/t3-toon) | 3.3 | [@therohanparmar](https://github.com/therohanparmar) |
| **Python** (Rust backend) | [toons](https://github.com/alesanfra/toons) | 4.1 | [@alesanfra](https://github.com/alesanfra) |
| **R** | [toon](https://github.com/laresbernardo/toon) | – | [@laresbernardo](https://github.com/laresbernardo) |
| **Ruby** | [toon-fu](https://github.com/hoblin/toon-fu) | 4.1 | [@hoblin](https://github.com/hoblin) |
| **Scala** | [toon4s](https://github.com/com-vitthalmirji/toon4s) | 3.0 | [@vim89](https://github.com/vim89) |
| **Zig** | [toon-zig](https://github.com/LatentEvals/toon-zig) | 3.0 | [@montanaflynn](https://github.com/montanaflynn) |

## Contributing an Implementation

Building a TOON implementation for a new language? Here are the steps:

1. **Follow the spec**: Implement the [latest specification](https://github.com/toon-format/spec/blob/main/SPEC.md).
2. **Add tests**: Run the [reference test suite](https://github.com/toon-format/spec/tree/main/tests) from a spec release tag in CI – its language-agnostic fixtures validate compatibility across implementations.
3. **Declare the spec version**: State the version you target in your README, e.g. `toon-spec: 4.4` ([§13](https://github.com/toon-format/spec/blob/main/SPEC.md#13-conformance-and-options)).
4. **Document usage**: Provide a clear README with installation and usage examples.
5. **Share it**: Open a PR that adds one row for your project to [this page](https://github.com/toon-format/toon/blob/main/docs/ecosystem/implementations.md).
