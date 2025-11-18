"""
Checks if a key can be used without quotes.
Valid unquoted keys must start with a letter or underscore,
followed by letters, digits, underscores, or dots.
"""
function is_valid_unquoted_key(key::String)::Bool
    return occursin(r"^[A-Z_][\w.]*$"i, key)
end

"""
Checks if a key segment is a valid identifier for safe folding/expansion.
Identifier segments are more restrictive than unquoted keys:
- Must start with a letter or underscore
- Followed only by letters, digits, or underscores (no dots)
- Used for safe key folding and path expansion
"""
function is_identifier_segment(key::String)::Bool
    return occursin(r"^[A-Z_]\w*$"i, key)
end

"""
Checks if a string looks like a number.
Match numbers like `42`, `-3.14`, `1e-6`, `05`, etc.
"""
function is_numeric_like(value::String)::Bool
    return occursin(r"^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$"i, value) || occursin(r"^0\d+$", value)
end

"""
Determines if a string value can be safely encoded without quotes.
A string needs quoting if it:
- Is empty
- Has leading or trailing whitespace
- Could be confused with a literal (boolean, null, number)
- Contains structural characters (colons, brackets, braces)
- Contains quotes or backslashes (need escaping)
- Contains control characters (newlines, tabs, etc.)
- Contains the active delimiter
- Starts with a list marker (hyphen)
"""
function is_safe_unquoted(value::String, delimiter::Char = DEFAULT_DELIMITER)::Bool
    if isempty(value)
        return false
    end
    
    if value != strip(value)
        return false
    end
    
    # Check if it looks like any literal value (boolean, null, or numeric)
    if is_boolean_or_null_literal(value) || is_numeric_like(value)
        return false
    end
    
    # Check for colon (always structural)
    if occursin(":", value)
        return false
    end
    
    # Check for quotes and backslash (always need escaping)
    if occursin("\"", value) || occursin("\\", value)
        return false
    end
    
    # Check for brackets and braces (always structural)
    if occursin(r"[\[\]{}]", value)
        return false
    end
    
    # Check for control characters (newline, carriage return, tab - always need quoting/escaping)
    if occursin(r"[\n\r\t]", value)
        return false
    end
    
    # Check for the active delimiter
    if occursin(string(delimiter), value)
        return false
    end
    
    # Check for hyphen at start (list marker)
    if startswith(value, string(LIST_ITEM_MARKER))
        return false
    end
    
    return true
end

