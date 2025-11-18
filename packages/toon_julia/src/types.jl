# JSON types
const JsonPrimitive = Union{String, Number, Bool, Nothing}
# Recursive JSON value type - using Any for Dict/Vector to allow recursion
const JsonValue = Union{JsonPrimitive, Dict{String, Any}, Vector{Any}}
# Type aliases for convenience (these are just Dict/Vector with Any)
const JsonObject = Dict{String, Any}
const JsonArray = Vector{Any}

# Encoder options
struct EncodeOptions
    indent::Int
    delimiter::Char
    key_folding::Symbol  # :off or :safe
    flatten_depth::Int
end

EncodeOptions(;
    indent::Int = 2,
    delimiter::Char = DEFAULT_DELIMITER,
    key_folding::Symbol = :off,
    flatten_depth::Int = typemax(Int)
) = EncodeOptions(indent, delimiter, key_folding, flatten_depth)

# Decoder options
struct DecodeOptions
    indent::Int
    strict::Bool
    expand_paths::Symbol  # :off or :safe
end

DecodeOptions(;
    indent::Int = 2,
    strict::Bool = true,
    expand_paths::Symbol = :off
) = DecodeOptions(indent, strict, expand_paths)

# Decoder parsing types
struct ArrayHeaderInfo
    key::Union{String, Nothing}
    length::Int
    delimiter::Char
    fields::Union{Vector{String}, Nothing}
end

struct ParsedLine
    raw::String
    depth::Int
    indent::Int
    content::String
    line_number::Int
end

struct BlankLineInfo
    line_number::Int
    indent::Int
    depth::Int
end

