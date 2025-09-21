"use client";

import { useEffect, useState } from "react";

function formatTimeAgo(iso: string) {
  const delta = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(delta / 60000);
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return d === 1 ? "vor 1 Tag" : `vor ${d} Tagen`;
}

export default function TimeAgo({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatTimeAgo(iso));

  useEffect(() => {
    const id = setInterval(() => setLabel(formatTimeAgo(iso)), 60_000);
    return () => clearInterval(id);
  }, [iso]);

  return <span>{label}</span>;
}