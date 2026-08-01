import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { scheduleAssistant } from "@/lib/schedule-ai.functions";
import { browserTimeZone } from "@/lib/tz";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Talk to the AI — Birthday Surprise" },
      { name: "description", content: "Chat with a friendly AI companion to put your feelings into words before writing the birthday letter for someone you love." },
      { property: "og:title", content: "Talk to the AI — Birthday Surprise" },
      { property: "og:description", content: "Chat with an AI companion about the birthday person before writing their letter." },
      { property: "og:url", content: "https://digital-keepsake-ai.lovable.app/chat" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://digital-keepsake-ai.lovable.app/chat" }],
  }),

  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function ChatPage() {
  const call = useServerFn(scheduleAssistant);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi 🌱 I can help two ways: talk through your feelings for the birthday letter, or manage your unlock schedule — try \"delay my surprise by two days\" or \"show my current unlock schedule\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [busy]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await call({
        data: { messages: next.slice(-20), timezone: browserTimeZone() },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen max-w-xl mx-auto p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">💬 Share your feelings</h1>
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      </div>

      <div className="flex-1 border rounded-md p-4 space-y-3 overflow-y-auto min-h-[400px] bg-background">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm " +
                (m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-muted-foreground">AI is thinking…</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type how you feel…"
          className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-4 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </main>
  );
}
