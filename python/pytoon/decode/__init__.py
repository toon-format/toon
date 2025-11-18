from __future__ import annotations

from typing import Any

from pytoon.decode.decoders import decode_value_from_lines
from pytoon.decode.expand import QUOTED_KEY_MARKER, expand_paths_safe
from pytoon.decode.scanner import LineCursor, to_parsed_lines
from pytoon.types import DecodeOptions, ResolvedDecodeOptions


def resolve_decode_options(options: DecodeOptions | None = None) -> ResolvedDecodeOptions:
    opts = options or DecodeOptions()
    indent = opts.indent if opts.indent is not None else 2
    strict = True if opts.strict is None else opts.strict
    expand_paths = opts.expand_paths if opts.expand_paths is not None else 'off'
    return ResolvedDecodeOptions(indent=indent, strict=strict, expand_paths=expand_paths)


def decode(source: str, options: DecodeOptions | None = None) -> Any:
    resolved = resolve_decode_options(options)
    lines, blanks = to_parsed_lines(source, resolved.indent, resolved.strict)
    cursor = LineCursor(lines, blanks)
    value = decode_value_from_lines(cursor, resolved)
    if resolved.expand_paths == 'safe':
        value = expand_paths_safe(value, resolved.strict)
    return _strip_metadata(value)


def _strip_metadata(value: Any) -> Any:
    if isinstance(value, list):
        return [_strip_metadata(item) for item in value]
    if isinstance(value, dict):
        value.pop(QUOTED_KEY_MARKER, None)
        for key, child in list(value.items()):
            if isinstance(key, str):
                value[key] = _strip_metadata(child)
        return value
    return value
