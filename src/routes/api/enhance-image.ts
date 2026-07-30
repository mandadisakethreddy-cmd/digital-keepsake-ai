import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const bodySchema = z.object({
  // Storage paths are always "<uuid>/<filename>" — no traversal, no absolute paths.
  path: z
    .string()
    .min(3)
    .max(512)
    .regex(/^[0-9a-fA-F-]{36}\/[^/\\]{1,255}$/, "Invalid path"),
});

export const Route = createFileRoute("/api/enhance-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            return new Response("Server misconfigured", { status: 500 });
          }

          // --- Require a valid signed-in Supabase session ---
          const authHeader = request.headers.get("authorization") ?? "";
          if (!authHeader.startsWith("Bearer ")) {
            return new Response("Unauthorized", { status: 401 });
          }
          const token = authHeader.slice("Bearer ".length).trim();
          if (token.split(".").length !== 3) {
            return new Response("Unauthorized", { status: 401 });
          }

          const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
          const userId = claimsData?.claims?.sub;
          if (claimsErr || !userId) {
            return new Response("Unauthorized", { status: 401 });
          }

          const parsed = bodySchema.safeParse(await request.json());
          if (!parsed.success) return new Response("Invalid path", { status: 400 });
          const { path } = parsed.data;

          // --- Ownership check: path must live in the caller's own folder ---
          if (path.split("/")[0] !== userId) {
            return new Response("Forbidden", { status: 403 });
          }

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");


          // Download original
          const { data: blob, error: dlErr } = await supabaseAdmin.storage
            .from("wish-media")
            .download(path);
          if (dlErr || !blob) return new Response(`Download failed: ${dlErr?.message}`, { status: 500 });

          const buf = await blob.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          const mime = blob.type || "image/jpeg";
          const dataUrl = `data:${mime};base64,${b64}`;

          // Call Gemini image editing
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              modalities: ["image", "text"],
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Restyle this photo as a joyful, vibrant, colorful birthday memory. Enhance colors, add soft magical lighting, warm glow, subtle sparkle and dreamy pastel tones. Keep faces and identities exactly the same. Do NOT add text or captions.",
                    },
                    { type: "image_url", image_url: { url: dataUrl } },
                  ],
                },
              ],
            }),
          });

          if (!aiRes.ok) {
            const t = await aiRes.text();
            return new Response(`AI error: ${t}`, { status: aiRes.status });
          }

          const aiJson = await aiRes.json();
          const images = aiJson?.choices?.[0]?.message?.images;
          const outUrl: string | undefined = images?.[0]?.image_url?.url;
          if (!outUrl?.startsWith("data:")) {
            return new Response("No image returned", { status: 500 });
          }

          // Parse data URL -> bytes
          const commaIdx = outUrl.indexOf(",");
          const meta = outUrl.slice(5, commaIdx); // e.g. image/png;base64
          const outMime = meta.split(";")[0] || "image/png";
          const outB64 = outUrl.slice(commaIdx + 1);
          const outBytes = Buffer.from(outB64, "base64");

          const ext = outMime.split("/")[1] || "png";
          const newPath = path.replace(/(\.[^.]+)?$/, `-ai-${Date.now()}.${ext}`);

          const { error: upErr } = await supabaseAdmin.storage
            .from("wish-media")
            .upload(newPath, outBytes, { contentType: outMime, upsert: false });
          if (upErr) return new Response(`Upload failed: ${upErr.message}`, { status: 500 });

          const { data: signed } = await supabaseAdmin.storage
            .from("wish-media")
            .createSignedUrl(newPath, 60 * 60 * 24 * 365 * 10);
          if (!signed?.signedUrl) return new Response("Sign failed", { status: 500 });

          return new Response(JSON.stringify({ path: newPath, url: signed.signedUrl }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Error", { status: 500 });
        }
      },
    },
  },
});
