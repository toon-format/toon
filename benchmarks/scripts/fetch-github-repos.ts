import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import process from 'node:process'
import * as prompts from '@clack/prompts'
import { ofetch } from 'ofetch'
import pMap from 'p-map'
import { BENCHMARKS_DIR } from '../src/constants.ts'
import { ensureDir } from '../src/utils.ts'

prompts.intro('GitHub Repositories Fetcher')

try {
  // Fetch top 100 repos from GitHub
  const repoList = await searchTop100Repos()
  const repos = await fetchRepoDetails(repoList)

  if (repos.length === 0) {
    prompts.log.error('No repositories fetched. Exiting.')
    process.exit(1)
  }

  // Sort by stars descending
  repos.sort((a, b) => b.stars - a.stars)

  await saveRepos(repos)

  prompts.log.success('Done!')
}
catch (error) {
  prompts.log.error(String(error))
  process.exit(1)
}

async function searchTop100Repos(): Promise<string[]> {
  const s = prompts.spinner()
  s.start('Fetching top 100 starred repositories')

  const response = await ofetch<{ items: { full_name: string }[] }>(
    'https://api.github.com/search/repositories',
    {
      query: {
        q: 'stars:>1',
        sort: 'stars',
        order: 'desc',
        per_page: 100,
      },
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )

  s.stop('Fetched top 100 repositories')

  return response.items.map(item => item.full_name)
}

async function fetchRepoDetails(repoList: string[]): Promise<Record<string, any>[]> {
  const s = prompts.spinner()
  s.start(`Fetching ${repoList.length} GitHub repositories`)

  const repos = await pMap(
    repoList,
    async (repoPath, index) => {
      s.message(`[${index + 1}/${repoList.length}] Fetching ${repoPath}`)
      const { repo } = await ofetch(`https://ungh.cc/repos/${repoPath}`)
      return repo
    },
    { concurrency: 5 },
  )

  s.stop(`Successfully fetched ${repos.length}/${repoList.length} repositories`)

  return repos
}

async function saveRepos(repos: Record<string, any>[]): Promise<void> {
  const outputDir = path.join(BENCHMARKS_DIR, 'data')
  const outputFile = path.join(outputDir, 'github-repos.json')

  await ensureDir(outputDir)
  const jsonOutput = JSON.stringify(repos, undefined, 2)
  await fsp.writeFile(outputFile, `${jsonOutput}\n`, 'utf-8')

  const relativePath = path.relative(BENCHMARKS_DIR, outputFile)
  prompts.log.info(`Result saved to \`${relativePath}\``)
}
