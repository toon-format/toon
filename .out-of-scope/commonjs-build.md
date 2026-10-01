# CommonJS Build

`@toon-format/toon` and `@toon-format/cli` ship as ESM only. A CommonJS build (`index.cjs`, a `require` export condition) is out of scope.

## Why this is out of scope

ESM-only is deliberate, to move the JS ecosystem forward ([toon#279](https://github.com/toon-format/toon/issues/279#issuecomment-3903810256), [toon#271](https://github.com/toon-format/toon/pull/271#issuecomment-3813078863)). From CommonJS, `require()` the package where Node supports `require(esm)`, or load it with `await import('@toon-format/toon')`. If your setup needs a CJS file, bundle one in your project.

## Prior requests

- toon#279 – missing CJS build
- toon#271 – export CJS along with ESM
- toon#53 – import error when using `encode` from CommonJS
