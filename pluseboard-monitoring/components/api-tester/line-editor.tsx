"use client";

import { useMemo, useRef } from "react";

interface LineEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
}

export function LineEditor({ value, onChange, placeholder, minRows = 8 }: Readonly<LineEditorProps>) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lineCount = useMemo(() => Math.max(1, value.split("\n").length), [value]);
  const gutterLines = useMemo(() => Array.from({ length: Math.max(lineCount, minRows) }, (_, index) => index + 1), [lineCount, minRows]);

  function syncScroll() {
    if (inputRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = inputRef.current.scrollTop;
    }
  }

  return (
    <div className="editor-wrap thin-scroll">
      <div ref={gutterRef} className="editor-gutter" aria-hidden="true">
        {gutterLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <textarea
        ref={inputRef}
        className="editor-input thin-scroll"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
      />
    </div>
  );
}