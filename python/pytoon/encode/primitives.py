from __future__ import annotations

from typing import Iterable, List
import math

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
        return _format_number_js(value)
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


def _format_number_js(value: int | float) -> str:
    """Format numbers like JavaScript `String(number)` for parity.

    - integers (including integer-valued floats) are serialized without a decimal point
    - -0.0 is serialized as '0'
    - 'nan', 'inf' cases are mapped to 'NaN', 'Infinity', '-Infinity'
    - exponent formatting removes zero padding in the exponent to match JS (e.g. e-07 -> e-7)
    """
    # Integers
    if isinstance(value, int):
        return str(value)

    # Floats
    if math.isnan(value):
        return 'NaN'
    if math.isinf(value):
        return 'Infinity' if value > 0 else '-Infinity'

    # Negative zero -> '0'
    if value == 0.0 and math.copysign(1.0, value) < 0:
        return '0'

    # Integer-valued floats -> no decimal
    if value.is_integer():
        return str(int(value))

    # Use Python's str() to get a compact representation then normalize exponent format
    s = str(value)
    # Normalize exponent zero-padding: e.g. 1.23e-07 -> 1.23e-7 and 1.23E+07 -> 1.23e+7
    if 'e' in s or 'E' in s:
        mantissa, sep, exp = s.partition('e' if 'e' in s else 'E')
        # split exp sign and digits
        if exp and (exp[0] == '+' or exp[0] == '-'):
            sign = exp[0]
            digits = exp[1:].lstrip('0')
            if digits == '':
                digits = '0'
            s = f"{mantissa}e{sign}{digits}"
    return s

