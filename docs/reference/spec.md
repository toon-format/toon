---
description: Where the TOON specification lives, which version is current, and what each section covers.
---

# Specification

**Spec v{{ $spec.version }}** ({{ $spec.date }})

The [TOON specification](https://github.com/toon-format/spec/blob/main/SPEC.md) is the authoritative reference for encoders, decoders, and validators. Implementers work through the [conformance checklist (§13)](https://github.com/toon-format/spec/blob/main/SPEC.md#13-conformance-and-options) for their class, the [CHANGELOG](https://github.com/toon-format/spec/blob/main/CHANGELOG.md) records each version, and [CONTRIBUTING](https://github.com/toon-format/spec/blob/main/CONTRIBUTING.md) covers how to propose changes.

## Sections

- [§1 Terminology and Conventions](https://github.com/toon-format/spec/blob/main/SPEC.md#1-terminology-and-conventions) – key terms and RFC 2119 keywords.
- [§2 Data Model](https://github.com/toon-format/spec/blob/main/SPEC.md#2-data-model) – the JSON data model, ordering, and canonical numbers.
- [§3 Encoding Normalization](https://github.com/toon-format/spec/blob/main/SPEC.md#3-encoding-normalization-reference-encoder) – how non-JSON values are normalized before encoding.
- [§4 Decoding Interpretation](https://github.com/toon-format/spec/blob/main/SPEC.md#4-decoding-interpretation-reference-decoder) – how tokens map to strings, numbers, booleans, and null.
- [§5 Concrete Syntax and Root Form](https://github.com/toon-format/spec/blob/main/SPEC.md#5-concrete-syntax-and-root-form) – line structure, comment lines, and root detection.
- [§6 Header Syntax](https://github.com/toon-format/spec/blob/main/SPEC.md#6-header-syntax-normative) – the ABNF for array headers and field lists.
- [§7 Strings and Keys](https://github.com/toon-format/spec/blob/main/SPEC.md#7-strings-and-keys) – quoting rules and escape sequences.
- [§8 Objects](https://github.com/toon-format/spec/blob/main/SPEC.md#8-objects) – fields, nesting, and empty objects.
- [§9 Arrays and Tabular Forms](https://github.com/toon-format/spec/blob/main/SPEC.md#9-arrays-and-tabular-forms) – inline, tabular, list, and keyed tabular forms.
- [§10 Objects as List Items](https://github.com/toon-format/spec/blob/main/SPEC.md#10-objects-as-list-items) – indentation of objects inside lists.
- [§11 Delimiters](https://github.com/toon-format/spec/blob/main/SPEC.md#11-delimiters) – comma, tab, and pipe, and their scope.
- [§12 Indentation and Whitespace](https://github.com/toon-format/spec/blob/main/SPEC.md#12-indentation-and-whitespace) – what encoders emit and decoders accept.
- [§13 Conformance and Options](https://github.com/toon-format/spec/blob/main/SPEC.md#13-conformance-and-options) – conformance classes, options, and checklists.
- [§14 Strict Mode Errors](https://github.com/toon-format/spec/blob/main/SPEC.md#14-strict-mode-errors-and-diagnostics-authoritative-checklist) – every error strict mode raises.
- [§15 Security Considerations](https://github.com/toon-format/spec/blob/main/SPEC.md#15-security-considerations) – injection risks and the checks against them.
- [§16 Internationalization](https://github.com/toon-format/spec/blob/main/SPEC.md#16-internationalization) – Unicode and locale-independent numbers.
- [§17 IANA Considerations](https://github.com/toon-format/spec/blob/main/SPEC.md#17-iana-considerations) – the provisional `text/toon` media type.
- [§18 Versioning and Extensibility](https://github.com/toon-format/spec/blob/main/SPEC.md#18-versioning-and-extensibility) – what a major or minor version may change.
- [Appendix C: Test Suite](https://github.com/toon-format/spec/blob/main/SPEC.md#appendix-c-test-suite-and-compliance-informative) – the fixtures implementations run.
