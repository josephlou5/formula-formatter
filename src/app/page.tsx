"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import "./style.css";

interface Position {
  /** Line number (0-indexed). */
  lineNum: number;
  /** Column number right after the cursor (0-indexed). */
  colNum: number;
}

const TAB_SPACES = 2;
const ZERO_WIDTH_SPACE = "\u200B";

export default function Page() {
  const [text, setText] = useState("=");
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
    let newText = event.currentTarget.value;
    if (!newText.startsWith("=")) {
      // FIXME: When deleting the equals sign, the cursor jumps to the end.
      // FIXME: When the cursor is before the equals sign and the user types,
      // an equals sign will be inserted.
      newText = "=" + newText;
    }
    const newLines = newText.split("\n");
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
          <HighlightedLine lineNum={index} line={line} />
        </div>
      ))}
      <textarea
        ref={textareaRef}
        id="editor"
        className="form-control overflow-hidden"
        value={text}
        autoComplete="off"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        style={{
          // Not sure why `gridRowEnd: -1` doesn't work. Also feels so "hacky"
          // to do this.
          gridRowEnd: lines.length + 2,
        }}
      ></textarea>
    </div>
  );
}

/** Displays a highlighted line. */
function HighlightedLine({ lineNum, line }: { lineNum: number; line: string }) {
  if (!line) return <span className="indent-level">{ZERO_WIDTH_SPACE}</span>;

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

  const leadingTabs = [];
  for (let i = 0; i < numLeadingSpaces; i += TAB_SPACES) {
    const endIndex = Math.min(i + TAB_SPACES, numLeadingSpaces);
    leadingTabs.push(
      <span key={`line-${lineNum}-indent-${i}`} className="indent-level">
        {line.slice(i, endIndex)}
      </span>
    );
  }

  return (
    <>
      {leadingTabs}
      {line.slice(numLeadingSpaces, line.length - numTrailingSpaces)}
      {numTrailingSpaces > 0 && (
        <span className="trailing-spaces">
          {line.slice(line.length - numTrailingSpaces)}
        </span>
      )}
    </>
  );
}

/**
 * Converts the given index to its position.
 *
 * If `index` is out of bounds, returns the last position.
 */
function convertIndexToPosition(lines: string[], index: number): Position {
  if (index < 0) {
    return { lineNum: 0, colNum: 0 };
  }
  let currIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const endIndex = currIndex + lines[i].length;
    if (currIndex <= index && index <= endIndex) {
      return { lineNum: i, colNum: index - currIndex };
    }
    // Add one for the newline character.
    currIndex = endIndex + 1;
  }
  return { lineNum: lines.length - 1, colNum: lines[lines.length - 1].length };
}

/**
 * Converts the given position to its index.
 *
 * If `position.lineNum` is out of bounds, returns the last index.
 * If `position.colNum` is out of bounds, returns the last index in that line.
 */
function convertPositionToIndex(lines: string[], position: Position): number {
  const lineLengths = lines.map((line) => line.length);
  if (position.lineNum < 0) {
    return 0;
  }
  if (position.lineNum >= lines.length) {
    return lineLengths.reduce(
      (total, length) => total + length,
      lines.length - 1
    );
  }
  const lineOffset = lineLengths
    .slice(0, position.lineNum)
    .reduce((total, length) => total + length + 1, 0);
  const colOffset = Math.min(
    Math.max(0, position.colNum),
    lines[position.lineNum].length
  );
  return lineOffset + colOffset;
}
