// src/lib/__tests__/dateRange.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildDateRange } from "@/lib/dateRange";

describe("buildDateRange", () => {
  const FIXED = new Date("2025-09-22T15:30:45.123Z"); // fester Zeitpunkt

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
  });
  afterAll(() => vi.useRealTimers());

  it("returns empty object for vollständig / undefined", () => {
    expect(buildDateRange("vollständig")).toEqual({});
    expect(buildDateRange(undefined)).toEqual({});
  });

  it("heute: gte ist lokale Mitternacht, lte ist jetzt", () => {
    const { gte, lte } = buildDateRange("heute");
    const start = new Date(FIXED);
    start.setHours(0, 0, 0, 0);                 // ⬅ lokal statt UTC
    expect(gte!.toISOString()).toBe(start.toISOString());
    expect(lte!.toISOString()).toBe(FIXED.toISOString());
  });

  it("7 Tage: gte ist vor 7 Tagen lokale Mitternacht, lte ist jetzt", () => {
    const { gte, lte } = buildDateRange("7 Tage");
    const start = new Date(FIXED);
    start.setDate(start.getDate() - 7);         // ⬅ lokal statt UTC
    start.setHours(0, 0, 0, 0);                 // ⬅ lokal statt UTC
    expect(gte!.toISOString()).toBe(start.toISOString());
    expect(lte!.toISOString()).toBe(FIXED.toISOString());
  });

  it("30 Tage: gte ist vor 30 Tagen lokale Mitternacht, lte ist jetzt", () => {
    const { gte, lte } = buildDateRange("30 Tage");
    const start = new Date(FIXED);
    start.setDate(start.getDate() - 30);        // ⬅ lokal statt UTC
    start.setHours(0, 0, 0, 0);                 // ⬅ lokal statt UTC
    expect(gte!.toISOString()).toBe(start.toISOString());
    expect(lte!.toISOString()).toBe(FIXED.toISOString());
  });
});
