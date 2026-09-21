"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CodeBlock({
  code,
  language = "bash",
  title,
}: {
  code: string;
  language?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="docs-code-block group relative overflow-hidden rounded-lg border border-[color:var(--border)]">
      {title && (
        <div className="flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">
            {title}
          </span>
          <span className="rounded bg-[color:var(--card-soft)] px-1.5 py-0.5 text-[0.65rem] font-mono font-medium text-[color:var(--faint)]">
            {language}
          </span>
        </div>
      )}
      <div className="relative">
        <pre className="code-area overflow-x-auto p-4 text-[0.8rem] leading-relaxed">
          <code>{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--muted)] opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:border-[color:var(--border-strong)] hover:text-[color:var(--text)]"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[color:var(--success)]" />
              <span className="text-[color:var(--success)]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
