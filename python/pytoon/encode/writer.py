from __future__ import annotations

from pytoon.types import Depth


class LineWriter:
    __slots__ = ('_lines', '_indent_unit')

    def __init__(self, indent_size: int) -> None:
        self._lines: list[str] = []
        self._indent_unit = ' ' * indent_size

    def push(self, depth: Depth, content: str) -> None:
        self._lines.append(f"{self._indent_unit * depth}{content}")

    def push_list_item(self, depth: Depth, content: str) -> None:
        from pytoon.constants import LIST_ITEM_PREFIX  # local import to avoid cycles

        self.push(depth, f"{LIST_ITEM_PREFIX}{content}")

    def to_string(self) -> str:
        return '\n'.join(self._lines)
