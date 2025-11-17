/**
 * Example demonstrating the TOON streaming API
 */

import { streamEncodeGenerator, streamDecodeGenerator, batchEncode, batchDecode } from '../src/streaming'

// Helper to convert array to async iterable for demonstration
async function* arrayToAsyncIterable<T>(array: T[]): AsyncIterable<T> {
  for (const item of array) {
    yield item
  }
}

async function demonstrateStreamingAPI() {
  console.log('TOON Streaming API Demo\n')

  // Example 1: Streaming JSON to TOON
  console.log('Streaming JSON to TOON:')
  const jsonChunks = [
    '{"name": "Alice", "age": 30}',
    '{"name": "Bob", "age": 25, "city": "New York"}'
  ]
  
  console.log('Input JSON chunks:')
  jsonChunks.forEach((chunk, i) => console.log(`  ${i + 1}: ${chunk}`))
  
  console.log('\nOutput TOON:')
  let index = 1
  for await (const toonOutput of streamEncodeGenerator(arrayToAsyncIterable(jsonChunks))) {
    console.log(`  Document ${index++}:`)
    console.log(toonOutput.split('\n').map(line => `    ${line}`).join('\n'))
    console.log()
  }

  // Example 2: Streaming TOON to JSON
  console.log('Streaming TOON to JSON:')
  const toonChunks = [
    'name: Charlie\nage: 35\n---\n',
    'name: Diana\nage: 28\ncity: London'
  ]
  
  console.log('Input TOON chunks:')
  toonChunks.forEach((chunk, i) => {
    console.log(`  ${i + 1}:`)
    console.log(chunk.split('\n').map(line => `    ${line}`).join('\n'))
  })
  
  console.log('\nOutput JSON:')
  index = 1
  for await (const jsonOutput of streamDecodeGenerator(arrayToAsyncIterable(toonChunks))) {
    console.log(`  Document ${index++}: ${JSON.stringify(jsonOutput)}`)
  }
  console.log()

  // Example 3: Batch operations
  console.log('Batch operations:')
  const batchData = [
    { product: 'laptop', price: 999, inStock: true },
    { product: 'mouse', price: 25, inStock: false },
    { product: 'keyboard', price: 75, inStock: true }
  ]
  
  const batchToon = batchEncode(batchData)
  console.log('Batch encoded to TOON:')
  console.log(batchToon.split('\n').map(line => `  ${line}`).join('\n'))
  console.log()
  
  const batchDecoded = batchDecode(batchToon)
  console.log('Batch decoded back to JSON:')
  batchDecoded.forEach((item, i) => {
    console.log(`  ${i + 1}: ${JSON.stringify(item)}`)
  })
  console.log()

  // Example 4: Handling multiple JSON objects in one chunk
  console.log('Multiple JSON objects in single chunk:')
  const multiJsonChunk = ['{"id": 1, "type": "user"}{"id": 2, "type": "admin"}{"id": 3, "type": "guest"}']
  
  console.log(`Input: ${multiJsonChunk[0]}`)
  console.log('\nParsed as separate TOON documents:')
  index = 1
  for await (const toonOutput of streamEncodeGenerator(arrayToAsyncIterable(multiJsonChunk))) {
    console.log(`  Document ${index++}: ${toonOutput.replace(/\n/g, ' ')}`)
  }
  console.log()

  console.log('Streaming API demo complete!')
}

// Run the demo
demonstrateStreamingAPI().catch(console.error)