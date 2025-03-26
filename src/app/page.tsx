"use client";

import Link from "next/link";

import { getCurrentVersion } from "./changelog/changelog";
import { TITLE } from "./metadata";

export default function Page() {
  return (
    <>
      <div className="mb-2">
        <span className="h1">{TITLE}</span>
        <span className="h6 fst-italic text-secondary ms-3">
          (
          <Link href="/changelog" className="text-reset">
            {getCurrentVersion()}
          </Link>
          )
        </span>
      </div>

      <div className="mb-2">Page Content</div>
    </>
  );
}
