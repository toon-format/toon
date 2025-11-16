import 'dart:convert';
import 'package:benchmark_harness/benchmark_harness.dart';
import 'package:toon_formater/toon_formater.dart';

/// Benchmark comparing JSON encoding vs Toon encoding
class JsonEncodeBenchmark extends BenchmarkBase {
  final Map<String, dynamic> _data;

  JsonEncodeBenchmark(this._data) : super('JSON Encode');

  @override
  void run() {
    jsonEncode(_data);
  }
}

class ToonEncodeBenchmark extends BenchmarkBase {
  final Map<String, dynamic> _data;

  ToonEncodeBenchmark(this._data) : super('Toon Encode');

  @override
  void run() {
    encode(_data);
  }
}

/// Benchmark comparing JSON decoding vs Toon decoding
class JsonDecodeBenchmark extends BenchmarkBase {
  final String _jsonString;

  JsonDecodeBenchmark(this._jsonString) : super('JSON Decode');

  @override
  void run() {
    jsonDecode(_jsonString);
  }
}

class ToonDecodeBenchmark extends BenchmarkBase {
  final String _toonString;

  ToonDecodeBenchmark(this._toonString) : super('Toon Decode');

  @override
  void run() {
    decode(_toonString);
  }
}

/// Benchmark comparing JSON encode+decode vs Toon encode+decode
class JsonRoundTripBenchmark extends BenchmarkBase {
  final Map<String, dynamic> _data;

  JsonRoundTripBenchmark(this._data) : super('JSON Round Trip');

  @override
  void run() {
    final encoded = jsonEncode(_data);
    jsonDecode(encoded);
  }
}

class ToonRoundTripBenchmark extends BenchmarkBase {
  final Map<String, dynamic> _data;

  ToonRoundTripBenchmark(this._data) : super('Toon Round Trip');

  @override
  void run() {
    final encoded = encode(_data);
    decode(encoded);
  }
}

void main() {
  final separator = List.filled(60, '=').join('');
  print(separator);
  print('JSON vs Toon Benchmark');
  print(separator);

  // Small data benchmark
  final smallData = {
    'name': 'Alice',
    'age': 30,
    'email': 'alice@example.com',
  };

  print('\n--- Small Data (3 fields) ---');
  final smallJsonString = jsonEncode(smallData);
  final smallToonString = encode(smallData);

  print('JSON size: ${smallJsonString.length} bytes');
  print('Toon size: ${smallToonString.length} bytes');
  print('Size ratio: ${(smallToonString.length / smallJsonString.length * 100).toStringAsFixed(1)}%');

  JsonEncodeBenchmark(smallData).report();
  ToonEncodeBenchmark(smallData).report();
  print('');
  JsonDecodeBenchmark(smallJsonString).report();
  ToonDecodeBenchmark(smallToonString).report();
  print('');
  JsonRoundTripBenchmark(smallData).report();
  ToonRoundTripBenchmark(smallData).report();

  // Medium data benchmark
  final mediumData = {
    'users': List.generate(10, (i) => {
      'id': i,
      'name': 'User $i',
      'age': 20 + i,
      'email': 'user$i@example.com',
      'active': i % 2 == 0,
    }),
    'metadata': {
      'total': 10,
      'page': 1,
      'perPage': 10,
    },
  };

  print('\n--- Medium Data (10 users + metadata) ---');
  final mediumJsonString = jsonEncode(mediumData);
  final mediumToonString = encode(mediumData);

  print('JSON size: ${mediumJsonString.length} bytes');
  print('Toon size: ${mediumToonString.length} bytes');
  print('Size ratio: ${(mediumToonString.length / mediumJsonString.length * 100).toStringAsFixed(1)}%');

  JsonEncodeBenchmark(mediumData).report();
  ToonEncodeBenchmark(mediumData).report();
  print('');
  JsonDecodeBenchmark(mediumJsonString).report();
  ToonDecodeBenchmark(mediumToonString).report();
  print('');
  JsonRoundTripBenchmark(mediumData).report();
  ToonRoundTripBenchmark(mediumData).report();

  // Large data benchmark
  final largeData = {
    'products': List.generate(100, (i) => {
      'id': i,
      'name': 'Product $i',
      'price': 9.99 + i * 0.1,
      'description': 'This is a detailed description for product $i',
      'category': 'Category ${i % 5}',
      'inStock': i % 3 != 0,
      'tags': List.generate(5, (j) => 'tag${i}_$j'),
      'reviews': List.generate(3, (j) => {
        'rating': 3 + (i + j) % 3,
        'comment': 'Review $j for product $i',
      }),
    }),
    'summary': {
      'total': 100,
      'averagePrice': 14.99,
      'categories': List.generate(5, (i) => 'Category $i'),
    },
  };

  print('\n--- Large Data (100 products with nested data) ---');
  final largeJsonString = jsonEncode(largeData);
  final largeToonString = encode(largeData);

  print('JSON size: ${largeJsonString.length} bytes');
  print('Toon size: ${largeToonString.length} bytes');
  print('Size ratio: ${(largeToonString.length / largeJsonString.length * 100).toStringAsFixed(1)}%');

  JsonEncodeBenchmark(largeData).report();
  ToonEncodeBenchmark(largeData).report();
  print('');
  JsonDecodeBenchmark(largeJsonString).report();
  ToonDecodeBenchmark(largeToonString).report();
  print('');
  JsonRoundTripBenchmark(largeData).report();
  ToonRoundTripBenchmark(largeData).report();

  print('\n$separator');
}

