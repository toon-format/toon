import type { UserConfig } from 'unocss'
import { defineConfig, presetIcons, presetWind4, transformerDirectives } from 'unocss'

const config: UserConfig = defineConfig({
  presets: [
    presetWind4(),
    presetIcons(),
  ],
  transformers: [
    transformerDirectives(),
  ],
})

export default config
