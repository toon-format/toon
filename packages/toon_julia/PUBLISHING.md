# Publishing Toon.jl to Julia General Registry

This guide explains how to publish the Toon.jl package to the Julia General Registry.

## Prerequisites

1. **GitHub Repository**: The package must be in a GitHub repository (public)
   - Repository URL: `https://github.com/toon-format/toon_julia`

2. **Julia Registry Account**: You need a GitHub account to submit pull requests to the registry

3. **Package Requirements**:
   - ✅ `Project.toml` with proper UUID, version, and metadata
   - ✅ `LICENSE` file (MIT License)
   - ✅ `README.md` with installation instructions
   - ✅ Tests in `test/` directory
   - ✅ `.gitignore` file

## Current Package Status

- **Name**: Toon
- **UUID**: `616451e9-093a-4ec3-b67a-88f06778d1cb`
- **Version**: 1.0.0
- **License**: MIT
- **Repository**: https://github.com/toon-format/toon_julia
- **Julia Compatibility**: ≥1.6
- **Dependencies**: JSON.jl

## Publishing Steps

### Step 1: Ensure Repository is Public

Make sure your GitHub repository is public and accessible:
```bash
# Verify repository is accessible
curl -I https://github.com/toon-format/toon_julia
```

### Step 2: Install Registrator.jl

The Julia General Registry uses [Registrator.jl](https://github.com/JuliaRegistries/Registrator.jl) for package registration.

**Option A: Using GitHub App (Recommended)**
1. Go to https://github.com/apps/juliaregistrator
2. Click "Configure" and authorize the app
3. Grant access to the `toon-format/toon_julia` repository

**Option B: Using Command Line**
```julia
using Pkg
Pkg.add("Registrator")
```

### Step 3: Register the Package

**Using GitHub App:**
1. Go to your repository: https://github.com/toon-format/toon_julia
2. Create a new release or tag: `v1.0.0`
3. Comment on the release/tag: `@JuliaRegistrator register`
4. The bot will automatically create a pull request to the General Registry

**Using Command Line:**
```julia
using Registrator
Registrator.register("Toon"; repo="https://github.com/toon-format/toon_julia")
```

### Step 4: Review and Merge

1. The Registrator bot will create a pull request to [JuliaRegistries/General](https://github.com/JuliaRegistries/General)
2. Review the PR to ensure all metadata is correct
3. Once approved and merged, your package will be available via:
   ```julia
   using Pkg
   Pkg.add("Toon")
   ```

## Post-Publication

After the package is registered:

1. **Update README.md**: Change installation instructions to use `Pkg.add("Toon")`
2. **Create a Release**: Tag the version on GitHub
3. **Announce**: Share on Julia Discourse, Twitter, etc.

## Useful Links

- [Julia General Registry](https://github.com/JuliaRegistries/General)
- [Registrator.jl Documentation](https://github.com/JuliaRegistries/Registrator.jl)
- [Julia Package Guidelines](https://pkgdocs.julialang.org/v1/creating-packages/)
- [Julia Package Development Guide](https://pkgdocs.julialang.org/v1/)

## Notes

- The package name "Toon" must be unique in the registry
- Version numbers follow semantic versioning (major.minor.patch)
- Each version release requires a new registration
- The registry automatically validates package structure and tests

