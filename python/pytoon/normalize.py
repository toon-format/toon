from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pytoon.types import JsonArray, JsonObject, JsonPrimitive, JsonValue


def normalize_value(value: Any) -> JsonValue:
    if value is None:
        return None
    if isinstance(value, (str, bool)):
        return value
    if isinstance(value, (int, float)):
        if isinstance(value, float):
            if value != value or value in {float('inf'), float('-inf')}:
                return None
            if value == 0.0:
                return 0
        return int(value) if isinstance(value, bool) else value
    if isinstance(value, Decimal):
        if not value.is_finite():
            return None
        if value == value.to_integral_value() and value.as_tuple().exponent >= 0:
            as_int = int(value)
            if -(2**53) < as_int < 2**53:
                return as_int
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, set):
        return [normalize_value(item) for item in value]
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [normalize_value(item) for item in value]
    if isinstance(value, Mapping):
        return {str(key): normalize_value(val) for key, val in value.items()}
    if hasattr(value, '__dict__'):
        return {str(key): normalize_value(val) for key, val in vars(value).items()}
    return None


def is_json_primitive(value: Any) -> bool:
    return value is None or isinstance(value, (str, int, float, bool))


def is_json_array(value: Any) -> bool:
    return isinstance(value, list)


def is_json_object(value: Any) -> bool:
    return isinstance(value, dict)


def is_empty_object(value: JsonObject) -> bool:
    return not value


def is_array_of_primitives(value: JsonArray) -> bool:
    return all(is_json_primitive(item) for item in value)


def is_array_of_arrays(value: JsonArray) -> bool:
    return all(isinstance(item, list) for item in value)


def is_array_of_objects(value: JsonArray) -> bool:
    return all(isinstance(item, dict) for item in value)
