"""
Encodes a primitive value to a string.
"""
function encode_primitive(value::JsonPrimitive, delimiter::Char = DEFAULT_DELIMITER)::String
    if value === nothing
        return NULL_LITERAL
    end
    
    if value isa Bool
        return string(value)
    end
    
    if value isa Number
        # Encode integers without decimal point
        if isinteger(value)
            return string(Int64(value))
        else
            return string(value)
        end
    end
    
    return encode_string_literal(value, delimiter)
end

"""
Encodes a string literal, adding quotes if necessary.
"""
function encode_string_literal(value::String, delimiter::Char = DEFAULT_DELIMITER)::String
    if is_safe_unquoted(value, delimiter)
        return value
    end
    
    return "$(DOUBLE_QUOTE)$(escape_string(value))$(DOUBLE_QUOTE)"
end

"""
Encodes a key, adding quotes if necessary.
"""
function encode_key(key::String)::String
    if is_valid_unquoted_key(key)
        return key
    end
    
    return "$(DOUBLE_QUOTE)$(escape_string(key))$(DOUBLE_QUOTE)"
end

"""
Encodes and joins primitive values with a delimiter.
"""
function encode_and_join_primitives(values::Vector{JsonPrimitive}, delimiter::Char = DEFAULT_DELIMITER)::String
    return join([encode_primitive(v, delimiter) for v in values], string(delimiter))
end

"""
Formats an array header.
"""
function format_header(
    length::Int;
    key::Union{String, Nothing} = nothing,
    fields::Union{Vector{String}, Nothing} = nothing,
    delimiter::Char = DEFAULT_DELIMITER
)::String
    header = ""
    
    if key !== nothing
        header *= encode_key(key)
    end
    
    # Only include delimiter if it's not the default (comma)
    if delimiter != DEFAULT_DELIMITER
        header *= "[$(length)$(delimiter)]"
    else
        header *= "[$(length)]"
    end
    
    if fields !== nothing
        quoted_fields = [encode_key(f) for f in fields]
        header *= "{$(join(quoted_fields, string(delimiter)))}"
    end
    
    header *= ":"
    
    return header
end

