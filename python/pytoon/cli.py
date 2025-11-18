from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from pytoon import DecodeOptions, EncodeOptions, decode, encode
from pytoon.constants import DEFAULT_DELIMITER, DELIMITERS
from pytoon.stats import estimate_token_count

DELIMITER_ALIASES = {
    ',': DELIMITERS['comma'],
    'comma': DELIMITERS['comma'],
    '\t': DELIMITERS['tab'],
    'tab': DELIMITERS['tab'],
    '|': DELIMITERS['pipe'],
    'pipe': DELIMITERS['pipe'],
}


@dataclass(slots=True)
class InputSource:
    kind: Literal['stdin', 'file']
    path: Path | None = None


def detect_mode(source: InputSource, encode_flag: bool, decode_flag: bool) -> Literal['encode', 'decode']:
    if encode_flag:
        return 'encode'
    if decode_flag:
        return 'decode'
    if source.kind == 'file' and source.path:
        if source.path.suffix == '.json':
            return 'encode'
        if source.path.suffix == '.toon':
            return 'decode'
    return 'encode'


def read_input(source: InputSource) -> str:
    if source.kind == 'stdin':
        data = sys.stdin.read()
        return data
    assert source.path is not None
    return source.path.read_text(encoding='utf-8')


def format_input_label(source: InputSource) -> str:
    if source.kind == 'stdin':
        return 'stdin'
    assert source.path is not None
    try:
        return str(source.path.relative_to(Path.cwd()))
    except ValueError:
        return str(source.path)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='TOON CLI - Convert between JSON and TOON formats')
    parser.add_argument('input', nargs='?', help='Input file path (omit or use "-" for stdin)')
    parser.add_argument('-o', '--output', help='Output file path')
    parser.add_argument('-e', '--encode', action='store_true', help='Encode JSON to TOON')
    parser.add_argument('-d', '--decode', action='store_true', help='Decode TOON to JSON')
    parser.add_argument('--delimiter', default=',', help='Delimiter for arrays: comma (,), tab (\t), pipe (|)')
    parser.add_argument('--indent', default='2', help='Indentation size (default: 2)')
    parser.add_argument('--strict', action=argparse.BooleanOptionalAction, default=True, help='Strict mode for decoding (default: true)')
    parser.add_argument('--key-folding', default='off', choices=['off', 'safe'], help='Enable key folding')
    parser.add_argument('--flatten-depth', help='Maximum folded segment count when key folding is enabled')
    parser.add_argument('--expand-paths', default='off', choices=['off', 'safe'], help='Enable path expansion when decoding')
    parser.add_argument('--stats', action='store_true', help='Show token statistics')
    return parser.parse_args(argv)


def _parse_indent(value: str) -> int:
    try:
        indent = int(value)
    except ValueError as exc:
        raise ValueError(f'Invalid indent value: {value}') from exc
    if indent < 0:
        raise ValueError('Indent must be non-negative')
    return indent


def _parse_delimiter(value: str) -> str:
    normalized = DELIMITER_ALIASES.get(value, value)
    if normalized not in DELIMITERS.values():
        valid = ', '.join(['comma (,)','tab (\\t)','pipe (|)'])
        raise ValueError(f'Invalid delimiter "{value}". Valid delimiters are: {valid}')
    return normalized


def _parse_flatten_depth(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        depth = int(value)
    except ValueError as exc:
        raise ValueError(f'Invalid flatten depth value: {value}') from exc
    if depth < 0:
        raise ValueError('Flatten depth must be non-negative')
    return depth


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    input_arg = args.input
    if not input_arg or input_arg == '-':
        source = InputSource(kind='stdin')
    else:
        source = InputSource(kind='file', path=Path(input_arg).expanduser().resolve())

    output_path = Path(args.output).expanduser().resolve() if args.output else None

    try:
        indent = _parse_indent(args.indent)
        delimiter = _parse_delimiter(args.delimiter)
        flatten_depth = _parse_flatten_depth(args.flatten_depth)
        strict = args.strict
        expand_paths = args.expand_paths
        mode = detect_mode(source, args.encode, args.decode)

        if mode == 'encode':
            raw = read_input(source)
            data = json.loads(raw)
            encode_options = EncodeOptions(
                indent=indent,
                delimiter=delimiter,
                key_folding=args.key_folding,
                flatten_depth=flatten_depth,
            )
            toon_output = encode(data, encode_options)
            if output_path:
                output_path.write_text(toon_output, encoding='utf-8')
                print(f"Encoded `{format_input_label(source)}` -> `{output_path}`")
            else:
                print(toon_output)

            if args.stats:
                json_tokens = estimate_token_count(raw)
                toon_tokens = estimate_token_count(toon_output)
                diff = json_tokens - toon_tokens
                percent = (diff / json_tokens * 100) if json_tokens else 0
                print()
                print(f"Token estimates: ~{json_tokens} (JSON) -> ~{toon_tokens} (TOON)")
                print(f"Saved ~{diff} tokens ({percent:.1f}%)")
        else:
            toon_source = read_input(source)
            decode_options = DecodeOptions(indent=indent, strict=strict, expand_paths=expand_paths)
            data = decode(toon_source, decode_options)
            json_output = json.dumps(data, indent=indent, ensure_ascii=False)
            if output_path:
                output_path.write_text(json_output, encoding='utf-8')
                print(f"Decoded `{format_input_label(source)}` -> `{output_path}`")
            else:
                print(json_output)

    except Exception as exc:  # noqa: BLE001
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
