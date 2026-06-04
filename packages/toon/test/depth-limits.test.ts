import { describe, expect, it } from 'vitest'
import { decode, decodeStream, decodeStreamSync, encode, ToonDecodeError } from '../src/index'

describe('depth limits', () => {
  it('rejects encode input deeper than the default maxDepth', () => {
    expect(() => encode(createNestedObject(1001))).toThrow(RangeError)
    expect(() => encode(createNestedObject(1001))).toThrow(/maxDepth/)
  })

  it('honors custom encode maxDepth values', () => {
    expect(() => encode(createNestedObject(2), { maxDepth: 2 })).not.toThrow()
    expect(() => encode(createNestedObject(2), { maxDepth: 1 })).toThrow(RangeError)
  })

  it('checks values returned by replacer before encoding them', () => {
    expect(() => encode({ value: 'replace' }, {
      maxDepth: 1,
      replacer(key, value) {
        if (key === 'value') {
          return createNestedObject(2)
        }
        return value
      },
    })).toThrow(RangeError)
  })

  it('allows trusted encode callers to disable the depth limit', () => {
    expect(() => encode(createNestedObject(20), { maxDepth: Infinity })).not.toThrow()
  })

  it('rejects decode input deeper than the default maxDepth', () => {
    expect(() => decode(createNestedToon(1001))).toThrow(ToonDecodeError)
    expect(() => decode(createNestedToon(1001))).toThrow(/Maximum nesting depth/)
  })

  it('honors custom decode maxDepth values', () => {
    expect(() => decode(createNestedToon(2), { maxDepth: 2 })).not.toThrow()
    expect(() => decode(createNestedToon(2), { maxDepth: 1 })).toThrow(ToonDecodeError)
  })

  it('counts keyed inline containers as nested decode values', () => {
    expect(() => decode('items: []', { maxDepth: 0 })).toThrow(ToonDecodeError)
    expect(() => decode('items: []', { maxDepth: 1 })).not.toThrow()
  })

  it('counts tabular row objects as nested decode values', () => {
    const input = 'items[1]{name}:\n  Alice'

    expect(() => decode(input, { maxDepth: 1 })).toThrow(ToonDecodeError)
    expect(() => decode(input, { maxDepth: 2 })).not.toThrow()
  })

  it('applies maxDepth to safe path expansion', () => {
    expect(decode('a.b.c: true', { expandPaths: 'safe', maxDepth: 2 })).toEqual({
      a: {
        b: {
          c: true,
        },
      },
    })
    expect(() => decode('a.b.c: true', { expandPaths: 'safe', maxDepth: 1 })).toThrow(RangeError)
  })

  it('applies maxDepth in synchronous streaming decode', () => {
    const lines = createNestedToon(2).split('\n')

    expect(() => Array.from(decodeStreamSync(lines, { maxDepth: 1 }))).toThrow(ToonDecodeError)
    expect(() => Array.from(decodeStreamSync(['items[1]{name}:', '  Alice'], { maxDepth: 1 }))).toThrow(ToonDecodeError)
  })

  it('applies maxDepth in asynchronous streaming decode', async () => {
    const lines = createNestedToon(2).split('\n')

    await expect(collect(decodeStream(asyncLines(lines), { maxDepth: 1 }))).rejects.toThrow(ToonDecodeError)
  })

  it('validates maxDepth options', () => {
    expect(() => encode({}, { maxDepth: -1 })).toThrow(RangeError)
    expect(() => decode('a: 1', { maxDepth: 1.5 })).toThrow(RangeError)
  })
})

function createNestedObject(depth: number): unknown {
  let value: unknown = true

  for (let i = depth; i >= 0; i--) {
    value = { [`level${i}`]: value }
  }

  return value
}

function createNestedToon(depth: number): string {
  const lines: string[] = []

  for (let i = 0; i < depth; i++) {
    lines.push(`${'  '.repeat(i)}level${i}:`)
  }
  lines.push(`${'  '.repeat(depth)}value: true`)

  return lines.join('\n')
}

async function* asyncLines(lines: readonly string[]): AsyncIterable<string> {
  for (const line of lines) {
    yield line
  }
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = []

  for await (const item of iterable) {
    items.push(item)
  }

  return items
}
