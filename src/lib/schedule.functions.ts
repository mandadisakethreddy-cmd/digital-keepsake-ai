import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const updateInput = z.object({
  eventId: z.string().uuid(),
  unlockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  unlockTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1).max(64),
  expectedVersion: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

export const updateUnlockTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { updateUnlockTimeCore, metaFromRequest, ScheduleError } = await import(
      "@/lib/schedule.server"
    );
    try {
      const request = getRequest();
      return await updateUnlockTimeCore(context.userId, data, metaFromRequest(request));
    } catch (err) {
      if (err instanceof ScheduleError) throw new Error(err.message);
      throw err;
    }
  });

export const getEventSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getEventScheduleCore, ScheduleError } = await import("@/lib/schedule.server");
    try {
      return await getEventScheduleCore(context.userId, data.eventId);
    } catch (err) {
      if (err instanceof ScheduleError) throw new Error(err.message);
      throw err;
    }
  });

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("wish_audit_logs")
      .select("id, old_unlock_time, new_unlock_time, timezone, device, browser, ip_address, reason, created_at")
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return { logs: rows ?? [] };
  });
