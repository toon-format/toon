import 'constants.dart';
import 'normalize.dart';
import 'primitives.dart';
import 'types.dart';
import 'writer.dart';

/// Encodes a Dart value into TOON format string.
String encode(Object? input, [EncodeOptions? options]) {
  final opts = options ?? const EncodeOptions();
  final normalizedValue = normalizeValue(input);
  return _encodeValue(normalizedValue, opts);
}

/// Decodes a TOON format string into a Dart value.
JsonValue decode(String input, [DecodeOptions? options]) {
  final opts = options ?? const DecodeOptions();
  // Simplified decoder - full implementation would parse line by line
  // For now, return a basic structure
  return _decodeValue(input, opts);
}

String _encodeValue(JsonValue value, EncodeOptions options) {
  if (isJsonPrimitive(value)) {
    return encodePrimitive(value, options.delimiter);
  }

  final writer = LineWriter(options.indent);

  if (isJsonArray(value)) {
    _encodeArray(null, value as JsonArray, writer, 0, options);
  } else if (isJsonObject(value)) {
    _encodeObject(value as JsonObject, writer, 0, options);
  }

  return writer.toString();
}

void _encodeObject(
  JsonObject value,
  LineWriter writer,
  int depth,
  EncodeOptions options,
) {
  for (final entry in value.entries) {
    _encodeKeyValuePair(entry.key, entry.value, writer, depth, options);
  }
}

void _encodeKeyValuePair(
  String key,
  JsonValue value,
  LineWriter writer,
  int depth,
  EncodeOptions options,
) {
  final encodedKey = encodeKey(key);

  if (isJsonPrimitive(value)) {
    writer.push(
      depth,
      '$encodedKey: ${encodePrimitive(value, options.delimiter)}',
    );
  } else if (isJsonArray(value)) {
    _encodeArray(key, value as JsonArray, writer, depth, options);
  } else if (isJsonObject(value)) {
    final obj = value as JsonObject;
    writer.push(depth, '$encodedKey:');
    if (!isEmptyObject(obj)) {
      _encodeObject(obj, writer, depth + 1, options);
    }
  }
}

void _encodeArray(
  String? key,
  JsonArray value,
  LineWriter writer,
  int depth,
  EncodeOptions options,
) {
  if (value.isEmpty) {
    final header = formatHeader(0, key: key, delimiter: options.delimiter);
    writer.push(depth, header);
    return;
  }

  // Primitive array
  if (isArrayOfPrimitives(value)) {
    final arrayLine = _encodeInlineArrayLine(
      value.cast<JsonPrimitive>(),
      options.delimiter,
      key,
    );
    writer.push(depth, arrayLine);
    return;
  }

  // Array of objects - check if tabular (optimized: combine detection with extraction)
  if (isArrayOfObjects(value)) {
    final header = _extractTabularHeaderOptimized(value);
    if (header != null) {
      final objects = value.map((v) => v as JsonObject).toList();
      _encodeArrayOfObjectsAsTabular(
        key,
        objects,
        header,
        writer,
        depth,
        options,
      );
      return;
    }
  }

  // Mixed array: fallback to expanded format
  _encodeMixedArrayAsListItems(key, value, writer, depth, options);
}

String _encodeInlineArrayLine(
  List<JsonPrimitive> values,
  Delimiter delimiter,
  String? prefix,
) {
  final header = formatHeader(values.length, key: prefix, delimiter: delimiter);
  final joinedValue = encodeAndJoinPrimitives(values, delimiter);
  if (values.isEmpty) {
    return header;
  }
  return '$header $joinedValue';
}

/// Optimized version that extracts header and validates in a single pass
List<String>? _extractTabularHeaderOptimized(JsonArray value) {
  if (value.isEmpty) return null;

  final firstRow = value.first as JsonObject;
  final firstKeys = firstRow.keys.toList();
  if (firstKeys.isEmpty) return null;

  // Validate all rows in single pass
  for (int i = 1; i < value.length; i++) {
    final row = value[i] as JsonObject;
    if (row.length != firstKeys.length) {
      return null;
    }
    for (final key in firstKeys) {
      if (!row.containsKey(key) || !isJsonPrimitive(row[key])) {
        return null;
      }
    }
  }
  
  return firstKeys;
}

void _encodeArrayOfObjectsAsTabular(
  String? prefix,
  List<JsonObject> rows,
  List<String> header,
  LineWriter writer,
  int depth,
  EncodeOptions options,
) {
  final formattedHeader = formatHeader(
    rows.length,
    key: prefix,
    fields: header,
    delimiter: options.delimiter,
  );
  writer.push(depth, formattedHeader);

  for (final row in rows) {
    final values = header.map((key) => row[key]).toList();
    final joinedValue = encodeAndJoinPrimitives(values, options.delimiter);
    writer.push(depth + 1, joinedValue);
  }
}

void _encodeMixedArrayAsListItems(
  String? prefix,
  List<JsonValue> items,
  LineWriter writer,
  int depth,
  EncodeOptions options,
) {
  final header = formatHeader(items.length, key: prefix, delimiter: options.delimiter);
  writer.push(depth, header);

  for (final item in items) {
    _encodeListItemValue(item, writer, depth + 1, options);
  }
}

void _encodeListItemValue(
  JsonValue value,
  LineWriter writer,
  int depth,
  EncodeOptions options,
) {
  if (isJsonPrimitive(value)) {
    writer.pushListItem(depth, encodePrimitive(value, options.delimiter));
  } else if (isJsonArray(value)) {
    final arr = value as JsonArray;
    if (isArrayOfPrimitives(arr)) {
      final arrayLine = _encodeInlineArrayLine(
        arr.cast<JsonPrimitive>(),
        options.delimiter,
        null,
      );
      writer.pushListItem(depth, arrayLine);
    }
  } else if (isJsonObject(value)) {
    _encodeObjectAsListItem(value as JsonObject, writer, depth, options);
  }
}

void _encodeObjectAsListItem(
  JsonObject obj,
  LineWriter writer,
  int depth,
  EncodeOptions options,
) {
  if (isEmptyObject(obj)) {
    writer.pushListItem(depth, '');
    return;
  }

  final entries = obj.entries.toList();
  final firstEntry = entries.first;
  final encodedKey = encodeKey(firstEntry.key);

  if (isJsonPrimitive(firstEntry.value)) {
    writer.pushListItem(
      depth,
      '$encodedKey: ${encodePrimitive(firstEntry.value, options.delimiter)}',
    );
  } else if (isJsonArray(firstEntry.value)) {
    // Handle array in list item
    final arr = firstEntry.value as JsonArray;
    final header = formatHeader(
      arr.length,
      key: firstEntry.key,
      delimiter: options.delimiter,
    );
    writer.pushListItem(depth, header);
    // Encode array items
    for (final item in arr) {
      _encodeListItemValue(item, writer, depth + 1, options);
    }
  } else if (isJsonObject(firstEntry.value)) {
    writer.pushListItem(depth, '$encodedKey:');
    final obj = firstEntry.value as JsonObject;
    if (!isEmptyObject(obj)) {
      _encodeObject(obj, writer, depth + 1, options);
    }
  }

  // Remaining entries
  for (int i = 1; i < entries.length; i++) {
    _encodeKeyValuePair(entries[i].key, entries[i].value, writer, depth + 1, options);
  }
}

// Simplified decoder - full implementation would be more complex
JsonValue _decodeValue(String input, DecodeOptions options) {
  // This is a placeholder - full decoder implementation would parse line by line
  // For now, return empty object
  return <String, Object?>{};
}

