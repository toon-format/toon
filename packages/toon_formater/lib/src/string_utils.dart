import 'constants.dart';

/// Escapes special characters in a string for encoding.
/// Optimized version that scans once instead of multiple replaceAll calls.
String escapeString(String value) {
  final buffer = StringBuffer();
  for (int i = 0; i < value.length; i++) {
    final char = value[i];
    switch (char) {
      case backslash:
        buffer.write('\\');
        buffer.write(backslash);
        break;
      case doubleQuote:
        buffer.write('\\');
        buffer.write(doubleQuote);
        break;
      case newline:
        buffer.write('\\n');
        break;
      case carriageReturn:
        buffer.write('\\r');
        break;
      case tab:
        buffer.write('\\t');
        break;
      default:
        buffer.write(char);
    }
  }
  return buffer.toString();
}

/// Unescapes a string by processing escape sequences.
String unescapeString(String value) {
  final buffer = StringBuffer();
  int i = 0;

  while (i < value.length) {
    if (value[i] == backslash) {
      if (i + 1 >= value.length) {
        throw const FormatException('Invalid escape sequence: backslash at end of string');
      }

      final next = value[i + 1];
      switch (next) {
        case 'n':
          buffer.write(newline);
          i += 2;
          continue;
        case 't':
          buffer.write(tab);
          i += 2;
          continue;
        case 'r':
          buffer.write(carriageReturn);
          i += 2;
          continue;
        case backslash:
          buffer.write(backslash);
          i += 2;
          continue;
        case doubleQuote:
          buffer.write(doubleQuote);
          i += 2;
          continue;
        default:
          throw FormatException('Invalid escape sequence: \\$next');
      }
    }

    buffer.write(value[i]);
    i++;
  }

  return buffer.toString();
}

/// Finds the index of the closing double quote, accounting for escape sequences.
int findClosingQuote(String content, int start) {
  int i = start + 1;
  while (i < content.length) {
    if (content[i] == backslash && i + 1 < content.length) {
      // Skip escaped character
      i += 2;
      continue;
    }
    if (content[i] == doubleQuote) {
      return i;
    }
    i++;
  }
  return -1; // Not found
}

/// Finds the index of a character outside of quoted sections.
int findUnquotedChar(String content, String char, [int start = 0]) {
  bool inQuotes = false;
  int i = start;

  while (i < content.length) {
    if (content[i] == backslash && i + 1 < content.length && inQuotes) {
      // Skip escaped character
      i += 2;
      continue;
    }

    if (content[i] == doubleQuote) {
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (content[i] == char && !inQuotes) {
      return i;
    }

    i++;
  }

  return -1;
}

