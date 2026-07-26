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
    return { wish: row ?? null };
  });
