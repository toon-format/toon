---
description: Guided tour of the TOON specification – sections, conformance checklists, media type, and versioning.
---

# Specification

The [TOON specification](https://github.com/toon-format/spec) is the authoritative reference for implementing encoders, decoders, and validators. It defines the concrete syntax, normative encoding/decoding behavior, and strict-mode validation rules.

You don't need this page to *use* TOON. It's mainly for implementers and contributors. If you're looking to learn how to use TOON, start with the [Getting Started](/guide/getting-started) guide instead.

> [!NOTE]
> The TOON specification is stable, but also an idea in progress. Nothing's set in stone – help shape where it goes by contributing to it or sharing feedback.

## Current Version

**Spec v{{ $spec.version }}** ({{ $spec.date }}) is the current published Working Draft. It is stable for implementation but not yet finalized; see "Status of This Document" in the spec for details.

## Media Type & File Extension

The spec defines a provisional media type and file extension in [§17](https://github.com/toon-format/spec/blob/main/SPEC.md#17-iana-considerations):

- **Media type:** `text/toon` (provisional, not yet IANA‑registered; UTF‑8 only)
- **File extension:** `.toon`

TOON documents are always UTF‑8 with LF (`\n`) line endings; the optional `charset` parameter, when present, is `utf-8`.

## Guided Tour of the Spec

### Core Concepts

[§1 Terminology and Conventions](https://github.com/toon-format/spec/blob/main/SPEC.md#1-terminology-and-conventions):
Defines key terms like "indentation level", "active delimiter", "strict mode", and RFC2119 keywords (MUST, SHOULD, MAY).

[§2 Data Model](https://github.com/toon-format/spec/blob/main/SPEC.md#2-data-model):
Specifies the JSON data model (objects, arrays, primitives), array/object ordering requirements, and canonical number formatting (canonical decimal for values in `[1e-6, 1e21)` or zero; exponent form permitted outside).

[§3 Encoding Normalization](https://github.com/toon-format/spec/blob/main/SPEC.md#3-encoding-normalization-reference-encoder):
Defines how non-JSON types (Date, BigInt, NaN, Infinity, undefined, etc.) are normalized before encoding. Required reading for encoder implementers.

[§4 Decoding Interpretation](https://github.com/toon-format/spec/blob/main/SPEC.md#4-decoding-interpretation-reference-decoder):
Specifies how decoders map text tokens to host values (quoted strings, unquoted primitives, numeric parsing with leading-zero handling). Decoders default to strict mode (`strict = true`) in the reference implementation; strict-mode errors are enumerated in §14.

### Syntax Rules

[§5 Concrete Syntax and Root Form](https://github.com/toon-format/spec/blob/main/SPEC.md#5-concrete-syntax-and-root-form):
Defines TOON's line-oriented, indentation-based notation and how to determine whether the root is an object, array, or primitive. §5.1 defines full-line comment lines, removed in a lexical pre-pass before any other processing.

[§6 Header Syntax](https://github.com/toon-format/spec/blob/main/SPEC.md#6-header-syntax-normative):
Normative ABNF grammar for array and keyed headers: `key[N<delim?>]{fields}:` and `key[N:<delim?>]{fields}:`. Specifies bracket segments, delimiter symbols, and field lists, including nested field groups.

[§7 Strings and Keys](https://github.com/toon-format/spec/blob/main/SPEC.md#7-strings-and-keys):
Complete quoting rules (when strings MUST be quoted), escape sequences (only `\\`, `\"`, `\n`, `\r`, `\t`, and `\uXXXX` for other U+0000–U+001F controls are valid), and key encoding requirements.

[§8 Objects](https://github.com/toon-format/spec/blob/main/SPEC.md#8-objects):
Object field encoding (key: value), nesting rules, key order preservation, and empty object handling.

[§9 Arrays and Tabular Forms](https://github.com/toon-format/spec/blob/main/SPEC.md#9-arrays-and-tabular-forms):
Covers all array forms – primitive (inline), arrays of objects (tabular, including nested field groups), mixed/non-uniform (list), and arrays of arrays – plus the keyed tabular form for objects of uniform objects (§9.5). Includes the detection requirements for each form.

[§10 Objects as List Items](https://github.com/toon-format/spec/blob/main/SPEC.md#10-objects-as-list-items):
Indentation rules for objects appearing in list items (first field on the hyphen line), including the canonical pattern when the first field is a tabular array or keyed tabular object (header on the hyphen line, rows at depth +2, sibling fields at depth +1).

[§11 Delimiters](https://github.com/toon-format/spec/blob/main/SPEC.md#11-delimiters):
Delimiter scoping (document vs active), delimiter-aware quoting, and parsing rules for comma/tab/pipe delimiters.

[§12 Indentation and Whitespace](https://github.com/toon-format/spec/blob/main/SPEC.md#12-indentation-and-whitespace):
Encoding requirements (consistent spaces, no tabs in indentation, no trailing spaces/newlines) and decoding rules (strict vs non-strict indentation handling).

### Conformance and Validation

[§13 Conformance and Options](https://github.com/toon-format/spec/blob/main/SPEC.md#13-conformance-and-options):
Defines conformance classes (encoder, decoder, validator), standardized options, and conformance checklists.

[§14 Strict Mode Errors and Diagnostics](https://github.com/toon-format/spec/blob/main/SPEC.md#14-strict-mode-errors-and-diagnostics-authoritative-checklist):
**Authoritative checklist** of all strict-mode errors: array and entry count and width mismatches (§14.1), syntax and structural errors (§14.2), and duplicate sibling keys (§14.3).

### Implementation Guidance

[§15 Security Considerations](https://github.com/toon-format/spec/blob/main/SPEC.md#15-security-considerations):
Injection risks, quoting rules, and strict-mode checks relevant to security.

[§16 Internationalization](https://github.com/toon-format/spec/blob/main/SPEC.md#16-internationalization):
Unicode handling and locale-independent number formatting.

[§17 IANA Considerations](https://github.com/toon-format/spec/blob/main/SPEC.md#17-iana-considerations):
Media type registration plans and provisional status.

[§18 Versioning and Extensibility](https://github.com/toon-format/spec/blob/main/SPEC.md#18-versioning-and-extensibility):
How the spec evolves: major vs minor bumps and the extensibility policy.

[§19 Intellectual Property Considerations](https://github.com/toon-format/spec/blob/main/SPEC.md#19-intellectual-property-considerations):
Licensing and IP terms for the specification.

[Appendix E: Host Type Normalization Examples](https://github.com/toon-format/spec/blob/main/SPEC.md#appendix-e-host-type-normalization-examples-informative):
Non-normative guidance for Go, JavaScript, Python, Rust, and Java implementations on normalizing language-specific types.

[Appendix C: Test Suite and Compliance](https://github.com/toon-format/spec/blob/main/SPEC.md#appendix-c-test-suite-and-compliance-informative):
Reference test suite at [github.com/toon-format/spec/tree/main/tests](https://github.com/toon-format/spec/tree/main/tests) for validating implementations.

## Conformance Checklists

The spec carries one checklist per conformance class – work through the one matching what you're building. The checklists in SPEC.md are authoritative; summaries elsewhere can drift.

- **[Encoder checklist (§13.1)](https://github.com/toon-format/spec/blob/main/SPEC.md#131-encoder-conformance-checklist)** – output invariants: UTF-8 with LF, consistent indentation, quoting and escaping, `[N]` lengths, canonical numbers, key order, no comment lines, no trailing whitespace.
- **[Decoder checklist (§13.2)](https://github.com/toon-format/spec/blob/main/SPEC.md#132-decoder-conformance-checklist)** – parsing duties: comment pre-pass, header parsing, active-delimiter splitting, token typing, strict-mode enforcement, order preservation.
- **[Validator checklist (§13.3)](https://github.com/toon-format/spec/blob/main/SPEC.md#133-validator-conformance-checklist)** – structural and whitespace invariants, delimiter consistency, declared counts, all strict-mode rules.

## Versioning

The spec uses semantic versioning (major.minor):
- **Major version** (e.g., v2 → v3): Breaking changes, incompatible with previous versions
- **Minor version** (e.g., v3.1 → v3.2): Clarifications, additional requirements, or backward-compatible additions

See [CHANGELOG.md](https://github.com/toon-format/spec/blob/main/CHANGELOG.md) for detailed version history, and [VERSIONING.md](https://github.com/toon-format/spec/blob/main/VERSIONING.md) for the policy.

## Contributing to the Spec

The spec is community-maintained at [github.com/toon-format/spec](https://github.com/toon-format/spec) – report ambiguities, propose clarifications, or add test cases to the reference suite.
