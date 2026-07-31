import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SHARE_BASE_URL, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_wish",
  title: "Create a birthday surprise",
  description:
    "Create a birthday surprise page for the signed-in user with a written letter, an optional unlock date/time and a viewing window. Photos and videos are added in the app.",
  inputSchema: {
    recipient_name: z.string().trim().min(1).max(80).describe("Who the surprise is for."),
    sender_name: z.string().trim().min(1).max(80).describe("Who it is from."),
    letter: z.string().trim().min(1).max(4000).describe("The birthday letter text."),
    birthday_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullish()
      .describe("Unlock date as YYYY-MM-DD."),
    birthday_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullish()
      .describe("Unlock time as HH:MM (24h)."),
    view_duration_hours: z
      .number()
      .int()
      .min(1)
      .max(168)
      .default(24)
      .describe("How many hours the surprise stays viewable after unlocking."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("wishes")
      .insert({
        owner_id: ctx.getUserId(),
        recipient_name: input.recipient_name,
        sender_name: input.sender_name,
        letter: input.letter,
        media_urls: [],
        birthday_date: input.birthday_date ?? null,
        birthday_time: input.birthday_time ?? null,
        view_duration_hours: input.view_duration_hours ?? 24,
      })
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const wish = { ...data, share_url: `${SHARE_BASE_URL}/wish/${data.share_token}` };
    return {
      content: [{ type: "text", text: `Created. Share link: ${wish.share_url}` }],
      structuredContent: { wish },
    };
  },
});
