import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SHARE_BASE_URL, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_wishes",
  title: "List birthday surprises",
  description:
    "List the birthday surprises created by the signed-in user, newest first, with their shareable links.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("How many surprises to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("wishes")
      .select(
        "id, recipient_name, sender_name, birthday_date, birthday_time, view_duration_hours, share_token, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const wishes = (data ?? []).map((w) => ({
      ...w,
      share_url: `${SHARE_BASE_URL}/wish/${w.share_token}`,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(wishes, null, 2) }],
      structuredContent: { wishes },
    };
  },
});
