---
layout: home

hero:
  name: TOON
  text: Token-Oriented Object Notation
  tagline: A compact, human-readable encoding of the JSON data model for LLM prompts.
  image:
    dark: /logo-index-dark.svg
    light: /logo-index-light.svg
    alt: TOON Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Benchmarks
      link: /guide/benchmarks
    - theme: alt
      text: CLI
      link: /cli/
    - theme: alt
      text: Spec v2.0
      link: /reference/spec

features:
  - title: Token-Efficient & Accurate
    icon: 📊
    details: TOON reaches 74% accuracy (vs JSON's 70%) while using ~40% fewer tokens in mixed-structure benchmarks across 4 models.
    link: /guide/benchmarks
  - title: JSON Data Model
    icon: 🔁
    details: Encodes the same objects, arrays, and primitives as JSON with deterministic, lossless round-trips.
    link: /guide/format-overview
  - title: LLM-Friendly Guardrails
    icon: 🛤️
    details: Explicit [N] lengths and {fields} headers give models a clear schema to follow, improving parsing reliability.
    link: /guide/format-overview#arrays
  - title: Minimal Syntax
    icon: 📐
    details: Uses indentation instead of braces and minimizes quoting, giving YAML-like readability with CSV-style compactness.
    link: /guide/format-overview#arrays
  - title: Tabular Arrays
    icon: 🧺
    details: Uniform arrays of objects collapse into tables that declare fields once and stream row values line by line.
    link: /guide/format-overview#arrays
  - title: Multi-Language Ecosystem
    icon: 🌐
    details: Spec-driven implementations in TypeScript, Python, Go, Rust, .NET, and other languages.
    link: /ecosystem/implementations
---
