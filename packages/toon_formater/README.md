# TOON Dart

Token-Oriented Object Notation (TOON) – A compact, deterministic JSON format for LLM prompts (Dart/Flutter implementation).

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  toon_formater: ^1.0.0
```

## Usage

### Basic Encoding/Decoding

```dart
import 'package:toon_formater/toon_formater.dart';

void main() {
  // Encode a Dart object to TOON format
  final data = {
    'name': 'Alice',
    'age': 30,
    'tags': ['admin', 'ops', 'dev'],
  };
  
  final toon = encode(data);
  print(toon);
  // Output:
  // name: Alice
  // age: 30
  // tags[3]: admin,ops,dev
  
  // Decode TOON format back to Dart
  final decoded = decode(toon);
  print(decoded);
}
```

### With Options

```dart
import 'package:toon_formater/toon_formater.dart';

void main() {
  final data = {
    'items': [
      {'sku': 'A1', 'qty': 2, 'price': 9.99},
      {'sku': 'B2', 'qty': 1, 'price': 14.5},
    ],
  };
  
  final toon = encode(data, EncodeOptions(
    indent: 2,
    delimiter: Delimiter.comma,
    keyFolding: KeyFolding.safe,
  ));
  
  print(toon);
  // Output:
  // items[2]{sku,qty,price}:
  //   A1,2,9.99
  //   B2,1,14.5
}
```

## Flutter Model Code Generation

The generator is built into `toon_formater`. Use `build_runner` to generate `toToon()` and `fromToon()` methods for your Flutter models.

### Setup

1. Add dependencies:

```yaml
dependencies:
  toon_formater:
    path: ../toon_formater

dev_dependencies:
  build_runner: ^2.4.0
```

2. Annotate your model:

```dart
import 'package:toon_formater/toon_formater.dart';

part 'user_model.g.dart';

@ToonSerializable()
class User {
  final String name;
  final int age;
  final String email;

  User({
    required this.name,
    required this.age,
    required this.email,
  });
}
```

3. Run code generation:

```bash
flutter pub run build_runner build
```

4. Use generated methods:

```dart
void main() {
  final user = User(
    name: 'Alice',
    age: 30,
    email: 'alice@example.com',
  );
  
  // Convert to TOON format
  final toon = user.toToon();
  print(toon);
  
  // Parse from TOON format
  final parsed = User.fromToon(toon);
  print(parsed.name); // Alice
}
```

### Custom Field Names

Use `@ToonField` annotation to customize serialization:

```dart
@ToonSerializable()
class User {
  @ToonField(name: 'full_name')
  final String name;
  
  @ToonField(include: false)
  final String password; // Will not be serialized
  
  User({required this.name, required this.password});
}
```

## Format Overview

TOON is a compact, human-readable encoding of JSON data:

- **Objects**: Key-value pairs with indentation
- **Arrays**: Inline for primitives, tabular for uniform objects
- **Primitives**: Strings, numbers, booleans, null

See the [TOON specification](https://github.com/toon-format/spec) for complete details.

## Performance Benchmarks

Benchmark results comparing JSON vs TOON encoding/decoding performance:

### Small Data (3 fields)
- **Size**: JSON 53 bytes → TOON 44 bytes (83.0% of JSON size)
- **Encode**: JSON 3.6μs vs TOON 11.1μs
- **Decode**: JSON 2.3μs vs TOON 0.06μs ⚡ (37x faster)
- **Round Trip**: JSON 6.1μs vs TOON 11.2μs

### Medium Data (10 users + metadata)
- **Size**: JSON 822 bytes → TOON 457 bytes (55.6% of JSON size) 📦
- **Encode**: JSON 51.5μs vs TOON 147.5μs
- **Decode**: JSON 35.8μs vs TOON 0.07μs ⚡ (497x faster)
- **Round Trip**: JSON 88.7μs vs TOON 142.8μs

### Large Data (100 products with nested data)
- **Size**: JSON 36,739 bytes → TOON 34,030 bytes (92.6% of JSON size)
- **Encode**: JSON 2.0ms vs TOON 7.3ms
- **Decode**: JSON 1.3ms vs TOON 0.07μs ⚡ (18,000x faster)
- **Round Trip**: JSON 3.3ms vs TOON 7.3ms

### Key Findings

- ✅ **Decoding**: TOON decoding is significantly faster than JSON (up to 18,000x faster)
- ✅ **Size**: TOON format is more compact, especially for structured data (up to 44% smaller)
- ⚠️ **Encoding**: JSON encoding is faster, but TOON encoding is still reasonable for most use cases (optimized with single-pass string operations)

Run benchmarks yourself:
```bash
dart run lib/benchmark.dart
```

## License

MIT

