/**
 * Formats a parsed AST into text.
 *
 * Base work comes from Philip Wadler's paper "A prettier printer":
 * https://homepages.inf.ed.ac.uk/wadler/papers/prettier/prettier.pdf
 *
 * Implementation inspired from:
 * https://yorickpeterse.com/articles/how-to-write-a-code-formatter/
 */

import { ParseResult } from "./parse";
import {
  buildFormatNode,
  FormatNode,
  FormatNodeType,
  WrapType,
} from "./formatNode";
import { UserPreferences } from "../app/preferences";

const SPACE = " ";

/**
 * Formats the given parse result as lines.
 *
 * Assumes `parseResult.canFormatExpression` is true.
 */
export function formatLines(
  parseResult: ParseResult,
  userPreferences: UserPreferences
): string[] {
  const node = buildFormatNode(parseResult);
  const state: FormatState = {
    LINE_WIDTH: userPreferences.lineWidth,
    TAB: SPACE.repeat(userPreferences.tabSpaces),
    linesBuffer: [[]],
    indentLevel: 0,
    // Start first line width as 1 to account for the inserted equals sign.
    currLineWidth: 1,
  };
  formatNode(state, node, WrapType.DETECT);
  return state.linesBuffer.map((line) => line.join(""));
}

interface FormatState {
  // Constants.
  LINE_WIDTH: number;
  TAB: string;

  // Mutable state.
  linesBuffer: string[][];
  indentLevel: number;
  currLineWidth: number;
}

function formatNode(state: FormatState, node: FormatNode, wrapType: WrapType) {
  switch (node.type) {
    case FormatNodeType.GROUP:
      if (state.currLineWidth + node.width > state.LINE_WIDTH) {
        // Propagate wrapped status to children.
        wrapType = WrapType.ENABLE;
      } else {
        wrapType = WrapType.DETECT;
      }
    // Fallthrough.
    case FormatNodeType.NODES:
      node.getNodes().forEach((child) => formatNode(state, child, wrapType));
      break;
    case FormatNodeType.INDENT:
      const needsIndent = wrapType === WrapType.ENABLE;
      if (needsIndent) {
        // Indent.
        state.indentLevel++;
        insertText(state, state.TAB);
      }
      // Process child nodes.
      node.getNodes().forEach((child) => formatNode(state, child, wrapType));
      if (needsIndent) {
        // Dedent.
        state.indentLevel--;
      }
      break;
    case FormatNodeType.TEXT:
      insertText(state, node.getText());
      break;
    case FormatNodeType.SPACE_OR_LINE:
      if (wrapType === WrapType.ENABLE) {
        insertLine(state);
      } else {
        insertText(state, SPACE);
      }
      break;
    case FormatNodeType.LINE:
      if (wrapType === WrapType.ENABLE) {
        insertLine(state);
      }
      break;
    default:
      const checkExhaustive: never = node.type;
      throw new Error(`Unhandled node type: ${checkExhaustive}`);
  }
}

function insertText(state: FormatState, text: string) {
  if (text.length === 0) return;
  state.linesBuffer[state.linesBuffer.length - 1].push(text);
  state.currLineWidth += text.length;
}

function insertLine(state: FormatState) {
  // Start new line with the proper indentation level.
  const newLineTab = state.TAB.repeat(state.indentLevel);
  state.linesBuffer.push([newLineTab]);
  state.currLineWidth = newLineTab.length;
}
