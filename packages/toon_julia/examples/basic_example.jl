#!/usr/bin/env julia
# Basic Toon.jl Examples
# This file demonstrates various usage patterns of the Toon package

# Activate the package environment
using Pkg
Pkg.activate(joinpath(@__DIR__, ".."))
using Toon

println("=" ^ 60)
println("Toon.jl Examples")
println("=" ^ 60)
println()

# ============================================================================
# Example 1: Basic Encoding
# ============================================================================
println("Example 1: Basic Encoding")
println("-" ^ 60)

data = Dict(
    "name" => "Alice",
    "age" => 30,
    "city" => "New York"
)

toon_string = toonEncode(data)
println("Input:")
println("  data = Dict(\"name\" => \"Alice\", \"age\" => 30, \"city\" => \"New York\")")
println()
println("Encoded TOON:")
println(toon_string)
println()

# ============================================================================
# Example 2: Basic Decoding
# ============================================================================
println("Example 2: Basic Decoding")
println("-" ^ 60)

toon_input = """
name: Bob
age: 25
email: bob@example.com
"""

toonDecoded = toonDecode(toon_input)
println("Input TOON:")
println(toon_input)
println("Decoded:")
println("  ", toonDecoded)
println()

# ============================================================================
# Example 3: Nested Objects
# ============================================================================
println("Example 3: Nested Objects")
println("-" ^ 60)

nested_data = Dict(
    "user" => Dict(
        "name" => "Charlie",
        "address" => Dict(
            "street" => "123 Main St",
            "zipcode" => "10001"
        )
    )
)

toon_nested = toonEncode(nested_data)
println("Nested object toonEncoded:")
println(toon_nested)
println()

# ============================================================================
# Example 4: Arrays
# ============================================================================
println("Example 4: Arrays")
println("-" ^ 60)

array_data = Dict(
    "fruits" => ["apple", "banana", "orange"],
    "numbers" => [1, 2, 3, 4, 5]
)

toon_array = toonEncode(array_data)
println("Array toonEncoded:")
println(toon_array)
println()

# ============================================================================
# Example 5: Array of Objects
# ============================================================================
println("Example 5: Array of Objects")
println("-" ^ 60)

users_data = Dict(
    "users" => [
        Dict("id" => 1, "name" => "Alice", "role" => "admin"),
        Dict("id" => 2, "name" => "Bob", "role" => "user"),
        Dict("id" => 3, "name" => "Charlie", "role" => "user")
    ]
)

toon_users = toonEncode(users_data)
println("Array of objects toonEncoded:")
println(toon_users)
println()

# ============================================================================
# Example 6: Encoding Options
# ============================================================================
println("Example 6: Encoding Options (Custom Indentation)")
println("-" ^ 60)

options = EncodeOptions(indent=4)
data_with_options = Dict(
    "level1" => Dict(
        "level2" => Dict(
            "level3" => "value"
        )
    )
)

toon_indented = toonEncode(data_with_options; options=options)
println("With 4-space indentation:")
println(toon_indented)
println()

# ============================================================================
# Example 7: Round-trip Encoding/Decoding
# ============================================================================
println("Example 7: Round-trip Encoding/Decoding")
println("-" ^ 60)

original = Dict(
    "product" => "Laptop",
    "price" => 999.99,
    "in_stock" => true,
    "specs" => Dict(
        "cpu" => "Intel i7",
        "ram" => "16GB",
        "storage" => "512GB SSD"
    ),
    "tags" => ["electronics", "computers", "laptops"]
)

toonEncoded = toonEncode(original)
toonDecoded = toonDecode(toonEncoded)

println("Original:")
println("  ", original)
println()
println("Encoded:")
println(toonEncoded)
println()
println("Decoded:")
println("  ", toonDecoded)
println()

# ============================================================================
# Example 8: Decoding Options
# ============================================================================
println("Example 8: Decoding Options")
println("-" ^ 60)

toon_with_paths = """
users[3]:
  - id: 1
    name: Alice
  - id: 2
    name: Bob
  - id: 3
    name: Charlie
"""

# Decode without path expansion
toonDecoded_normal = toonDecode(toon_with_paths)
println("Decoded without path expansion:")
println("  ", toonDecoded_normal)
println()

# Decode with path expansion
toonDecode_options = DecodeOptions(expand_paths=:safe)
toonDecoded_expanded = toonDecode(toon_with_paths; options=toonDecode_options)
println("Decoded with path expansion:")
println("  ", toonDecoded_expanded)
println()

# ============================================================================
# Example 9: Complex Real-world Example
# ============================================================================
println("Example 9: Complex Real-world Example")
println("-" ^ 60)

# Simulating a configuration file or API response
config = Dict(
    "api" => Dict(
        "version" => "v1",
        "endpoints" => [
            Dict("path" => "/users", "method" => "GET"),
            Dict("path" => "/users", "method" => "POST"),
            Dict("path" => "/users/:id", "method" => "GET")
        ],
        "rate_limit" => Dict(
            "requests_per_minute" => 100,
            "burst" => 20
        )
    ),
    "database" => Dict(
        "host" => "localhost",
        "port" => 5432,
        "name" => "mydb",
        "ssl" => true
    ),
    "features" => ["authentication", "logging", "caching"]
)

config_toon = toonEncode(config)
println("Configuration toonEncoded to TOON:")
println(config_toon)
println()

# Decode it back
config_toonDecoded = toonDecode(config_toon)
println("Configuration toonDecoded back:")
println("  API Version: ", config_toonDecoded["api"]["version"])
println("  Database Host: ", config_toonDecoded["database"]["host"])
println("  Features: ", config_toonDecoded["features"])
println()

println("=" ^ 60)
println("Examples completed!")
println("=" ^ 60)

