import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { unlockTimeInput, ScheduleError, updateUnlockTimeCore, metaFromRequest } from "@/lib/schedule.server";

/**
 * PATCH /api/events/:id/unlock-time
 * Body: { unlockDate, unlockTime, timezone, expectedVersion?, reason? }
 * Requires a valid Supabase JWT; ownership, status, future timestamp and
 * timezone are all verified server-side against server UTC time.
 */
export const Route = createFileRoute("/api/events/$id/unlock-time")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const json = (v: unknown, status: number) =>
          new Response(JSON.stringify(v), {
            status,
            headers: { "content-type": "application/json" },
          });

        try {
          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            return json({ success: false, message: "Server misconfigured" }, 500);
          }

          const authHeader = request.headers.get("authorization") ?? "";
          if (!authHeader.startsWith("Bearer ")) {
            return json({ success: false, message: "Unauthorized" }, 401);
          }
          const token = authHeader.slice("Bearer ".length).trim();
          if (token.split(".").length !== 3) {
            return json({ success: false, message: "Unauthorized" }, 401);
          }

          const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
          const userId = claimsData?.claims?.sub;
          if (claimsErr || !userId) {
            return json({ success: false, message: "Unauthorized" }, 401);
          }

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return json({ success: false, message: "Invalid JSON body" }, 400);
          }

          const parsed = unlockTimeInput.safeParse({
            ...(body && typeof body === "object" ? body : {}),
            eventId: params.id,
          });
          if (!parsed.success) {
            return json(
              { success: false, message: parsed.error.issues[0]?.message ?? "Invalid request" },
              400,
            );
          }

          const result = await updateUnlockTimeCore(userId, parsed.data, metaFromRequest(request));
          return json(result, 200);
        } catch (err) {
          if (err instanceof ScheduleError) {
            return json({ success: false, message: err.message }, err.status);
          }
          console.error("unlock-time PATCH failed", err);
          return json({ success: false, message: "Unexpected error" }, 500);
        }
      },
    },
  },
});
