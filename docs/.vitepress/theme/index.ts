import type { Theme } from 'vitepress'
import CopyOrDownloadAsMarkdownButtons from 'vitepress-plugin-llms/vitepress-components/CopyOrDownloadAsMarkdownButtons.vue'
import DefaultTheme from 'vitepress/theme'
import PlaygroundLayout from './components/PlaygroundLayout.vue'
import VPInput from './components/VPInput.vue'

import './vars.css'
import './overrides.css'
import 'uno.css'

const config: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.config.globalProperties.$spec = {
      version: '3.0',
    }
    app.component('CopyOrDownloadAsMarkdownButtons', CopyOrDownloadAsMarkdownButtons)
    app.component('PlaygroundLayout', PlaygroundLayout)
    app.component('VPInput', VPInput)
  },
}

export default config
