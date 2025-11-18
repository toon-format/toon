"""
Parses an array header line.
"""
function parse_array_header_line(
    content::String,
    default_delimiter::Char
)::Union{Tuple{ArrayHeaderInfo, Union{String, Nothing}}, Nothing}
    trimmed = lstrip(content)
    
    # Find the bracket segment, accounting for quoted keys that may contain brackets
    bracket_start = -1
    
    # For quoted keys, find bracket after closing quote (not inside the quoted string)
    if startswith(trimmed, string(DOUBLE_QUOTE))
        closing_quote_index = find_closing_quote(trimmed, 0)
        if closing_quote_index == 0
            return nothing
        end
        
        after_quote = trimmed[closing_quote_index:end]
        if length(after_quote) < 2 || after_quote[2] != OPEN_BRACKET
            return nothing
        end
        
        # Calculate position in original content and find bracket after the quoted key
        leading_whitespace = length(content) - length(trimmed)
        key_end_index = leading_whitespace + closing_quote_index
        bracket_start_idx = findfirst(==(OPEN_BRACKET), content[key_end_index:end])
        if bracket_start_idx !== nothing
            bracket_start = key_end_index + bracket_start_idx - 1
        else
            bracket_start = -1
        end
    else
        # Unquoted key - find first bracket
        bracket_start_idx = findfirst(==(OPEN_BRACKET), content)
        bracket_start = bracket_start_idx !== nothing ? bracket_start_idx : -1
    end
    
    if bracket_start == -1
        return nothing
    end
    
    bracket_end_idx = findfirst(==(CLOSE_BRACKET), content[bracket_start:end])
    if bracket_end_idx === nothing
        return nothing
    end
    bracket_end = bracket_start + bracket_end_idx - 1
    
    # Find the colon that comes after all brackets and braces
    colon_index = bracket_end + 1
    brace_end = colon_index
    
    # Check for fields segment (braces come after bracket)
    brace_start_idx = findfirst(==(OPEN_BRACE), content[bracket_end:end])
    brace_start = brace_start_idx !== nothing ? bracket_end + brace_start_idx - 1 : -1
    
    colon_after_bracket_idx = findfirst(==(COLON), content[bracket_end:end])
    if brace_start != -1 && colon_after_bracket_idx !== nothing && brace_start < bracket_end + colon_after_bracket_idx - 1
        brace_end_idx = findfirst(==(CLOSE_BRACE), content[brace_start:end])
        if brace_end_idx !== nothing
            brace_end = brace_start + brace_end_idx
        end
    end
    
    # Now find colon after brackets and braces
    colon_idx = findfirst(==(COLON), content[max(bracket_end, brace_end):end])
    if colon_idx === nothing
        return nothing
    end
    colon_index = max(bracket_end, brace_end) + colon_idx - 1
    
    # Extract and parse the key (might be quoted)
    key = nothing
    if bracket_start > 1
        raw_key = strip(content[1:(bracket_start - 1)])
        key = startswith(raw_key, string(DOUBLE_QUOTE)) ? parse_string_literal(raw_key) : raw_key
    end
    
    after_colon = strip(content[(colon_index + 1):end])
    
    bracket_content = content[(bracket_start + 1):(bracket_end - 1)]
    
    # Try to parse bracket segment
    parsed_bracket = try
        parse_bracket_segment(bracket_content, default_delimiter)
    catch
        return nothing
    end
    
    length_val = parsed_bracket[1]
    delimiter = parsed_bracket[2]
    
    # Check for fields segment
    fields = nothing
    if brace_start != -1 && brace_start < colon_index
        brace_end_idx = findfirst(==(CLOSE_BRACE), content[brace_start:end])
        if brace_end_idx !== nothing && (brace_start + brace_end_idx - 1) < colon_index
            fields_content = content[(brace_start + 1):(brace_start + brace_end_idx - 2)]
            field_values = parse_delimited_values(fields_content, delimiter)
            fields = [parse_string_literal(strip(f)) for f in field_values]
        end
    end
    
    return (ArrayHeaderInfo(key, length_val, delimiter, fields), isempty(after_colon) ? nothing : after_colon)
end

"""
Parses a bracket segment to extract length and delimiter.
"""
function parse_bracket_segment(seg::String, default_delimiter::Char)::Tuple{Int, Char}
    content = seg
    
    # Check for delimiter suffix
    delimiter = default_delimiter
    if endswith(content, string(TAB))
        delimiter = DELIMITERS[:tab]
        content = content[1:(end - 1)]
    elseif endswith(content, string(PIPE))
        delimiter = DELIMITERS[:pipe]
        content = content[1:(end - 1)]
    end
    
    length_val = try
        parse(Int, content)
    catch
        throw(ArgumentError("Invalid array length: $(seg)"))
    end
    
    return (length_val, delimiter)
end

