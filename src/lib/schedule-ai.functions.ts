import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const chatInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(30),
  timezone: z.string().min(1).max(64),
});

type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};

const tools = [
  {
    type: "function",
    function: {
      name: "list_surprises",
      description: "List the signed-in user's birthday surprises with their current unlock schedule and status.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "set_unlock_time",
      description:
        "Change the unlock date and time of one surprise. Only works while the surprise is still locked (draft or scheduled).",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "The surprise id from list_surprises" },
          unlockDate: { type: "string", description: "Wall-clock date, format YYYY-MM-DD" },
          unlockTime: { type: "string", description: "Wall-clock 24h time, format HH:MM" },
          timezone: { type: "string", description: "IANA timezone, e.g. Asia/Kolkata" },
          reason: { type: "string", description: "Short reason for the change" },
        },
        required: ["eventId", "unlockDate", "unlockTime", "timezone"],
      },
    },
  },
];

async function callGroq(messages: GroqMessage[]) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing GROQ_API_KEY");
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages, tools, tool_choice: "auto" }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Groq error", res.status, text);
    if (res.status === 429) throw new Error("The assistant is busy — please try again in a moment.");
    throw new Error("The assistant is unavailable right now.");
  }
  const data = (await res.json()) as {
    choices?: Array<{ message: GroqMessage }>;
  };
  return data.choices?.[0]?.message ?? { role: "assistant" as const, content: "" };
}

export const scheduleAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => chatInput.parse(data))
  .handler(async ({ data, context }) => {
    const { updateUnlockTimeCore, getEventScheduleCore, metaFromRequest, ScheduleError } =
      await import("@/lib/schedule.server");
    void getEventScheduleCore;
    const meta = metaFromRequest(getRequest());
    const nowIso = new Date().toISOString();

    const history: GroqMessage[] = [
      {
        role: "system",
        content: [
          "You are a warm, eco-friendly birthday companion inside a Birthday Surprise app.",
          "You do two things: (1) help the user put their feelings and memories about the birthday person into words, and (2) manage the unlock schedule of their surprises.",
          `The server's current UTC time is ${nowIso}. The user's timezone is ${data.timezone}.`,
          "For scheduling: always call list_surprises first to find the right surprise id, then call set_unlock_time with a wall-clock date (YYYY-MM-DD), time (HH:MM) and the IANA timezone.",
          "Resolve relative requests like 'tomorrow at 8 PM' or 'delay by two days' yourself, in the user's timezone. Never invent an id.",
          "The unlock time must be in the future, and a surprise that has already opened can never be locked again — if the tool refuses, explain that kindly.",
          "After a successful change, confirm the new schedule in the user's timezone. Keep replies short (2-5 sentences), plain text.",
        ].join(" "),
      },
      ...data.messages.map((m) => ({ role: m.role, content: m.content }) as GroqMessage),
    ];

    for (let round = 0; round < 5; round++) {
      const msg = await callGroq(history);
      history.push(msg);

      const calls = msg.tool_calls ?? [];
      if (calls.length === 0) {
        return { reply: (msg.content ?? "").trim() || "I'm not sure how to help with that yet." };
      }

      for (const call of calls) {
        let result: unknown;
        try {
          const args = JSON.parse(call.function.arguments || "{}");
          if (call.function.name === "list_surprises") {
            const { data: rows, error } = await context.supabase
              .from("wishes")
              .select("id, recipient_name, unlock_time_utc, timezone, event_status, is_unlocked, unlock_version")
              .order("created_at", { ascending: false })
              .limit(20);
            if (error) throw new Error(error.message);
            result = { surprises: rows ?? [] };
          } else if (call.function.name === "set_unlock_time") {
            // Ownership, status, future timestamp, timezone and version are all
            // re-verified server-side here — the model is never trusted.
            result = await updateUnlockTimeCore(
              context.userId,
              {
                eventId: String(args.eventId ?? ""),
                unlockDate: String(args.unlockDate ?? ""),
                unlockTime: String(args.unlockTime ?? "").slice(0, 5),
                timezone: String(args.timezone || data.timezone),
                reason: args.reason ? String(args.reason).slice(0, 200) : "Changed via AI assistant",
              },
              meta,
            );
          } else {
            result = { error: "Unknown tool" };
          }
        } catch (err) {
          result = {
            error:
              err instanceof ScheduleError || err instanceof Error
                ? err.message
                : "Something went wrong",
          };
        }

        history.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return { reply: "I couldn't finish that request — could you rephrase it?" };
  });
