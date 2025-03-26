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
    timestamp: "TODO",
    description: [{ text: "Initial release" }],
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
