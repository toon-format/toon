#!/usr/bin/env julia
# TOON Specification Test Suite
# Tests based on official TOON specification fixtures from:
# https://github.com/toon-format/spec/tree/main/tests

using Test
using Toon
using JSON

"""
Loads a test fixture JSON file and returns the parsed data.
"""
function load_fixture(filepath::String)
    if !isfile(filepath)
        return nothing
    end
    try
        return JSON.parsefile(filepath)
    catch e
        @warn "Failed to load fixture $filepath: $e"
        return nothing
    end
end

"""
Normalizes JSON values for comparison (handles Float64/Int64 differences).
"""
function normalize_json_value(value)
    # Handle JSON.jl's Object type
    if typeof(value).name.name == :Object || (value isa Dict)
        return Dict{String, Any}(string(k) => normalize_json_value(v) for (k, v) in value)
    elseif value isa Array
        return Any[normalize_json_value(item) for item in value]
    elseif value isa Bool
        # Preserve booleans (Bool is a subtype of Number, so check this first)
        return value
    elseif value isa Number
        # Convert all numbers to Float64 for comparison (Julia's JSON parser does this)
        return Float64(value)
    else
        return value
    end
end

"""
Compares two JSON values, handling type differences.
"""
function json_values_equal(a, b)
    a_norm = normalize_json_value(a)
    b_norm = normalize_json_value(b)
    
    # Both should be normalized to Dict{String, Any} or Array, so compare types after normalization
    if (a_norm isa Dict) != (b_norm isa Dict) || (a_norm isa Array) != (b_norm isa Array)
        return false
    end
    
    if a_norm isa Dict
        if length(a_norm) != length(b_norm)
            return false
        end
        for (k, v) in a_norm
            if !haskey(b_norm, k) || !json_values_equal(v, b_norm[k])
                return false
            end
        end
        return true
    elseif a_norm isa Array
        if length(a_norm) != length(b_norm)
            return false
        end
        for (i, val) in enumerate(a_norm)
            if !json_values_equal(val, b_norm[i])
                return false
            end
        end
        return true
    else
        return a_norm == b_norm
    end
end

"""
Runs encode tests from a fixture file.
"""
function run_encode_tests(fixture_path::String)
    fixture = load_fixture(fixture_path)
    if fixture === nothing
        return
    end
    
    description = get(fixture, "description", "")
    tests = get(fixture, "tests", [])
    
    @testset "$(basename(fixture_path)): $description" begin
        for test_case in tests
            test_name = get(test_case, "name", "unnamed test")
            input_val = get(test_case, "input", nothing)
            expected = get(test_case, "expected", "")
            options_dict = get(test_case, "options", Dict())
            should_error = get(test_case, "shouldError", false)
            
            if input_val === nothing
                continue
            end
            
            # Convert JSON input to Julia types
            julia_input = normalize_json_value(input_val)
            
            # Build options
            encode_opts = EncodeOptions()
            if haskey(options_dict, "indent")
                encode_opts = EncodeOptions(indent=options_dict["indent"], 
                                          delimiter=encode_opts.delimiter,
                                          key_folding=encode_opts.key_folding,
                                          flatten_depth=encode_opts.flatten_depth)
            end
            if haskey(options_dict, "delimiter")
                delim_char = options_dict["delimiter"] == "\t" ? '\t' : 
                            options_dict["delimiter"] == "|" ? '|' : ','
                encode_opts = EncodeOptions(indent=encode_opts.indent,
                                          delimiter=delim_char,
                                          key_folding=encode_opts.key_folding,
                                          flatten_depth=encode_opts.flatten_depth)
            end
            
            if should_error
                @test_throws Exception toonEncode(julia_input; options=encode_opts)
            else
                try
                    result = toonEncode(julia_input; options=encode_opts)
                    # Normalize whitespace for comparison
                    result_normalized = strip(replace(result, r"\s+$"m => ""))
                    expected_normalized = strip(replace(expected, r"\s+$"m => ""))
                    @test result_normalized == expected_normalized
                catch e
                    @error "Test '$test_name' failed with error: $e"
                    @test false
                end
            end
        end
    end
end

"""
Runs decode tests from a fixture file.
"""
function run_decode_tests(fixture_path::String)
    fixture = load_fixture(fixture_path)
    if fixture === nothing
        return
    end
    
    description = get(fixture, "description", "")
    tests = get(fixture, "tests", [])
    
    @testset "$(basename(fixture_path)): $description" begin
        for test_case in tests
            test_name = get(test_case, "name", "unnamed test")
            input_toon = get(test_case, "input", "")
            expected_val = get(test_case, "expected", nothing)
            options_dict = get(test_case, "options", Dict())
            should_error = get(test_case, "shouldError", false)
            
            if expected_val === nothing
                continue
            end
            
            # Build options
            decode_opts = DecodeOptions()
            if haskey(options_dict, "strict")
                decode_opts = DecodeOptions(strict=options_dict["strict"],
                                          indent=decode_opts.indent,
                                          expand_paths=decode_opts.expand_paths)
            end
            if haskey(options_dict, "expandPaths")
                expand_val = options_dict["expandPaths"] == "safe" ? :safe : :off
                decode_opts = DecodeOptions(strict=decode_opts.strict,
                                          indent=decode_opts.indent,
                                          expand_paths=expand_val)
            end
            
            if should_error
                @test_throws Exception toonDecode(input_toon; options=decode_opts)
            else
                try
                    result = toonDecode(input_toon; options=decode_opts)
                    expected_normalized = normalize_json_value(expected_val)
                    
                    if !json_values_equal(result, expected_normalized)
                        @error "Test '$test_name' failed: expected $expected_normalized, got $result"
                    end
                    @test json_values_equal(result, expected_normalized)
                catch e
                    @error "Test '$test_name' failed with error: $e"
                    @test false
                end
            end
        end
    end
end

"""
Main test runner for specification tests.
"""
function run_spec_tests(fixtures_dir::String = "/tmp/toon-spec/tests/fixtures")
    if !isdir(fixtures_dir)
        @warn "Spec fixtures directory not found: $fixtures_dir"
        @warn "Skipping specification tests. Clone the spec repo:"
        @warn "  git clone https://github.com/toon-format/spec.git /tmp/toon-spec"
        return
    end
    
    @testset "TOON Specification Tests" begin
        # Encode tests
        encode_dir = joinpath(fixtures_dir, "encode")
        if isdir(encode_dir)
            @testset "Encoding Tests" begin
                for file in readdir(encode_dir)
                    if endswith(file, ".json")
                        run_encode_tests(joinpath(encode_dir, file))
                    end
                end
            end
        end
        
        # Decode tests
        decode_dir = joinpath(fixtures_dir, "decode")
        if isdir(decode_dir)
            @testset "Decoding Tests" begin
                for file in readdir(decode_dir)
                    if endswith(file, ".json")
                        run_decode_tests(joinpath(decode_dir, file))
                    end
                end
            end
        end
    end
end

# Run the tests if this file is executed directly
if abspath(PROGRAM_FILE) == @__FILE__
    run_spec_tests()
end
