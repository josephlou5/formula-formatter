"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { formatLines } from "../parser/format";
import { parseLines } from "../parser/parse";
import { Token, tokenErrorMessage, TokenType } from "../parser/tokens";
import { makeClassName } from "../utils/className";
import { LINE_WIDTH, TAB_SPACES } from "../utils/constants";
import {
  convertIndexToPosition,
  convertPositionToIndex,
  Position,
} from "../utils/position";

import "./style.css";

const FORMAT_KEYBINDS = new Set(["M-KeyS", "A-S-KeyF", "M-A-KeyL"]);

export default function Page() {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: Position; end: Position }>({
    start: { lineNum: 0, colNum: 1 },
    end: { lineNum: 0, colNum: 1 },
  });
  const escRef = useRef(false);

  const lines = text.split("\n");

  useEffect(() => {
    if (!textareaRef.current) return;
    const { start, end } = selectionRef.current;
    const startIndex = Math.max(1, convertPositionToIndex(lines, start));
    const endIndex = Math.max(startIndex, convertPositionToIndex(lines, end));
    textareaRef.current.setSelectionRange(startIndex, endIndex);
  });

  function setLines(lines: string[]) {
    setText(lines.join("\n"));
  }

  function handleTextareaSizing() {
    if (!textareaRef.current) return;
    // Make the height small so that `scrollHeight` is calculated to be the
    // minimum content height.
    textareaRef.current.style.height = "1px";
    // Account for the top padding of the textarea.
    textareaRef.current.style.height = `max(calc(0.25rem + ${textareaRef.current.scrollHeight}px), 100%)`;
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const newLines = event.currentTarget.value.split("\n");
    // Update the selection.
    handleSelect(event, newLines);
    setLines(newLines);
    handleTextareaSizing();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      escRef.current = true;
      return;
    }
    if (["Meta", "Control", "Alt", "Shift"].includes(event.key)) {
      // Don't do anything if only modifier keys are pressed.
      return;
    }
    if (escRef.current) {
      // Allow default behavior.
      escRef.current = false;
      return;
    }
    const key = [
      event.metaKey ? "M-" : "",
      event.ctrlKey ? "C-" : "",
      event.altKey ? "A-" : "",
      event.shiftKey ? "S-" : "",
      event.code,
    ].join("");
    if (["Tab", "S-Tab"].includes(key)) {
        if (!textareaRef.current) return;
        event.preventDefault();

        // Indent or dedent the lines containing the current selection.
        const startPos = convertIndexToPosition(
          lines,
          textareaRef.current.selectionStart
        );
        const endPos = convertIndexToPosition(
          lines,
          textareaRef.current.selectionEnd
        );

        const newLines = [...lines];
        for (
          let lineNum = startPos.lineNum;
          lineNum <= endPos.lineNum;
          lineNum++
        ) {
          if (lineNum === 0) {
            // Don't change the first line because it has the equal sign.
            continue;
          }
          const line = newLines[lineNum];
          const prevLength = line.length;
          if (prevLength === 0) continue;
          // Find out how many tabs there are at the start.
          let numSpaces = 0;
          for (let i = 0; i < line.length; i++) {
            if (line[i] !== " ") break;
            numSpaces++;
          }
          let numTabs = Math.floor(numSpaces / TAB_SPACES);
          if (key === "S-Tab") {
            // Dedent.
            if (numSpaces % TAB_SPACES === 0) {
              // Exact number of tabs, so decrease indentation level.
              numTabs = Math.max(0, numTabs - 1);
            } else {
              // Clamp to this indentation level (remove extra spaces).
            }
          } else {
            // Indent.
            numTabs++;
          }
          newLines[lineNum] =
            " ".repeat(TAB_SPACES * numTabs) + line.slice(numSpaces);

          const lengthDelta = newLines[lineNum].length - prevLength;
          if (lineNum === startPos.lineNum) {
            startPos.colNum += lengthDelta;
          }
          if (lineNum === endPos.lineNum) {
            endPos.colNum += lengthDelta;
          }
        }
        // Update the new selection.
        selectionRef.current.start = startPos;
        selectionRef.current.end = endPos;

        setLines(newLines);
      return;
    }
    if (FORMAT_KEYBINDS.has(key)) {
      event.preventDefault();
      if (parseResult.canFormatExpression) {
        setLines(formatLines(parseResult));
      }
      return;
      }
  }

  function handleSelect(
    { currentTarget }: SyntheticEvent<HTMLTextAreaElement>,
    currLines: string[] | null = null
  ) {
    currLines ??= lines;
    selectionRef.current.start = convertIndexToPosition(
      currLines,
      currentTarget.selectionStart
    );
    selectionRef.current.end = convertIndexToPosition(
      currLines,
      currentTarget.selectionEnd
    );
  }

  const parseResult = parseLines(lines);
  // Group the tokens by line.
  const tokensByLine = new Map<number, Token[]>();
  for (const token of parseResult.tokens) {
    const lineNum = token.startPosition.lineNum;
    if (!tokensByLine.has(lineNum)) {
      tokensByLine.set(lineNum, []);
    }
    tokensByLine.get(lineNum)!.push(token);
  }

  return (
    <div
      id="editor-container"
      className="flex-grow-1 d-grid column-gap-2 mb-1"
      style={{
        // Couldn't figure out how to make this work without "hacking" the CSS
        // like this.
        // Number of rows = 1 error row + number of lines + 1 dummy row to fill
        // remaining space.
        gridTemplateRows: `repeat(${1 + lines.length}, min-content) 1fr`,
      }}
    >
      {
        // There is technically no reason to split up the line numbers and the
        // line contents, but it looks nicer in the HTML.
      }
      {lines.map((line, index) => (
        <div
          key={`line-num-${index}`}
          className={`editor-line-num line-${index + 1}`}
          style={{ gridRow: index + 2 }}
        >
          {index + 1}
        </div>
      ))}
      {parseResult.hasError && (
        <div id="errors-container">
          <div className="fw-bold">Errors</div>
          <ul>
            {parseResult.errors.map((error) => {
              const loc = error.startPosition;
              const lineNum = loc.lineNum + 1;
              let colNum = loc.colNum + 1;
              if (lineNum === 1) {
                // Offset to account for the inserted equals sign.
                colNum++;
              }
              return (
                <li key={`error-${loc.lineNum}-${loc.colNum}`}>
                  Ln{lineNum}, Col{colNum}: {tokenErrorMessage(error.errorType)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {lines.map((line, index) => (
        <div
          key={`line-${index}`}
          className={`editor-content-overlay line-${index + 1}`}
          style={{ gridRow: index + 2 }}
        >
          <StylizedLine
            lineNum={index}
            line={line}
            lineTokens={tokensByLine.get(index) ?? []}
          />
        </div>
      ))}
      <div
        className="line-width-ruler"
        style={{ width: `${LINE_WIDTH}ch` }}
      ></div>
      <textarea
        ref={textareaRef}
        id="editor"
        className={makeClassName({
          "form-control": true,
          "overflow-hidden": true,
          "is-invalid": parseResult.hasError,
        })}
        value={text}
        autoComplete="off"
        spellCheck="false"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
      ></textarea>
    </div>
  );
}

/** Displays a stylized line. */
function StylizedLine({
  lineNum,
  line,
  lineTokens,
}: {
  lineNum: number;
  line: string;
  lineTokens: Token[];
}) {
  function makeKey(key: string, index?: number) {
    let fullKey = `line-${lineNum}-${key}`;
    if (index != null) {
      fullKey = `${fullKey}-${index}`;
    }
    return fullKey;
  }

  const lineElements = [];
  let index = 0;
  if (lineNum === 0) {
    // Special case: add the leading equals sign.
    lineElements.push("=");
  }

  if (!line) {
    if (lineElements.length === 0) {
      lineElements.push(
        <span key={makeKey("empty")} className="indent-level">
          &nbsp;
        </span>
      );
    }
    return lineElements;
  }

  let numTrailingSpaces = 0;
  for (let i = line.length - 1; i >= 0; i--) {
    if (line[i] !== " ") break;
    numTrailingSpaces++;
  }
  let numLeadingSpaces = 0;
  if (numTrailingSpaces < line.length) {
    for (let i = 0; i < line.length; i++) {
    if (line[i] !== " ") break;
    numLeadingSpaces++;
  }
  }
  const trailingSpacesIndex = line.length - numTrailingSpaces;

  // Leading tabs.
  while (index < numLeadingSpaces) {
    const endIndex = Math.min(index + TAB_SPACES, numLeadingSpaces);
    lineElements.push(
      <span key={makeKey("indent", index)} className="indent-level">
        {line.slice(index, endIndex)}
      </span>
    );
    index = endIndex;
  }

  // Stylized tokens. (Assume there are no tokens in leading whitespace).
  for (const token of lineTokens) {
    const startCol = token.startPosition.colNum;
    const endCol = token.endPosition.colNum;
    if (index < startCol) {
      lineElements.push(line.slice(index, startCol));
    }
    lineElements.push(
      <span
        key={makeKey("token", startCol)}
        className={makeClassName({
          [`token-${token.type}`]: true,
          [`token-${TokenType.ERROR}`]: !!token.errorType,
        })}
      >
        {token.content}
      </span>
    );
    index = endCol + 1;
  }
  if (index < trailingSpacesIndex) {
    lineElements.push(line.slice(index, trailingSpacesIndex));
  }

  // Trailing spaces. There might be a conflict with tokens here, if there was
  // a parse error with the rest of the line.
  if (numTrailingSpaces > 0 && index < line.length) {
    lineElements.push(
      <span key={makeKey("trailing-spaces")} className="trailing-spaces">
        {line.slice(Math.max(index, trailingSpacesIndex))}
      </span>
    );
  }

  return lineElements;
}
