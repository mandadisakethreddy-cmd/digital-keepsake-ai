// Timezone helpers — pure, no Node/browser-only APIs, safe on client and server.

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset (ms) of `tz` from UTC at the given instant. Positive east of UTC. */
export function tzOffsetMs(tz: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}

/**
 * Convert a wall-clock date/time in `tz` (e.g. "2026-08-25" + "21:30") to a UTC Date.
 * Runs the offset lookup twice so DST boundaries resolve correctly.
 */
export function zonedToUtc(dateStr: string, timeStr: string, tz: string): Date {
  const naive = Date.parse(`${dateStr}T${timeStr.slice(0, 5)}:00Z`);
  if (Number.isNaN(naive)) throw new Error("Invalid date or time");
  let utc = naive - tzOffsetMs(tz, new Date(naive));
  utc = naive - tzOffsetMs(tz, new Date(utc));
  return new Date(utc);
}

/** Split a UTC instant into wall-clock `date` / `time` strings in `tz`. */
export function utcToZonedParts(instant: Date, tz: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  };
}

export function formatInTz(instant: Date, tz: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  try {
    return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: tz }).format(instant);
  } catch {
    return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: "UTC" }).format(instant);
  }
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function timeZoneList(): string[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
  ).supportedValuesOf?.("timeZone");
  if (supported?.length) return supported;
  return [
    "UTC",
    "Asia/Kolkata",
    "Asia/Dubai",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Europe/London",
    "Europe/Berlin",
    "Europe/Paris",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "Australia/Sydney",
    "Africa/Lagos",
  ];
}
