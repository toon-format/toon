# TOON Streaming API

The TOON Streaming API provides efficient processing of large datasets without loading everything into memory at once. It supports both JSON-to-TOON and TOON-to-JSON conversions using async generators and batch operations.

## Features

- **Memory Efficient**: Process large files without loading entire datasets
- **Async Generators**: Modern JavaScript async iteration support
- **Batch Operations**: Convert multiple documents in single operations
- **Error Handling**: Robust error reporting for malformed data
- **Multiple JSON Objects**: Handle concatenated JSON objects in single chunks
- **Document Separation**: Support for document separators (`---`)

## API Reference

### `streamEncodeGenerator(input, encodeOptions?)`

Converts an async iterable of JSON strings to TOON format.

```typescript
async function* streamEncodeGenerator(
  input: AsyncIterable<string>,
  encodeOptions?: EncodeOptions
): AsyncGenerator<string, void, unknown>
```

**Parameters:**

- `input`: Async iterable of JSON strings
- `encodeOptions`: Optional TOON encoding options

**Returns:** Async generator yielding TOON-formatted strings

**Example:**

```typescript
const jsonChunks = ['{"name": "Alice"}', '{"name": "Bob"}']
for await (const toon of streamEncodeGenerator(asyncIterable(jsonChunks))) {
  console.log(toon)
}
// Output:
// name: Alice
// name: Bob
```

### `streamDecodeGenerator(input, decodeOptions?)`

Converts an async iterable of TOON strings to JSON values.

```typescript
async function* streamDecodeGenerator(
  input: AsyncIterable<string>,
  decodeOptions?: DecodeOptions
): AsyncGenerator<JsonValue, void, unknown>
```

**Parameters:**

- `input`: Async iterable of TOON strings
- `decodeOptions`: Optional TOON decoding options

**Returns:** Async generator yielding JSON values

**Example:**

```typescript
const toonChunks = ['name: Alice\n---\n', 'name: Bob']
for await (const json of streamDecodeGenerator(asyncIterable(toonChunks))) {
  console.log(json)
}
// Output:
// { name: 'Alice' }
// { name: 'Bob' }
```

### `batchEncode(values, encodeOptions?, separator?)`

Encodes multiple JSON values to a single TOON string with separators.

```typescript
function batchEncode(
  values: JsonValue[],
  encodeOptions?: EncodeOptions,
  separator = '---'
): string
```

**Parameters:**

- `values`: Array of JSON values to encode
- `encodeOptions`: Optional encoding options
- `separator`: Document separator (default: `'---'`)

**Returns:** TOON string with separated documents

**Example:**

```typescript
const data = [{ name: 'Alice' }, { name: 'Bob' }]
const toon = batchEncode(data)
console.log(toon)
// Output:
// name: Alice
// ---
// name: Bob
```

### `batchDecode(toonString, decodeOptions?, separator?)`

Decodes a TOON string with multiple documents to an array of JSON values.

```typescript
function batchDecode(
  toonString: string,
  decodeOptions?: DecodeOptions,
  separator = '---'
): JsonValue[]
```

**Parameters:**

- `toonString`: TOON string containing multiple documents
- `decodeOptions`: Optional decoding options
- `separator`: Document separator (default: `'---'`)

**Returns:** Array of JSON values

**Example:**

```typescript
const toon = 'name: Alice\n---\nname: Bob'
const data = batchDecode(toon)
console.log(data)
// Output: [{ name: 'Alice' }, { name: 'Bob' }]
```

## Usage Examples

### Processing Large Files

```typescript
import { createReadStream } from 'fs'
import { streamEncodeGenerator } from '@toon-format/toon'

// Convert large JSON file to TOON
async function convertLargeFile() {
  const fileStream = createReadStream('large-data.json', { encoding: 'utf8' })
  
  // Convert file stream to async iterable of chunks
  async function* readChunks() {
    for await (const chunk of fileStream) {
      yield chunk
    }
  }
  
  for await (const toonOutput of streamEncodeGenerator(readChunks())) {
    // Process each converted document
    console.log(toonOutput)
  }
}
```

### Real-time Data Processing

```typescript
// Process incoming data stream
async function processRealTimeData(dataStream: AsyncIterable<string>) {
  for await (const toonDoc of streamEncodeGenerator(dataStream, { keyFolding: 'safe' })) {
    // Send to analytics, save to database, etc.
    await processDocument(toonDoc)
  }
}
```

### Multiple JSON Objects in One Chunk

```typescript
// Handle concatenated JSON objects
const multiJson = '{"id":1}{"id":2}{"id":3}'
const chunks = [multiJson]

for await (const toon of streamEncodeGenerator(asyncIterable(chunks))) {
  console.log(toon)
}
// Output: Three separate TOON documents
```

### Document Separation

```typescript
// Use custom separators
const data = [{ a: 1 }, { b: 2 }, { c: 3 }]
const toon = batchEncode(data, undefined, '===')
console.log(toon)
// Output:
// a: 1
// ===
// b: 2
// ===
// c: 3

const decoded = batchDecode(toon, undefined, '===')
// Result: [{ a: 1 }, { b: 2 }, { c: 3 }]
```

## Error Handling

The streaming API provides detailed error messages for debugging:

```typescript
try {
  for await (const result of streamEncodeGenerator(invalidJsonStream)) {
    // Process result
  }
} catch (error) {
  console.error('Streaming error:', error.message)
  // Error: Failed to parse remaining JSON: SyntaxError: ...
}
```

## Performance Benefits

- **Memory Usage**: Constant memory usage regardless of input size
- **Throughput**: Process data as it arrives without waiting for complete input
- **Scalability**: Handle files larger than available RAM
- **Backpressure**: Natural flow control through async iteration

## Integration with Node.js Streams

While the streaming API uses async generators for platform independence, you can easily integrate with Node.js streams:

```typescript
import { Transform } from 'stream'
import { streamEncodeGenerator } from '@toon-format/toon'

// Create transform stream wrapper
function createToonEncoderStream() {
  return new Transform({
    objectMode: true,
    async transform(chunk, encoding, callback) {
      try {
        for await (const toon of streamEncodeGenerator([chunk.toString()])) {
          this.push(toon)
        }
        callback()
      } catch (error) {
        callback(error)
      }
    }
  })
}
```
