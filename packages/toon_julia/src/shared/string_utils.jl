"""
Escapes special characters in a string for encoding.
Handles backslashes, quotes, newlines, carriage returns, and tabs.
"""
function escape_string(value::String)::String
    result = value
    result = replace(result, "\\" => "\\\\")
    result = replace(result, "\"" => "\\\"")
    result = replace(result, "\n" => "\\n")
    result = replace(result, "\r" => "\\r")
    result = replace(result, "\t" => "\\t")
    return result
end

"""
Unescapes a string by processing escape sequences.
Handles `\n`, `\t`, `\r`, `\\`, and `\"` escape sequences.
"""
function unescape_string(value::String)::String
    unescaped = ""
    i = 1
    while i <= length(value)
        if value[i] == BACKSLASH
            if i + 1 > length(value)
                throw(ArgumentError("Invalid escape sequence: backslash at end of string"))
            end
            
            next_char = value[i + 1]
            if next_char == 'n'
                unescaped *= NEWLINE
                i += 2
                continue
            elseif next_char == 't'
                unescaped *= TAB
                i += 2
                continue
            elseif next_char == 'r'
                unescaped *= CARRIAGE_RETURN
                i += 2
                continue
            elseif next_char == BACKSLASH
                unescaped *= BACKSLASH
                i += 2
                continue
            elseif next_char == DOUBLE_QUOTE
                unescaped *= DOUBLE_QUOTE
                i += 2
                continue
            else
                throw(ArgumentError("Invalid escape sequence: \\$next_char"))
            end
        end
        
        unescaped *= value[i]
        i += 1
    end
    
    return unescaped
end

"""
Finds the index of the closing double quote, accounting for escape sequences.
Returns 0 if not found (Julia uses 1-based indexing).
"""
function find_closing_quote(content::String, start::Int)::Int
    i = start + 1
    while i <= length(content)
        if content[i] == BACKSLASH && i + 1 <= length(content)
            # Skip escaped character
            i += 2
            continue
        end
        if content[i] == DOUBLE_QUOTE
            return i
        end
        i += 1
    end
    return 0  # Not found
end

"""
Finds the index of a character outside of quoted sections.
Returns 0 if not found (Julia uses 1-based indexing).
"""
function find_unquoted_char(content::String, char::Char, start::Int = 1)::Int
    in_quotes = false
    i = start
    
    while i <= length(content)
        if content[i] == BACKSLASH && i + 1 <= length(content) && in_quotes
            # Skip escaped character
            i += 2
            continue
        end
        
        if content[i] == DOUBLE_QUOTE
            in_quotes = !in_quotes
            i += 1
            continue
        end
        
        if content[i] == char && !in_quotes
            return i
        end
        
        i += 1
    end
    
    return 0  # Not found
end

