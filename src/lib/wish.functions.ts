import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenSchema = z.object({
  token: z
    .string()
    .min(8)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export const getWishByToken = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("get_wish_by_token", {
      _token: data.token,
    });
    if (error) {
      console.error("get_wish_by_token failed", error);
      return { wish: null };
    }
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { wish: null };

    // Server UTC time decides the lock — never the viewer's clock.
    const serverNow = row.server_now ? new Date(row.server_now) : new Date();
    if (!row.is_unlocked && new Date(row.unlock_time_utc).getTime() <= serverNow.getTime()) {
      await supabaseAdmin
        .from("wishes")
        .update({ is_unlocked: true, event_status: "unlocked" })
        .eq("id", row.id);
      row.is_unlocked = true;
      row.event_status = "unlocked";
    }

    // Locked surprises never reveal their contents to the client.
    if (!row.is_unlocked) {
      return {
        wish: {
          id: row.id,
          sender_name: row.sender_name,
          recipient_name: row.recipient_name,
          letter: "",
          media_urls: [],
          created_at: row.created_at,
          view_duration_hours: row.view_duration_hours,
          unlock_time_utc: row.unlock_time_utc,
          timezone: row.timezone,
          event_status: row.event_status,
          is_unlocked: false,
          unlock_version: row.unlock_version,
          server_now: serverNow.toISOString(),
        },
      };
    }

    return { wish: { ...row, server_now: serverNow.toISOString() } };
  });
