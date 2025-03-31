import { Position, sortByPositions } from "../utils/position";

/** The token types. */
export enum TokenType {
  OPERATOR = "operator",

  COMMA = "comma",
  SEMICOLON = "semicolon",
  L_PAREN = "left_paren",
  R_PAREN = "right_paren",
  L_BRACKET = "left_bracket",
  R_BRACKET = "right_bracket",

  IDENTIFIER = "identifier",
  NUMBER = "number",
  STRING = "string",
  RANGE = "range",
  LITERAL = "literal",
}

const OPERATORS_SINGLE = new Set("+-/*^&=<>");
const OPERATORS_DOUBLE = new Set(["<=", ">=", "<>"]);
const PUNCTUATION = new Map([
  [",", TokenType.COMMA],
  [";", TokenType.SEMICOLON],
  ["(", TokenType.L_PAREN],
  [")", TokenType.R_PAREN],
  ["{", TokenType.L_BRACKET],
  ["}", TokenType.R_BRACKET],
]);
const LITERALS = new Set(["true", "false"]);
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

/** A range of text. */
export interface TextRange {
  /** The content of the token. */
  content: string;
  /** The start position of the token (inclusive). */
  startPosition: Position;
  /** The end position of the token (inclusive). */
  endPosition: Position;
}

/** A token. */
export interface Token extends TextRange {
  /** The type of the token. */
  type: TokenType;
}

/** An error during token parsing. */
export interface ParseTokensError extends TextRange {
  /** A description of the error. */
  error: string;
}

/** The parsed tokens. */
export interface ParseTokensResult {
  /** The parsed tokens. May be incomplete due to errors. */
  tokens: Token[];
  /** Errors during parsing. These will not overlap with `tokens`. */
  errors: ParseTokensError[];
}

/** Parses the given text into tokens. */
export function parseTokens(lines: string[]): ParseTokensResult {
  const tokens = [];
  const errors = [];

  function pushBuffer(buffer: string[], lineNum: number, colNum: number) {
    const content = buffer.join("");
    clearArray(buffer);
    if (content.length === 0) return;

    let tokenType = null;
    if (LITERALS.has(content.toLowerCase())) {
      tokenType = TokenType.LITERAL;
    } else if (NUMBER_LITERAL_RE.test(content)) {
      tokenType = TokenType.NUMBER;
    } else if (RANGE_REF_RE.test(content)) {
      tokenType = TokenType.RANGE;
    } else if (IDENTIFIER_LITERAL_RE.test(content)) {
      // Must be checked last so that literals and ranges are matched first.
      tokenType = TokenType.IDENTIFIER;
    }
    if (tokenType === null) {
      // Unknown token.
      errors.push(
        createError("Parse error: unknown token", content, lineNum, colNum - 1)
      );
    } else {
      tokens.push(createToken(tokenType, content, lineNum, colNum - 1));
    }
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

      if (state.inString) {
        if (c === '"') {
          if (colNum < line.length - 1 && line[colNum + 1] === '"') {
            // Two double quotes is escaped as a double quote.
            buffer.push('""');
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
        if (c === "'") {
          if (colNum < line.length - 1 && line[colNum + 1] === "'") {
            // Two single quotes is escaped as a single quote.
            buffer.push("''");
            colNum++;
            continue;
          }
          // End quote, but don't end the buffer.
          state.inQuotes = false;
        }
        buffer.push(c);
        continue;
      }

      if (c === " ") {
        pushBuffer(buffer, lineNum, colNum);
        // Ignore whitespace.
        continue;
      }
      if (colNum < line.length - 1) {
        // Check length 2 operators before length 1 operators.
        const op = line.slice(colNum, colNum + 2);
        if (OPERATORS_DOUBLE.has(op)) {
          pushBuffer(buffer, lineNum, colNum);
          tokens.push(createToken(TokenType.OPERATOR, op, lineNum, colNum + 1));
          colNum++;
          continue;
        }
      }
      if (OPERATORS_SINGLE.has(c)) {
        pushBuffer(buffer, lineNum, colNum);
        tokens.push(createToken(TokenType.OPERATOR, c, lineNum, colNum));
        continue;
      }
      const punctuationTokenType = PUNCTUATION.get(c);
      if (punctuationTokenType) {
        pushBuffer(buffer, lineNum, colNum);
        tokens.push(createToken(punctuationTokenType, c, lineNum, colNum));
        continue;
      }

      if (c === '"') {
        pushBuffer(buffer, lineNum, colNum);
        // Start string.
        state.inString = true;
      } else if (c === "'") {
        pushBuffer(buffer, lineNum, colNum);
        // Start quote.
        state.inQuotes = true;
      }
      buffer.push(c);
    }
    if (state.inString || state.inQuotes) {
      errors.push(
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
  const sortByStartPosition = sortByPositions<TextRange>(
    (textRange) => textRange.startPosition
  );
  tokens.sort(sortByStartPosition);
  errors.sort(sortByStartPosition);
  return { tokens, errors };
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
): ParseTokensError {
  return {
    content,
    startPosition: { lineNum, colNum: endCol - content.length + 1 },
    endPosition: { lineNum, colNum: endCol },
    error: message,
  };
}

function clearArray<T>(array: T[]) {
  array.splice(0);
}
