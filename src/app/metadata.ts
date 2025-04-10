import { Metadata } from "next";

/** Title of the app. */
export const TITLE = "Formula Formatter";
/** GitHub repo name (which becomes the base path). */
export const BASE_PATH = "formula-formatter";

export const GITHUB_LINK = `https://github.com/josephlou5/${BASE_PATH}`;

/** Creates Metadata for a page. */
export function metadataForPage(pageTitle: string = ""): Metadata {
  let title = TITLE;
  if (pageTitle) {
    title += ` - ${pageTitle}`;
  }
  return {
    title,
    applicationName: TITLE,
    description: "A static webpage to format Google Sheets Formulas.",
  };
}
