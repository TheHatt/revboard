// src/lib/dateRange.ts

export type DateRange = { gte?: Date; lte?: Date };

/**
 * Erzeugt einen [gte, lte]-Zeitraum.
 * Vorrang: wenn from/to (YYYY-MM-DD) gesetzt sind, werden Range-Presets ignoriert.
 *
 * range:
 * - "heute"        -> ab 00:00 Uhr heute bis jetzt
 * - "7 Tage"       -> ab vor 7 Tagen 00:00 Uhr bis jetzt
 * - "30 Tage"      -> ab vor 30 Tagen 00:00 Uhr bis jetzt
 * - "vollständig"  -> kein Zeitfilter
 */
export function buildDateRange(
  range?: "vollständig" | "heute" | "7 Tage" | "30 Tage",
  from?: string | null,
  to?: string | null
): DateRange {
  // 1) Vorrang für from/to (inklusive Grenzen)
  if (from && to) {
    const gte = parseISODateStart(from); // YYYY-MM-DDT00:00:00.000Z
    const lte = parseISODateEnd(to);     // YYYY-MM-DDT23:59:59.999Z
    return { gte, lte };
  }

  // 2) Fallback: Presets wie bisher
  if (!range || range === "vollständig") return {};

  const now = new Date();
  const start = new Date(now);

  if (range === "heute") {
    start.setHours(0, 0, 0, 0);
    return { gte: start, lte: now };
  }

  if (range === "7 Tage") {
    // inkl. heute -> 7*24h zurück, dann 00:00
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { gte: start, lte: now };
  }

  if (range === "30 Tage") {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { gte: start, lte: now };
  }

  return {};
}

/** Hilfen: strikte YYYY-MM-DD → Date (UTC-Start/UTC-Ende) */
function parseISODateStart(yyyyMMdd: string): Date {
  assertIsoDate(yyyyMMdd);
  // Wir interpretieren als UTC, damit Server/SSR deterministisch bleibt
  return new Date(`${yyyyMMdd}T00:00:00.000Z`);
}
function parseISODateEnd(yyyyMMdd: string): Date {
  assertIsoDate(yyyyMMdd);
  return new Date(`${yyyyMMdd}T23:59:59.999Z`);
}
function assertIsoDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`Invalid ISO date (YYYY-MM-DD) received: "${s}"`);
  }
}
