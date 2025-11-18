from __future__ import annotations

from pytoon.constants import FALSE_LITERAL, NULL_LITERAL, TRUE_LITERAL


def is_boolean_or_null_literal(token: str) -> bool:
    return token in {TRUE_LITERAL, FALSE_LITERAL, NULL_LITERAL}


def is_numeric_literal(token: str) -> bool:
    if not token:
        return False
    if len(token) > 1 and token[0] == '0' and token[1] != '.':
        return False
    try:
        value = float(token)
    except ValueError:
        return False
    return value == value and value not in {float('inf'), float('-inf')}
