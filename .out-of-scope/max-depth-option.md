# Nesting Depth Limit

`@toon-format/toon` has no `maxDepth` option for encode, decode, or the CLI.

## Why this is out of scope

The spec places no limit on nesting depth and lets decoders impose a documented one (§15) – the TypeScript reference doesn't. A limit tested in toon#317 didn't do what it promised:

> The default limit of 1000 doesn't prevent the crash it targets (deeply nested arrays overflow the native stack before the guard fires), and it breaks deep documents that decode fine on v2.3.x.
> – [toon#317](https://github.com/toon-format/toon/pull/317#issuecomment-4984641019)

A working guard would still be public API across encode, decode, streaming decode, and the CLI. TOON keeps that surface small, and for pathologically nested input the reference accepts a stack overflow.

If you decode untrusted input, bound its size before calling `decode`. Ports decide this for their own host – toon-swift ships `maxDepth` in its encoder and decoder limits.

## Prior requests

- toon#317 – limit nesting depth for encode and decode
