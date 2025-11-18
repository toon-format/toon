from __future__ import annotations

from copy import deepcopy
from typing import Dict, List

from pytoon.constants import DOT
from pytoon.normalize import is_json_object
from pytoon.types import JsonObject, JsonValue
from pytoon.validation_utils import is_identifier_segment

QUOTED_KEY_MARKER = object()


def expand_paths_safe(value: JsonValue, strict: bool) -> JsonValue:
    if isinstance(value, list):
        return [expand_paths_safe(item, strict) for item in value]
    if not is_json_object(value):
        return value

    expanded: JsonObject = {}
    quoted_keys = value.pop(QUOTED_KEY_MARKER, None)

    for key, raw_val in value.items():
        if not isinstance(key, str):
            continue
        is_quoted = isinstance(quoted_keys, set) and key in quoted_keys
        if DOT in key and not is_quoted:
            segments = key.split(DOT)
            if all(is_identifier_segment(seg) for seg in segments):
                insert_path_safe(expanded, segments, expand_paths_safe(raw_val, strict), strict)
                continue
        expanded_value = expand_paths_safe(raw_val, strict)
        if key in expanded:
            merge_objects_or_resolve(expanded, key, expanded_value, strict)
        else:
            expanded[key] = expanded_value

    return expanded


def insert_path_safe(target: JsonObject, segments: List[str], value: JsonValue, strict: bool) -> None:
    current = target
    for segment in segments[:-1]:
        existing = current.get(segment)
        if existing is None:
            new_obj: JsonObject = {}
            current[segment] = new_obj
            current = new_obj
        elif is_json_object(existing):
            current = existing
        else:
            if strict:
                raise TypeError(
                    f"Path expansion conflict at segment \"{segment}\": expected object but found {type(existing).__name__}",
                )
            new_obj = {}
            current[segment] = new_obj
            current = new_obj
    last = segments[-1]
    if last in current:
        merge_objects_or_resolve(current, last, value, strict)
    else:
        current[last] = value


def merge_objects_or_resolve(target: JsonObject, key: str, value: JsonValue, strict: bool) -> None:
    existing = target[key]
    if is_json_object(existing) and is_json_object(value):
        merge_objects(existing, value, strict)
    elif strict:
        raise TypeError(
            f"Path expansion conflict at key \"{key}\": cannot merge {type(existing).__name__} with {type(value).__name__}",
        )
    else:
        target[key] = value


def merge_objects(target: JsonObject, source: JsonObject, strict: bool) -> None:
    for key, value in source.items():
        if key in target:
            merge_objects_or_resolve(target, key, value, strict)
        else:
            target[key] = value
