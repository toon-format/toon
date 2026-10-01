import type { Fixtures } from './types'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'

const require = createRequire(import.meta.url)
const fixturesDir = path.join(path.dirname(require.resolve('@toon-format/spec/package.json')), 'tests/fixtures')

/**
 * Loads every spec fixture file of a category via `JSON.parse`.
 *
 * @remarks
 * Static JSON imports go through Vite's JSON-to-literal transform, where a
 * literal `__proto__` key sets the object's prototype instead of an own
 * property – silently corrupting the prototype-safety fixtures.
 */
export function loadFixtures(category: 'encode' | 'decode'): Fixtures[] {
  const categoryDir = path.join(fixturesDir, category)
  return readdirSync(categoryDir)
    .filter(fileName => fileName.endsWith('.json'))
    .map(fileName => JSON.parse(readFileSync(path.join(categoryDir, fileName), 'utf-8')) as Fixtures)
}
