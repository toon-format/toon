# List markers
const LIST_ITEM_MARKER = '-'
const LIST_ITEM_PREFIX = "- "

# Structural characters
const COMMA = ','
const COLON = ':'
const SPACE = ' '
const PIPE = '|'
const DOT = '.'

# Brackets and braces
const OPEN_BRACKET = '['
const CLOSE_BRACKET = ']'
const OPEN_BRACE = '{'
const CLOSE_BRACE = '}'

# Literals
const NULL_LITERAL = "null"
const TRUE_LITERAL = "true"
const FALSE_LITERAL = "false"

# Escape characters
const BACKSLASH = '\\'
const DOUBLE_QUOTE = '"'
const NEWLINE = '\n'
const CARRIAGE_RETURN = '\r'
const TAB = '\t'

# Delimiters
const DELIMITERS = Dict(
    :comma => COMMA,
    :tab => TAB,
    :pipe => PIPE
)

const DEFAULT_DELIMITER = DELIMITERS[:comma]

