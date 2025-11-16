import 'dart:async';

import 'package:build/build.dart';
import 'package:source_gen/source_gen.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';

import 'toon_annotation.dart';

/// Generator for TOON serialization methods
class ToonGenerator extends GeneratorForAnnotation<ToonSerializable> {
  @override
  String toString() => 'ToonGenerator';

  @override
  FutureOr<String> generateForAnnotatedElement(
    Element element,
    ConstantReader annotation,
    BuildStep buildStep,
  ) async {
    if (element is! ClassElement) {
      throw InvalidGenerationSourceError(
        'ToonSerializable can only be applied to classes.',
        element: element,
      );
    }

    final classElement = element;
    final generateToToon = annotation.read('generateToToon').boolValue;
    final generateFromToon = annotation.read('generateFromToon').boolValue;

    final buffer = StringBuffer();
    
    // Generate only the helper class - user will add delegation methods manually
    final helperClassName = '_${classElement.name}ToonGenerated';
    buffer.writeln(_generateHelperClass(classElement, helperClassName, generateToToon, generateFromToon));

    return buffer.toString();
  }

  String _generateHelperClass(
    ClassElement classElement,
    String helperClassName,
    bool generateToToon,
    bool generateFromToon,
  ) {
    final className = classElement.name;
    final buffer = StringBuffer();

    buffer.writeln('class $helperClassName {');
    
    if (generateToToon) {
      buffer.writeln('  static String toToon($className instance) {');
      buffer.writeln('    final map = <String, Object?>{};');

      for (final field in _getSerializableFields(classElement)) {
        final fieldName = field.name;
        final toonField = _getToonFieldAnnotation(field);
        final nameReader = toonField?.read('name');
        final serializedName = nameReader != null && !nameReader.isNull
            ? nameReader.stringValue
            : fieldName;

        buffer.writeln('    map[\'$serializedName\'] = instance.$fieldName;');
      }

      buffer.writeln('    return encode(map);');
      buffer.writeln('  }');
    }

    if (generateFromToon) {
      if (generateToToon) {
        buffer.writeln();
      }
      buffer.writeln('  static $className fromToon(String toon) {');
      buffer.writeln('    final map = decode(toon) as Map<String, Object?>;');
      buffer.writeln('    return $className(');

      final fields = _getSerializableFields(classElement);
      for (int i = 0; i < fields.length; i++) {
        final field = fields[i];
        final fieldName = field.name;
        final toonField = _getToonFieldAnnotation(field);
        final nameReader = toonField?.read('name');
        final serializedName = nameReader != null && !nameReader.isNull
            ? nameReader.stringValue
            : fieldName;
        final fieldType = field.type;
        final isLast = i == fields.length - 1;

        // Handle type conversion
        String valueAccess = 'map[\'$serializedName\']';
        if (fieldType.isDartCoreInt) {
          valueAccess = '($valueAccess as num?)?.toInt() ?? 0';
        } else if (fieldType.isDartCoreDouble) {
          valueAccess = '($valueAccess as num?)?.toDouble() ?? 0.0';
        } else if (fieldType.isDartCoreBool) {
          valueAccess = '$valueAccess as bool? ?? false';
        } else if (fieldType.isDartCoreString) {
          valueAccess = '$valueAccess as String? ?? \'\'';
        } else if (fieldType.isDartCoreList) {
          valueAccess = '$valueAccess as List? ?? []';
        } else if (fieldType.isDartCoreMap) {
          valueAccess = '$valueAccess as Map? ?? {}';
        } else {
          valueAccess = valueAccess;
        }

        buffer.writeln('      $fieldName: $valueAccess${isLast ? '' : ','}');
      }

      buffer.writeln('    );');
      buffer.writeln('  }');
    }

    buffer.writeln('}');

    return buffer.toString();
  }


  List<FieldElement> _getSerializableFields(ClassElement classElement) {
    return classElement.fields
        .where((field) => !field.isStatic && !field.isPrivate)
        .where((field) {
      final toonField = _getToonFieldAnnotation(field);
      if (toonField == null) return true;
      return toonField.read('include').boolValue;
    }).toList();
  }

  ConstantReader? _getToonFieldAnnotation(FieldElement field) {
    try {
      final annotation = field.metadata.firstWhere(
        (meta) => meta.element?.enclosingElement?.name == 'ToonField',
      );
      final constant = annotation.computeConstantValue();
      return constant != null ? ConstantReader(constant) : null;
    } catch (_) {
      return null;
    }
  }
}

extension TypeExtension on DartType {
  bool get isDartCoreInt => element?.name == 'int';
  bool get isDartCoreDouble => element?.name == 'double';
  bool get isDartCoreBool => element?.name == 'bool';
  bool get isDartCoreString => element?.name == 'String';
  bool get isDartCoreList => element?.name == 'List';
  bool get isDartCoreMap => element?.name == 'Map';
}

