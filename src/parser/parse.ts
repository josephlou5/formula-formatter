import {
  OPERATORS,
  parseTokens,
  Token,
  TokenErrorType,
  TokenType,
  UNARY_OPERATORS,
} from "./tokens";

/** An expression. */
export interface Expression {
  /**
   * The terms in this expression.
   *
   * Invariant: `terms.length` >= 1
   */
  terms: Term[];
  /**
   * The operators joining this terms.
   *
   * Invariant: `operatorTokens.length` === `terms.length` - 1
   */
  operatorTokens: Token[];
}

/** A list of expressions, some of which may be null (empty). */
export interface ExpressionList {
  /** The expressions in this list. */
  expressions: Array<Expression | null>;
  /**
   * The commas separating these arguments.
   *
   * Invariants:
   *   `expressions.length` === 0 && `commaTokens.length` === 0; OR
   *   `commaTokens.length` === `expressions.length` - 1
   */
  commaTokens: Token[];
}

/** The term types. */
export enum TermType {
  LITERAL = "LITERAL",
  UNARY_OP = "UNARY_OP",
  ARRAY_LITERAL = "ARRAY_LITERAL",
  CALL = "CALL",
  PARENTHESIZED = "PARENTHESIZED",
}

/**
 * A term.
 *
 * Invariant: Only the property corresponding with `type` will be set.
 */
export interface Term {
  /** The type of the term. */
  type: TermType;
  /** A literal value. */
  literal?: Token;
  /** A unary operator applied to a term. */
  unaryOp?: {
    /** The unary operator. */
    operatorToken: Token;
    /** The operand. This can only be certain terms. */
    operand: Term;
  };
  /** An array literal. */
  arrayLiteral?: {
    /** The opening left bracket. */
    leftBracketToken: Token;
    /** The rows of values. */
    rows: ExpressionList[];
    /**
     * The semicolons separating the rows.
     *
     * Invariants:
     *   `rows.length` === 0 && `semicolonTokens.length` === 0; OR
     *   `semicolonTokens.length` === `rows.length` - 1
     */
    semicolonTokens: Token[];
    /** The closing right bracket, if it exists. */
    rightBracketToken?: Token;
  };
  /** A function call. */
  call?: {
    /** The function identifier. */
    functionToken: Token;
    /** The opening left parentheses. */
    leftParenToken: Token;
    /** The arguments to the function. */
    args: ExpressionList;
    /** The closing right parentheses, if it exists. */
    rightParenToken?: Token;
  };
  /** A parenthesized expression. */
  parenthesized?: {
    /** The opening left parentheses. */
    leftParenToken: Token;
    /** The inner expression. */
    expression: Expression;
    /** The closing right parentheses, if it exists. */
    rightParenToken?: Token;
  };
}

/** The result of a parse. */
export interface ParseResult {
  /** The parsed tokens. */
  tokens: Token[];
  /** Whether there were errors during parsing. */
  hasError: boolean;
  /**
   * The subset of `tokens` that are errors (`token.type` is `TokenType.ERROR`
   * or `token.errorType` has a value). Only populated if `hasError` is true.
   */
  errors: Token[];
  /**
   * Whether `expression` can be formatted.
   *
   * If there was an unrecoverable parsing error, such as an unclosed string,
   * this will be false.
   */
  canFormatExpression: boolean;
  /** The expression. If null, the input was all whitespace. */
  expression: Expression | null;
}

interface ParseState {
  /** The parsed tokens. */
  tokens: Token[];
}

