import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { SHARE_BASE_URL, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_wish",
  title: "Get a birthday surprise",
  description:
    "Fetch one of the signed-in user's birthday surprises by id, including its letter, media and share link.",
  inputSchema: { id: z.string().uuid().describe("The surprise id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("wishes").select("*").eq("id", id).maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Surprise not found" }], isError: true };

    const wish = { ...data, share_url: `${SHARE_BASE_URL}/wish/${data.share_token}` };
    return {
      content: [{ type: "text", text: JSON.stringify(wish, null, 2) }],
      structuredContent: { wish },
    };
  },
});
