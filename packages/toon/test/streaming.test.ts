import { describe, expect, it } from 'vitest'
import { streamEncodeGenerator, streamDecodeGenerator, batchEncode, batchDecode } from '../src/streaming'

// Helper function to convert array to async iterable
async function* arrayToAsyncIterable<T>(array: T[]): AsyncIterable<T> {
  for (const item of array) {
    yield item
  }
}

describe('streaming API', () => {
  it('should encode JSON strings to TOON using generator', async () => {
    const jsonData = [
      '{"name": "Alice", "age": 30}',
      '{"name": "Bob", "age": 25}'
    ]
    
    const results: string[] = []
    for await (const toonOutput of streamEncodeGenerator(arrayToAsyncIterable(jsonData))) {
      results.push(toonOutput)
    }
    
    expect(results).toHaveLength(2)
    expect(results[0]).toContain('name: Alice')
    expect(results[0]).toContain('age: 30')
    expect(results[1]).toContain('name: Bob')
    expect(results[1]).toContain('age: 25')
  })

  it('should decode TOON strings to JSON using generator', async () => {
    const toonData = [
      'name: Alice\nage: 30\n---\n',
      'name: Bob\nage: 25'
    ]
    
    const results: any[] = []
    for await (const jsonOutput of streamDecodeGenerator(arrayToAsyncIterable(toonData))) {
      results.push(jsonOutput)
    }
    
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ name: 'Alice', age: 30 })
    expect(results[1]).toEqual({ name: 'Bob', age: 25 })
  })

  it('should handle multiple JSON objects in single chunk', async () => {
    const jsonData = [
      '{"name": "Alice"}{"name": "Bob"}'
    ]
    
    const results: string[] = []
    for await (const toonOutput of streamEncodeGenerator(arrayToAsyncIterable(jsonData))) {
      results.push(toonOutput)
    }
    
    expect(results).toHaveLength(2)
    expect(results[0]).toContain('name: Alice')
    expect(results[1]).toContain('name: Bob')
  })

  it('should handle incomplete JSON across chunks', async () => {
    const jsonData = [
      '{"name": "Alice", "details": {"age": 30, "city"',
      ': "New York"}}'
    ]
    
    const results: string[] = []
    for await (const toonOutput of streamEncodeGenerator(arrayToAsyncIterable(jsonData))) {
      results.push(toonOutput)
    }
    
    expect(results).toHaveLength(1)
    expect(results[0]).toContain('name: Alice')
    expect(results[0]).toContain('age: 30')
    expect(results[0]).toContain('city: New York')
  })

  it('should batch encode multiple values', () => {
    const values = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ]
    
    const result = batchEncode(values)
    
    expect(result).toContain('name: Alice')
    expect(result).toContain('name: Bob')
    expect(result).toContain('---')
  })

  it('should batch decode multiple documents', () => {
    const toonString = 'name: Alice\nage: 30\n---\nname: Bob\nage: 25'
    
    const results = batchDecode(toonString)
    
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ name: 'Alice', age: 30 })
    expect(results[1]).toEqual({ name: 'Bob', age: 25 })
  })

  it('should handle TOON documents with separators in decode generator', async () => {
    const toonData = [
      'name: Alice\nage: 30\n---\nname: Bob\nage: 25'
    ]
    
    const results: any[] = []
    for await (const jsonOutput of streamDecodeGenerator(arrayToAsyncIterable(toonData))) {
      results.push(jsonOutput)
    }
    
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ name: 'Alice', age: 30 })
    expect(results[1]).toEqual({ name: 'Bob', age: 25 })
  })

  it('should handle encode options in streaming', async () => {
    const jsonData = ['{"data": {"nested": {"value": 42}}}']
    
    const results: string[] = []
    for await (const toonOutput of streamEncodeGenerator(arrayToAsyncIterable(jsonData), { keyFolding: 'safe' })) {
      results.push(toonOutput)
    }
    
    expect(results[0]).toContain('data.nested.value: 42')
  })
})