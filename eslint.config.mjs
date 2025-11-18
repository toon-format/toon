// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu().append({
  files: ['README.md', 'SPEC.md', '**/docs/**/*'],
  rules: {
    'yaml/quotes': 'off',
    'style/no-tabs': 'off',
  },
})
