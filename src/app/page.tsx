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
    textareaRef.current.style.height = "1px";
    textareaRef.current.style.height = `max(${textareaRef.current.scrollHeight}px, 100%)`;
    textareaRef.current.style.width = "1px";
    textareaRef.current.style.width = `max(${textareaRef.current.scrollWidth}px, 100%)`;
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
          } else if (lineNum === endPos.lineNum) {
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
    <div className="flex-grow-1 d-flex">
      <div
        className="d-flex flex-column text-end text-secondary me-2"
        style={{ paddingTop: "5px" }}
      >
        {lines.map((line, index) => (
          <div key={index} className="editor-font">
            {index + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        id="editor"
        className="form-control editor-font overflow-y-hidden p-1"
        style={{ width: "100%", height: "100%" }}
        value={text}
        autoComplete="off"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
      ></textarea>
    </div>
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
