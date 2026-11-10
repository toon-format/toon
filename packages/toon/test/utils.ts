import type { Fixtures } from './types'
import { readdir, readFile } from 'node:fs/promises'

const fixturesDir = new URL('tests/fixtures/', import.meta.resolve('@toon-format/spec/package.json'))

/**
 * Loads every spec fixture file of a category via `JSON.parse`.
 *
 * @remarks
 * Static JSON imports go through Vite's JSON-to-literal transform, where a
 * literal `__proto__` key sets the object's prototype instead of an own
 * property – silently corrupting the prototype-safety fixtures.
 */
export async function loadFixtures(category: 'encode' | 'decode'): Promise<Fixtures[]> {
  const categoryDir = new URL(`${category}/`, fixturesDir)
  const fileNames = (await readdir(categoryDir)).filter(fileName => fileName.endsWith('.json')).sort()
  return Promise.all(fileNames.map(async fileName => JSON.parse(await readFile(new URL(fileName, categoryDir), 'utf8')) as Fixtures))
}
