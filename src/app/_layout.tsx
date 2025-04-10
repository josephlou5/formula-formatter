"use client";

import Link from "next/link";
import {
  useSelectedLayoutSegment,
  useSelectedLayoutSegments,
} from "next/navigation";
import { useEffect } from "react";

import { getCurrentVersion } from "./changelog/changelog";
import { BASE_PATH, GITHUB_LINK } from "./metadata";
import { PREFERENCES_PANE_ID } from "./preferences";

const NOT_FOUND_SEGMENT = "/_not-found";

/** Dynamically imports Bootstrap JS on the client side. */
export function BootstrapJs() {
  useEffect(() => {
    import("bootstrap");
  }, []);

  return null;
}

/** Displays breadcrumbs for page navigation. */
export function Breadcrumbs() {
  const segments = useSelectedLayoutSegments();
  if (segments.includes(NOT_FOUND_SEGMENT)) {
    // This is a "not found" page. Don't show the breadcrumbs.
    return <></>;
  }
  // In local development, the base path is "/". In GitHub Pages, the base path
  // is automatically injected, but `segments` doesn't include it. So we need to
  // manually add it in every time.
  segments.unshift(BASE_PATH);

  const href: string[] = [];
  return (
    <div className="d-flex justify-content-between">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link href="../">Home</Link>
          </li>
          {segments.map((segment, i) => {
            const segmentTitle = segment
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            if (i === segments.length - 1) {
              // Active page and last breadcrumb.
              return (
                <li
                  key={i}
                  className="breadcrumb-item active"
                  aria-current="page"
                >
                  {segmentTitle}
                </li>
              );
            }
            if (i > 0) {
              // Skip the base path in the link, since the links are built
              // relative to it already.
              href.push(segment);
            }
            return (
              <li key={i} className="breadcrumb-item">
                <Link href={"/" + href.join("/")}>{segmentTitle}</Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <div>
        <Link href="/about" className="btn p-0">
          <i
            className="bi bi-question-circle"
            style={{ fontSize: "1.2em" }}
          ></i>
        </Link>
        {segments.length === 1 && (
          // Only show preferences button on actual formatter page.
          <button
            type="button"
            className="btn p-0 ms-2 me-1"
            data-bs-toggle="offcanvas"
            data-bs-target={`#${PREFERENCES_PANE_ID}`}
            aria-controls={PREFERENCES_PANE_ID}
          >
            <i className="bi bi-gear" style={{ fontSize: "1.2em" }}></i>
          </button>
        )}
      </div>
    </div>
  );
}

/** Displays a page footer. */
export function Footer() {
  const segment = useSelectedLayoutSegment();
  if (segment === NOT_FOUND_SEGMENT) return <></>;
  if (segment === "changelog") {
    // Don't show the changelog footer in the changelog page.
    return <></>;
  }

  return (
    <div className="text-secondary" style={{ fontSize: "0.8em" }}>
      Version:{" "}
      <Link href="/changelog" className="text-reset">
        {getCurrentVersion()}
      </Link>
      . See the source code at{" "}
      <a href={GITHUB_LINK} target="_blank">
        {GITHUB_LINK}
      </a>
      .
    </div>
  );
}
