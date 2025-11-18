"""
LineCursor handles parsing through lines with tracking of position.
"""
mutable struct LineCursor
    lines::Vector{ParsedLine}
    index::Int
    blank_lines::Vector{BlankLineInfo}
    
    function LineCursor(lines::Vector{ParsedLine}, blank_lines::Vector{BlankLineInfo} = BlankLineInfo[])
        new(lines, 1, blank_lines)
    end
end

function get_blank_lines(cursor::LineCursor)::Vector{BlankLineInfo}
    return cursor.blank_lines
end

function peek(cursor::LineCursor)::Union{ParsedLine, Nothing}
    if cursor.index > length(cursor.lines)
        return nothing
    end
    return cursor.lines[cursor.index]
end

function next(cursor::LineCursor)::Union{ParsedLine, Nothing}
    if cursor.index > length(cursor.lines)
        return nothing
    end
    line = cursor.lines[cursor.index]
    cursor.index += 1
    return line
end

function current(cursor::LineCursor)::Union{ParsedLine, Nothing}
    if cursor.index > 1 && cursor.index <= length(cursor.lines) + 1
        return cursor.lines[cursor.index - 1]
    end
    return nothing
end

function advance(cursor::LineCursor)
    cursor.index += 1
end

function at_end(cursor::LineCursor)::Bool
    return cursor.index > length(cursor.lines)
end

function Base.length(cursor::LineCursor)::Int
    return length(cursor.lines)
end

function peek_at_depth(cursor::LineCursor, target_depth::Int)::Union{ParsedLine, Nothing}
    line = peek(cursor)
    return line !== nothing && line.depth == target_depth ? line : nothing
end

"""
Converts source string to parsed lines.
"""
struct ScanResult
    lines::Vector{ParsedLine}
    blank_lines::Vector{BlankLineInfo}
end

function to_parsed_lines(source::String, indent_size::Int, strict::Bool)::ScanResult
    if isempty(strip(source))
        return ScanResult(ParsedLine[], BlankLineInfo[])
    end
    
    lines = split(source, '\n')
    parsed = ParsedLine[]
    blank_lines = BlankLineInfo[]
    
    for (i, raw) in enumerate(lines)
        line_number = i
        indent = 0
        while indent < length(raw) && raw[indent + 1] == SPACE
            indent += 1
        end
        
        content = raw[(indent + 1):end]
        
        # Track blank lines
        if isempty(strip(content))
            depth = compute_depth_from_indent(indent, indent_size)
            push!(blank_lines, BlankLineInfo(line_number, indent, depth))
            continue
        end
        
        depth = compute_depth_from_indent(indent, indent_size)
        
        # Strict mode validation
        if strict
            # Check for tabs in leading whitespace
            whitespace_region = raw[1:min(indent, length(raw))]
            if occursin(TAB, whitespace_region)
                throw(ArgumentError("Line $(line_number): Tabs are not allowed in indentation in strict mode"))
            end
            
            # Check for exact multiples of indent_size
            if indent > 0 && indent % indent_size != 0
                throw(ArgumentError("Line $(line_number): Indentation must be exact multiple of $(indent_size), but found $(indent) spaces"))
            end
        end
        
        push!(parsed, ParsedLine(raw, depth, indent, content, line_number))
    end
    
    return ScanResult(parsed, blank_lines)
end

function compute_depth_from_indent(indent_spaces::Int, indent_size::Int)::Int
    return div(indent_spaces, indent_size)
end

