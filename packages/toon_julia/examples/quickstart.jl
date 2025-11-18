#!/usr/bin/env julia
# Quick Start Example for Toon.jl
# A simple example to get started with Toon encoding and decoding

# Activate the package environment
using Pkg
Pkg.activate(joinpath(@__DIR__, ".."))
using Toon

# ============================================================================
# Quick Start: Encode a simple dictionary
# ============================================================================
println("Encoding a dictionary to TOON format:")
data = Dict("name" => "Alice", "age" => 30)
toon_output = toonEncode(data)
println(toon_output)
println()

# ============================================================================
# Quick Start: Decode a TOON string
# ============================================================================
println("Decoding a TOON string:")
toon_input = "name: Bob\nage: 25"
toonDecoded = toonDecode(toon_input)
println("Decoded: ", toonDecoded)
println()

# ============================================================================
# Quick Start: Nested structures
# ============================================================================
println("Encoding nested structures:")
nested = Dict(
    "user" => Dict(
        "name" => "Charlie",
        "email" => "charlie@example.com"
    )
)
println(toonEncode(nested))
println()

# ============================================================================
# Quick Start: Arrays
# ============================================================================
println("Encoding arrays:")
with_arrays = Dict(
    "fruits" => ["apple", "banana", "orange"],
    "counts" => [1, 2, 3]
)
println(toonEncode(with_arrays))