"""
Parses a delimited string into values, respecting quoted strings and escape sequences.
"""
function parse_delimited_values(input::String, delimiter::Char)::Vector{String}
    values = String[]
    value_buffer = ""
    in_quotes = false
    i = 1
    
    while i <= length(input)
        char = input[i]
        
        if char == BACKSLASH && i + 1 <= length(input) && in_quotes
            # Escape sequence in quoted string
            value_buffer *= char * input[i + 1]
            i += 2
            continue
        end
        
        if char == DOUBLE_QUOTE
            in_quotes = !in_quotes
            value_buffer *= char
            i += 1
            continue
        end
        
        if char == delimiter && !in_quotes
            push!(values, strip(value_buffer))
            value_buffer = ""
            i += 1
            continue
        end
        
        value_buffer *= char
        i += 1
    end
    
    # Add last value
    if !isempty(value_buffer) || !isempty(values)
        push!(values, strip(value_buffer))
    end
    
    return values
end

"""
Maps row values to primitives.
"""
function map_row_values_to_primitives(values::Vector{String})::Vector{JsonPrimitive}
    return [parse_primitive_token(v) for v in values]
end

"""
Parses a primitive token.
"""
function parse_primitive_token(token::String)::JsonPrimitive
    trimmed = string(strip(token))
    
    # Empty token
    if isempty(trimmed)
        return ""
    end
    
    # Quoted string (if starts with quote, it MUST be properly quoted)
    if startswith(trimmed, string(DOUBLE_QUOTE))
        return parse_string_literal(trimmed)
    end
    
    # Boolean or null literals
    if is_boolean_or_null_literal(trimmed)
        if trimmed == TRUE_LITERAL
            return true
        elseif trimmed == FALSE_LITERAL
            return false
        elseif trimmed == NULL_LITERAL
            return nothing
        end
    end
    
    # Numeric literal
    if is_numeric_literal(trimmed)
        parsed_number = parse(Float64, trimmed)
        # Normalize negative zero to positive zero
        return parsed_number == 0.0 && signbit(parsed_number) ? 0.0 : parsed_number
    end
    
    # Unquoted string
    return trimmed
end

"""
Parses a string literal.
"""
function parse_string_literal(token::String)::String
    trimmed_token = strip(token)
    
    if startswith(trimmed_token, string(DOUBLE_QUOTE))
        # Find the closing quote, accounting for escaped quotes
        closing_quote_index = find_closing_quote(trimmed_token, 0)
        
        if closing_quote_index == 0
            # No closing quote was found
            throw(ArgumentError("Unterminated string: missing closing quote"))
        end
        
        if closing_quote_index != length(trimmed_token)
            throw(ArgumentError("Unexpected characters after closing quote"))
        end
        
        content = trimmed_token[2:(closing_quote_index - 1)]
        return unescape_string(content)
    end
    
    return trimmed_token
end

"""
Parses an unquoted key.
"""
function parse_unquoted_key(content::String, start::Int)::Tuple{String, Int}
    parse_position = start
    while parse_position <= length(content) && content[parse_position] != COLON
        parse_position += 1
    end
    
    # Validate that a colon was found
    if parse_position > length(content) || content[parse_position] != COLON
        throw(ArgumentError("Missing colon after key"))
    end
    
    key = strip(content[start:(parse_position - 1)])
    
    # Skip the colon
    parse_position += 1
    
    return (key, parse_position)
end

"""
Parses a quoted key.
"""
function parse_quoted_key(content::String, start::Int)::Tuple{String, Int}
    # Find the closing quote, accounting for escaped quotes
    closing_quote_index = find_closing_quote(content, start - 1)
    
    if closing_quote_index == 0
        throw(ArgumentError("Unterminated quoted key"))
    end
    
    # Extract and unescape the key content
    key_content = content[(start + 1):(closing_quote_index - 1)]
    key = unescape_string(key_content)
    parse_position = closing_quote_index + 1
    
    # Validate and skip colon after quoted key
    if parse_position > length(content) || content[parse_position] != COLON
        throw(ArgumentError("Missing colon after key"))
    end
    parse_position += 1
    
    return (key, parse_position)
end

"""
Parses a key token (quoted or unquoted).
"""
function parse_key_token(content::String, start::Int)::Tuple{String, Int, Bool}
    is_quoted = content[start] == DOUBLE_QUOTE
    if is_quoted
        key, end_pos = parse_quoted_key(content, start)
    else
        key, end_pos = parse_unquoted_key(content, start)
    end
    return (key, end_pos, is_quoted)
end

"""
Checks if content is an array header after hyphen.
"""
function is_array_header_after_hyphen(content::String)::Bool
    return startswith(strip(content), string(OPEN_BRACKET)) && find_unquoted_char(content, COLON) != 0
end

"""
Checks if content is an object first field after hyphen.
"""
function is_object_first_field_after_hyphen(content::String)::Bool
    return find_unquoted_char(content, COLON) != 0
end

