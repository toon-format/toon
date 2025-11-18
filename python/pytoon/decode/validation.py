from __future__ import annotations

from pytoon.constants import COLON, LIST_ITEM_PREFIX
from pytoon.types import ArrayHeaderInfo, BlankLineInfo, Depth, ResolvedDecodeOptions
from pytoon.decode.scanner import LineCursor


class RangeError(ValueError):
    """Mirror the JS RangeError semantics."""
    pass


def assert_expected_count(actual: int, expected: int, item_type: str, options: ResolvedDecodeOptions) -> None:
    if options.strict and actual != expected:
        raise RangeError(f"Expected {expected} {item_type}, but got {actual}")


def validate_no_extra_list_items(cursor: LineCursor, item_depth: Depth, expected_count: int) -> None:
    next_line = cursor.peek()
    if next_line and next_line.depth == item_depth and next_line.content.startswith(LIST_ITEM_PREFIX):
        raise RangeError(f"Expected {expected_count} list array items, but found more")


def validate_no_extra_tabular_rows(cursor: LineCursor, row_depth: Depth, header: ArrayHeaderInfo) -> None:
    next_line = cursor.peek()
    if next_line and next_line.depth == row_depth and not next_line.content.startswith(LIST_ITEM_PREFIX):
        if _is_data_row(next_line.content, header.delimiter):
            raise RangeError(f"Expected {header.length} tabular rows, but found more")


def validate_no_blank_lines_in_range(
    start_line: int,
    end_line: int,
    blank_lines: list[BlankLineInfo],
    strict: bool,
    context: str,
) -> None:
    if not strict:
        return
    for blank in blank_lines:
        if start_line < blank.line_number < end_line:
            raise SyntaxError(
                f"Line {blank.line_number}: Blank lines inside {context} are not allowed in strict mode",
            )


def _is_data_row(content: str, delimiter: str) -> bool:
    colon_pos = content.find(COLON)
    delimiter_pos = content.find(delimiter)
    if colon_pos == -1:
        return True
    if delimiter_pos != -1 and delimiter_pos < colon_pos:
        return True
    return False
