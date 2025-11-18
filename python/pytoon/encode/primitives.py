from __future__ import annotations

from typing import Iterable, List

from pytoon.constants import COMMA, DEFAULT_DELIMITER, NULL_LITERAL
from pytoon.string_utils import escape_string
from pytoon.types import JsonPrimitive
from pytoon.validation_utils import is_safe_unquoted, is_valid_unquoted_key


def encode_primitive(value: JsonPrimitive, delimiter: str = DEFAULT_DELIMITER) -> str:
    if value is None:
        return NULL_LITERAL
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (int, float)):
        if isinstance(value, float) and value == 0.0:
            return '0'
        return format(value, 'g')
    return encode_string_literal(str(value), delimiter)


def encode_string_literal(value: str, delimiter: str = DEFAULT_DELIMITER) -> str:
    if is_safe_unquoted(value, delimiter):
        return value
    return f'"{escape_string(value)}"'


def encode_key(key: str) -> str:
    if is_valid_unquoted_key(key):
        return key
    return f'"{escape_string(key)}"'


def encode_and_join_primitives(values: Iterable[JsonPrimitive], delimiter: str = DEFAULT_DELIMITER) -> str:
    return delimiter.join(encode_primitive(v, delimiter) for v in values)


def format_header(length: int, *, key: str | None = None, fields: List[str] | None = None, delimiter: str = DEFAULT_DELIMITER) -> str:
    parts: list[str] = []
    if key:
        parts.append(encode_key(key))
    delimiter_suffix = delimiter if delimiter != DEFAULT_DELIMITER else ''
    parts.append(f'[{length}{delimiter_suffix}]')
    if fields:
        quoted_fields = delimiter.join(encode_key(field) for field in fields)
        parts.append(f'{{{quoted_fields}}}')
    parts.append(':')
    return ''.join(parts)


def encode_inline_array_line(values: Iterable[JsonPrimitive], delimiter: str, prefix: str | None = None) -> str:
    value_list = list(values)
    header = format_header(len(value_list), key=prefix, delimiter=delimiter)
    if not value_list:
        return header
    return f"{header} {encode_and_join_primitives(value_list, delimiter)}"

