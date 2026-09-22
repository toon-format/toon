---
description: Official and community TOON implementations across languages, plus contribution pointers.
---

# Implementations

TOON has official and community implementations across multiple programming languages. All implementations are intended to conform to the same [Specification](https://github.com/toon-format/spec) to ensure compatibility and interoperability.

The code examples throughout this documentation site use the TypeScript implementation by default, but the format and concepts apply equally to all languages.

## Official Implementations

| Language | Repository | Status |
|----------|------------|--------|
| **.NET** | [toon-dotnet](https://github.com/toon-format/toon-dotnet) | In Development |
| **Dart** | [toon-dart](https://github.com/toon-format/toon-dart) | In Development |
| **Go** | [toon-go](https://github.com/toon-format/toon-go) | In Development |
| **Java** | [toon-java](https://github.com/toon-format/toon-java) | ✅ Stable |
| **Julia** | [ToonFormat.jl](https://github.com/toon-format/ToonFormat.jl) | ✅ Stable |
| **Python** | [toon-python](https://github.com/toon-format/toon-python) | ✅ Stable |
| **Rust** | [toon-rust](https://github.com/toon-format/toon-rust) | ✅ Stable |
| **Swift** | [toon-swift](https://github.com/toon-format/toon-swift) | ✅ Stable |
| **TypeScript/JavaScript** | [toon](https://github.com/toon-format/toon/tree/main/packages/toon) | ✅ Stable |

## Community Implementations

Community members have created implementations in additional languages:

| Language | Repository | Maintainer |
|----------|------------|------------|
| **Apex** | [ApexToon](https://github.com/Eacaw/ApexToon) | [@Eacaw](https://github.com/Eacaw) |
| **C** | [TOONc](https://github.com/UsboKirishima/TOONc) | [@UsboKirishima](https://github.com/UsboKirishima) |
| **C++** | [ctoon](https://github.com/mohammadraziei/ctoon) | [@mohammadraziei](https://github.com/mohammadraziei) |
| **C#** | [ToonEncoder](https://github.com/Cysharp/ToonEncoder) | [@Cysharp](https://github.com/Cysharp/ToonEncoder) |
| **C#** | [Corvus.JsonSchema](https://github.com/corvus-dotnet/Corvus.JsonSchema/blob/main/docs/Toon.md) | [@mwadams](https://github.com/corvus-dotnet/Corvus.JsonSchema/) |
| **Clojure** | [toon](https://github.com/vadelabs/toon) | [@vadelabs](https://github.com/vadelabs) |
| **Crystal** | [toon-crystal](https://github.com/mamantoha/toon-crystal) | [@mamantoha](https://github.com/mamantoha) |
| **Delphi** | [delphi-toon](https://github.com/ernestoalconada/delphi-toon) | [@ernestoalconada](https://github.com/ernestoalconada) |
| **Elixir** | [toon_ex](https://github.com/kentaro/toon_ex) | [@kentaro](https://github.com/kentaro) |
| **Gleam** | [toon_codec](https://github.com/axelbellec/toon_codec) | [@axelbellec](https://github.com/axelbellec) |
| **Go** | [gotoon](https://github.com/alpkeskin/gotoon) | [@alpkeskin](https://github.com/alpkeskin) |
| **Java** | [json-io](https://github.com/jdereg/json-io) | [@jdereg](https://github.com/jdereg) |
| **Kotlin** | [ktoon](https://github.com/lukelast/ktoon)| [@lukelast](https://github.com/lukelast) |
| **Laravel Framework** | [laravel-toon](https://github.com/mischasigtermans/laravel-toon) | [@mischasigtermans](https://github.com/mischasigtermans) |
| **Lua/Neovim** | [toon.nvim](https://github.com/thalesgelinger/toon.nvim) | [@thalesgelinger](https://github.com/thalesgelinger) |
| **Matlab** | [ctoon](https://github.com/mohammadraziei/ctoon) | [@mohammadraziei](https://github.com/mohammadraziei) |
| **OCaml** | [ocaml-toon](https://github.com/davesnx/ocaml-toon) | [@davesnx](https://github.com/davesnx) |
| **Perl** | [Data::TOON](https://github.com/ytnobody/p5-Data-TOON) | [@ytnobody](https://github.com/ytnobody) |
| **PHP** | [toon-php](https://github.com/HelgeSverre/toon-php) | [@HelgeSverre](https://github.com/HelgeSverre) |
| **PHP / TYPO3** | [t3-toon](https://github.com/therohanparmar/t3-toon) | [@therohanparmar](https://github.com/therohanparmar) |
| **Python** (C++ backend) | [ctoon](https://github.com/mohammadraziei/ctoon) | [@mohammadraziei](https://github.com/mohammadraziei) |
| **Python** (Rust backend) | [toons](https://github.com/alesanfra/toons) | [@alesanfra](https://github.com/alesanfra) |
| **R** | [toon](https://github.com/laresbernardo/toon) | [@laresbernardo](https://github.com/laresbernardo) |
| **Ruby** | [toon-ruby](https://github.com/andrepcg/toon-ruby) | [@andrepcg](https://github.com/andrepcg) |
| **Scala** | [toon4s](https://github.com/vim89/toon4s) | [@vim89](https://github.com/vim89) |
| **Zig** | [toon-zig](https://github.com/LatentEvals/toon-zig) | [@montanaflynn](https://github.com/montanaflynn) |

## Contributing an Implementation

Building a TOON implementation for a new language? Here are the steps:

1. **Follow the spec**: Implement the [latest specification](https://github.com/toon-format/spec/blob/main/SPEC.md).
2. **Add tests**: Run the [reference test suite](https://github.com/toon-format/spec/tree/main/tests) – its language-agnostic fixtures validate compatibility across implementations.
3. **Document usage**: Provide a clear README with installation and usage examples.
4. **Share it**: Open a PR to add your implementation to the README at [github.com/toon-format/toon](https://github.com/toon-format/toon).
