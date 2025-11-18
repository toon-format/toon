from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional

from pytoon.constants import DOT
from pytoon.normalize import is_empty_object, is_json_object
from pytoon.types import JsonValue, ResolvedEncodeOptions
from pytoon.validation_utils import is_identifier_segment


@dataclass(slots=True)
class FoldResult:
    folded_key: str
    remainder: JsonValue | None
    leaf_value: JsonValue
    segment_count: int


def try_fold_key_chain(
    key: str,
    value: JsonValue,
    siblings: Iterable[str],
    options: ResolvedEncodeOptions,
    root_literal_keys: Optional[set[str]] = None,
    path_prefix: str | None = None,
    flatten_depth: float | int | None = None,
) -> FoldResult | None:
    if options.key_folding != 'safe' or not is_json_object(value):
        return None

    effective_depth = flatten_depth if flatten_depth is not None else options.flatten_depth
    segments, tail, leaf_value = _collect_single_key_chain(key, value, effective_depth)
    if len(segments) < 2 or not all(is_identifier_segment(seg) for seg in segments):
        return None

    folded_key = DOT.join(segments)
    absolute_path = f"{path_prefix + DOT if path_prefix else ''}{folded_key}"

    if folded_key in siblings:
        return None
    if root_literal_keys and absolute_path in root_literal_keys:
        return None

    return FoldResult(
        folded_key=folded_key,
        remainder=tail,
        leaf_value=leaf_value,
        segment_count=len(segments),
    )


def _collect_single_key_chain(
    start_key: str,
    start_value: JsonValue,
    max_depth: float | int,
) -> tuple[list[str], JsonValue | None, JsonValue]:
    segments = [start_key]
    current = start_value

    while len(segments) < max_depth:
        if not is_json_object(current):
            break
        keys = list(current.keys())
        if len(keys) != 1:
            break
        next_key = keys[0]
        segments.append(next_key)
        current = current[next_key]

    if not is_json_object(current) or is_empty_object(current):
        return segments, None, current

    return segments, current, current
