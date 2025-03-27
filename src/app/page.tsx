"use client";

import { ChangeEvent, useState } from "react";

import "./style.css";

export default function Page() {
  const [text, setText] = useState("=");

  function onChange(event: ChangeEvent<HTMLTextAreaElement>) {
    let newText = event.target.value;
    if (!newText.startsWith("=")) {
      // FIXME: When deleting the equals sign, the cursor jumps to the end.
      newText = "=" + newText;
    }
    setText(newText);
  }

  return (
    <div className="flex-grow-1">
      <textarea
        id="editor"
        className="form-control h-100 p-1"
        value={text}
        onChange={onChange}
      ></textarea>
    </div>
  );
}
