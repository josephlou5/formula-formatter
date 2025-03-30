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
