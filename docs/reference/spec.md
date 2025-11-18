# Specification

The [TOON specification](https://github.com/toon-format/spec) is the authoritative reference for implementing encoders, decoders, and validators. It defines the concrete syntax, normative encoding/decoding behavior, and strict-mode validation rules.

You don't need this page to *use* TOON. It's mainly for implementers and contributors. If you're looking to learn how to use TOON, start with the [Getting Started](/guide/getting-started) guide instead.

> [!TIP]
> The TOON specification is stable, but also an idea in progress. Nothing's set in stone – help shape where it goes by contributing to it or sharing feedback!

## Current Version

**Spec v2.0** (2025-11-10) is the current stable version.

## Guided Tour of the Spec

### Core Concepts

**[§1 Terminology and Conventions](https://github.com/toon-format/spec/blob/main/SPEC.md#1-terminology-and-conventions)**
Defines key terms like "indentation level", "active delimiter", "strict mode", and RFC2119 keywords (MUST, SHOULD, MAY).

**[§2 Data Model](https://github.com/toon-format/spec/blob/main/SPEC.md#2-data-model)**
Specifies the JSON data model (objects, arrays, primitives), array/object ordering requirements, and canonical number formatting (no exponent notation, no leading/trailing zeros).

**[§3 Encoding Normalization](https://github.com/toon-format/spec/blob/main/SPEC.md#3-encoding-normalization-reference-encoder)**
Defines how non-JSON types (Date, BigInt, NaN, Infinity, undefined, etc.) are normalized before encoding. Required reading for encoder implementers.

**[§4 Decoding Interpretation](https://github.com/toon-format/spec/blob/main/SPEC.md#4-decoding-interpretation-reference-decoder)**
Specifies how decoders map text tokens to host values (quoted strings, unquoted primitives, numeric parsing with leading-zero handling). Decoders default to strict mode (`strict = true`) in the reference implementation; strict-mode errors are enumerated in §14.

### Syntax Rules

**[§5 Concrete Syntax and Root Form](https://github.com/toon-format/spec/blob/main/SPEC.md#5-concrete-syntax-and-root-form)**
Defines TOON's line-oriented, indentation-based notation and how to determine whether the root is an object, array, or primitive.

**[§6 Header Syntax](https://github.com/toon-format/spec/blob/main/SPEC.md#6-header-syntax-normative)**
Normative ABNF grammar for array headers: `key[N<delim?>]{fields}:`. Specifies bracket segments, delimiter symbols, and field lists.

**[§7 Strings and Keys](https://github.com/toon-format/spec/blob/main/SPEC.md#7-strings-and-keys)**
Complete quoting rules (when strings MUST be quoted), escape sequences (only `\\`, `\"`, `\n`, `\r`, `\t` are valid), and key encoding requirements.

**[§8 Objects](https://github.com/toon-format/spec/blob/main/SPEC.md#8-objects)**
Object field encoding (key: value), nesting rules, key order preservation, and empty object handling.

**[§9 Arrays](https://github.com/toon-format/spec/blob/main/SPEC.md#9-arrays)**
Covers all array forms: primitive (inline), arrays of objects (tabular), mixed/non-uniform (list), and arrays of arrays. Includes tabular detection requirements.

**[§10 Objects as List Items](https://github.com/toon-format/spec/blob/main/SPEC.md#10-objects-as-list-items)**
Indentation rules for objects appearing in list items (first field on hyphen line, nested object rules).

**[§11 Delimiters](https://github.com/toon-format/spec/blob/main/SPEC.md#11-delimiters)**
Delimiter scoping (document vs active), delimiter-aware quoting, and parsing rules for comma/tab/pipe delimiters.

**[§12 Indentation and Whitespace](https://github.com/toon-format/spec/blob/main/SPEC.md#12-indentation-and-whitespace)**
Encoding requirements (consistent spaces, no tabs in indentation, no trailing spaces/newlines) and decoding rules (strict vs non-strict indentation handling).

### Conformance and Validation

**[§13 Conformance and Options](https://github.com/toon-format/spec/blob/main/SPEC.md#13-conformance-and-options)**
Defines conformance classes (encoder, decoder, validator), required options, and conformance checklists.

**[§13.4 Key Folding and Path Expansion](https://github.com/toon-format/spec/blob/main/SPEC.md#134-key-folding-and-path-expansion)**
Optional encoder feature (key folding) and decoder feature (path expansion) for collapsing/expanding dotted paths. Specifies safety requirements and conflict resolution.

**[§14 Strict Mode Errors and Diagnostics](https://github.com/toon-format/spec/blob/main/SPEC.md#14-strict-mode-errors-and-diagnostics-authoritative-checklist)**
**Authoritative checklist** of all strict-mode errors: array count mismatches, syntax errors, indentation errors, structural errors, and path expansion conflicts.

### Implementation Guidance

**[§19 TOON Core Profile](https://github.com/toon-format/spec/blob/main/SPEC.md#19-toon-core-profile-normative-subset)**
Normative subset of the most common, memory-friendly rules. Useful for minimal implementations.

**[Appendix G: Host Type Normalization Examples](https://github.com/toon-format/spec/blob/main/SPEC.md#appendix-g-host-type-normalization-examples-informative)**
Non-normative guidance for Go, JavaScript, Python, and Rust implementations on normalizing language-specific types.

**[Appendix C: Test Suite and Compliance](https://github.com/toon-format/spec/blob/main/SPEC.md#appendix-c-test-suite-and-compliance-informative)**
Reference test suite at [github.com/toon-format/spec/tree/main/tests](https://github.com/toon-format/spec/tree/main/tests) for validating implementations.

## Spec Sections at a Glance

| Section | Topic | When to Read |
|---------|-------|--------------|
| §1-4 | Data model, normalization, decoding | Implementing encoders/decoders |
| §5-6 | Syntax, headers, root form | Implementing parsers |
| §7 | Strings, keys, quoting, escaping | Implementing string handling |
| §8-10 | Objects, arrays, list items | Implementing structure encoding |
| §11-12 | Delimiters, indentation, whitespace | Implementing formatting and validation |
| §13 | Conformance, options, key folding | Implementing options and features |
| §14 | Strict-mode errors | Implementing validators |
| §19 | Core profile | Minimal implementations |

## Conformance Checklists

The spec includes three conformance checklists:

### [Encoder Checklist (§13.1)](https://github.com/toon-format/spec/blob/main/SPEC.md#131-encoder-conformance-checklist)

Key requirements:
- Produce UTF-8 with LF line endings
- Use consistent indentation (default 2 spaces, no tabs)
- Escape only `\\`, `\"`, `\n`, `\r`, `\t` in quoted strings
- Quote strings with active delimiter, colon, or structural characters
- Emit array lengths `[N]` matching actual count
- Preserve object key order
- Normalize numbers to non-exponential decimal form
- Convert `-0` to `0`, `NaN`/±Infinity to `null`
- No trailing spaces or trailing newline

### [Decoder Checklist (§13.2)](https://github.com/toon-format/spec/blob/main/SPEC.md#132-decoder-conformance-checklist)

Key requirements:
- Parse array headers per §6 (length, delimiter, fields)
- Split inline arrays and tabular rows using active delimiter only
- Unescape quoted strings with only valid escapes
- Type unquoted primitives: true/false/null → booleans/null, numeric → number, else → string
- Enforce strict-mode rules when `strict=true`
- Preserve array order and object key order

### [Validator Checklist (§13.3)](https://github.com/toon-format/spec/blob/main/SPEC.md#133-validator-conformance-checklist)

Validators should verify:
- Structural conformance (headers, indentation, list markers)
- Whitespace invariants (no trailing spaces/newlines)
- Delimiter consistency between headers and rows
- Array length counts match declared `[N]`
- All strict-mode requirements

## Versioning

The spec uses semantic versioning (major.minor):
- **Major version** (e.g., v2.0): Breaking changes, incompatible with previous versions
- **Minor version** (e.g., v1.5 → v1.6): Clarifications, additional requirements, or backward-compatible additions

See [Appendix D: Document Changelog](https://github.com/toon-format/spec/blob/main/SPEC.md#appendix-d-document-changelog-informative) for detailed version history.

## Contributing to the Spec

The spec is community-maintained at [github.com/toon-format/spec](https://github.com/toon-format/spec). We welcome contributions of all kinds: reporting ambiguities or errors, proposing clarifications and examples, adding test cases to the reference suite, or discussing edge cases and normative behavior. Your feedback helps shape the format.
