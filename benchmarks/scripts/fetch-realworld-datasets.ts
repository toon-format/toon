import * as fsp from 'node:fs/promises'
import { join } from 'node:path'

const OUTPUT_DIR = join(import.meta.dirname, '..', 'data')

/**
 * Fetch top 100 HuggingFace datasets
 */
async function fetchHuggingFaceDatasets(): Promise<void> {
  console.log('Fetching HuggingFace datasets...')
  const response = await fetch(
    'https://huggingface.co/api/datasets?limit=100&sort=likes&direction=-1',
  )
  const data = await response.json()
  await fsp.writeFile(
    join(OUTPUT_DIR, 'huggingface-datasets.json'),
    JSON.stringify(data, null, 2),
  )
  console.log(`Saved ${data.length} HuggingFace datasets`)
}

/**
 * Fetch top 100 NPM packages
 */
async function fetchNpmPackages(): Promise<void> {
  console.log('Fetching NPM packages...')
  const response = await fetch(
    'https://registry.npmjs.org/-/v1/search?text=react&size=100',
  )
  const data = await response.json()
  await fsp.writeFile(
    join(OUTPUT_DIR, 'npm-packages.json'),
    JSON.stringify(data.objects, null, 2),
  )
  console.log(`Saved ${data.objects.length} NPM packages`)
}

/**
 * Fetch all countries from REST Countries
 */
async function fetchCountries(): Promise<void> {
  console.log('Fetching REST Countries...')
  const response = await fetch('https://restcountries.com/v3.1/all?fields=name,flags')
  const data = await response.json()
  await fsp.writeFile(
    join(OUTPUT_DIR, 'countries.json'),
    JSON.stringify(data, null, 2),
  )
  console.log(`Saved ${data.length} countries`)
}

async function main(): Promise<void> {
  await fetchHuggingFaceDatasets()
  await fetchNpmPackages()
  await fetchCountries()
  console.log('\nAll real-world datasets fetched successfully!')
}

main().catch(console.error)
