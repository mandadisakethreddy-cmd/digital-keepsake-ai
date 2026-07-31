import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_wish_letter",
  title: "Rewrite a surprise letter",
  description: "Replace the letter text of one of the signed-in user's birthday surprises.",
  inputSchema: {
    id: z.string().uuid().describe("The surprise id."),
    letter: z.string().trim().min(1).max(4000).describe("The new letter text."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id, letter }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("wishes")
      .update({ letter })
      .eq("id", id)
      .select("id, recipient_name, letter")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Surprise not found" }], isError: true };

    return {
      content: [{ type: "text", text: `Letter updated for ${data.recipient_name}.` }],
      structuredContent: { wish: data },
    };
  },
});
