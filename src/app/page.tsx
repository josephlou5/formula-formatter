"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { parseTokens, TextRange } from "../parser/tokens";
import {
  convertIndexToPosition,
  convertPositionToIndex,
  Position,
  sortByPositions,
} from "../utils/position";

import "./style.css";

const TAB_SPACES = 2;

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
    const key = event.key;
    const shift = event.shiftKey;
    if (key === "Escape") {
      escRef.current = true;
      return;
    }
    (() => {
      if (key === "Tab") {
        if (escRef.current) {
          // Allow default behavior.
          return;
        }
        event.preventDefault();
        if (!textareaRef.current) return;

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
          if (shift) {
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
      }
    })();
    escRef.current = false;
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

  const parsedTokens = parseTokens(lines);
  // Combine the errors with the tokens so they can iterated over easily.
  const parsedTokensByLine = new Map<number, TokenSpan[]>();
  for (const token of parsedTokens.tokens) {
    const lineNum = token.startPosition.lineNum;
    if (!parsedTokensByLine.has(lineNum)) {
      parsedTokensByLine.set(lineNum, []);
    }
    parsedTokensByLine.get(lineNum)!.push({
      ...token,
      keyLabel: "token",
      className: `token-${token.type}`,
    });
  }
  for (const error of parsedTokens.errors) {
    const lineNum = error.startPosition.lineNum;
    if (!parsedTokensByLine.has(lineNum)) {
      parsedTokensByLine.set(lineNum, []);
    }
    parsedTokensByLine.get(lineNum)!.push({
      ...error,
      keyLabel: "error",
      className: "token-parse-error",
    });
  }
  for (const array of parsedTokensByLine.values()) {
    array.sort(sortByPositions((x) => x.startPosition));
  }

  return (
    <div
      id="editor-container"
      className="flex-grow-1 d-grid column-gap-2 mb-1"
      style={{
        // Couldn't figure out how to make this work without "hacking" the CSS
        // like this.
        gridTemplateRows: `repeat(${lines.length}, min-content) 1fr`,
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
          style={{ gridRow: index + 1 }}
        >
          {index + 1}
        </div>
      ))}
      {lines.map((line, index) => (
        <div
          key={`line-${index}`}
          className={`editor-content-overlay line-${index + 1}`}
          style={{ gridRow: index + 1 }}
        >
          <StylizedLine
            lineNum={index}
            line={line}
            tokenSpans={parsedTokensByLine.get(index) ?? []}
          />
        </div>
      ))}
      <textarea
        ref={textareaRef}
        id="editor"
        className="form-control overflow-hidden"
        value={text}
        autoComplete="off"
        spellCheck="false"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
      ></textarea>
      {parsedTokens.errors.length > 0 && (
        <div id="errors-status-container">
          <div className="fw-bold">Errors</div>
          <ul>
            {parsedTokens.errors.map((error) => {
              const loc = error.startPosition;
              const lineNum = loc.lineNum + 1;
              let colNum = loc.colNum + 1;
              if (lineNum === 1) {
                // Offset to account for the inserted equals sign.
                colNum++;
              }
              return (
                <li
                  key={`error-status-${loc.lineNum}-${loc.colNum}`}
                  className="status-error"
                >
                  Ln{lineNum}, Col{colNum}: {error.error}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

interface TokenSpan extends TextRange {
  keyLabel: string;
  className?: string;
}

/** Displays a stylized line. */
function StylizedLine({
  lineNum,
  line,
  tokenSpans,
}: {
  lineNum: number;
  line: string;
  tokenSpans: TokenSpan[];
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
        <span key={makeKey("empty")} className="indent-level"></span>
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
  for (let i = numTrailingSpaces; i < line.length; i++) {
    if (line[i] !== " ") break;
    numLeadingSpaces++;
  }

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

  // Stylized tokens. (Assume there are no tokens in whitespace).
  for (const {
    startPosition,
    endPosition,
    keyLabel,
    className,
    content,
  } of tokenSpans) {
    const startCol = startPosition.colNum;
    const endCol = endPosition.colNum;
    if (index < startCol) {
      lineElements.push(line.slice(index, startCol));
    }
    lineElements.push(
      <span key={makeKey(keyLabel, startCol)} className={className}>
        {content}
      </span>
    );
    index = endCol + 1;
  }
  if (index < line.length - numTrailingSpaces) {
    lineElements.push(line.slice(index, line.length - numTrailingSpaces));
  }

  // Trailing spaces.
  if (numTrailingSpaces > 0) {
    lineElements.push(
      <span key={makeKey("trailing-spaces")} className="trailing-spaces">
        {line.slice(line.length - numTrailingSpaces)}
      </span>
    );
  }

  return lineElements;
}
