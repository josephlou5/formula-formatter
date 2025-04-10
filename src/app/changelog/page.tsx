import { GITHUB_LINK, metadataForPage } from "../metadata";
import { CHANGELOG, Description, versionToString } from "./changelog";

export const metadata = metadataForPage("Changelog");

/** Changelog for this project. */
export default function Page() {
  return (
    <>
      <div className="h1">Changelog</div>

      <div className="mb-3">
        See the source code at{" "}
        <a href={GITHUB_LINK} target="_blank">
          {GITHUB_LINK}
        </a>
        .
      </div>

      {CHANGELOG.map((version, i) => (
        <div key={i} className="mb-2">
          <div>
            <span className="fs-4">{versionToString(version.version)}</span>
            <span className="fst-italic text-muted ms-3">
              {version.timestamp}
            </span>
          </div>
          <VersionDescriptions descriptions={version.description} />
        </div>
      ))}
    </>
  );
}

/** Recursively displays an array of version descriptions. */
function VersionDescriptions({
  descriptions,
}: {
  descriptions: Description[];
}) {
  return (
    <ul>
      {descriptions.map((desc, i) => (
        <li key={i}>
          {desc.text}
          {desc.children && (
            <VersionDescriptions descriptions={desc.children} />
          )}
        </li>
      ))}
    </ul>
  );
}
