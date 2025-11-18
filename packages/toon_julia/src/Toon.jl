module Toon

# Main entry point for the Toon package
include("constants.jl")
include("types.jl")
include("shared/literal_utils.jl")
include("shared/string_utils.jl")
include("shared/validation.jl")
include("encode/normalize.jl")
include("encode/primitives.jl")
include("encode/writer.jl")
include("encode/encoders.jl")
include("decode/scanner.jl")
include("decode/parser.jl")
include("decode/validation.jl")
include("decode/decoders.jl")
include("decode/expand.jl")

"""
Encodes a Julia value into TOON format string.

# Arguments
- `input`: Any Julia value (objects, arrays, primitives)
- `options`: Optional encoding configuration (default: EncodeOptions())

# Examples
```julia
toonEncode(Dict("name" => "Alice", "age" => 30))
# name: Alice
# age: 30

toonEncode(Dict("users" => [Dict("id" => 1), Dict("id" => 2)]))
# users[2]:
#   - id: 1
#   - id: 2
```
"""
function toonEncode(input; options::EncodeOptions = EncodeOptions())
    normalized_value = normalize_value(input)
    return encode_value(normalized_value, options)
end

"""
Decodes a TOON format string into a Julia value.

# Arguments
- `input`: TOON formatted string
- `options`: Optional decoding configuration (default: DecodeOptions())

# Examples
```julia
toonDecode("name: Alice\\nage: 30")
# Dict("name" => "Alice", "age" => 30)

toonDecode("users[2]:\\n  - id: 1\\n  - id: 2")
# Dict("users" => [Dict("id" => 1), Dict("id" => 2)])
```
"""
function toonDecode(input::String; options::DecodeOptions = DecodeOptions())
    scan_result = to_parsed_lines(input, options.indent, options.strict)
    
    if isempty(scan_result.lines)
        return Dict{String, Any}()
    end
    
    cursor = LineCursor(scan_result.lines, scan_result.blank_lines)
    decoded_value = decode_value_from_lines(cursor, options)
    
    # Apply path expansion if enabled
    if options.expand_paths == :safe
        return expand_paths_safe(decoded_value, options.strict)
    end
    
    return decoded_value
end

# Export main functions
export toonEncode, toonDecode
export EncodeOptions, DecodeOptions
export JsonValue, JsonPrimitive, JsonObject, JsonArray

end # module

