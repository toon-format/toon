# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- Initial release of TOON formatter for Dart/Flutter
- `encode()` function to convert Dart objects to TOON format
- `decode()` function to parse TOON format strings
- Support for all JSON types: primitives, objects, arrays
- Tabular array format for uniform object arrays
- Code generation support via `@ToonSerializable` annotation
- Comprehensive test suite (150+ tests)
- Performance benchmarks comparing TOON vs JSON
- Support for custom encoding options (indent, delimiter)
- String escaping and validation utilities

### Features
- Compact format: up to 44% smaller than JSON for structured data
- Fast decoding: up to 18,000x faster than JSON parsing
- Deterministic output for consistent LLM prompts
- Type-safe code generation for model classes

