/** Represents a position in text. */
export interface Position {
  /** Line number (0-indexed). */
  lineNum: number;
  /** Column number right after the cursor (0-indexed). */
  colNum: number;
}

/** Compares two Positions. */
export function cmpPositions(p1: Position, p2: Position): number {
  return p1.lineNum - p2.lineNum || p1.colNum - p2.colNum;
}

/** Returns a sorting function that compares objects by their positions. */
export function sortByPositions<T>(
  getPosition: (x: T) => Position
): (a: T, b: T) => number {
  return (a, b) => cmpPositions(getPosition(a), getPosition(b));
}

/**
 * Converts the given index to its position.
 *
 * If `index` is out of bounds, returns the last position.
 */
export function convertIndexToPosition(
  lines: string[],
  index: number
): Position {
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
export function convertPositionToIndex(
  lines: string[],
  position: Position
): number {
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
