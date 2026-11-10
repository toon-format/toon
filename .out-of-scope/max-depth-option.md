# Nesting Depth Limit

`@toon-format/toon` has no `maxDepth` option for encode, decode, or the CLI.

## Why this is out of scope

A depth option is public API every port would have to mirror, and TOON keeps that surface minimal – for pathologically nested input, the reference accepts a crash ([toon#317](https://github.com/toon-format/toon/pull/317#issuecomment-4984641019)). The spec places no limit on nesting depth and lets each decoder impose a documented one (§15), so ports decide this for their own host.

## Prior requests

- toon#317 – limit nesting depth for encode and decode
