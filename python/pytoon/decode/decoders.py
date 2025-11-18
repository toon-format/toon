from __future__ import annotations

from typing import List

from pytoon.constants import COLON, DEFAULT_DELIMITER, DOT, LIST_ITEM_PREFIX
from pytoon.decode.expand import QUOTED_KEY_MARKER
from pytoon.decode.parser import (
    is_array_header_after_hyphen,
    is_object_first_field_after_hyphen,
    map_row_values_to_primitives,
    parse_array_header_line,
    parse_delimited_values,
    parse_key_token,
    parse_primitive_token,
)
from pytoon.decode.scanner import LineCursor
from pytoon.decode.validation import (
    RangeError,
    assert_expected_count,
    validate_no_blank_lines_in_range,
    validate_no_extra_list_items,
    validate_no_extra_tabular_rows,
)
from pytoon.string_utils import find_closing_quote
from pytoon.types import ArrayHeaderInfo, Depth, JsonArray, JsonObject, JsonPrimitive, JsonValue, ParsedLine, ResolvedDecodeOptions


def decode_value_from_lines(cursor: LineCursor, options: ResolvedDecodeOptions) -> JsonValue:
    first = cursor.peek()
    if first is None:
        raise ReferenceError('No content to decode')

    if is_array_header_after_hyphen(first.content):
        header_info = parse_array_header_line(first.content, DEFAULT_DELIMITER)
        if header_info:
            header, inline_values = header_info
            cursor.advance()
            return decode_array_from_header(header, inline_values, cursor, 0, options)

    if cursor.length == 1 and not _is_key_value_line(first):
        return parse_primitive_token(first.content.strip())

    return _decode_object(cursor, 0, options)


def _is_key_value_line(line: ParsedLine) -> bool:
    content = line.content
    if content.startswith('"'):
        closing = find_closing_quote(content, 0)
        if closing == -1:
            return False
        return COLON in content[closing + 1:]
    return COLON in content


def _decode_object(cursor: LineCursor, base_depth: Depth, options: ResolvedDecodeOptions) -> JsonObject:
    obj: JsonObject = {}
    quoted_keys: set[str] = set()
    computed_depth: Depth | None = None

    while not cursor.at_end():
        line = cursor.peek()
        if not line or line.depth < base_depth:
            break
        if computed_depth is None and line.depth >= base_depth:
            computed_depth = line.depth
        if line.depth == computed_depth:
            cursor.advance()
            key, value, _, is_quoted = _decode_key_value(line.content, cursor, computed_depth, options)
            obj[key] = value
            if is_quoted and DOT in key:
                quoted_keys.add(key)
        else:
            break

    if quoted_keys:
        obj[QUOTED_KEY_MARKER] = quoted_keys

    return obj


def _decode_key_value(
    content: str,
    cursor: LineCursor,
    base_depth: Depth,
    options: ResolvedDecodeOptions,
) -> tuple[str, JsonValue, Depth, bool]:
    header_info = parse_array_header_line(content, DEFAULT_DELIMITER)
    if header_info and header_info[0].key:
        header, inline_values = header_info
        decoded = decode_array_from_header(header, inline_values, cursor, base_depth, options)
        return header.key or '', decoded, base_depth + 1, False

    key, end, is_quoted = parse_key_token(content, 0)
    rest = content[end:].strip()

    if not rest:
        next_line = cursor.peek()
        if next_line and next_line.depth > base_depth:
            nested = _decode_object(cursor, base_depth + 1, options)
            return key, nested, base_depth + 1, is_quoted
        return key, {}, base_depth + 1, is_quoted

    return key, parse_primitive_token(rest), base_depth + 1, is_quoted


def decode_array_from_header(
    header: ArrayHeaderInfo,
    inline_values: str | None,
    cursor: LineCursor,
    base_depth: Depth,
    options: ResolvedDecodeOptions,
) -> JsonArray:
    if inline_values is not None:
        return _decode_inline_primitive_array(header, inline_values, options)
    if header.fields:
        return _decode_tabular_array(header, cursor, base_depth, options)
    return _decode_list_array(header, cursor, base_depth, options)


def _decode_inline_primitive_array(
    header: ArrayHeaderInfo,
    inline_values: str,
    options: ResolvedDecodeOptions,
) -> list[JsonPrimitive]:
    if not inline_values.strip():
        assert_expected_count(0, header.length, 'inline array items', options)
        return []
    values = parse_delimited_values(inline_values, header.delimiter)
    primitives = map_row_values_to_primitives(values)
    assert_expected_count(len(primitives), header.length, 'inline array items', options)
    return primitives


