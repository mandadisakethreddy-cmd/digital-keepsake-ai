import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(messages: { role: string; content: string }[]) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({ model: "openai/gpt-5.5", messages }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
    throw new Error(`AI error: ${res.status}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

const LetterInput = z.object({
  senderName: z.string().min(1).max(80),
  recipientName: z.string().min(1).max(80),
  feelings: z.string().max(2000).default(""),
  tone: z.enum(["emotional", "funny", "romantic", "cute"]).default("emotional"),
});

export const generateLetter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => LetterInput.parse(data))
  .handler(async ({ data }) => {
    const content = await callAI([
      {
        role: "system",
        content:
          "You write short, heartfelt birthday letters (150-250 words). Warm, personal, easy to read. No markdown, plain text with line breaks.",
      },
      {
        role: "user",
        content: `Write a ${data.tone} birthday letter from ${data.senderName} to ${data.recipientName}. Notes about how the sender feels and shared memories: ${data.feelings || "(none provided)"}. Start with "Dear ${data.recipientName},".`,
      },
    ]);
    return { letter: content };
  });

const ChatInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(30),
});

export const chatWithAI = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatInput.parse(data))
  .handler(async ({ data }) => {
    const reply = await callAI([
      {
        role: "system",
        content:
          "You are a warm, friendly companion who helps the user share their feelings about someone whose birthday is coming up. Ask gentle questions about memories, moments, and what they love about the person. Keep replies short (2-4 sentences). Be encouraging and eco-friendly in tone — kind, gentle, no pressure.",
      },
      ...data.messages,
    ]);
    return { reply };
  });
