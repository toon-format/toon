from __future__ import annotations

from pytoon.constants import BACKSLASH, CARRIAGE_RETURN, DOUBLE_QUOTE, NEWLINE, TAB


def escape_string(value: str) -> str:
    """Escape characters that require quoting in TOON literals."""
    return (
        value.replace(BACKSLASH, BACKSLASH * 2)
        .replace(DOUBLE_QUOTE, f"{BACKSLASH}{DOUBLE_QUOTE}")
        .replace('\n', f"{BACKSLASH}n")
        .replace('\r', f"{BACKSLASH}r")
        .replace('\t', f"{BACKSLASH}t")
    )


def unescape_string(value: str) -> str:
    result: list[str] = []
    i = 0
    length = len(value)
    while i < length:
        char = value[i]
        if char != BACKSLASH:
            result.append(char)
            i += 1
            continue
        if i + 1 >= length:
            raise SyntaxError('Invalid escape sequence: backslash at end of string')
        nxt = value[i + 1]
        if nxt == 'n':
            result.append(NEWLINE)
        elif nxt == 't':
            result.append(TAB)
        elif nxt == 'r':
            result.append(CARRIAGE_RETURN)
        elif nxt == BACKSLASH:
            result.append(BACKSLASH)
        elif nxt == DOUBLE_QUOTE:
            result.append(DOUBLE_QUOTE)
        else:
            raise SyntaxError(f"Invalid escape sequence: \\{nxt}")
        i += 2
    return ''.join(result)


def find_closing_quote(content: str, start: int) -> int:
    i = start + 1
    length = len(content)
    while i < length:
        char = content[i]
        if char == BACKSLASH and i + 1 < length:
            i += 2
            continue
        if char == DOUBLE_QUOTE:
            return i
        i += 1
    return -1


def find_unquoted_char(content: str, target: str, start: int = 0) -> int:
    in_quotes = False
    i = start
    length = len(content)
    while i < length:
        char = content[i]
        if char == BACKSLASH and i + 1 < length and in_quotes:
            i += 2
            continue
        if char == DOUBLE_QUOTE:
            in_quotes = not in_quotes
            i += 1
            continue
        if char == target and not in_quotes:
            return i
        i += 1
    return -1
