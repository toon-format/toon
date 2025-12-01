import type { Rule, UserConfig } from '@commitlint/types'
import { RuleConfigSeverity } from '@commitlint/types'

// #region Rules

/**
 * Rule to ensure the first letter of the commit subject is lowercase.
 *
 * @param parsed - Parsed commit object containing commit message parts.
 * @returns A tuple where the first element is a boolean indicating
 * if the rule passed, and the second is an optional error message.
 */
const subjectLowercaseFirst: Rule = async (parsed) => {
  const firstChar = parsed.subject!.match(/[a-z]/i)?.[0]
  if (firstChar && firstChar === firstChar.toUpperCase()) {
    return [false, 'Subject must start with a lowercase letter']
  }
  return [true]
}

// #endregion

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [RuleConfigSeverity.Disabled],
    'subject-lowercase-first': [RuleConfigSeverity.Error, 'always'],
  },
  plugins: [
    {
      rules: {
        'subject-lowercase-first': subjectLowercaseFirst,
      },
    },
  ],
}

export default Configuration
