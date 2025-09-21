"use client";

import { useMemo, useState, useEffect } from "react";
import { Star, Send, X, MessageSquare, Filter } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast"; // ← Toast-Hook
import TimeAgo from "@/components/TimeAgo";

// --- Types (DTO vom Server) ---
export type ReviewDTO = {
  id: string;
  author: string;
  initials: string;
  stars: number;
  text: string;
  location: string;
  publishedAt: string; // ISO
  answered: boolean;
  replyText?: string;
  chips?: string[];
};

type Props = {
  role: "viewer" | "editor" | "admin";
  reviews: ReviewDTO[];
  nextCursor?: string;
  serverFilters: {
    rating: string;
    status: string;
    range: string;
    location: string;
    take: number;
  };
  /** Neu: Standort-Optionen aus dem Server (inkl. "alle" als erster Eintrag) */
  locationOptions: string[];
};

// --- Helpers ---
function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
function timeAgo(iso: string) {
  const delta = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(delta / 60000);
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  return d === 1 ? "vor 1 Tag" : `vor ${d} Tagen`;
}

export default function ReviewsClient({ reviews, nextCursor, serverFilters, locationOptions, role }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast(); // ← Toast

  const [expanded, setExpanded] = useState<{ id: string; mode: "reply" | "view" } | null>(null);
  const [query, setQuery] = useState({
    location: serverFilters.location,
    range: serverFilters.range,
    rating: serverFilters.rating,
    status: serverFilters.status,
  });

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (query.rating !== "alle" && r.stars !== Number(query.rating)) return false;
      if (query.status === "beantwortet" && !r.answered) return false;
      if (query.status === "offen" && r.answered) return false;
      return true;
    });
  }, [reviews, query]);

  function applyServerFilters() {
    const params = new URLSearchParams();
    params.set("rating", query.rating);
    params.set("status", query.status);
    params.set("range", query.range);
    params.set("location", query.location);
    router.push(`/reviews?${params.toString()}`);
  }

  function goNextPage() {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", nextCursor);
    params.set("take", String(serverFilters.take));
    params.set("rating", query.rating);
    params.set("status", query.status);
    params.set("range", query.range);
    params.set("location", query.location);
    router.push(`/reviews?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Filterbar */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:grid-cols-2 lg:grid-cols-5">
        <SelectBox
          label="Standort"
          value={query.location}
          onChange={(v) => setQuery((s) => ({ ...s, location: v }))}
          options={locationOptions}
        />
        <SelectBox
          label="Zeitraum"
          value={query.range}
          onChange={(v) => setQuery((s) => ({ ...s, range: v }))}
          options={["vollständig", "heute", "7 Tage", "30 Tage"]}
        />
        <SelectBox
          label="Bewertung"
          value={query.rating}
          onChange={(v) => setQuery((s) => ({ ...s, rating: v }))}
          options={["alle", "5", "4", "3", "2", "1"]}
        />
        <SelectBox
          label="Status"
          value={query.status}
          onChange={(v) => setQuery((s) => ({ ...s, status: v }))}
          options={["alle", "beantwortet", "offen"]}
        />
        <div className="flex items-end">
          <button
            onClick={applyServerFilters}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <Filter className="h-4 w-4" /> anwenden
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) =>
          expanded?.id === r.id ? (
            <ExpandedReplyCard
              key={r.id}
              review={r}
              mode={expanded.mode}
              onClose={() => setExpanded(null)}
              onPublish={async (text, tone) => {
                // Optimistic Update
                if (role === "viewer") return;
                const prev = { answered: r.answered, replyText: r.replyText };
                r.answered = true;
                r.replyText = text;
                setExpanded(null);

                try {
                  const res = await fetch(`/api/reviews/${r.id}/reply`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text, tone }),
                  });

                  if (!res.ok) {
                    // Rollback
                    r.answered = prev.answered;
                    r.replyText = prev.replyText;
                    const err = await res.json().catch(() => ({}));
                    push({
                      title: "Antwort fehlgeschlagen",
                      description: err?.error ?? "Unbekannter Fehler",
                    });
                    return;
                  }

                  const data = await res.json();
                  r.answered = true;
                  r.replyText = data.reply?.text ?? text;
                  push({ title: "Antwort veröffentlicht" });
                } catch {
                  // Rollback bei Netzwerkfehler
                  r.answered = prev.answered;
                  r.replyText = prev.replyText;
                  push({
                    title: "Netzwerkfehler",
                    description: "Bitte erneut versuchen",
                  });
                }
              }}
            />
          ) : (
            <ReviewCard
              key={r.id}
              review={r}
              onReply={() => setExpanded({ id: r.id, mode: "reply" })}
              onView={() => setExpanded({ id: r.id, mode: "view" })}
            />
          )
        )}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border p-6 text-sm text-neutral-600">
          Keine Ergebnisse.
          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set("rating", "alle");
              params.set("status", "alle");
              params.set("range", "vollständig");
              params.set("location", "alle");
              window.location.href = `/reviews?${params.toString()}`;
            }}
            className="ml-2 underline"
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center pb-4">
        {nextCursor ? (
          <button
            onClick={goNextPage}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            Weitere laden
          </button>
        ) : (
          <div className="text-xs text-neutral-500">Ende erreicht</div>
        )}
      </div>
    </div>
  );

  // —— Nested UI-Bausteine ——
  function Stars({ value }: { value: number }) {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cx("h-4 w-4", i < value ? "fill-yellow-400 stroke-yellow-400" : "stroke-neutral-300")}
          />
        ))}
      </div>
    );
  }
  function Chip({ children }: { children: React.ReactNode }) {
    return <span className="rounded-full border px-2 py-0.5 text-xs dark:border-neutral-800">{children}</span>;
  }
  function Avatar({ initials }: { initials: string }) {
    return (
      <div className="grid h-8 w-8 place-items-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
        {initials}
      </div>
    );
  }

  function ReviewCard({
    review,
    onReply,
    onView,
  }: {
    review: ReviewDTO;
    onReply: () => void;
    onView: () => void;
  }) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar initials={review.initials} />
            <div>
              <div className="text-sm font-medium">{review.author}</div>
              <div className="text-[11px] text-neutral-500">
                <div className="text-[11px] text-neutral-500">
                    <TimeAgo iso={review.publishedAt} /> · {review.location}
                </div>
              </div>
            </div>
          </div>
          <Stars value={review.stars} />
        </div>

        <p className="text-sm text-neutral-800 dark:text-neutral-200">{review.text}</p>

        {!!review.chips?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {review.chips.map((c: string) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="text-[11px] text-neutral-500">{review.answered ? "beantwortet" : "offen"}</div>
          <div className="flex gap-2">
          {role !== "viewer" ? (
            !review.answered ? (
              <button
                onClick={onReply}
                className="rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 dark:bg-white dark:text-black"
              >
                antworten
              </button>
            ) : (
              <button
                onClick={onView}
                className="rounded-xl border px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                ansehen
              </button>
               )
              ) : (
                // viewer: nur ansehen
                <button
                  onClick={onView}
                  className="rounded-xl border px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  aria-disabled
                  title="Nur Ansicht (keine Schreibrechte)"
                >
                  ansehen
                </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

// — Editor/Ansicht mit KI-Stil —
type AiTone = "neutral" | "freundlich" | "formell" | "ausführlich" | "knapp";
const TONE_OPTIONS: { value: AiTone; label: string }[] = [
  { value: "neutral", label: "neutral" },
  { value: "freundlich", label: "freundlich" },
  { value: "formell", label: "formell" },
  { value: "ausführlich", label: "ausführlich" },
  { value: "knapp", label: "knapp" },
];

function ExpandedReplyCard({
  review,
  mode,
  onClose,
  onPublish,
  className,
  onSuggest,
}: {
  review: ReviewDTO;
  mode: "reply" | "view";
  onClose: () => void;
  onPublish: (text: string, tone?: AiTone) => Promise<void> | void;
  className?: string;
  onSuggest?: (tone: AiTone, review: ReviewDTO) => Promise<string>;
}) {
  const [text, setText] = useState(
    review.replyText ?? `Hallo ${review.author.split(" ")[0]},\n\nvielen Dank für Ihre Bewertung!`
  );
  const [tone, setTone] = useState<AiTone>(() =>
    typeof window === "undefined" ? "neutral" : ((localStorage.getItem("revboard.tone") as AiTone) || "neutral")
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("revboard.tone", tone);
  }, [tone]);

  async function handleSuggest() {
    if (onSuggest) {
      setText(await onSuggest(tone, review));
      return;
    }
    const demo =
      tone === "knapp"
        ? `Hallo ${review.author.split(" ")[0]},\n\ndanke für Ihre Bewertung! Viele Grüße\nIhr Team`
        : `Hallo ${review.author.split(" ")[0]},\n\nvielen Dank für Ihre ${review.stars}-Sterne-Bewertung und das freundliche Feedback.\n\nFreundliche Grüße\nIhr Team`;
    setText(demo);
  }

  return (
    <div className={cx("rounded-2xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            {review.initials}
          </div>
          <div>
            <div className="text-sm font-medium">{review.author}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Schließen"
          title="Schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* linke Spalte: Original */}
        <div className="rounded-xl border p-3 text-sm dark:border-neutral-800">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-neutral-500">Original</div>
          <p className="text-neutral-800 dark:text-neutral-200">{review.text}</p>
        </div>

        {/* rechte Spalte */}
        <div className="flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wide text-neutral-500">
              {mode === "reply" ? "Antwort verfassen" : "Antwort"}
            </div>

            {mode === "reply" && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-neutral-500">
                  Stil
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as AiTone)}
                    className="rounded-lg border bg-white px-2 py-1 text-xs outline-none hover:bg-neutral-50 focus:ring-2 focus:ring-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus:ring-neutral-700"
                  >
                    {TONE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={handleSuggest}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <MessageSquare className="h-4 w-4" /> Vorschlag
                </button>
              </div>
            )}
          </div>

          {mode === "reply" ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className="min-h-[160px] w-full resize-y rounded-xl border bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-800 dark:focus:ring-neutral-700"
                placeholder="Deine Antwort …"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    try {
                      setSubmitting(true);
                      await onPublish(text, undefined);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "sende…" : "veröffentlichen"}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border p-3 text-sm dark:border-neutral-800">
              <p className="whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
                {review.replyText ?? "Diese Rezension wurde beantwortet. (Antworttext nicht geladen)"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === SelectBox unten außerhalb der Komponenten ===
function SelectBox({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-neutral-500">{label}</span>
      <select
        className="rounded-xl border bg-white px-3 py-2 text-sm outline-none hover:bg-neutral-50 focus:ring-2 focus:ring-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900 dark:focus:ring-neutral-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
