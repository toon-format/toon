from __future__ import annotations

from typing import Iterable, List, Optional, Sequence

from pytoon.constants import DOT, LIST_ITEM_MARKER
from pytoon.encode.folding import try_fold_key_chain
from pytoon.encode.primitives import (
    encode_and_join_primitives,
    encode_inline_array_line,
    encode_key,
    encode_primitive,
    format_header,
)
from pytoon.encode.writer import LineWriter
from pytoon.normalize import (
    is_array_of_arrays,
    is_array_of_objects,
    is_array_of_primitives,
    is_empty_object,
    is_json_array,
    is_json_object,
    is_json_primitive,
)
from pytoon.types import JsonArray, JsonObject, JsonPrimitive, JsonValue, ResolvedEncodeOptions


def encode_value(value: JsonValue, options: ResolvedEncodeOptions) -> str:
    if is_json_primitive(value):
        return encode_primitive(value, options.delimiter)

    writer = LineWriter(options.indent)

    if is_json_array(value):
        encode_array(None, value, writer, 0, options)
    elif is_json_object(value):
        encode_object(value, writer, 0, options)

    return writer.to_string()


def encode_object(
    value: JsonObject,
    writer: LineWriter,
    depth: int,
    options: ResolvedEncodeOptions,
    root_literal_keys: Optional[set[str]] = None,
    path_prefix: str | None = None,
    remaining_depth: Optional[int] = None,
) -> None:
    keys = list(value.keys())
    if depth == 0 and root_literal_keys is None:
        root_literal_keys = {key for key in keys if DOT in key}

    effective_flatten_depth = remaining_depth if remaining_depth is not None else options.flatten_depth

    for key, val in value.items():
        encode_key_value_pair(
            key,
            val,
            writer,
            depth,
            options,
            siblings=keys,
            root_literal_keys=root_literal_keys,
            path_prefix=path_prefix,
            flatten_depth=effective_flatten_depth,
        )


def encode_key_value_pair(
    key: str,
    value: JsonValue,
    writer: LineWriter,
    depth: int,
    options: ResolvedEncodeOptions,
    siblings: Optional[Sequence[str]] = None,
    root_literal_keys: Optional[set[str]] = None,
    path_prefix: str | None = None,
    flatten_depth: Optional[int] = None,
) -> None:
    current_path = f"{path_prefix + DOT if path_prefix else ''}{key}"
    effective_flatten_depth = flatten_depth if flatten_depth is not None else options.flatten_depth

    if options.key_folding == 'safe' and siblings:
        fold_result = try_fold_key_chain(
            key,
            value,
            siblings,
            options,
            root_literal_keys=root_literal_keys,
            path_prefix=path_prefix,
            flatten_depth=effective_flatten_depth,
        )
        if fold_result:
            folded_key = fold_result.folded_key
            encoded_folded_key = encode_key(folded_key)
            if fold_result.remainder is None:
                leaf_value = fold_result.leaf_value
                if is_json_primitive(leaf_value):
                    writer.push(depth, f"{encoded_folded_key}: {encode_primitive(leaf_value, options.delimiter)}")
                    return
                if is_json_array(leaf_value):
                    encode_array(folded_key, leaf_value, writer, depth, options)
                    return
                if is_json_object(leaf_value) and is_empty_object(leaf_value):
                    writer.push(depth, f"{encoded_folded_key}:")
                    return
            if fold_result.remainder is not None and is_json_object(fold_result.remainder):
                writer.push(depth, f"{encoded_folded_key}:")
                remaining_depth = effective_flatten_depth - fold_result.segment_count
                folded_path = f"{path_prefix + DOT if path_prefix else ''}{folded_key}" if path_prefix else folded_key
                encode_object(
                    fold_result.remainder,
                    writer,
                    depth + 1,
                    options,
                    root_literal_keys=root_literal_keys,
                    path_prefix=folded_path,
                    remaining_depth=remaining_depth,
                )
                return

    encoded_key = encode_key(key)
    if is_json_primitive(value):
        writer.push(depth, f"{encoded_key}: {encode_primitive(value, options.delimiter)}")
    elif is_json_array(value):
        encode_array(key, value, writer, depth, options)
    elif is_json_object(value):
        writer.push(depth, f"{encoded_key}:")
        if not is_empty_object(value):
            encode_object(value, writer, depth + 1, options, root_literal_keys, current_path, effective_flatten_depth)


