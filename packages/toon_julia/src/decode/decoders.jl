"""
Decodes a value from lines using a cursor.
"""
function decode_value_from_lines(cursor::LineCursor, options::DecodeOptions)::JsonValue
    first = peek(cursor)
    if first === nothing
        throw(ArgumentError("No content to decode"))
    end
    
    # Check for root array
    if is_array_header_after_hyphen(first.content)
        header_result = parse_array_header_line(first.content, DEFAULT_DELIMITER)
        if header_result !== nothing
            header_info, inline_values = header_result
            advance(cursor)  # Move past the header line
            return decode_array_from_header(header_info, inline_values, cursor, 0, options)
        end
    end
    
    # Check for single primitive value
    if length(cursor) == 1 && !is_key_value_line(first)
        return parse_primitive_token(string(strip(first.content)))
    end
    
    # Default to object
    return decode_object(cursor, 0, options)
end

function is_key_value_line(line::ParsedLine)::Bool
    content = line.content
    # Look for unquoted colon or quoted key followed by colon
    if startswith(content, string(DOUBLE_QUOTE))
        # Quoted key - find the closing quote
        closing_quote_index = find_closing_quote(content, 0)
        if closing_quote_index == 0
            return false
        end
        # Check if colon exists after quoted key
        return closing_quote_index < length(content) && occursin(COLON, content[closing_quote_index:end])
    else
        # Unquoted key - look for colon
        return occursin(COLON, content)
    end
end

"""
Decodes an object.
"""
function decode_object(cursor::LineCursor, base_depth::Int, options::DecodeOptions)::JsonObject
    obj = Dict{String, Any}()
    quoted_keys = Set{String}()
    
    # Detect the actual depth of the first field
    computed_depth = nothing
    
    while !at_end(cursor)
        line = peek(cursor)
        if line === nothing || line.depth < base_depth
            break
        end
        
        if computed_depth === nothing && line.depth >= base_depth
            computed_depth = line.depth
        end
        
        if line.depth == computed_depth
            advance(cursor)
            key, value, is_quoted = decode_key_value(line.content, cursor, computed_depth, options)
            obj[key] = value
            
            # Track quoted dotted keys for expansion phase
            if is_quoted && occursin(".", key)
                push!(quoted_keys, key)
            end
        else
            # Different depth - stop object parsing
            break
        end
    end
    
    # Store quoted keys metadata if needed (simplified for now)
    return obj
end

"""
Decodes a key-value pair.
"""
function decode_key_value(
    content::String,
    cursor::LineCursor,
    base_depth::Int,
    options::DecodeOptions
)::Tuple{String, JsonValue, Bool}
    # Check for array header first
    header_result = parse_array_header_line(content, DEFAULT_DELIMITER)
    if header_result !== nothing
        header_info, inline_values = header_result
        if header_info.key !== nothing
            decoded_value = decode_array_from_header(header_info, inline_values, cursor, base_depth, options)
            return (header_info.key, decoded_value, false)
        end
    end
    
    # Regular key-value pair
    key, end_pos, is_quoted = parse_key_token(content, 1)
    rest = string(strip(content[end_pos:end]))
    
    # No value after colon - expect nested object or empty
    if isempty(rest)
        next_line = peek(cursor)
        if next_line !== nothing && next_line.depth > base_depth
            nested = decode_object(cursor, base_depth + 1, options)
            return (key, nested, is_quoted)
        end
        # Empty object
        return (key, Dict{String, Any}(), is_quoted)
    end
    
    # Inline primitive value
    decoded_value = parse_primitive_token(rest)
    return (key, decoded_value, is_quoted)
end

"""
Decodes an array from header.
"""
function decode_array_from_header(
    header::ArrayHeaderInfo,
    inline_values::Union{String, Nothing},
    cursor::LineCursor,
    base_depth::Int,
    options::DecodeOptions
)::JsonArray
    # Inline primitive array
    if inline_values !== nothing
        return decode_inline_primitive_array(header, inline_values, options)
    end
    
    # Tabular array
    if header.fields !== nothing && !isempty(header.fields)
        return decode_tabular_array(header, cursor, base_depth, options)
    end
    
    # List array
    return decode_list_array(header, cursor, base_depth, options)
end

"""
Decodes an inline primitive array.
"""
function decode_inline_primitive_array(
    header::ArrayHeaderInfo,
    inline_values::String,
    options::DecodeOptions
)::Vector{JsonPrimitive}
    if isempty(strip(inline_values))
        assert_expected_count(0, header.length, "inline array items", options)
        return JsonPrimitive[]
    end
    
    values = parse_delimited_values(inline_values, header.delimiter)
    primitives = map_row_values_to_primitives(values)
    
    assert_expected_count(length(primitives), header.length, "inline array items", options)
    
    return primitives
end

