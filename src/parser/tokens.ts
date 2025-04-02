import { Position, sortByPositions } from "../utils/position";

/** The token types. */
export enum TokenType {
  // Unary operators.
  PLUS = "plus",
  MINUS = "minus",
  // Binary operators.
  MULTIPLY = "multiply",
  DIVIDE = "divide",
  XOR = "xor",
  CONCAT = "concat",
  EQUAL = "equal",
  NOT_EQUAL = "not_equal",
  LESS = "less",
  GREATER = "greater",
  LESS_OR_EQUAL = "less_or_equal",
  GREATER_OR_EQUAL = "greater_or_equal",

  // Punctuation.
  COMMA = "comma",
  SEMICOLON = "semicolon",
  L_PAREN = "left_paren",
  R_PAREN = "right_paren",
  L_BRACKET = "left_bracket",
  R_BRACKET = "right_bracket",

  // Literals.
  LITERAL = "literal",
  IDENTIFIER = "identifier",
  NUMBER = "number",
  STRING = "string",
  RANGE = "range",

  ERROR = "parse_error",
}

/** The unary operator tokens. */
export const UNARY_OPERATORS = [TokenType.PLUS, TokenType.MINUS];

/** The binary operator tokens. */
export const OPERATORS = [
  ...UNARY_OPERATORS,
  TokenType.MULTIPLY,
  TokenType.DIVIDE,
  TokenType.XOR,
  TokenType.CONCAT,
  TokenType.EQUAL,
  TokenType.NOT_EQUAL,
  TokenType.LESS,
  TokenType.GREATER,
  TokenType.LESS_OR_EQUAL,
  TokenType.GREATER_OR_EQUAL,
];

const OPERATORS_SINGLE = new Map([
  ["+", TokenType.PLUS],
  ["-", TokenType.MINUS],
  ["*", TokenType.MULTIPLY],
  ["/", TokenType.DIVIDE],
  ["^", TokenType.XOR],
  ["&", TokenType.CONCAT],
  ["=", TokenType.EQUAL],
  ["<", TokenType.LESS],
  [">", TokenType.GREATER],
]);
const OPERATORS_DOUBLE = new Map([
  ["<>", TokenType.NOT_EQUAL],
  ["<=", TokenType.LESS_OR_EQUAL],
  [">=", TokenType.GREATER_OR_EQUAL],
]);
const PUNCTUATION = new Map([
  [",", TokenType.COMMA],
  [";", TokenType.SEMICOLON],
  ["(", TokenType.L_PAREN],
  [")", TokenType.R_PAREN],
  ["{", TokenType.L_BRACKET],
  ["}", TokenType.R_BRACKET],
]);
const LITERALS = new Set(["true", "false", "#n/a"]);
const NUMBER_LITERAL_RE = /^-?(\d+(\.\d*)?|\.\d+)(e\d+)?$/i;
const IDENTIFIER_LITERAL_RE = /^[a-z_][a-z0-9_]*$/i;
const RANGE_REF_RE = (() => {
  function joinPatterns(...patterns: string[]) {
    return "(" + patterns.join("|") + ")";
  }

  const sheetNamePattern = /([a-z0-9_]+|'.+')!/.source;
  const cellColPattern = /\$?[a-z]+/.source;
  const cellRowPattern = /\$?0*[1-9]\d*/.source;
  const cellRefPattern = cellColPattern + cellRowPattern;
  const openColPattern = cellColPattern + `(${cellRowPattern})?`;
  const openRowPattern = `(${cellColPattern})?` + cellRowPattern;
  const rangeRefRe = new RegExp(
    "^" +
      `(${sheetNamePattern})?` +
      joinPatterns(
        // Single cell.
        cellRefPattern,
        openColPattern + ":" + openColPattern,
        openRowPattern + ":" + openRowPattern
      ) +
      "$",
    "i"
  );
  // Possible named range. https://support.google.com/docs/answer/63175?hl=en
  const namedRangeRe = new RegExp(
    "^" + sheetNamePattern + /[a-z_][a-z0-9_]{0,249}/.source + "$",
    "i"
  );

  return {
    test(text: string) {
      if (rangeRefRe.test(text)) return true;
      if (namedRangeRe.test(text)) {
        // Named ranges cannot be named 'true' or 'false'.
        if (text.endsWith("!true") || text.endsWith("!false")) return false;
        return true;
      }
      return false;
    },
  };
})();

/** A token. */
export interface Token {
  /** The type of the token. */
  type: TokenType;
  /** The content of the token. */
  content: string;
  /** The start position of the token (inclusive). */
  startPosition: Position;
  /** The end position of the token (inclusive). */
  endPosition: Position;
  /** A description of the error, if `type` is `TokenType.ERROR`. */
  error?: string;
}

const SPACE = " ";
const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';

