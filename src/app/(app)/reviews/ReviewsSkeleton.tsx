// src/app/(app)/reviews/ReviewsSkeleton.tsx
export default function ReviewsSkeleton() {
    return (
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 h-5 w-40 rounded bg-muted/40" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-3">
              <div className="col-span-2 h-4 rounded bg-muted/30" />
              <div className="col-span-2 h-4 rounded bg-muted/30" />
              <div className="col-span-6 h-4 rounded bg-muted/30" />
              <div className="col-span-2 h-4 rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  