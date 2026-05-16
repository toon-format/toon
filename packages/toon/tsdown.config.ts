import type { UserConfig } from 'tsdown/config'
import { defineConfig } from 'tsdown/config'

const config: UserConfig = defineConfig({
  entry: 'src/index.ts',
  dts: true,
})

export default config