/** Parses the given lines. */
export function parseLines(lines: string[]): ParseResult {
  const state: ParseState = { tokens: parseTokens(lines) };
  // formula := expressionOrEmpty
  const [endIndex, expression] = parseExpressionOrEmpty(state, 0);
  if (endIndex < state.tokens.length) {
    setErrorTypeIfNull(state.tokens[endIndex], TokenErrorType.UNEXPECTED_TOKEN);
  }
  let canFormatExpression = endIndex >= state.tokens.length;
  const errors = [];
  for (const token of state.tokens) {
    if (token.type === TokenType.ERROR || token.errorType !== undefined) {
      errors.push(token);
      if (
        token.errorType &&
        [
          TokenErrorType.UNCLOSED_STRING,
          TokenErrorType.UNCLOSED_QUOTES,
        ].includes(token.errorType)
      ) {
        // These errors are unrecoverable in terms of formatting.
        canFormatExpression = false;
      }
    }
  }
  return {
    tokens: state.tokens,
    hasError: errors.length > 0,
    errors,
    canFormatExpression,
    expression,
  };
}

function parseExpressionOrEmpty(
  state: ParseState,
  index: number
): [number, Expression | null] {
  // expressionOrEmpty := ( expression )?
  const result = parseExpression(state, index);
  if (result === null) {
    return [index, null];
  }
  return result;
}

function parseExpression(
  state: ParseState,
  index: number
): [number, Expression] | null {
  // expression := term ( op term )*
  if (index >= state.tokens.length) return null;
  const result = parseTerm(state, index);
  if (result === null) return null;
  let [endIndex, firstTerm] = result;
  const terms = [firstTerm];
  const operatorTokens = [];
  // Match as many operations as possible.
  while (endIndex < state.tokens.length) {
    const opToken = state.tokens[endIndex];
    if (!OPERATORS.includes(opToken.type)) break;
    const nextTerm = parseTerm(state, endIndex + 1);
    if (nextTerm === null) break;
    operatorTokens.push(opToken);
    terms.push(nextTerm[1]);
    endIndex = nextTerm[0];
  }
  return [endIndex, { terms, operatorTokens }];
}

function parseExpressionList(
  state: ParseState,
  index: number
): [number, ExpressionList] {
  // expressionList :=
  //   expressionOrEmpty ( TokenType.COMMA expressionOrEmpty )*
  let [endIndex, initialExpr] = parseExpressionOrEmpty(state, index);
  const expressions = [initialExpr];
  const commaTokens = [];
  while (endIndex < state.tokens.length) {
    const commaToken = state.tokens[endIndex];
    if (commaToken.type !== TokenType.COMMA) break;
    commaTokens.push(commaToken);
    const [newEndIndex, expression] = parseExpressionOrEmpty(
      state,
      endIndex + 1
    );
    expressions.push(expression);
    endIndex = newEndIndex;
  }
  if (
    expressions.length === 1 &&
    commaTokens.length === 0 &&
    expressions[0] === null
  ) {
    // No expressions in this list.
    expressions.splice(0);
  }
  return [endIndex, { expressions, commaTokens }];
}