"""
Decodes a list array.
"""
function decode_list_array(
    header::ArrayHeaderInfo,
    cursor::LineCursor,
    base_depth::Int,
    options::DecodeOptions
)::JsonArray
    items = JsonValue[]
    item_depth = base_depth + 1
    
    # Track line range for blank line validation
    start_line = nothing
    end_line = nothing
    
    while !at_end(cursor) && length(items) < header.length
        line = peek(cursor)
        if line === nothing || line.depth < item_depth
            break
        end
        
        # Check for list item (with or without space after hyphen)
        is_list_item = startswith(line.content, LIST_ITEM_PREFIX) || line.content == string(LIST_ITEM_MARKER)
        
        if line.depth == item_depth && is_list_item
            # Track first and last item line numbers
            if start_line === nothing
                start_line = line.line_number
            end
            end_line = line.line_number
            
            item = decode_list_item(cursor, item_depth, options)
            push!(items, item)
            
            # Update end_line to the current cursor position
            current_line = current(cursor)
            if current_line !== nothing
                end_line = current_line.line_number
            end
        else
            break
        end
    end
    
    assert_expected_count(length(items), header.length, "list array items", options)
    
    # In strict mode, check for blank lines inside the array
    if options.strict && start_line !== nothing && end_line !== nothing
        validate_no_blank_lines_in_range(
            start_line,
            end_line,
            get_blank_lines(cursor),
            options.strict,
            "list array"
        )
    end
    
    # In strict mode, check for extra items
    if options.strict
        validate_no_extra_list_items(cursor, item_depth, header.length)
    end
    
    return items
end

"""
Decodes a tabular array.
"""
function decode_tabular_array(
    header::ArrayHeaderInfo,
    cursor::LineCursor,
    base_depth::Int,
    options::DecodeOptions
)::Vector{JsonObject}
    objects = JsonObject[]
    row_depth = base_depth + 1
    
    # Track line range for blank line validation
    start_line = nothing
    end_line = nothing
    
    while !at_end(cursor) && length(objects) < header.length
        line = peek(cursor)
        if line === nothing || line.depth < row_depth
            break
        end
        
        if line.depth == row_depth
            # Track first and last row line numbers
            if start_line === nothing
                start_line = line.line_number
            end
            end_line = line.line_number
            
            advance(cursor)
            values = parse_delimited_values(line.content, header.delimiter)
            assert_expected_count(length(values), length(header.fields), "tabular row values", options)
            
            primitives = map_row_values_to_primitives(values)
            obj = Dict{String, Any}()
            
            for i in 1:length(header.fields)
                obj[header.fields[i]] = primitives[i]
            end
            
            push!(objects, obj)
        else
            break
        end
    end
    
    assert_expected_count(length(objects), header.length, "tabular rows", options)
    
    # In strict mode, check for blank lines inside the array
    if options.strict && start_line !== nothing && end_line !== nothing
        validate_no_blank_lines_in_range(
            start_line,
            end_line,
            get_blank_lines(cursor),
            options.strict,
            "tabular array"
        )
    end
    
    # In strict mode, check for extra rows
    if options.strict
        validate_no_extra_tabular_rows(cursor, row_depth, header)
    end
    
    return objects
end

"""
Decodes a list item.
"""
function decode_list_item(
    cursor::LineCursor,
    base_depth::Int,
    options::DecodeOptions
)::JsonValue
    line = next(cursor)
    if line === nothing
        throw(ArgumentError("Expected list item"))
    end
    
    # Check for list item
    after_hyphen = ""
    
    # Empty list item should be an empty object
    if line.content == string(LIST_ITEM_MARKER)
        return Dict{String, Any}()
    elseif startswith(line.content, LIST_ITEM_PREFIX)
        after_hyphen = string(line.content[(length(LIST_ITEM_PREFIX) + 1):end])
    else
        throw(ArgumentError("Expected list item to start with \"$(LIST_ITEM_PREFIX)\""))
    end
    
    # Empty content after list item should also be an empty object
    if isempty(strip(after_hyphen))
        return Dict{String, Any}()
    end
    
    # Check for array header after hyphen
    if is_array_header_after_hyphen(after_hyphen)
        header_result = parse_array_header_line(after_hyphen, DEFAULT_DELIMITER)
        if header_result !== nothing
            header_info, inline_values = header_result
            return decode_array_from_header(header_info, inline_values, cursor, base_depth, options)
        end
    end
    
    # Check for object first field after hyphen
    if is_object_first_field_after_hyphen(after_hyphen)
        return decode_object_from_list_item(line, cursor, base_depth, options)
    end
    
    # Primitive value
    return parse_primitive_token(after_hyphen)
end

"""
Decodes an object from a list item.
"""
function decode_object_from_list_item(
    first_line::ParsedLine,
    cursor::LineCursor,
    base_depth::Int,
    options::DecodeOptions
)::JsonObject
    after_hyphen = first_line.content[(length(LIST_ITEM_PREFIX) + 1):end]
    key, value, is_quoted = decode_key_value(after_hyphen, cursor, base_depth, options)
    
    obj = Dict{String, Any}(key => value)
    quoted_keys = Set{String}()
    
    # Track if first key was quoted and dotted
    if is_quoted && occursin(".", key)
        push!(quoted_keys, key)
    end
    
    # Read subsequent fields
    follow_depth = base_depth + 1
    while !at_end(cursor)
        line = peek(cursor)
        if line === nothing || line.depth < follow_depth
            break
        end
        
        if line.depth == follow_depth && !startswith(line.content, LIST_ITEM_PREFIX)
            advance(cursor)
            k, v, k_is_quoted = decode_key_value(line.content, cursor, follow_depth, options)
            obj[k] = v
            
            # Track quoted dotted keys
            if k_is_quoted && occursin(".", k)
                push!(quoted_keys, k)
            end
        else
            break
        end
    end
    
    return obj
end

