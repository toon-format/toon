"""
Normalizes a value to JsonValue type.
Handles various Julia types and converts them to JSON-compatible types.
"""
function normalize_value(value)::JsonValue
    # null/nothing
    if value === nothing
        return nothing
    end
    
    # Primitives
    if value isa String || value isa Bool
        return value
    end
    
    # Numbers
    if value isa Number
        if !isfinite(value)
            return nothing
        end
        # Normalize -0 to 0
        if value isa Float64 && value == 0.0 && signbit(value)
            return 0.0
        end
        return value
    end
    
    # Array
    if value isa AbstractArray
        # Check if array contains JSON.jl Objects - preserve them
        if !isempty(value) && typeof(value[1]).name.name == :Object
            # Array of JSON.jl Objects - preserve them to maintain order
            return Any[normalize_value(item) for item in value]
        end
        return Any[normalize_value(item) for item in value]
    end
    
    # Dict/AbstractDict
    if value isa AbstractDict && !(value isa AbstractArray)
        # Check if it's a JSON.jl Object (preserves insertion order)
        if typeof(value).name.name == :Object
            # JSON.jl Object - preserve it to maintain insertion order
            # Recursively normalize nested values but keep the Object structure
            result = typeof(value)()
            for (k, v) in value
                result[string(k)] = normalize_value(v)
            end
            return result
        else
            # Regular Dict - order may not be preserved
            normalized = Dict{String, Any}()
            for (k, v) in value
                normalized[string(k)] = normalize_value(v)
            end
            return normalized
        end
    end
    
    # Fallback: function, symbol, or other → nothing
    return nothing
end

# Type guards
function is_json_primitive(value)::Bool
    return value === nothing || value isa String || value isa Number || value isa Bool
end

function is_json_array(value)::Bool
    return value isa AbstractArray
end

function is_json_object(value)::Bool
    return value isa AbstractDict && !(value isa AbstractArray) && !(value isa Tuple)
end

function is_empty_object(value)::Bool
    if value isa AbstractDict
        return isempty(value)
    end
    return false
end

function is_plain_dict(value)::Bool
    return value isa Dict
end

# Array type detection
function is_array_of_primitives(value::JsonArray)::Bool
    return isempty(value) || all(item -> is_json_primitive(item), value)
end

function is_array_of_arrays(value::JsonArray)::Bool
    return isempty(value) || all(item -> is_json_array(item), value)
end

function is_array_of_objects(value::JsonArray)::Bool
    return isempty(value) || all(item -> is_json_object(item), value)
end

