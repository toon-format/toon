// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'no-cond-assign': 'off',
  },
  // `README.md` is symlinked to this file so we
  // exclude it to avoid linting the same file twice.
  ignores: ['packages/toon/README.md'],
}).append({
  files: ['README.md', 'SPEC.md', '**/docs/**/*'],
  rules: {
    'import/no-duplicates': 'off',
    'style/no-tabs': 'off',
    'yaml/quotes': 'off',
  },
})
