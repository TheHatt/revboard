import { describe, it, expect } from "vitest";
import { getStatItems } from "@/lib/statsView";
import type { StatsDTO } from "@/lib/stats";

const base: StatsDTO = {
  totalReviews: 10,
  avgRating: 4.234,
  replyRate: 0.42,
  byDay: [],
  byStars: [],
};

describe("getStatItems", () => {
  it("formats values and includes labels/subtitles", () => {
    const items = getStatItems(base, { range: "7 Tage", locationId: null });

    const map = Object.fromEntries(items.map(i => [i.key, i]));
    expect(map.totalReviews.value).toBe("10");
    expect(map.avgRating.value).toMatch(/^4,23|4\.23$/); // je nach Locale
    expect(map.replyRate.value).toBe("42%");
    expect(map.totalReviews.sub).toMatch(/7 Tage|heute|30 Tage|gesamter Zeitraum/);
  });

  it("empty data edge case handled upstream (no items check here)", () => {
    const items = getStatItems({ ...base, totalReviews: 0 }, { range: "heute", locationId: null });
    // Wir rendern zwar normal Items, aber StatsClient zeigt Empty-State vorab.
    expect(items.length).toBeGreaterThan(0);
  });
});
