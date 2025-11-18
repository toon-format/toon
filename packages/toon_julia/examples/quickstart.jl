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
# Use JSON.jl to preserve insertion order (matching TypeScript implementation)
using JSON
nested_json = """
{
  "context": {
    "task": "Our favorite hikes together",
    "location": "Boulder",
    "season": "spring_2025"
  },
  "friends": ["ana", "luis", "sam"],
  "hikes": [
    {
      "id": 1,
      "name": "Blue Lake Trail",
      "distanceKm": 7.5,
      "elevationGain": 320,
      "companion": "ana",
      "wasSunny": true
    },
    {
      "id": 2,
      "name": "Ridge Overlook",
      "distanceKm": 9.2,
      "elevationGain": 540,
      "companion": "luis",
      "wasSunny": false
    },
    {
      "id": 3,
      "name": "Wildflower Loop",
      "distanceKm": 5.1,
      "elevationGain": 180,
      "companion": "sam",
      "wasSunny": true
    }
  ]
}
"""
nested = JSON.parse(nested_json)
# JSON.jl preserves insertion order, so we can use default options
# (sort_keys=false) to match TypeScript implementation output
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

