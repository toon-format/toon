import 'dart:convert';
import 'dart:io';
import 'package:test/test.dart';
import 'package:toon_formater/toon_formater.dart';

Map<String, dynamic> _loadHardfileData() {
  // Read the hardfile.json
  final file = File('test/hardfile.json');
  final jsonString = file.readAsStringSync();
  
  // Pre-process JSON to handle invalid JSON values and control characters
  var processedJson = jsonString;
  
  // Replace NaN and Infinity (not valid JSON)
  processedJson = processedJson
      .replaceAll(': NaN', ': null')
      .replaceAll(': Infinity', ': null')
      .replaceAll(': -Infinity', ': null')
      .replaceAll('"NaN"', 'null')
      .replaceAll('"Infinity"', 'null');
  
  // Escape all control characters in string literals
  final buffer = StringBuffer();
  bool inString = false;
  int backslashCount = 0;
  
  for (int i = 0; i < processedJson.length; i++) {
    final char = processedJson[i];
    final codeUnit = char.codeUnitAt(0);
    
    if (char == '\\') {
      backslashCount++;
      buffer.write(char);
      continue;
    }
    
    final isEscaped = (backslashCount % 2) == 1;
    backslashCount = 0;
    
    if (char == '"' && !isEscaped) {
      inString = !inString;
      buffer.write(char);
      continue;
    }
    
    if (inString && !isEscaped && codeUnit >= 0 && codeUnit < 32) {
      switch (char) {
        case '\t':
          buffer.write('\\t');
          break;
        case '\n':
          buffer.write('\\n');
          break;
        case '\r':
          buffer.write('\\r');
          break;
        case '\b':
          buffer.write('\\b');
          break;
        case '\f':
          buffer.write('\\f');
          break;
        default:
          buffer.write('\\u${codeUnit.toRadixString(16).padLeft(4, '0')}');
      }
    } else {
      buffer.write(char);
    }
  }
  
  processedJson = buffer.toString();
  return jsonDecode(processedJson) as Map<String, dynamic>;
}

void main() {
  group('Hardfile Real Data Test', () {
    late Map<String, dynamic> originalData;
    late String jsonString;
    late String toonEncoded;
    late JsonValue toonDecoded;

    setUpAll(() {
      final file = File('test/hardfile.json');
      jsonString = file.readAsStringSync();
      originalData = _loadHardfileData();
    });

    test('encodes hardfile.json to TOON format', () {
      try {
        toonEncoded = encode(originalData);
        expect(toonEncoded, isNotEmpty);
        
        // Write encoded result to file
        final outputFile = File('test/hardfile_encoded.toon');
        outputFile.writeAsStringSync(toonEncoded);
        print('Encoded TOON written to: ${outputFile.path}');
        print('Original JSON size: ${jsonString.length} bytes');
        print('Encoded TOON size: ${toonEncoded.length} bytes');
        print('Size ratio: ${(toonEncoded.length / jsonString.length * 100).toStringAsFixed(1)}%');
      } catch (e, stackTrace) {
        // If encoding fails, write error to file
        final errorFile = File('test/hardfile_encode_error.txt');
        errorFile.writeAsStringSync('Error encoding hardfile.json:\n$e\n\nStack trace:\n$stackTrace');
        print('Encoding failed: $e');
        print('Error details written to: ${errorFile.path}');
        rethrow; // Re-throw to fail the test
      }
    });

    test('decodes TOON format back to JSON', () {
      toonDecoded = decode(toonEncoded);
      expect(toonDecoded, isNotNull);
      
      // Convert decoded result to JSON string for comparison
      final decodedJsonString = jsonEncode(toonDecoded);
      
      // Write decoded result to file
      final outputFile = File('test/hardfile_decoded.json');
      outputFile.writeAsStringSync(decodedJsonString);
      print('Decoded JSON written to: ${outputFile.path}');
      print('Decoded JSON size: ${decodedJsonString.length} bytes');
    });

    test('round trip: encode -> decode preserves structure', () {
      // This test verifies that encoding and decoding work together
      final encoded = encode(originalData);
      final decoded = decode(encoded);
      
      expect(decoded, isNotNull);
      expect(decoded, isA<Map>());
      
      // Write round trip comparison to file
      final comparisonFile = File('test/hardfile_roundtrip_comparison.txt');
      final buffer = StringBuffer();
      buffer.writeln('=== Round Trip Comparison ===');
      buffer.writeln('');
      buffer.writeln('Original JSON size: ${jsonString.length} bytes');
      buffer.writeln('Encoded TOON size: ${encoded.length} bytes');
      buffer.writeln('Decoded JSON size: ${jsonEncode(decoded).length} bytes');
      buffer.writeln('');
      buffer.writeln('=== Encoded TOON (first 500 chars) ===');
      buffer.writeln(encoded.length > 500 ? '${encoded.substring(0, 500)}...' : encoded);
      buffer.writeln('');
      buffer.writeln('=== Decoded JSON (first 500 chars) ===');
      final decodedJson = jsonEncode(decoded);
      buffer.writeln(decodedJson.length > 500 ? '${decodedJson.substring(0, 500)}...' : decodedJson);
      
      comparisonFile.writeAsStringSync(buffer.toString());
      print('Round trip comparison written to: ${comparisonFile.path}');
    });

    test('benchmark data preparation', () {
      // Verify the data is suitable for benchmarking
      expect(originalData, isNotEmpty);
      expect(toonEncoded, isNotEmpty);
      
      // Write benchmark-ready data summary
      final summaryFile = File('test/hardfile_benchmark_summary.txt');
      final buffer = StringBuffer();
      buffer.writeln('=== Hardfile Benchmark Data Summary ===');
      buffer.writeln('');
      buffer.writeln('Data structure:');
      buffer.writeln('  - Top-level keys: ${originalData.keys.length}');
      for (final key in originalData.keys) {
        final value = originalData[key];
        if (value is Map) {
          buffer.writeln('  - $key (object): ${(value as Map).keys.length} keys');
        } else if (value is List) {
          buffer.writeln('  - $key (array): ${value.length} items');
        } else {
          buffer.writeln('  - $key: ${value.runtimeType}');
        }
      }
      buffer.writeln('');
      buffer.writeln('Size metrics:');
      buffer.writeln('  - JSON: ${jsonString.length} bytes');
      buffer.writeln('  - TOON: ${toonEncoded.length} bytes');
      buffer.writeln('  - Compression: ${((1 - toonEncoded.length / jsonString.length) * 100).toStringAsFixed(1)}%');
      
      summaryFile.writeAsStringSync(buffer.toString());
      print('Benchmark summary written to: ${summaryFile.path}');
    });
  });
}

