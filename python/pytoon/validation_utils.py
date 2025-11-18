from __future__ import annotations

import re

from pytoon.constants import DEFAULT_DELIMITER, LIST_ITEM_MARKER
from pytoon.literal_utils import is_boolean_or_null_literal

_UNQUOTED_KEY_RE = re.compile(r"^[A-Z_][\w.]*$", re.IGNORECASE)
_IDENTIFIER_SEGMENT_RE = re.compile(r"^[A-Z_]\w*$", re.IGNORECASE)
_NUMERIC_LIKE_RE = re.compile(r"^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$", re.IGNORECASE)
_LEADING_ZERO_RE = re.compile(r"^0\d+$")


def is_valid_unquoted_key(key: str) -> bool:
    return bool(_UNQUOTED_KEY_RE.match(key))


def is_identifier_segment(key: str) -> bool:
    return bool(_IDENTIFIER_SEGMENT_RE.match(key))


def _is_numeric_like(value: str) -> bool:
    return bool(_NUMERIC_LIKE_RE.match(value) or _LEADING_ZERO_RE.match(value))


def is_safe_unquoted(value: str, delimiter: str = DEFAULT_DELIMITER) -> bool:
    if not value or value != value.strip():
        return False
    if is_boolean_or_null_literal(value) or _is_numeric_like(value):
        return False
    if ':' in value or '"' in value or '\\' in value:
        return False
    if any(x in value for x in ['[', ']', '{', '}']):
        return False
    if any(c in value for c in ['\n', '\r', '\t']):
        return False
    if delimiter in value:
        return False
    if value.startswith(LIST_ITEM_MARKER):
        return False
    return True
