// src/lib/dateRange.ts

export type DateRange = { gte?: Date; lte?: Date };

/**
 * Erzeugt einen [gte, lte]-Zeitraum für bekannte Labels.
 * "heute"  -> ab 00:00 Uhr bis jetzt
 * "7 Tage" -> ab vor 7 Tagen 00:00 Uhr bis jetzt
 * "30 Tage"-> ab vor 30 Tagen 00:00 Uhr bis jetzt
 * "vollständig" oder undefined -> leeres Objekt (kein Zeitfilter)
 */
export function buildDateRange(range?: "vollständig" | "heute" | "7 Tage" | "30 Tage"): DateRange {
  if (!range || range === "vollständig") return {};

  const now = new Date();
  const from = new Date(now);

  if (range === "heute") {
    from.setHours(0, 0, 0, 0);
  } else if (range === "7 Tage") {
    from.setDate(now.getDate() - 7);
    from.setHours(0, 0, 0, 0);
  } else if (range === "30 Tage") {
    from.setDate(now.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  }

  return { gte: from, lte: now };
}
