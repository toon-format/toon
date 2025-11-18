function is_boolean_or_null_literal(token::String)::Bool
    return token == TRUE_LITERAL || token == FALSE_LITERAL || token == NULL_LITERAL
end

"""
Checks if a token represents a valid numeric literal.
Rejects numbers with leading zeros (except `"0"` itself or decimals like `"0.5"`).
"""
function is_numeric_literal(token::String)::Bool
    if isempty(token)
        return false
    end
    
    # Must not have leading zeros (except for `"0"` itself or decimals like `"0.5"`)
    if length(token) > 1 && token[1] == '0' && (length(token) == 1 || token[2] != '.')
        return false
    end
    
    # Check if it's a valid number
    try
        numeric_value = parse(Float64, token)
        return isfinite(numeric_value)
    catch
        return false
    end
end

