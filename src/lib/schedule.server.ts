import { z } from "zod";
import { isValidTimeZone, zonedToUtc } from "./tz";

export const unlockTimeInput = z.object({
  eventId: z.string().uuid(),
  unlockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  unlockTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  timezone: z.string().min(1).max(64),
  expectedVersion: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

export type UnlockTimeInput = z.infer<typeof unlockTimeInput>;

export class ScheduleError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type RequestMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

function parseUserAgent(ua: string | null | undefined) {
  const s = ua ?? "";
  const device = /iPhone|iPad|Android|Mobile/i.test(s)
    ? /iPad|Tablet/i.test(s)
      ? "Tablet"
      : "Mobile"
    : "Desktop";
  const browser = /Edg\//.test(s)
    ? "Edge"
    : /OPR\//.test(s)
      ? "Opera"
      : /Chrome\//.test(s)
        ? "Chrome"
        : /Safari\//.test(s)
          ? "Safari"
          : /Firefox\//.test(s)
            ? "Firefox"
            : "Unknown";
  return { device, browser };
}

export function metaFromRequest(request: Request): RequestMeta {
  const fwd = request.headers.get("x-forwarded-for");
  return {
    ip:
      request.headers.get("cf-connecting-ip") ??
      (fwd ? fwd.split(",")[0]!.trim() : null) ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export type EventSchedule = {
  id: string;
  unlock_time_utc: string;
  timezone: string;
  event_status: string;
  is_unlocked: boolean;
  unlock_version: number;
  recipient_name: string;
};

/**
 * Server-authoritative unlock-time update.
 * Verifies ownership, event status, future timestamp, timezone and version,
 * then writes the change plus an audit-log entry.
 */
export async function updateUnlockTimeCore(
  userId: string,
  input: UnlockTimeInput,
  meta: RequestMeta,
): Promise<{
  success: true;
  message: string;
  unlockTimeUTC: string;
  timezone: string;
  eventStatus: string;
  unlockVersion: number;
  countdown: "updated";
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (!isValidTimeZone(input.timezone)) {
    throw new ScheduleError("Unknown timezone.", 400);
  }

  let newUnlock: Date;
  try {
    newUnlock = zonedToUtc(input.unlockDate, input.unlockTime, input.timezone);
  } catch {
    throw new ScheduleError("Invalid date or time.", 400);
  }
  if (Number.isNaN(newUnlock.getTime())) {
    throw new ScheduleError("Invalid date or time.", 400);
  }

  // Server UTC time is the only source of truth.
  const nowMs = Date.now();
  if (newUnlock.getTime() <= nowMs + 60_000) {
    throw new ScheduleError("The new unlock time must be at least a minute in the future.", 400);
  }
  if (newUnlock.getTime() > nowMs + 5 * 365 * 24 * 3600_000) {
    throw new ScheduleError("The unlock time cannot be more than 5 years away.", 400);
  }

  const { data: event, error: readErr } = await supabaseAdmin
    .from("wishes")
    .select(
      "id, owner_id, unlock_time_utc, timezone, event_status, is_unlocked, unlock_version, recipient_name",
    )
    .eq("id", input.eventId)
    .maybeSingle();

  if (readErr) throw new ScheduleError("Could not load the surprise.", 500);
  if (!event) throw new ScheduleError("Surprise not found.", 404);
  if (event.owner_id !== userId) throw new ScheduleError("You are not the owner of this surprise.", 403);

  // Lazy status settle: once the unlock moment has passed it is unlocked forever.
  const alreadyUnlocked =
    event.is_unlocked ||
    event.event_status === "unlocked" ||
    new Date(event.unlock_time_utc).getTime() <= nowMs;

  if (alreadyUnlocked) {
    if (!event.is_unlocked) {
      await supabaseAdmin
        .from("wishes")
        .update({ is_unlocked: true, event_status: "unlocked" })
        .eq("id", event.id);
    }
    throw new ScheduleError(
      "This surprise has already been opened and cannot be locked again.",
      409,
    );
  }

  if (event.event_status !== "draft" && event.event_status !== "scheduled") {
    throw new ScheduleError("This surprise can no longer be rescheduled.", 409);
  }

  if (input.expectedVersion !== undefined && input.expectedVersion !== event.unlock_version) {
    throw new ScheduleError(
      "This surprise was changed somewhere else. Reload and try again.",
      409,
    );
  }

  // Lightweight abuse guard: max 10 reschedules per event per minute.
  const { count: recentCount } = await supabaseAdmin
    .from("wish_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .gte("created_at", new Date(nowMs - 60_000).toISOString());
  if ((recentCount ?? 0) >= 10) {
    throw new ScheduleError("Too many changes in a short time. Please wait a minute.", 429);
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("wishes")
    .update({
      unlock_time_utc: newUnlock.toISOString(),
      timezone: input.timezone,
      birthday_date: input.unlockDate,
      birthday_time: `${input.unlockTime}:00`,
      last_edited_at: new Date(nowMs).toISOString(),
      last_edited_by: userId,
      unlock_version: event.unlock_version + 1,
      event_status: "scheduled",
      is_unlocked: false,
    })
    .eq("id", event.id)
    .eq("unlock_version", event.unlock_version) // optimistic concurrency
    .eq("is_unlocked", false)
    .select("unlock_time_utc, timezone, event_status, unlock_version")
    .maybeSingle();

  if (updErr) throw new ScheduleError("Could not save the new unlock time.", 500);
  if (!updated) {
    throw new ScheduleError("This surprise was changed somewhere else. Reload and try again.", 409);
  }

  const { device, browser } = parseUserAgent(meta.userAgent);
  const { error: auditErr } = await supabaseAdmin.from("wish_audit_logs").insert({
    event_id: event.id,
    edited_by: userId,
    old_unlock_time: event.unlock_time_utc,
    new_unlock_time: updated.unlock_time_utc,
    timezone: input.timezone,
    ip_address: meta.ip ?? null,
    device,
    browser,
    reason: input.reason ?? null,
  });
  if (auditErr) console.error("audit log insert failed", auditErr);

  return {
    success: true,
    message: "Unlock time updated successfully.",
    unlockTimeUTC: updated.unlock_time_utc,
    timezone: updated.timezone,
    eventStatus: updated.event_status,
    unlockVersion: updated.unlock_version,
    countdown: "updated",
  };
}

/** Owner-scoped read of a single event's schedule, settling the unlocked state. */
export async function getEventScheduleCore(userId: string, eventId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: event, error } = await supabaseAdmin
    .from("wishes")
    .select(
      "id, owner_id, unlock_time_utc, timezone, event_status, is_unlocked, unlock_version, recipient_name, view_duration_hours",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw new ScheduleError("Could not load the surprise.", 500);
  if (!event) throw new ScheduleError("Surprise not found.", 404);
  if (event.owner_id !== userId) throw new ScheduleError("You are not the owner of this surprise.", 403);

  const nowMs = Date.now();
  if (!event.is_unlocked && new Date(event.unlock_time_utc).getTime() <= nowMs) {
    await supabaseAdmin
      .from("wishes")
      .update({ is_unlocked: true, event_status: "unlocked" })
      .eq("id", event.id);
    event.is_unlocked = true;
    event.event_status = "unlocked";
  }

  return { ...event, serverNow: new Date(nowMs).toISOString() };
}
