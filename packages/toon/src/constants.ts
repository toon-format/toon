// #region List markers

export const LIST_ITEM_MARKER = '-'
export const LIST_ITEM_PREFIX = '- '

// #endregion

// #region Structural characters

export const COMMA = ','
export const COLON = ':'
export const SPACE = ' '
export const PIPE = '|'
export const DOT = '.'

// #endregion

// #region Brackets and braces

export const OPEN_BRACKET = '['
export const CLOSE_BRACKET = ']'
export const OPEN_BRACE = '{'
export const CLOSE_BRACE = '}'

// #endregion

// #region Literals

export const NULL_LITERAL = 'null'
export const TRUE_LITERAL = 'true'
export const FALSE_LITERAL = 'false'

// #endregion

// #region Escape characters

export const BACKSLASH = '\\'
export const DOUBLE_QUOTE = '"'
export const NEWLINE = '\n'
export const CARRIAGE_RETURN = '\r'
export const TAB = '\t'

// #endregion

// #region Delimiters

export const DELIMITERS = {
  comma: COMMA as ',',
  tab: TAB as '\t',
  pipe: PIPE as '|',
} as const

export type DelimiterKey = keyof typeof DELIMITERS
export type Delimiter = typeof DELIMITERS[DelimiterKey]

export const DEFAULT_DELIMITER: Delimiter = DELIMITERS.comma

// #endregion

// #region JSONL

export const JSONL_SEPARATOR = '---'

// #endregion
