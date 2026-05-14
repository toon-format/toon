import type { UserConfig } from 'vite'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = dirname(fileURLToPath(import.meta.url))

const config: UserConfig = defineConfig({
  test: {
    root,
    include: ['.vitepress/theme/playground/**/*.test.ts'],
  },
})

export default config
