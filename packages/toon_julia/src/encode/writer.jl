"""
LineWriter handles building the output string with proper indentation.
"""
mutable struct LineWriter
    lines::Vector{String}
    indentation_string::String
    
    function LineWriter(indent_size::Int)
        new(String[], " " ^ indent_size)
    end
end

"""
Pushes a line with the specified depth (indentation level).
"""
function push(writer::LineWriter, depth::Int, content::String)
    indent = writer.indentation_string ^ depth
    push!(writer.lines, indent * content)
end

"""
Pushes a list item with the specified depth.
"""
function push_list_item(writer::LineWriter, depth::Int, content::String)
    push(writer, depth, LIST_ITEM_PREFIX * content)
end

"""
Converts the writer to a string.
"""
function Base.string(writer::LineWriter)::String
    return join(writer.lines, "\n")
end