/** Parses the given text into tokens. */
export function parseTokens(lines: string[]): Token[] {
  const tokens: Token[] = [];

  function pushBuffer(buffer: string[], lineNum: number, colNum: number) {
    let content = buffer.join("");
    clearArray(buffer);
    if (content.length === 0) return;

    // Special case: #n/a.
    if (tokens.length >= 2 && content.toLowerCase() === "a") {
      const prev1 = tokens[tokens.length - 2];
      const prev2 = tokens[tokens.length - 1];
      if (
        prev1.startPosition.lineNum === lineNum &&
        prev1.startPosition.colNum === colNum - 4 &&
        prev1.content.toLowerCase() === "#n" &&
        prev2.content === "/"
      ) {
        tokens.splice(-2, 2);
        content = prev1.content + prev2.content + content;
      }
    }

    let tokenType;
    if (LITERALS.has(content.toLowerCase())) {
      tokenType = TokenType.LITERAL;
    } else if (NUMBER_LITERAL_RE.test(content)) {
      tokenType = TokenType.NUMBER;
    } else if (RANGE_REF_RE.test(content)) {
      tokenType = TokenType.RANGE;
    } else if (IDENTIFIER_LITERAL_RE.test(content)) {
      // Must be checked last so that literals and ranges are matched first.
      tokenType = TokenType.IDENTIFIER;
    } else {
      // Unknown token.
      tokens.push(
        createError("Parse error: unknown token", content, lineNum, colNum - 1)
      );
      return;
    }
    tokens.push(createToken(tokenType, content, lineNum, colNum - 1));
  }

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const buffer = [];
    const state = {
      // In a double-quoted string.
      inString: false,
      // In a single-quoted string. These are not considered strings in Google
      // Sheets, but they're used in sheet references, so we want to be able to
      // capture it together.
      inQuotes: false,
    };
    for (let colNum = 0; colNum < line.length; colNum++) {
      const c = line[colNum];
      const cc = colNum < line.length - 1 ? line.slice(colNum, colNum + 2) : "";

      if (state.inString) {
        if (c === DOUBLE_QUOTE) {
          if (cc === DOUBLE_QUOTE + DOUBLE_QUOTE) {
            // Two double quotes is escaped as a double quote.
            buffer.push(cc);
            colNum++;
            continue;
          }
          // End string.
          state.inString = false;
          buffer.push(c);
          tokens.push(
            createToken(TokenType.STRING, buffer.join(""), lineNum, colNum)
          );
          clearArray(buffer);
          continue;
        }
        buffer.push(c);
        continue;
      }
      if (state.inQuotes) {
        if (c === SINGLE_QUOTE) {
          if (cc === SINGLE_QUOTE + SINGLE_QUOTE) {
            // Two single quotes is escaped as a single quote.
            buffer.push(cc);
            colNum++;
            continue;
          }
          // End quote, but don't end the buffer.
          state.inQuotes = false;
        }
        buffer.push(c);
        continue;
      }

      if (c === SPACE) {
        pushBuffer(buffer, lineNum, colNum);
        // Ignore whitespace.
        continue;
      }

      let matched = false;
      for (const [test, map] of [
        // Check length 2 operators before length 1 operators.
        [cc, OPERATORS_DOUBLE],
        [c, OPERATORS_SINGLE],
        [c, PUNCTUATION],
      ] as Array<[string, Map<string, TokenType>]>) {
        const tokenType = map.get(test);
        if (!tokenType) continue;
        matched = true;
        pushBuffer(buffer, lineNum, colNum);
        colNum += test.length - 1;
        tokens.push(createToken(tokenType, test, lineNum, colNum));
        break;
      }
      if (matched) continue;

      if (c === DOUBLE_QUOTE) {
        pushBuffer(buffer, lineNum, colNum);
        // Start string.
        state.inString = true;
      } else if (c === SINGLE_QUOTE) {
        pushBuffer(buffer, lineNum, colNum);
        // Start quote.
        state.inQuotes = true;
      }
      buffer.push(c);
    }
    if (state.inString || state.inQuotes) {
      tokens.push(
        createError(
          "Unclosed " + (state.inString ? "string" : "quotes"),
          buffer.join(""),
          lineNum,
          line.length - 1
        )
      );
      continue;
    }
    pushBuffer(buffer, lineNum, line.length);
  }

  // Sort the values just in case.
  tokens.sort(sortByPositions((token) => token.startPosition));
  return tokens;
}

function createToken(
  type: TokenType,
  content: string,
  lineNum: number,
  endCol: number
): Token {
  return {
    type,
    content,
    startPosition: { lineNum, colNum: endCol - content.length + 1 },
    endPosition: { lineNum, colNum: endCol },
  };
}

function createError(
  message: string,
  content: string,
  lineNum: number,
  endCol: number
): Token {
  const errorToken = createToken(TokenType.ERROR, content, lineNum, endCol);
  errorToken.error = message;
  return errorToken;
}

function clearArray<T>(array: T[]) {
  array.splice(0);
}
