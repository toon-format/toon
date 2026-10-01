# CommonJS Build

`@toon-format/toon` and `@toon-format/cli` ship as ESM only. A CommonJS build (`index.cjs`, a `require` export condition) is out of scope.

## Why this is out of scope

ESM-only is a deliberate choice, not an oversight:

> The packages is intentionally ESM-only to bring the JS ecosystem forward.
> – [toon#279](https://github.com/toon-format/toon/issues/279#issuecomment-3903810256)

From CommonJS, load the package with a dynamic import:

```js
const { encode } = await import('@toon-format/toon')
```

If your setup needs a CJS file, bundle one in your project ([toon#271](https://github.com/toon-format/toon/pull/271#issuecomment-3813078863)).

## Prior requests

- toon#279 – missing CJS build
- toon#271 – export CJS along with ESM
- toon#53 – import error when using `encode` from CommonJS