def encode_array(
    key: str | None,
    value: JsonArray,
    writer: LineWriter,
    depth: int,
    options: ResolvedEncodeOptions,
) -> None:
    if not value:
        writer.push(depth, format_header(0, key=key, delimiter=options.delimiter))
        return
    if is_array_of_primitives(value):
        writer.push(depth, encode_inline_array_line(value, options.delimiter, key))
        return
    if is_array_of_arrays(value):
        if all(is_array_of_primitives(item) for item in value):
            encode_array_of_arrays_as_list_items(key, value, writer, depth, options)
            return
    if is_array_of_objects(value):
        header = extract_tabular_header(value)
        if header:
            encode_array_of_objects_as_tabular(key, value, header, writer, depth, options)
        else:
            encode_mixed_array_as_list_items(key, value, writer, depth, options)
        return
    encode_mixed_array_as_list_items(key, value, writer, depth, options)


def encode_array_of_arrays_as_list_items(
    prefix: str | None,
    values: Sequence[JsonArray],
    writer: LineWriter,
    depth: int,
    options: ResolvedEncodeOptions,
) -> None:
    writer.push(depth, format_header(len(values), key=prefix, delimiter=options.delimiter))
    for arr in values:
        if is_array_of_primitives(arr):
            writer.push_list_item(depth + 1, encode_inline_array_line(arr, options.delimiter))



def encode_array_of_objects_as_tabular(
    prefix: str | None,
    rows: Sequence[JsonObject],
    header: Sequence[str],
    writer: LineWriter,
    depth: int,
    options: ResolvedEncodeOptions,
) -> None:
    writer.push(depth, format_header(len(rows), key=prefix, fields=list(header), delimiter=options.delimiter))
    write_tabular_rows(rows, header, writer, depth + 1, options)


def extract_tabular_header(rows: Sequence[JsonObject]) -> list[str] | None:
    if not rows:
        return None
    first_row = rows[0]
    keys = list(first_row.keys())
    if not keys:
        return None
    return keys if is_tabular_array(rows, keys) else None


def is_tabular_array(rows: Sequence[JsonObject], header: Sequence[str]) -> bool:
    for row in rows:
        row_keys = set(row.keys())
        if len(row_keys) != len(header):
            return False
        for key in header:
            if key not in row or not is_json_primitive(row[key]):
                return False
    return True


def write_tabular_rows(
    rows: Sequence[JsonObject],
    header: Sequence[str],
    writer: LineWriter,
    depth: int,
    options: ResolvedEncodeOptions,
) -> None:
    for row in rows:
        values = [row[key] for key in header]
        writer.push(depth, encode_and_join_primitives(values, options.delimiter))


def encode_mixed_array_as_list_items(
    prefix: str | None,
    items: Sequence[JsonValue],
    writer: LineWriter,
    depth: int,
    options: ResolvedEncodeOptions,
) -> None:
    writer.push(depth, format_header(len(items), key=prefix, delimiter=options.delimiter))
    for item in items:
        encode_list_item_value(item, writer, depth + 1, options)


def encode_object_as_list_item(obj: JsonObject, writer: LineWriter, depth: int, options: ResolvedEncodeOptions) -> None:
    if is_empty_object(obj):
        writer.push(depth, LIST_ITEM_MARKER)
        return

    entries = list(obj.items())
    first_key, first_value = entries[0]
    encoded_key = encode_key(first_key)

    if is_json_primitive(first_value):
        writer.push_list_item(depth, f"{encoded_key}: {encode_primitive(first_value, options.delimiter)}")
    elif is_json_array(first_value):
        if is_array_of_primitives(first_value):
            writer.push_list_item(depth, encode_inline_array_line(first_value, options.delimiter, first_key))
        elif is_array_of_objects(first_value):
            header = extract_tabular_header(first_value)
            if header:
                writer.push_list_item(depth, format_header(len(first_value), key=first_key, fields=header, delimiter=options.delimiter))
                write_tabular_rows(first_value, header, writer, depth + 1, options)
            else:
                writer.push_list_item(depth, f"{encoded_key}[{len(first_value)}]:")
                for item in first_value:
                    encode_object_as_list_item(item, writer, depth + 1, options)
        else:
            writer.push_list_item(depth, f"{encoded_key}[{len(first_value)}]:")
            for item in first_value:
                encode_list_item_value(item, writer, depth + 1, options)
    elif is_json_object(first_value):
        writer.push_list_item(depth, f"{encoded_key}:")
        if not is_empty_object(first_value):
            encode_object(first_value, writer, depth + 2, options)

    for key, value in entries[1:]:
        encode_key_value_pair(key, value, writer, depth + 1, options)


def encode_list_item_value(value: JsonValue, writer: LineWriter, depth: int, options: ResolvedEncodeOptions) -> None:
    if is_json_primitive(value):
        writer.push_list_item(depth, encode_primitive(value, options.delimiter))
    elif is_json_array(value) and is_array_of_primitives(value):
        writer.push_list_item(depth, encode_inline_array_line(value, options.delimiter))
    elif is_json_object(value):
        encode_object_as_list_item(value, writer, depth, options)
