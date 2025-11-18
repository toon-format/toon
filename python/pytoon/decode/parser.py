from __future__ import annotations

from typing import List

from pytoon.constants import (
    BACKSLASH,
    CLOSE_BRACE,
    CLOSE_BRACKET,
    COLON,
    DELIMITERS,
    DOUBLE_QUOTE,
    FALSE_LITERAL,
    NULL_LITERAL,
    OPEN_BRACE,
    OPEN_BRACKET,
    PIPE,
    TAB,
    TRUE_LITERAL,
)
from pytoon.literal_utils import is_boolean_or_null_literal, is_numeric_literal
from pytoon.string_utils import find_closing_quote, find_unquoted_char, unescape_string
from pytoon.types import ArrayHeaderInfo, JsonPrimitive


def parse_array_header_line(content: str, default_delimiter: str) -> tuple[ArrayHeaderInfo, str | None] | None:
    trimmed = content.lstrip()
    bracket_start = -1

    if trimmed.startswith(DOUBLE_QUOTE):
        closing = find_closing_quote(trimmed, 0)
        if closing == -1:
            return None
        after_quote = trimmed[closing + 1:]
        if not after_quote.startswith(OPEN_BRACKET):
            return None
        leading_ws = len(content) - len(trimmed)
        key_end_index = leading_ws + closing + 1
        bracket_start = content.find(OPEN_BRACKET, key_end_index)
    else:
        bracket_start = content.find(OPEN_BRACKET)

    if bracket_start == -1:
        return None

    bracket_end = content.find(CLOSE_BRACKET, bracket_start)
    if bracket_end == -1:
        return None

    colon_index = bracket_end + 1
    brace_end = colon_index

    brace_start = content.find(OPEN_BRACE, bracket_end)
    colon_after_brackets = content.find(COLON, bracket_end)
    if brace_start != -1 and (colon_after_brackets == -1 or brace_start < colon_after_brackets):
        found_brace_end = content.find(CLOSE_BRACE, brace_start)
        if found_brace_end != -1:
            brace_end = found_brace_end + 1

    colon_index = content.find(COLON, max(bracket_end, brace_end))
    if colon_index == -1:
        return None

    key: str | None = None
    if bracket_start > 0:
        raw_key = content[:bracket_start].strip()
        key = parse_string_literal(raw_key) if raw_key.startswith(DOUBLE_QUOTE) else raw_key or None

    after_colon = content[colon_index + 1:].strip() or None
    bracket_content = content[bracket_start + 1: bracket_end]

    try:
        length, delimiter = parse_bracket_segment(bracket_content, default_delimiter)
    except ValueError:
        return None

    fields: list[str] | None = None
    if brace_start != -1 and brace_start < colon_index:
        found_brace_end = content.find(CLOSE_BRACE, brace_start)
        if found_brace_end != -1 and found_brace_end < colon_index:
            fields_content = content[brace_start + 1: found_brace_end]
            raw_fields = parse_delimited_values(fields_content, delimiter)
            fields = [parse_string_literal(field.strip()) for field in raw_fields if field.strip()]

    header = ArrayHeaderInfo(key=key, length=length, delimiter=delimiter, fields=fields)
    return header, after_colon


def parse_bracket_segment(segment: str, default_delimiter: str) -> tuple[int, str]:
    content = segment
    delimiter = default_delimiter

    if content.endswith(TAB):
        delimiter = DELIMITERS['tab']
        content = content[:-1]
    elif content.endswith(PIPE):
        delimiter = DELIMITERS['pipe']
        content = content[:-1]

    try:
        length = int(content)
    except ValueError:
        raise ValueError('Invalid array length')
    if length < 0:
        raise ValueError('Array length must be non-negative')

    return length, delimiter


def parse_delimited_values(content: str, delimiter: str) -> list[str]:
    values: list[str] = []
    current: list[str] = []
    in_quotes = False
    escape_next = False

    for char in content:
        if escape_next:
            current.append(char)
            escape_next = False
            continue
        if char == BACKSLASH and in_quotes:
            current.append(char)
            escape_next = True
            continue
        if char == DOUBLE_QUOTE:
            in_quotes = not in_quotes
            current.append(char)
            continue
        if char == delimiter and not in_quotes:
            values.append(''.join(current).strip())
            current = []
            continue
        current.append(char)

    values.append(''.join(current).strip())
    return values if values != [''] else []


def map_row_values_to_primitives(values: List[str]) -> list[JsonPrimitive]:
    return [parse_primitive_token(value) for value in values]


def parse_primitive_token(token: str) -> JsonPrimitive:
    trimmed = token.strip()
    if not trimmed:
        return ''
    if trimmed.startswith(DOUBLE_QUOTE):
        return parse_string_literal(trimmed)
    if is_boolean_or_null_literal(trimmed):
        if trimmed == TRUE_LITERAL:
            return True
        if trimmed == FALSE_LITERAL:
            return False
        return None
    if is_numeric_literal(trimmed):
        is_float_like = '.' in trimmed or 'e' in trimmed.lower()
        if is_float_like:
            value = float(trimmed)
            return 0 if value == -0.0 else value
        value = int(trimmed)
        if value == 0 and trimmed.startswith('-'):
            return 0
        return value
    return trimmed


def parse_string_literal(token: str) -> str:
    trimmed = token.strip()
    if not trimmed.startswith(DOUBLE_QUOTE):
        return trimmed
    closing = find_closing_quote(trimmed, 0)
    if closing == -1:
        raise SyntaxError('Unterminated string literal')
    if closing != len(trimmed) - 1:
        raise SyntaxError('Unexpected characters after closing quote')
    inner = trimmed[1:closing]
    return unescape_string(inner)


def parse_unquoted_key(content: str, start: int) -> tuple[str, int]:
    pos = start
    while pos < len(content) and content[pos] != COLON:
        pos += 1
    if pos >= len(content) or content[pos] != COLON:
        raise SyntaxError('Missing colon after key')
    key = content[start:pos].strip()
    return key, pos + 1


def parse_quoted_key(content: str, start: int) -> tuple[str, int]:
    closing = find_closing_quote(content, start)
    if closing == -1:
        raise SyntaxError('Unterminated quoted key')
    key = unescape_string(content[start + 1:closing])
    pos = closing + 1
    if pos >= len(content) or content[pos] != COLON:
        raise SyntaxError('Missing colon after key')
    return key, pos + 1


def parse_key_token(content: str, start: int) -> tuple[str, int, bool]:
    if content[start] == DOUBLE_QUOTE:
        key, end = parse_quoted_key(content, start)
        return key, end, True
    key, end = parse_unquoted_key(content, start)
    return key, end, False


def is_array_header_after_hyphen(content: str) -> bool:
    trimmed = content.strip()
    return trimmed.startswith(OPEN_BRACKET) and find_unquoted_char(content, COLON) != -1


def is_object_first_field_after_hyphen(content: str) -> bool:
    return find_unquoted_char(content, COLON) != -1
