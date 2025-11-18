# pytoon

Pure-Python implementation of the Token-Oriented Object Notation (TOON) encoder/decoder. Provides both a library API and a CLI that mirror the TypeScript reference implementation.

## Installation

```bash
cd python
pip install .
```

> Tip: use `pip install -e .` for editable installs during development.

## CLI usage

```bash
toon input.json --encode --stats
toon data.toon --decode --indent 4 --expand-paths safe
```

- Input defaults to stdin (pass `-`).
- Outputs to stdout unless `-o/--output` is provided.
- Delimiters: `,`, `\t`, `|` (or the words `comma`, `tab`, `pipe`).

Run `toon --help` for the complete flag list.

## Library API

```python
from pytoon import encode, decode, EncodeOptions, DecodeOptions

toon_text = encode(data, EncodeOptions(indent=2, key_folding='safe'))
restored = decode(toon_text, DecodeOptions(expand_paths='safe'))
```

See the root `README.md` for background on the TOON format itself.

## Tests

```bash
cd python
pip install .[test]
pytest
```
