# Implementations

TOON has official and community implementations across multiple programming languages. All implementations are intended to conform to the same [specification](https://github.com/toon-format/spec) to ensure compatibility and interoperability.

The code examples throughout this documentation site use the TypeScript implementation by default, but the format and concepts apply equally to all languages.

> [!NOTE]
> When implementing TOON in other languages, please follow the [spec](https://github.com/toon-format/spec/blob/main/SPEC.md) to ensure compatibility across implementations. The [conformance tests](https://github.com/toon-format/spec/tree/main/tests) provide language-agnostic test fixtures that validate your implementation.

## Official Implementations

These implementations are actively being developed by dedicated teams. Contributions are welcome! Join the effort by opening issues, submitting PRs, or discussing implementation details in the respective repositories.

| Language | Repository | Status | Maintainer |
|----------|------------|--------|------------|
| **.NET** | [toon-dotnet](https://github.com/toon-format/toon-dotnet) | In Development | Official Team |
| **Dart** | [toon-dart](https://github.com/toon-format/toon-dart) | In Development | Official Team |
| **Go** | [toon-go](https://github.com/toon-format/toon-go) | In Development | Official Team |
| **Python** | [toon-python](https://github.com/toon-format/toon-python) | In Development | Official Team |
| **Rust** | [toon-rust](https://github.com/toon-format/toon-rust) | In Development | Official Team |
| **TypeScript/JavaScript** | [toon](https://github.com/toon-format/toon/tree/main/packages/toon) | ✅ Stable | Official Team |

## Community Implementations

Community members have created implementations in additional languages:

| Language | Repository | Maintainer |
|----------|------------|------------|
| **Apex** | [ApexToon](https://github.com/Eacaw/ApexToon) | [@Eacaw](https://github.com/Eacaw) |
| **C++** | [ctoon](https://github.com/mohammadraziei/ctoon) | [@mohammadraziei](https://github.com/mohammadraziei) |
| **Clojure** | [toon](https://github.com/vadelabs/toon) | [@vadelabs](https://github.com/vadelabs) |
| **Crystal** | [toon-crystal](https://github.com/mamantoha/toon-crystal) | [@mamantoha](https://github.com/mamantoha) |
| **Elixir** | [toon_ex](https://github.com/kentaro/toon_ex) | [@kentaro](https://github.com/kentaro) |
| **Gleam** | [toon_codec](https://github.com/axelbellec/toon_codec) | [@axelbellec](https://github.com/axelbellec) |
| **Go** | [gotoon](https://github.com/alpkeskin/gotoon) | [@alpkeskin](https://github.com/alpkeskin) |
| **Java** | [JToon](https://github.com/felipestanzani/JToon) | [@felipestanzani](https://github.com/felipestanzani) |
| **Kotlin** | [kotlin-toon](https://github.com/vexpera-br/kotlin-toon) | [@vexpera-br](https://github.com/vexpera-br) |
| **Laravel Framework** | [laravel-toon](https://github.com/jobmetric/laravel-toon) | [@jobmetric](https://github.com/jobmetric) |
| **Lua/Neovim** | [toon.nvim](https://github.com/thalesgelinger/toon.nvim) | [@thalesgelinger](https://github.com/thalesgelinger) |
| **OCaml** | [ocaml-toon](https://github.com/davesnx/ocaml-toon) | [@davesnx](https://github.com/davesnx) |
| **PHP** | [toon-php](https://github.com/HelgeSverre/toon-php) | [@HelgeSverre](https://github.com/HelgeSverre) |
| **R** | [toon](https://github.com/laresbernardo/toon) | [@laresbernardo](https://github.com/laresbernardo) |
| **Ruby** | [toon-ruby](https://github.com/andrepcg/toon-ruby) | [@andrepcg](https://github.com/andrepcg) |
| **Scala** | [toon4s](https://github.com/vim89/toon4s) | [@vim89](https://github.com/vim89) |
| **Swift** | [TOONEncoder](https://github.com/mattt/TOONEncoder) | [@mattt](https://github.com/mattt) |

## Contributing an Implementation

Building a TOON implementation for a new language? Great! Here are some steps to get started:

1. **Follow the spec**: Implement the [latest specification](https://github.com/toon-format/spec/blob/main/SPEC.md).
2. **Add tests**: Run the [reference test suite](https://github.com/toon-format/spec/tree/main/tests).
3. **Document usage**: Provide clear README with installation and usage examples.
4. **Share it**: Open a PR to add your implementation to the README at [github.com/toon-format/toon](https://github.com/toon-format/toon).
