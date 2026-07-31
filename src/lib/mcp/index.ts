import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listWishesTool from "./tools/list-wishes";
import getWishTool from "./tools/get-wish";
import createWishTool from "./tools/create-wish";
import updateWishLetterTool from "./tools/update-wish-letter";
import deleteWishTool from "./tools/delete-wish";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "surprise-sentiments",
  title: "Surprise Sentiments",
  version: "0.1.0",
  instructions:
    "Tools for Surprise Sentiments, a birthday surprise app. Create and manage birthday surprise pages for the signed-in user: list them with their share links, read one, write or rewrite the birthday letter, and delete surprises. Photos and videos are uploaded in the app itself.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listWishesTool, getWishTool, createWishTool, updateWishLetterTool, deleteWishTool],
});
