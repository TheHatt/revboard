export default function Loading() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 rounded-2xl border p-3 animate-pulse h-20" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl border p-4 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  