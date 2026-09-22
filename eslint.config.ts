import type { ConfigNames, TypedFlatConfigItem } from '@antfu/eslint-config'
import type { FlatConfigComposer } from 'eslint-flat-config-utils'
import antfu from '@antfu/eslint-config'

const config: FlatConfigComposer<TypedFlatConfigItem, ConfigNames> = antfu({
  rules: {
    'no-cond-assign': 'off',
    'jsdoc/multiline-blocks': ['error', {
      noMultilineBlocks: true,
      minimumLengthForMultiline: 100,
    }],
  },
}).append({
  files: ['**/README.md', 'SPEC.md', '**/benchmarks/**/*', '**/docs/**/*'],
  rules: {
    'markdown/no-missing-link-fragments': 'off',
    'markdown/fenced-code-language': 'off',
    'markdown/heading-increment': 'off',
    'import/no-duplicates': 'off',
    'style/no-tabs': 'off',
    'yaml/quotes': 'off',
    'yaml/indent': 'off',
  },
})

export default config
