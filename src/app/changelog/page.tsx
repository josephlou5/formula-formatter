import { metadataForPage } from "../metadata";
import { CHANGELOG, Description, versionToString } from "./changelog";

export const metadata = metadataForPage("Changelog");

/** Changelog for this project. */
export default function Page() {
  return (
    <>
      <div className="h1">Changelog</div>

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
