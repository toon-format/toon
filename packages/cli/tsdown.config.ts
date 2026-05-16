import type { UserConfig } from 'tsdown/config'
import { defineConfig } from 'tsdown/config'

const config: UserConfig = defineConfig({
  entry: {
    index: 'src/cli-entry.ts',
  },
  dts: true,
})

export default config
