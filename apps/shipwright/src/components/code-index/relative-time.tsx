"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/code-index/view-data";

// "2 min ago", but only in the browser. The server prints the fixed UTC date (`fallback`), and this swaps it for the friendly
// version after the page has loaded, so server and browser never disagree about the text during hydration.
export function RelativeTime({ iso, fallback }: { iso: string; fallback: string }) {
  const [text, setText] = useState(fallback);
  useEffect(() => {
    const update = () => setText(relativeTime(iso, new Date()) || fallback);
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [iso, fallback]);
  return (
    <time dateTime={iso} title={fallback}>
      {text}
    </time>
  );
}
