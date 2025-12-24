import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/index'

describe('Issue 249', () => {
  it('should preserve strings starting with dot or plus followed by numbers', () => {
    const indent: number = 1;

    function encodeToon(data: any): string {
      return encode(data, { indent });
    }

    function decodeToon<T>(toon: string): T {
      return decode(toon, { indent }) as any;
    }

    const data = [
      '.6226633103089010',
      '+8613334445577',
    ]

    // Expecting that it properly encodes these strings so that they decode back to strings
    // If it encodes them as raw numbers in TOON format without quotes, they might be read back as numbers.
    const encoded = encodeToon(data);
    console.log('Encoded:', encoded);

    // Encoded values MUST be quoted to avoid ambiguity with numbers
    // This assertion will fail initially
    expect(encoded).toContain('".6226633103089010"');
    expect(encoded).toContain('"+8613334445577"');

    const decoded = decodeToon(encoded);

    expect(decoded).toEqual(data);
  })
})
