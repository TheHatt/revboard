"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="text-base font-semibold">Uups – etwas ist schiefgelaufen.</h2>
      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 rounded-md border bg-accent px-3 py-2 text-sm"
      >
        Noch einmal versuchen
      </button>
    </div>
  );
}
