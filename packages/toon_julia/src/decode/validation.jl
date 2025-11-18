"""
Asserts that the expected count matches the actual count.
"""
function assert_expected_count(actual::Int, expected::Int, context::String, options::DecodeOptions)
    if actual != expected
        if options.strict
            throw(ArgumentError("Expected $(expected) $(context), but found $(actual)"))
        end
    end
end

"""
Validates no blank lines in range.
"""
function validate_no_blank_lines_in_range(
    start_line::Int,
    end_line::Int,
    blank_lines::Vector{BlankLineInfo},
    strict::Bool,
    context::String
)
    if !strict
        return
    end
    
    for blank_line in blank_lines
        if blank_line.line_number >= start_line && blank_line.line_number <= end_line
            throw(ArgumentError("Blank line $(blank_line.line_number) found inside $(context) in strict mode"))
        end
    end
end

"""
Validates no extra list items.
"""
function validate_no_extra_list_items(cursor::LineCursor, item_depth::Int, expected_length::Int)
    # This would check for extra items beyond expected_length
    # Implementation simplified for now
end

"""
Validates no extra tabular rows.
"""
function validate_no_extra_tabular_rows(cursor::LineCursor, row_depth::Int, header::ArrayHeaderInfo)
    # This would check for extra rows beyond header.length
    # Implementation simplified for now
end

