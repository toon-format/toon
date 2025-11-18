"""
Expands dotted keys into nested objects in safe mode.
"""
function expand_paths_safe(value::JsonValue, strict::Bool)::JsonValue
    if value isa AbstractArray
        # Recursively expand array elements
        return [expand_paths_safe(item, strict) for item in value]
    end
    
    if is_json_object(value)
        expanded_object = Dict{String, Any}()
        
        # Simplified: no quoted key tracking for now
        for (key, key_value) in value
            # Check if key contains dots and should be expanded
            if occursin(".", key)
                segments = [string(s) for s in split(key, ".")]
                
                # Validate all segments are identifiers
                if all(seg -> is_identifier_segment(seg), segments)
                    # Expand this dotted key
                    expanded_value = expand_paths_safe(key_value, strict)
                    insert_path_safe(expanded_object, segments, expanded_value, strict)
                    continue
                end
            end
            
            # Not expandable - keep as literal key, but still recursively expand the value
            expanded_value = expand_paths_safe(key_value, strict)
            
            # Check for conflicts with already-expanded keys
            if haskey(expanded_object, key)
                conflicting_value = expanded_object[key]
                # If both are objects, try to merge them
                if can_merge(conflicting_value, expanded_value)
                    merge_objects(conflicting_value, expanded_value, strict)
                else
                    # Conflict: incompatible types
                    if strict
                        throw(ArgumentError("Path expansion conflict at key \"$(key)\": cannot merge $(typeof(conflicting_value)) with $(typeof(expanded_value))"))
                    end
                    # Non-strict: overwrite (LWW)
                    expanded_object[key] = expanded_value
                end
            else
                # No conflict - insert directly
                expanded_object[key] = expanded_value
            end
        end
        
        return expanded_object
    end
    
    # Primitive value - return as-is
    return value
end

"""
Inserts a value at a nested path, creating intermediate objects as needed.
"""
function insert_path_safe(
    target::JsonObject,
    segments::Vector{String},
    value::JsonValue,
    strict::Bool
)
    current_node = target
    
    # Walk to the penultimate segment, creating objects as needed
    for i in 1:(length(segments) - 1)
        current_segment = segments[i]
        segment_value = get(current_node, current_segment, nothing)
        
        if segment_value === nothing
            # Create new intermediate object
            new_obj = Dict{String, Any}()
            current_node[current_segment] = new_obj
            current_node = new_obj
        elseif is_json_object(segment_value)
            # Continue into existing object
            current_node = segment_value
        else
            # Conflict: existing value is not an object
            if strict
                throw(ArgumentError("Path expansion conflict at segment \"$(current_segment)\": expected object but found $(typeof(segment_value))"))
            end
            # Non-strict: overwrite with new object
            new_obj = Dict{String, Any}()
            current_node[current_segment] = new_obj
            current_node = new_obj
        end
    end
    
    # Insert at the final segment
    last_seg = segments[end]
    destination_value = get(current_node, last_seg, nothing)
    
    if destination_value === nothing
        # No conflict - insert directly
        current_node[last_seg] = value
    elseif can_merge(destination_value, value)
        # Both are objects - deep merge
        merge_objects(destination_value, value, strict)
    else
        # Conflict: incompatible types
        if strict
            throw(ArgumentError("Path expansion conflict at key \"$(last_seg)\": cannot merge $(typeof(destination_value)) with $(typeof(value))"))
        end
        # Non-strict: overwrite (LWW)
        current_node[last_seg] = value
    end
end

"""
Deep merges properties from source into target.
"""
function merge_objects(
    target::JsonObject,
    source::JsonObject,
    strict::Bool
)
    for (key, source_value) in source
        target_value = get(target, key, nothing)
        
        if target_value === nothing
            # Key doesn't exist in target - copy it
            target[key] = source_value
        elseif can_merge(target_value, source_value)
            # Both are objects - recursively merge
            merge_objects(target_value, source_value, strict)
        else
            # Conflict: incompatible types
            if strict
                throw(ArgumentError("Path expansion conflict at key \"$(key)\": cannot merge $(typeof(target_value)) with $(typeof(source_value))"))
            end
            # Non-strict: overwrite (LWW)
            target[key] = source_value
        end
    end
end

function can_merge(a::JsonValue, b::JsonValue)::Bool
    return is_json_object(a) && is_json_object(b)
end

