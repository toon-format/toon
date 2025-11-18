from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, MutableSequence, Optional, Sequence, TypedDict, Union, Literal

JsonPrimitive = Union[str, int, float, bool, None]
JsonObject = Dict[str, 'JsonValue']
JsonArray = List['JsonValue']
JsonValue = Union[JsonPrimitive, JsonObject, JsonArray]
Depth = int

KeyFolding = Literal['off', 'safe']
ExpandPaths = Literal['off', 'safe']


@dataclass(slots=True)
class EncodeOptions:
    indent: Optional[int] = None
    delimiter: Optional[str] = None
    key_folding: Optional[KeyFolding] = None
    flatten_depth: Optional[int] = None


@dataclass(slots=True)
class ResolvedEncodeOptions:
    indent: int
    delimiter: str
    key_folding: KeyFolding
    flatten_depth: float | int


@dataclass(slots=True)
class DecodeOptions:
    indent: Optional[int] = None
    strict: Optional[bool] = None
    expand_paths: Optional[ExpandPaths] = None


@dataclass(slots=True)
class ResolvedDecodeOptions:
    indent: int
    strict: bool
    expand_paths: ExpandPaths


@dataclass(slots=True)
class ArrayHeaderInfo:
    key: Optional[str]
    length: int
    delimiter: str
    fields: Optional[List[str]] = None


@dataclass(slots=True)
class ParsedLine:
    raw: str
    depth: Depth
    indent: int
    content: str
    line_number: int


@dataclass(slots=True)
class BlankLineInfo:
    line_number: int
    indent: int
    depth: Depth

