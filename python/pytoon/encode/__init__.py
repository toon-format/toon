from __future__ import annotations

from dataclasses import asdict
from math import inf
from typing import Any

from pytoon.constants import DEFAULT_DELIMITER
from pytoon.encode.core import encode_value as _encode_value
from pytoon.normalize import normalize_value
from pytoon.types import EncodeOptions, ResolvedEncodeOptions


def resolve_encode_options(options: EncodeOptions | None = None) -> ResolvedEncodeOptions:
    opts = options or EncodeOptions()
    indent = opts.indent if opts.indent is not None else 2
    delimiter = opts.delimiter if opts.delimiter is not None else DEFAULT_DELIMITER
    key_folding = opts.key_folding if opts.key_folding is not None else 'off'
    flatten_depth = opts.flatten_depth if opts.flatten_depth is not None else inf
    return ResolvedEncodeOptions(indent=indent, delimiter=delimiter, key_folding=key_folding, flatten_depth=flatten_depth)


def encode(value: Any, options: EncodeOptions | None = None) -> str:
    normalized = normalize_value(value)
    resolved = resolve_encode_options(options)
    return _encode_value(normalized, resolved)
