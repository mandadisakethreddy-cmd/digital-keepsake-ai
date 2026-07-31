import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "delete_wish",
  title: "Delete a birthday surprise",
  description:
    "Permanently delete one of the signed-in user's birthday surprises and disable its share link.",
  inputSchema: { id: z.string().uuid().describe("The surprise id to delete.") },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("wishes")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Surprise not found" }], isError: true };

    return { content: [{ type: "text", text: `Deleted surprise ${data.id}.` }] };
  },
});
