"use client";

import { TITLE } from "./metadata";

export default function Page() {
  return (
    <>
      <div className="h1 mb-2">{TITLE}</div>

      <div className="mb-2">Page Content</div>
    </>
  );
}
