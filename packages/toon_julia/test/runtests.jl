using Test
using Toon

# Include specification tests
include("spec_tests.jl")

# Run specification tests
run_spec_tests()

@testset "Toon.jl Tests" begin
    @testset "Encoding" begin
        # Test primitive encoding
        @test toonEncode(42) == "42"
        @test toonEncode("hello") == "hello"
        @test toonEncode(true) == "true"
        @test toonEncode(nothing) == "null"
        
        # Test object encoding
        data = Dict("name" => "Alice", "age" => 30)
        result = toonEncode(data)
        @test occursin("name: Alice", result)
        @test occursin("age: 30", result)
        
        # Test array encoding
        arr = [1, 2, 3]
        result = toonEncode(arr)
        @test occursin("[3]", result)
        @test occursin("1,2,3", result)
    end
    
    @testset "Decoding" begin
        # Test primitive decoding
        @test toonDecode("42") == 42.0
        @test toonDecode("hello") == "hello"
        @test toonDecode("true") == true
        @test toonDecode("null") === nothing
        
        # Test object decoding
        toon_string = "name: Alice\nage: 30"
        result = toonDecode(toon_string)
        @test result["name"] == "Alice"
        @test result["age"] == 30.0
        
        # Test round-trip
        original = Dict("name" => "Alice", "age" => 30)
        toonEncoded = toonEncode(original)
        toonDecoded = toonDecode(toonEncoded)
        @test toonDecoded["name"] == original["name"]
        @test toonDecoded["age"] == original["age"]
    end
    
    @testset "Options" begin
        # Test toonEncode options
        options = EncodeOptions(indent=4)
        data = Dict("key" => "value")
        result = toonEncode(data; options=options)
        @test occursin("    key:", result)  # 4 spaces indentation
        
        # Test toonDecode options
        options = DecodeOptions(strict=false)
        result = toonDecode("key: value"; options=options)
        @test result["key"] == "value"
    end
end

