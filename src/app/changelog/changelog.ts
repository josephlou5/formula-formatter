/** Represents a version number as its parts. */
export type VersionNumber = number[];

/** The change description of a version. */
export type Description = {
  text: string;
  children?: Description[];
};

/** Represents a version. */
export type Version = {
  version: VersionNumber;
  timestamp: string;
  description: Description[];
};

/** All the changes, sorted by decreasing version number. */
export const CHANGELOG: Version[] = [
  {
    version: [0, 1],
    timestamp: "2025-03-26 08:56",
    description: [{ text: "Initial commit" }],
  },
  {
    version: [0, 2],
    timestamp: "2025-03-27 09:24",
    description: [
      { text: "Made page fullscreen" },
      { text: "Moved current version number to the bottom" },
      { text: "Slightly reduced padding around the page" },
    ],
  },
  {
    version: [0, 3],
    timestamp: "2025-03-27 19:55",
    description: [{ text: "Added full-page textarea formula editor" }],
  },
  {
    version: [0, 4],
    timestamp: "2025-03-28 02:02",
    description: [
      { text: "Added indent and dedent functionality in editor using tab key" },
    ],
  },
  {
    version: [0, 5],
    timestamp: "2025-03-28 02:58",
    description: [{ text: "Added automatic height expansion to the editor" }],
  },
  {
    version: [0, 6],
    timestamp: "2025-03-28 21:57",
    description: [
      {
        text: "Added content overlay",
        children: [
          {
            text:
              "A lot of inspiration from " +
              "https://css-tricks.com/creating-an-editable-textarea-that-supports-syntax-highlighted-code/",
          },
          {
            text:
              "Switched to CSS grid, which made the overlay pretty much " +
              "trivial. Except I couldn't figure out some things without " +
              '"hacking" values into the element styles.',
          },
          {
            text:
              "Long lines will wrap, and line numbers are spaced " +
              "appropriately (thanks CSS grid!).",
          },
        ],
      },
    ],
  },
  {
    version: [0, 7],
    timestamp: "2025-03-28 21:59",
    description: [
      { text: "Added indent level rulers" },
      { text: "Added trailing space highlights" },
    ],
  },
  {
    version: [0, 8],
    timestamp: "2025-03-30 00:27",
    description: [
      { text: "Added token parsing" },
      { text: "Added token styles" },
      { text: "Added parse errors panel" },
    ],
  },
  {
    version: [0, 9],
    timestamp: "2025-03-30 00:47",
    description: [
      {
        text: "Added indent to textarea input",
        children: [
          { text: "This makes the equals sign uneditable and constant." },
        ],
      },
    ],
  },
  {
    version: [0, 10],
    timestamp: "2025-03-30 01:37",
    description: [{ text: "Fixed ESLint warning" }],
  },
  {
    version: [0, 11],
    timestamp: "2025-03-30 11:32",
    description: [
      {
        text: "Fixed injected equals sign",
        children: [
          {
            text:
              "The insertion into the actual text was causing issues due to " +
              "the input loop. Now the equals sign is injected into the " +
              "content overlay directly.",
          },
        ],
      },
    ],
  },
  {
    version: [0, 11],
    timestamp: "2025-03-30 11:35",
    description: [
      { text: "Updated keydown handler to properly process modifier keys" },
    ],
  },
  {
    version: [0, 12],
    timestamp: "2025-03-30 21:40",
    description: [
      {
        text: "Moved errors container to above the input",
        children: [
          { text: "This makes it easier to use on mobile or smaller screens." },
        ],
      },
      {
        text:
          "Added red highlight around the textarea when there is a parsing " +
          "error",
      },
      {
        text: "Fixed a few issues with line styling",
        children: [
          { text: "Empty lines show the first indent ruler again." },
          {
            text:
              "Trailing and leading spaces no longer compete (resulted in " +
              "rendering them twice).",
          },
          {
            text:
              "There may be stylized parts in the trailing whitespace (such " +
              "as errors), so don't render them twice.",
          },
        ],
      },
    ],
  },
  {
    version: [0, 13],
    timestamp: "2025-03-31 09:25",
    description: [
      {
        text: "Added support for named ranges in 'range' token",
        children: [
          { text: "Thanks to my sister for pointing out this was a thing." },
        ],
      },
    ],
  },
  {
    version: [0, 14],
    timestamp: "2025-03-31 14:40",
    description: [{ text: "Added support for missing operators" }],
  },
  {
    version: [0, 15],
    timestamp: "2025-03-31 17:08",
    description: [
      { text: "Updated token parser to output errors as regular tokens" },
    ],
  },
  {
    version: [0, 16],
    timestamp: "2025-04-01 20:47",
    description: [
      {
        text: "Added token semantic analysis",
        children: [
          {
            text:
              "Semantically incorrect tokens are now highlighted, such as " +
              "unclosed parentheses. The specific error messages are not " +
              "great yet.",
          },
        ],
      },
    ],
  },
  {
    version: [0, 17],
    timestamp: "2025-04-02 00:30",
    description: [
      { text: "Updated ESLint `prefer-const` rule (was blocking deploy)" },
      { text: "Updated some parsing logic" },
    ],
  },
  {
    version: [0, 18],
    timestamp: "2025-04-07 23:59",
    description: [
      { text: "Added preliminary formatter" },
      { text: "Added line width limit ruler" },
    ],
  },
  {
    version: [0, 19],
    timestamp: "2025-04-08 00:38",
    description: [
      { text: "Added more supported cases for terms with a unary operator" },
    ],
  },
  {
    version: [0, 20],
    timestamp: "2025-04-08 09:57",
    description: [
      { text: "Added user preferences to configure tab spaces and line width" },
    ],
  },
  {
    version: [0, 21],
    timestamp: "2025-04-08 21:03",
    description: [
      { text: "Removed indent level vertical lines for first line" },
    ],
  },
  {
    version: [0, 22],
    timestamp: "2025-04-08 21:14",
    description: [
      {
        text: "Added logic to remove leading equals signs from the first line",
        children: [
          {
            text:
              "This will make it easier to paste in formulas from Google " +
              "Sheets without needing to mind the equals sign. Previously " +
              "this would result in an immediate parse error.",
          },
        ],
      },
    ],
  },
  {
    version: [0, 23],
    timestamp: "2025-04-09 09:04",
    description: [{ text: "Updated preferences inputs" }],
  },
].sort((v1, v2) => -cmpVersions(v1.version, v2.version));

/** Returns the current version number as a string. */
export function getCurrentVersion(): string {
  let currVersion: VersionNumber = [];
  for (const version of CHANGELOG) {
    if (cmpVersions(version.version, currVersion) > 0) {
      currVersion = version.version;
    }
  }
  return versionToString(currVersion);
}

/** Compares two versions. */
function cmpVersions(version1: VersionNumber, version2: VersionNumber): number {
  for (let i = 0; i < Math.max(version1.length, version2.length); i++) {
    const v1 = version1[i] ?? 0;
    const v2 = version2[i] ?? 0;
    if (v1 < v2) return -1;
    if (v1 > v2) return 1;
  }
  return 0;
}

/** Converts a version to its string representation. */
export function versionToString(version: VersionNumber): string {
  if (version.length === 0) return "";
  return "v" + version.join(".");
}
