import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateLetter } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({ meta: [{ title: "Create a Birthday Wish" }] }),
  component: NewWish,
});

type MediaItem = { url: string; type: "image" | "video"; name: string };

function NewWish() {
  const navigate = useNavigate();
  const genLetter = useServerFn(generateLetter);

  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [birthdayDate, setBirthdayDate] = useState("");
  const [viewHours, setViewHours] = useState(24);
  const [feelings, setFeelings] = useState("");
  const [tone, setTone] = useState<"emotional" | "funny" | "romantic" | "cute">("emotional");
  const [letter, setLetter] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleUpload(files: FileList | null) {
    if (!files) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setBusy(true);
    try {
      const uploads: MediaItem[] = [];
      for (const file of Array.from(files)) {
        const path = `${u.user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("wish-media").upload(path, file);
        if (error) {
          toast.error(`${file.name}: ${error.message}`);
          continue;
        }
        const { data: signed } = await supabase.storage
          .from("wish-media")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 10); // ~10 years
        if (signed?.signedUrl) {
          uploads.push({
            url: signed.signedUrl,
            type: file.type.startsWith("video") ? "video" : "image",
            name: file.name,
          });
        }
      }
      setMedia((m) => [...m, ...uploads]);
      toast.success(`Added ${uploads.length} file(s)`);
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    if (!sender || !recipient) {
      toast.error("Please add sender and recipient names");
      return;
    }
    setBusy(true);
    try {
      const res = await genLetter({ data: { senderName: sender, recipientName: recipient, feelings, tone } });
      setLetter(res.letter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!sender || !recipient || !letter) {
      toast.error("Please fill sender, recipient and the letter");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("wishes")
        .insert({
          owner_id: u.user!.id,
          sender_name: sender,
          recipient_name: recipient,
          letter,
          media_urls: media,
        })
        .select("share_token")
        .single();
      if (error) throw error;
      toast.success("Wish saved! Share the link.");
      navigate({ to: "/dashboard" });
      void data;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Create a birthday wish</h1>
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      </div>

      <section className="space-y-3">
        <input
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          placeholder="Your name (sender)"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
        />
        <input
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          placeholder="Birthday boy / girl name"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </section>

      <section className="space-y-2">
        <label className="text-sm font-medium">Upload photos & videos</label>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="block text-sm"
        />
        {media.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {media.map((m, i) => (
              <div key={i} className="relative border rounded overflow-hidden aspect-square bg-muted">
                {m.type === "image" ? (
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <video src={m.url} className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => setMedia((arr) => arr.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <label className="text-sm font-medium">Share your feelings & memories (for the AI)</label>
        <textarea
          rows={4}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          placeholder="e.g. She's my best friend since college, always makes me laugh, loves hiking..."
          value={feelings}
          onChange={(e) => setFeelings(e.target.value)}
        />
        <div className="flex gap-2 items-center">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as typeof tone)}
            className="border rounded-md px-2 py-1 text-sm bg-background"
          >
            <option value="emotional">Emotional</option>
            <option value="funny">Funny</option>
            <option value="romantic">Romantic</option>
            <option value="cute">Cute</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-60"
          >
            ✨ Generate birthday letter
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-sm font-medium">Birthday letter</label>
        <textarea
          rows={10}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          placeholder="Your birthday letter will appear here — you can also write your own."
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
        />
      </section>

      <button
        onClick={handleSave}
        disabled={busy}
        className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {busy ? "Working..." : "Save & get shareable link"}
      </button>
    </main>
  );
}
