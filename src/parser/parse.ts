import {
  OPERATORS,
  parseTokens,
  Token,
  TokenType,
  UNARY_OPERATORS,
} from "./tokens";

/** A list of expressions, some of which may be null (empty). */
export interface ExpressionList {
  /** The expressions in this list. */
  expressions: Array<Expression | null>;
  /**
   * The commas separating these arguments.
   *
   * Invariant: `commaTokens.length` === `args.length` - 1
   */
  commaTokens: Token[];
}

/**
 * A term.
 *
 * Invariant: Exactly one of these properties will be set.
 */
export interface Term {
  /**
   * A literal value.
   *
   * A unary operator and a literal will result in two tokens.
   */
  literal?: Token | [Token, Token];
  /** An array literal. */
  arrayLiteral?: {
    /** The opening left bracket. */
    leftBracketToken: Token;
    /** The rows of values. */
    rows: ExpressionList[];
    /**
     * The semicolons separating the rows.
     *
     * Invariant: `semicolonTokens.length` === `rows.length` - 1
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

/** An expression. */
export interface Expression {
  /** The terms in this expression. */
  terms: Term[];
  /**
   * The operators joining this terms.
   *
   * Invariant: `operatorTokens.length` === `terms.length` - 1
   */
  operatorTokens: Token[];
}

/** The result of a parse. */
export interface ParseResult {
  /** The parsed tokens. */
  tokens: Token[];
  /** Whether there were errors during parsing. */
  hasError: boolean;
  /**
   * The subset of `tokens` that are errors (`token.type` is `TokenType.ERROR`
   * or `token.error` has a value). Only populated if `hasError` is true.
   */
  errors: Token[];
  /** The expression. If null, the input was all whitespace. */
  expression: Expression | null;
}

export function parseLines(lines: string[]): ParseResult {
  return new Parser(lines).parse();
}

class Parser {
  constructor(lines: string[]) {
    this.tokens = parseTokens(lines);
  }

  private tokens: Token[];

  parse(): ParseResult {
    // formula := expressionOrEmpty
    const [endIndex, expression] = this.parseExpressionOrEmpty(0);
    if (endIndex < this.tokens.length && !this.tokens[endIndex].error) {
      this.tokens[endIndex].error = "Parse error: unexpected token";
    }
    const errors = this.tokens.filter(
      (token) => token.type === TokenType.ERROR || !!token.error
    );
    return {
      tokens: this.tokens,
      hasError: errors.length > 0,
      errors,
      expression,
    };
  }

  private parseExpressionOrEmpty(index: number): [number, Expression | null] {
    // expressionOrEmpty := ( expression )?
    const result = this.parseExpression(index);
    if (result === null) {
      return [index, null];
    }
    return result;
  }

  private parseExpression(index: number): [number, Expression] | null {
    // expression := term ( op term )*
    if (index >= this.tokens.length) return null;
    const result = this.parseTerm(index);
    if (result === null) return null;
    let [endIndex, firstTerm] = result;
    const terms = [firstTerm];
    const operatorTokens = [];
    // Match as many operations as possible.
    while (endIndex < this.tokens.length) {
      const opToken = this.tokens[endIndex];
      if (!OPERATORS.includes(opToken.type)) break;
      const nextTerm = this.parseTerm(endIndex + 1);
      if (nextTerm === null) break;
      operatorTokens.push(opToken);
      terms.push(nextTerm[1]);
      endIndex = nextTerm[0];
    }
    return [endIndex, { terms, operatorTokens }];
  }

  private parseExpressionList(index: number): [number, ExpressionList] {
    // expressionList :=
    //   expressionOrEmpty ( TokenType.COMMA expressionOrEmpty )*
    let [endIndex, initialExpr] = this.parseExpressionOrEmpty(index);
    const expressions = [initialExpr];
    const commaTokens = [];
    while (endIndex < this.tokens.length) {
      const commaToken = this.tokens[endIndex];
      if (commaToken.type !== TokenType.COMMA) break;
      commaTokens.push(commaToken);
      const [newEndIndex, expression] = this.parseExpressionOrEmpty(
        endIndex + 1
      );
      expressions.push(expression);
      endIndex = newEndIndex;
    }
    return [endIndex, { expressions, commaTokens }];
  }

  private parseTerm(start: number): [number, Term] | null {
    // term :=
    //  | arrayLiteral
    //  | functionCall
    //  | TokenType.L_PAREN expression TokenType.R_PAREN
    //  | literal
    if (start >= this.tokens.length) return null;
    const startToken = this.tokens[start];

    // Array literal.
    // arrayLiteral :=
    //   TokenType.L_BRACKET
    //     expressionList ( TokenType.SEMICOLON expressionList )*
    //   TokenType.R_BRACKET
    if (startToken.type === TokenType.L_BRACKET) {
      const term: Term = {
        arrayLiteral: {
          leftBracketToken: startToken,
          rows: [],
          semicolonTokens: [],
        },
      };
      const { rows, semicolonTokens } = term.arrayLiteral!;
      let [endIndex, initialExpressionList] = this.parseExpressionList(
        start + 1
      );
      rows.push(initialExpressionList);
      while (endIndex < this.tokens.length) {
        const token = this.tokens[endIndex];
        if (token.type === TokenType.R_BRACKET) {
          term.arrayLiteral!.rightBracketToken = token;
          endIndex++;
          break;
        }
        if (token.type !== TokenType.SEMICOLON) break;
        semicolonTokens.push(token);
        const [newEndIndex, expressionList] = this.parseExpressionList(
          endIndex + 1
        );
        rows.push(expressionList);
        endIndex = newEndIndex;
      }
      if (
        term.arrayLiteral!.rightBracketToken === undefined &&
        !startToken.error
      ) {
        startToken.error = "Unclosed array literal";
      }
      return [endIndex, term];
    }

    // Function call.
    // functionCall :=
    //   TokenType.IDENTIFIER TokenType.L_PAREN expressionList TokenType.R_PAREN
    if (
      startToken.type === TokenType.IDENTIFIER &&
      start < this.tokens.length - 1 &&
      this.tokens[start + 1].type === TokenType.L_PAREN
    ) {
      let [endIndex, expressionList] = this.parseExpressionList(start + 2);
      const term: Term = {
        call: {
          functionToken: startToken,
          leftParenToken: this.tokens[start + 1],
          args: expressionList,
        },
      };
      if (
        endIndex < this.tokens.length &&
        this.tokens[endIndex].type === TokenType.R_PAREN
      ) {
        term.call!.rightParenToken = this.tokens[endIndex];
        endIndex++;
      } else if (!this.tokens[start + 1].error) {
        this.tokens[start + 1].error = "Unclosed function call";
      }
      return [endIndex, term];
    }

    // Parenthesized expression.
    if (startToken.type === TokenType.L_PAREN) {
      const result = this.parseExpression(start + 1);
      if (result !== null) {
        let [endIndex, expression] = result;
        const term: Term = {
          parenthesized: { leftParenToken: startToken, expression },
        };
        if (
          endIndex < this.tokens.length &&
          this.tokens[endIndex].type === TokenType.R_PAREN
        ) {
          term.parenthesized!.rightParenToken = this.tokens[endIndex];
          endIndex++;
        } else if (!startToken.error) {
          startToken.error = "Unclosed parentheses";
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
      return [start + 1, { literal: startToken }];
    }
    if (
      UNARY_OPERATORS.includes(startToken.type) &&
      start < this.tokens.length - 1 &&
      this.tokens[start + 1].type === TokenType.NUMBER
    ) {
      return [start + 2, { literal: [startToken, this.tokens[start + 1]] }];
    }

    return null;
  }
}
