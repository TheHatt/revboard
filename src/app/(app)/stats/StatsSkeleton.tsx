// src/app/(app)/stats/StatsSkeleton.tsx
export default function StatsSkeleton() {
    return (
      <section aria-label="Kernkennzahlen (Ladezustand)" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <div className="h-3 w-24 rounded bg-muted/40" />
              <div className="h-5 w-5 rounded-full bg-muted/40" />
            </div>
            <div className="px-6 pb-6">
              <div className="h-8 w-28 rounded bg-muted/50" />
              <div className="mt-2 h-3 w-20 rounded bg-muted/40" />
            </div>
          </div>
        ))}
      </section>
    );
  }
  