function parseTerm(state: ParseState, start: number): [number, Term] | null {
  // term :=
  //  | arrayLiteral
  //  | functionCall
  //  | TokenType.L_PAREN expression TokenType.R_PAREN
  //  | literal
  if (start >= state.tokens.length) return null;
  const startToken = state.tokens[start];

  // Array literal.
  // arrayLiteral :=
  //   TokenType.L_BRACKET
  //     expressionList ( TokenType.SEMICOLON expressionList )*
  //   TokenType.R_BRACKET
  if (startToken.type === TokenType.L_BRACKET) {
    const term: Term = {
      type: TermType.ARRAY_LITERAL,
      arrayLiteral: {
        leftBracketToken: startToken,
        rows: [],
        semicolonTokens: [],
      },
    };
    const { rows, semicolonTokens } = term.arrayLiteral!;
    let [endIndex, initialExpressionList] = parseExpressionList(
      state,
      start + 1
    );
    rows.push(initialExpressionList);
    while (endIndex < state.tokens.length) {
      const token = state.tokens[endIndex];
      if (token.type === TokenType.R_BRACKET) {
        term.arrayLiteral!.rightBracketToken = token;
        endIndex++;
        break;
      }
      if (token.type !== TokenType.SEMICOLON) break;
      semicolonTokens.push(token);
      const [newEndIndex, expressionList] = parseExpressionList(
        state,
        endIndex + 1
      );
      rows.push(expressionList);
      endIndex = newEndIndex;
    }
    if (
      rows.length === 1 &&
      semicolonTokens.length === 0 &&
      (rows[0] === null || rows[0].expressions.length === 0)
    ) {
      // No rows in this array literal.
      rows.splice(0);
    }
    if (term.arrayLiteral!.rightBracketToken === undefined) {
      setErrorTypeIfNull(startToken, TokenErrorType.UNCLOSED_ARRAY);
    }
    return [endIndex, term];
  }

  // Function call.
  // functionCall :=
  //   TokenType.IDENTIFIER TokenType.L_PAREN expressionList TokenType.R_PAREN
  if (
    startToken.type === TokenType.IDENTIFIER &&
    start < state.tokens.length - 1 &&
    state.tokens[start + 1].type === TokenType.L_PAREN
  ) {
    let [endIndex, expressionList] = parseExpressionList(state, start + 2);
    const term: Term = {
      type: TermType.CALL,
      call: {
        functionToken: startToken,
        leftParenToken: state.tokens[start + 1],
        args: expressionList,
      },
    };
    if (
      endIndex < state.tokens.length &&
      state.tokens[endIndex].type === TokenType.R_PAREN
    ) {
      term.call!.rightParenToken = state.tokens[endIndex];
      endIndex++;
    } else {
      setErrorTypeIfNull(
        state.tokens[start + 1],
        TokenErrorType.UNCLOSED_FUNCTION_CALL
      );
    }
    return [endIndex, term];
  }

  // Parenthesized expression.
  if (startToken.type === TokenType.L_PAREN) {
    const result = parseExpression(state, start + 1);
    if (result !== null) {
      let [endIndex, expression] = result;
      const term: Term = {
        type: TermType.PARENTHESIZED,
        parenthesized: { leftParenToken: startToken, expression },
      };
      if (
        endIndex < state.tokens.length &&
        state.tokens[endIndex].type === TokenType.R_PAREN
      ) {
        term.parenthesized!.rightParenToken = state.tokens[endIndex];
        endIndex++;
      } else {
        setErrorTypeIfNull(startToken, TokenErrorType.UNCLOSED_PARENTHESES);
      }
      return [endIndex, term];
    }
  }

  // Literal.
  if (
    [
      TokenType.IDENTIFIER,
      TokenType.NUMBER,
      TokenType.STRING,
      TokenType.RANGE,
      TokenType.LITERAL,
      // Treat error token as a valid literal, since it is either an unknown
      // identifier or unclosed string.
      TokenType.ERROR,
    ].includes(startToken.type)
  ) {
    return [start + 1, { type: TermType.LITERAL, literal: startToken }];
  }

  // Unary operator.
  if (
    UNARY_OPERATORS.includes(startToken.type) &&
    start < state.tokens.length - 1
  ) {
    // Get the operand term.
    const operandTerm = parseTerm(state, start + 1);
    if (operandTerm !== null) {
      const [endIndex, operand] = operandTerm;
      // Only allow certain terms to be the operand.
      if (
        (operand.type === TermType.LITERAL &&
          [
            TokenType.LITERAL,
            TokenType.IDENTIFIER,
            TokenType.NUMBER,
            TokenType.RANGE,
          ].includes(operand.literal!.type)) ||
        [TermType.CALL, TermType.PARENTHESIZED].includes(operand.type)
      ) {
        return [
          endIndex,
          {
            type: TermType.UNARY_OP,
            unaryOp: { operatorToken: startToken, operand },
          },
        ];
      }
      // Found a valid term, but this operator token is not valid for the term
      // type.
      setErrorTypeIfNull(startToken, TokenErrorType.INVALID_UNARY_OPERAND);
    }
  }

  return null;
}

function setErrorTypeIfNull(token: Token, errorType: TokenErrorType) {
  if (token.errorType === undefined) {
    token.errorType = errorType;
  }
}
