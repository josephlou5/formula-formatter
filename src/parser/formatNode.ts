import {
  Expression,
  ExpressionList,
  ParseResult,
  Term,
  TermType,
} from "./parse";
import { Token } from "./tokens";

export enum WrapType {
  ENABLE,
  DETECT,
}

export enum FormatNodeType {
  /**
   * A list of nodes to be formatted.
   */
  NODES = "NODES",
  /**
   * A group to be formatted. If the entire group fits on one line, it is
   * rendered as such; otherwise, the nodes are wrapped.
   */
  GROUP = "GROUP",
  /**
   * A list of nodes to be formatted. If this node is in a group that was
   * wrapped, each line will be indented.
   */
  INDENT = "INDENT",
  /**
   * Plain text.
   */
  TEXT = "TEXT",
  /**
   * A child node of a group that renders as a space if the group is not wrapped
   * and renders as a line break if the group is wrapped.
   */
  SPACE_OR_LINE = "SPACE_OR_LINE",
  /**
   * A child node of a group that renders as a line break if the group is
   * wrapped (if not, does not render as anything).
   */
  LINE = "LINE",
}

export class FormatNode {
  /** DO NOT USE THE CONSTRUCTOR DIRECTLY. */
  constructor(
    readonly type: FormatNodeType,
    private readonly data: {
      nodes?: FormatNode[];
      text?: string;
    }
  ) {
    this.width = (() => {
      switch (this.type) {
        case FormatNodeType.NODES:
        case FormatNodeType.GROUP:
        case FormatNodeType.INDENT:
          return (
            this.getNodes().reduce((total, node) => total + node.width, 0) ?? 0
          );
        case FormatNodeType.TEXT:
          return this.getText().length;
        case FormatNodeType.SPACE_OR_LINE:
          return 1;
        case FormatNodeType.LINE:
          return 0;
      }
    })();
  }

  /** The full width of this node. */
  readonly width: number;

  static makeNodes(nodes: FormatNode[]): FormatNode {
    return new FormatNode(FormatNodeType.NODES, { nodes });
  }

  static makeGroup(nodes: FormatNode[]): FormatNode {
    return new FormatNode(FormatNodeType.GROUP, { nodes });
  }

  static makeIndent(nodes: FormatNode[]): FormatNode {
    return new FormatNode(FormatNodeType.INDENT, { nodes });
  }

  static makeText(text: string): FormatNode {
    return new FormatNode(FormatNodeType.TEXT, { text });
  }

  static makeTokenText(token: Token): FormatNode {
    return FormatNode.makeText(token.content);
  }

  static makeSpaceOrLine(): FormatNode {
    return new FormatNode(FormatNodeType.SPACE_OR_LINE, {});
  }

  static makeLine(): FormatNode {
    return new FormatNode(FormatNodeType.LINE, {});
  }

  /**
   * Gets the list of nodes.
   *
   * Type must be `NODES`, `GROUP`, or `INDENT`.
   */
  getNodes(): FormatNode[] {
    return this.data.nodes!;
  }

  /**
   * Gets the text.
   *
   * Type must be `STRING`.
   */
  getText(): string {
    return this.data.text!;
  }
}

/** Builds a format node from a parsed expression. */
export function buildFormatNode(parseResult: ParseResult): FormatNode {
  const { expression } = parseResult;
  if (expression === null) {
    return FormatNode.makeText("");
  }
  return buildExpression(expression);
}

function buildExpression(expression: Expression): FormatNode {
  const {
    terms: [initialTerm, ...terms],
    operatorTokens,
  } = expression;
  return FormatNode.makeGroup(
    [buildTerm(initialTerm)].concat(
      operatorTokens.flatMap((operator, i) => [
        FormatNode.makeText(" "),
        FormatNode.makeTokenText(operator),
        FormatNode.makeSpaceOrLine(),
        buildTerm(terms[i]),
      ])
    )
  );
}

function buildExpressionList(expressionList: ExpressionList): FormatNode {
  const { expressions, commaTokens } = expressionList;
  if (expressions.length === 0) {
    // Return a blank node so that this empty expression list does not render.
    return FormatNode.makeText("");
  }
  const nodes = [];
  if (expressions[0] !== null) {
    nodes.push(buildExpression(expressions[0]));
  }
  for (let i = 0; i < commaTokens.length; i++) {
    nodes.push(FormatNode.makeTokenText(commaTokens[i]));
    const expr = expressions[i + 1];
    if (expr !== null) {
      nodes.push(FormatNode.makeSpaceOrLine());
      nodes.push(buildExpression(expr));
    }
  }
  return FormatNode.makeGroup(nodes);
}

function buildTerm(term: Term): FormatNode {
  switch (term.type) {
    case TermType.LITERAL:
      return FormatNode.makeNodes([FormatNode.makeTokenText(term.literal!)]);
    case TermType.UNARY_OP: {
      const { operatorToken, operand } = term.unaryOp!;
      return FormatNode.makeNodes(
        [FormatNode.makeTokenText(operatorToken)].concat(buildTerm(operand))
      );
    }
    case TermType.ARRAY_LITERAL: {
      const { leftBracketToken, rows, semicolonTokens, rightBracketToken } =
        term.arrayLiteral!;
      const nodes = [FormatNode.makeTokenText(leftBracketToken)];
      if (rows.length > 0) {
        const indentNodes = [];
        if (rows[0].expressions.length > 0) {
          indentNodes.push(buildExpressionList(rows[0]));
        }
        for (let i = 0; i < semicolonTokens.length; i++) {
          indentNodes.push(FormatNode.makeTokenText(semicolonTokens[i]));
          const row = rows[i + 1];
          if (row.expressions.length > 0) {
            indentNodes.push(FormatNode.makeSpaceOrLine());
            indentNodes.push(buildExpressionList(row));
          }
        }
        nodes.push(
          FormatNode.makeLine(),
          FormatNode.makeIndent(indentNodes),
          FormatNode.makeLine()
        );
      }
      if (rightBracketToken !== undefined) {
        nodes.push(FormatNode.makeTokenText(rightBracketToken));
      }
      return FormatNode.makeGroup(nodes);
    }
    case TermType.CALL: {
      const { functionToken, leftParenToken, args, rightParenToken } =
        term.call!;
      const nodes = [
        FormatNode.makeTokenText(functionToken),
        FormatNode.makeTokenText(leftParenToken),
      ];
      if (args.expressions.length > 0) {
        nodes.push(
          FormatNode.makeLine(),
          FormatNode.makeIndent([buildExpressionList(args)]),
          FormatNode.makeLine()
        );
      }
      if (rightParenToken !== undefined) {
        nodes.push(FormatNode.makeTokenText(rightParenToken));
      }
      return FormatNode.makeGroup(nodes);
    }
    case TermType.PARENTHESIZED: {
      const { leftParenToken, expression, rightParenToken } =
        term.parenthesized!;
      const nodes = [
        FormatNode.makeTokenText(leftParenToken),
        FormatNode.makeLine(),
        FormatNode.makeIndent([buildExpression(expression)]),
        FormatNode.makeLine(),
      ];
      if (rightParenToken !== undefined) {
        nodes.push(FormatNode.makeTokenText(rightParenToken));
      }
      return FormatNode.makeGroup(nodes);
    }
  }
}