def _decode_list_array(
    header: ArrayHeaderInfo,
    cursor: LineCursor,
    base_depth: Depth,
    options: ResolvedDecodeOptions,
) -> JsonArray:
    items: list[JsonValue] = []
    item_depth = base_depth + 1
    start_line: int | None = None
    end_line: int | None = None

    while not cursor.at_end() and len(items) < header.length:
        line = cursor.peek()
        if not line or line.depth < item_depth:
            break
        is_list_item = line.content.startswith(LIST_ITEM_PREFIX) or line.content == '-'
        if line.depth == item_depth and is_list_item:
            if start_line is None:
                start_line = line.line_number
            end_line = line.line_number
            item = _decode_list_item(cursor, item_depth, options)
            items.append(item)
            current_line = cursor.current()
            if current_line:
                end_line = current_line.line_number
        else:
            break

    assert_expected_count(len(items), header.length, 'list array items', options)

    if options.strict and start_line is not None and end_line is not None:
        validate_no_blank_lines_in_range(start_line, end_line, cursor.get_blank_lines(), options.strict, 'list array')

    if options.strict:
        validate_no_extra_list_items(cursor, item_depth, header.length)

    return items


def _decode_tabular_array(
    header: ArrayHeaderInfo,
    cursor: LineCursor,
    base_depth: Depth,
    options: ResolvedDecodeOptions,
) -> list[JsonObject]:
    objects: list[JsonObject] = []
    row_depth = base_depth + 1
    start_line: int | None = None
    end_line: int | None = None

    while not cursor.at_end() and len(objects) < header.length:
        line = cursor.peek()
        if not line or line.depth < row_depth:
            break
        if line.depth == row_depth:
            if start_line is None:
                start_line = line.line_number
            end_line = line.line_number
            cursor.advance()
            values = parse_delimited_values(line.content, header.delimiter)
            assert_expected_count(len(values), len(header.fields or []), 'tabular row values', options)
            primitives = map_row_values_to_primitives(values)
            obj: JsonObject = {}
            for idx, field in enumerate(header.fields or []):
                obj[field] = primitives[idx]
            objects.append(obj)
        else:
            break

    assert_expected_count(len(objects), header.length, 'tabular rows', options)

    if options.strict and start_line is not None and end_line is not None:
        validate_no_blank_lines_in_range(start_line, end_line, cursor.get_blank_lines(), options.strict, 'tabular array')

    if options.strict:
        validate_no_extra_tabular_rows(cursor, row_depth, header)

    return objects


def _decode_list_item(cursor: LineCursor, base_depth: Depth, options: ResolvedDecodeOptions) -> JsonValue:
    line = cursor.next()
    if line is None:
        raise ReferenceError('Expected list item')

    if line.content == '-':
        return {}
    if line.content.startswith(LIST_ITEM_PREFIX):
        after_hyphen = line.content[len(LIST_ITEM_PREFIX):]
    else:
        raise SyntaxError(f'Expected list item to start with "{LIST_ITEM_PREFIX}"')

    if not after_hyphen.strip():
        return {}

    if is_array_header_after_hyphen(after_hyphen):
        header_info = parse_array_header_line(after_hyphen, DEFAULT_DELIMITER)
        if header_info:
            header, inline_values = header_info
            return decode_array_from_header(header, inline_values, cursor, base_depth, options)

    if is_object_first_field_after_hyphen(after_hyphen):
        return _decode_object_from_list_item(line, cursor, base_depth, options)

    return parse_primitive_token(after_hyphen)


def _decode_object_from_list_item(
    first_line: ParsedLine,
    cursor: LineCursor,
    base_depth: Depth,
    options: ResolvedDecodeOptions,
) -> JsonObject:
    after_hyphen = first_line.content[len(LIST_ITEM_PREFIX):]
    key, value, follow_depth, is_quoted = _decode_key_value(after_hyphen, cursor, base_depth, options)
    obj: JsonObject = {key: value}
    quoted_keys: set[str] = set()
    if is_quoted and DOT in key:
        quoted_keys.add(key)

    while not cursor.at_end():
        line = cursor.peek()
        if not line or line.depth < follow_depth:
            break
        if line.depth == follow_depth and not line.content.startswith(LIST_ITEM_PREFIX):
            cursor.advance()
            k, v, _, k_is_quoted = _decode_key_value(line.content, cursor, follow_depth, options)
            obj[k] = v
            if k_is_quoted and DOT in k:
                quoted_keys.add(k)
        else:
            break

    if quoted_keys:
        obj[QUOTED_KEY_MARKER] = quoted_keys

    return obj
