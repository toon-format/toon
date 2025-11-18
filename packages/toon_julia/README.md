# Toon.jl

A Julia implementation of the TOON (Token-Oriented Object Notation) format - a compact, deterministic JSON format for LLM prompts.

## Installation

```julia
using Pkg
Pkg.add(url="https://github.com/toon-format/toon_julia")
```

Or add to your `Project.toml`:

```toml
[deps]
Toon = { git = "https://github.com/toon-format/toon_julia" }
```

## Usage

### Encoding

```julia
using Toon

# Encode a dictionary
data = Dict("name" => "Alice", "age" => 30)
toon_string = toonEncode(data)
# name: Alice
# age: 30

# Encode with options
options = EncodeOptions(indent=4, delimiter=',')
toon_string = toonEncode(data; options=options)

# Encode arrays
users = [Dict("id" => 1, "name" => "Alice"), Dict("id" => 2, "name" => "Bob")]
toon_string = toonEncode(Dict("users" => users))
# users[2]:
#   - id: 1
#   - name: Alice
#   - id: 2
#   - name: Bob
```

### Decoding

```julia
using Toon

# Decode a TOON string
toon_string = "name: Alice\nage: 30"
data = toonDecode(toon_string)
# Dict{String, Any}("name" => "Alice", "age" => 30)

# Decode with options
options = DecodeOptions(strict=true, expand_paths=:safe)
data = toonDecode(toon_string; options=options)
```

## Features

- **Full TOON 2.0 specification support**
- **Encoding**: Convert Julia values (Dict, Array, primitives) to TOON format
- **Decoding**: Parse TOON strings back to Julia values
- **Configurable options**: Indentation, delimiters, strict mode, path expansion
- **Type-safe**: Uses Julia's type system for JSON value types

## Options

### EncodeOptions

- `indent::Int` - Number of spaces per indentation level (default: 2)
- `delimiter::Char` - Delimiter for tabular arrays (default: ',')
- `key_folding::Symbol` - Enable key folding (`:off` or `:safe`, default: `:off`)
- `flatten_depth::Int` - Maximum depth for key folding (default: `typemax(Int)`)

### DecodeOptions

- `indent::Int` - Number of spaces per indentation level (default: 2)
- `strict::Bool` - Enforce strict validation (default: `true`)
- `expand_paths::Symbol` - Enable path expansion (`:off` or `:safe`, default: `:off`)

## Examples

See the [TOON specification](https://github.com/toon-format/spec) for more examples and details about the format.

## License

MIT License - see LICENSE file for details.

