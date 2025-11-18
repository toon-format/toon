from __future__ import annotations

from dataclasses import dataclass
from typing import List

from pytoon.constants import SPACE, TAB
from pytoon.types import BlankLineInfo, Depth, ParsedLine


class LineCursor:
    def __init__(self, lines: List[ParsedLine], blank_lines: List[BlankLineInfo] | None = None) -> None:
        self._lines = lines
        self._blank_lines = blank_lines or []
        self._index = 0

    def peek(self) -> ParsedLine | None:
        return self._lines[self._index] if self._index < len(self._lines) else None

    def next(self) -> ParsedLine | None:
        if self._index >= len(self._lines):
            return None
        line = self._lines[self._index]
        self._index += 1
        return line

    def current(self) -> ParsedLine | None:
        return self._lines[self._index - 1] if self._index > 0 else None

    def advance(self) -> None:
        self._index += 1

    def at_end(self) -> bool:
        return self._index >= len(self._lines)

    def peek_at_depth(self, depth: Depth) -> ParsedLine | None:
        line = self.peek()
        return line if line and line.depth == depth else None

    def get_blank_lines(self) -> List[BlankLineInfo]:
        return self._blank_lines

    @property
    def length(self) -> int:
        return len(self._lines)


def to_parsed_lines(source: str, indent_size: int, strict: bool) -> tuple[list[ParsedLine], list[BlankLineInfo]]:
    if not source.strip():
        return [], []

    parsed: list[ParsedLine] = []
    blanks: list[BlankLineInfo] = []

    for index, raw in enumerate(source.split('\n')):
        line_number = index + 1
        indent = 0
        while indent < len(raw) and raw[indent] == SPACE:
            indent += 1

        content = raw[indent:]

        if not content.strip():
            depth = indent // indent_size if indent_size else 0
            blanks.append(BlankLineInfo(line_number=line_number, indent=indent, depth=depth))
            continue

        if strict:
            leading_ws = ''
            for ch in raw:
                if ch in (SPACE, TAB):
                    leading_ws += ch
                else:
                    break
            if TAB in leading_ws:
                raise SyntaxError(f"Line {line_number}: Tabs are not allowed in indentation in strict mode")
            if indent_size and indent % indent_size != 0:
                raise SyntaxError(
                    f"Line {line_number}: Indentation must be exact multiple of {indent_size}, but found {indent} spaces",
                )

        depth = indent // indent_size if indent_size else 0
        parsed.append(ParsedLine(raw=raw, indent=indent, content=content, depth=depth, line_number=line_number))

    return parsed, blanks
