import type { Fixtures } from './types'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Loads spec fixture files via JSON.parse.
 *
 * @remarks
 * Static JSON imports go through Vite's JSON-to-literal transform, where a
 * literal `__proto__` key sets the object's prototype instead of an own
 * property – silently corrupting the prototype-safety fixtures.
 */
export function loadFixtures(category: 'encode' | 'decode', fileNames: readonly string[]): Fixtures[] {
  return fileNames.map((fileName) => {
    const fixturePath = require.resolve(`@toon-format/spec/tests/fixtures/${category}/${fileName}.json`)
    return JSON.parse(readFileSync(fixturePath, 'utf-8')) as Fixtures
  })
}
