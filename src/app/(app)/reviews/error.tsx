"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-2xl border p-6 text-sm">
      <div className="mb-2 font-medium">Upps, etwas ist schiefgelaufen.</div>
      <button onClick={reset} className="rounded-xl border px-3 py-2 text-xs hover:bg-neutral-50">
        Neu laden
      </button>
    </div>
  );
}
