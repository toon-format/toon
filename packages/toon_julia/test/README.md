# TOON.jl Test Suite

This directory contains comprehensive tests for the TOON.jl implementation, including tests based on the official TOON specification test fixtures.

## Test Files

- **`runtests.jl`** - Main test runner that includes both basic tests and specification tests
- **`spec_tests.jl`** - Test suite that runs against official TOON specification fixtures from [toon-format/spec](https://github.com/toon-format/spec/tree/main/tests/fixtures)

## Running Tests

### Run All Tests

```bash
julia --project=. test/runtests.jl
```

### Run Only Specification Tests

```bash
julia --project=. test/spec_tests.jl
```

### Using Julia's Test Runner

```bash
julia --project=. -e "using Pkg; Pkg.test()"
```

## Test Fixtures

The specification tests use official test fixtures from the TOON specification repository. The test suite automatically looks for fixtures in `/tmp/toon-spec/tests/fixtures`.

### Setting Up Test Fixtures

If the fixtures directory is not found, clone the spec repository:

```bash
git clone --depth=1 https://github.com/toon-format/spec.git /tmp/toon-spec
```

Alternatively, you can specify a custom fixtures directory:

```julia
using Toon
include("test/spec_tests.jl")
run_spec_tests("/path/to/spec/tests/fixtures")
```

## Test Coverage

The specification tests cover:

### Encoding Tests (9 fixture files)
- **primitives.json** - Primitive value encoding (strings, numbers, booleans, null)
- **objects.json** - Object encoding (simple objects, nested objects, key encoding)
- **arrays-primitive.json** - Primitive array encoding (inline arrays)
- **arrays-tabular.json** - Tabular array encoding (arrays of uniform objects)
- **arrays-nested.json** - Nested and mixed array encoding
- **arrays-objects.json** - Arrays of objects encoding
- **delimiters.json** - Delimiter options (tab, pipe, comma)
- **whitespace.json** - Whitespace and formatting invariants
- **key-folding.json** - Key folding with safe mode

### Decoding Tests (13 fixture files)
- **primitives.json** - Primitive value decoding (strings, numbers, booleans, null, unescaping)
- **objects.json** - Object decoding (simple objects, nested objects, key parsing)
- **arrays-primitive.json** - Primitive array decoding
- **arrays-tabular.json** - Tabular array decoding
- **arrays-nested.json** - Nested and mixed array decoding
- **delimiters.json** - Delimiter decoding (tab, pipe, comma)
- **whitespace.json** - Whitespace tolerance in decoding
- **numbers.json** - Number decoding edge cases
- **blank-lines.json** - Blank line handling
- **indentation-errors.json** - Strict mode indentation validation
- **path-expansion.json** - Path expansion with safe mode
- **root-form.json** - Root form detection
- **validation-errors.json** - Validation errors

## Test Results

The test suite provides detailed output showing:
- Number of tests passed/failed per fixture file
- Specific test failures with error messages
- Overall test summary

Example output:
```
Test Summary:
TOON Specification Tests | Pass  Fail  Total
  Encoding Tests         |  65    78   143
  Decoding Tests         |  87    85   172
```

## Dependencies

The test suite requires:
- `Test` - Julia's standard testing framework
- `JSON` - For parsing test fixture files

These are automatically installed when you run `Pkg.instantiate()` or `Pkg.test()`.

## Contributing

When adding new features or fixing bugs:
1. Run the full test suite to ensure no regressions
2. Check that specification tests still pass
3. Add new tests for new features in `runtests.jl`

