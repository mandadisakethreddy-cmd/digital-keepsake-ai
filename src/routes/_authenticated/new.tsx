import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateLetter } from "@/lib/ai.functions";
import { browserTimeZone, timeZoneList, zonedToUtc } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({
    meta: [
      { title: "Create a Birthday Wish — Birthday Surprise" },
      { name: "description", content: "Upload photos and videos, colorize them with AI, generate a birthday letter and pick the exact moment your surprise unlocks." },
      { property: "og:title", content: "Create a Birthday Wish — Birthday Surprise" },
      { property: "og:description", content: "Build a birthday surprise with photos, videos and an AI-written letter." },
      { property: "og:url", content: "https://digital-keepsake-ai.lovable.app/new" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://digital-keepsake-ai.lovable.app/new" }],
  }),

  component: NewWish,
});

type MediaItem = { url: string; type: "image" | "video"; name: string; path?: string; enhancing?: boolean };

function NewWish() {
  const navigate = useNavigate();
  const genLetter = useServerFn(generateLetter);

  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [birthdayDate, setBirthdayDate] = useState("");
  const [birthdayTime, setBirthdayTime] = useState("09:00");
  const [timezone, setTimezone] = useState(() => browserTimeZone());
  const zones = timeZoneList();

  
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
            path,
          });
        }
      }
      setMedia((m) => [...m, ...uploads]);
      toast.success(`Added ${uploads.length} file(s)`);
    } finally {
      setBusy(false);
    }
  }

  async function handleEnhance(index: number) {
    const item = media[index];
    if (!item?.path || item.type !== "image") return;
    setMedia((arr) => arr.map((m, i) => (i === index ? { ...m, enhancing: true } : m)));
    try {
      const { data: s } = await supabase.auth.getSession();
      const accessToken = s.session?.access_token;
      if (!accessToken) throw new Error("Please sign in again");
      const res = await fetch("/api/enhance-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ path: item.path }),
      });
      if (!res.ok) throw new Error(await res.text());

      const { url, path } = (await res.json()) as { url: string; path: string };
      setMedia((arr) =>
        arr.map((m, i) => (i === index ? { ...m, url, path, enhancing: false } : m)),
      );
      toast.success("✨ Colorized!");
    } catch (err) {
      setMedia((arr) => arr.map((m, i) => (i === index ? { ...m, enhancing: false } : m)));
      toast.error(err instanceof Error ? err.message : "Enhance failed");
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
      const unlockUtc = birthdayDate
        ? zonedToUtc(birthdayDate, birthdayTime || "00:00", timezone)
        : new Date();
      const { data, error } = await supabase
        .from("wishes")
        .insert({
          owner_id: u.user!.id,
          sender_name: sender,
          recipient_name: recipient,
          letter,
          media_urls: media,
          birthday_date: birthdayDate || null,
          birthday_time: birthdayDate ? `${birthdayTime || "00:00"}:00` : null,
          view_duration_hours: viewHours,
          timezone,
          unlock_time_utc: unlockUtc.toISOString(),
          event_status: unlockUtc.getTime() > Date.now() ? "scheduled" : "unlocked",
          is_unlocked: unlockUtc.getTime() <= Date.now(),
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
        <h1 className="text-2xl bday-title">🎂 Create a birthday wish</h1>
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      </div>

      <section className="bday-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">🎈 Who is this surprise for?</h2>
        <input
          className="bday-input"
          aria-label="Your name (sender)"
          placeholder="Your name (sender)"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
        />

        <input
          className="bday-input"
          aria-label="Birthday boy or girl name"
          placeholder="Birthday boy / girl name"

          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1">🎉 Birthday date (optional)</label>
            <input
              type="date"
              className="bday-input"
              value={birthdayDate}
              onChange={(e) => setBirthdayDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">🕐 Unlock time</label>
            <input
              type="time"
              className="bday-input"
              value={birthdayTime}
              disabled={!birthdayDate}
              onChange={(e) => setBirthdayTime(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">⏰ Viewable for</label>
            <select
              className="bday-input"
              value={viewHours}
              onChange={(e) => setViewHours(Number(e.target.value))}
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>1 day</option>
              <option value={72}>3 days</option>
              <option value={168}>1 week</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">🌍 Time zone</label>
            <select
              className="bday-input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {!zones.includes(timezone) && <option value={timezone}>{timezone}</option>}
              {zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          🎁 {birthdayDate
            ? `The surprise stays locked until ${birthdayDate} at ${birthdayTime || "00:00"} (${timezone}), then stays open for the viewing window you pick. Stored in UTC so it unlocks at the right moment anywhere in the world.`
            : "No date set — the recipient can open it right away, and the viewing window starts now."}
        </p>
      </section>

      <section className="bday-card p-5 space-y-2">
        <h2 className="text-sm font-semibold" id="upload-heading">📸 Upload photos & videos</h2>
        <input
          type="file"
          aria-labelledby="upload-heading"
          accept="image/*,video/*"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="block text-sm"
        />

        {media.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">Tap ✨ to colorize a photo with AI (adds a magical, vibrant birthday vibe).</p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {media.map((m, i) => (
                <div key={i} className="relative border rounded-xl overflow-hidden aspect-square bg-muted">
                  {m.type === "image" ? (
                    <img
                      src={m.url}
                      alt={`Birthday photo ${i + 1} of ${media.length} for ${recipient || "the birthday person"}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={m.url}
                      aria-label={`Birthday video ${i + 1} of ${media.length}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {m.enhancing && (
                    <div className="absolute inset-0 bg-black/50 text-white text-xs flex items-center justify-center">
                      ✨ Colorizing…
                    </div>
                  )}
                  <button
                    onClick={() => setMedia((arr) => arr.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${m.type === "image" ? "photo" : "video"} ${i + 1}`}
                    className="absolute top-1 right-1 bg-black/60 text-white text-xs w-5 h-5 rounded-full"
                  >
                    <span aria-hidden="true">×</span>
                  </button>

                  {m.type === "image" && !m.enhancing && (
                    <button
                      onClick={() => handleEnhance(i)}
                      aria-label={`Colorize photo ${i + 1} with AI`}
                      className="absolute bottom-1 left-1 right-1 bg-gradient-to-r from-pink-500 to-amber-400 text-white text-[10px] py-1 rounded-md font-semibold"
                    >
                      ✨ Colorize
                    </button>
                  )}

                </div>
              ))}
            </div>
          </>
        )}
      </section>


      <section className="bday-card p-5 space-y-2">
        <h2 className="text-sm font-semibold">💭 Share your feelings & memories (for the AI)</h2>
        <textarea
          rows={4}
          className="bday-input"
          aria-label="Feelings and memories about the birthday person"
          placeholder="e.g. She's my best friend since college, always makes me laugh, loves hiking..."
          value={feelings}
          onChange={(e) => setFeelings(e.target.value)}
        />
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={tone}
            aria-label="Letter tone"
            onChange={(e) => setTone(e.target.value as typeof tone)}
            className="bday-input"
            style={{ width: "auto" }}
          >
            <option value="emotional">Emotional</option>
            <option value="funny">Funny</option>
            <option value="romantic">Romantic</option>
            <option value="cute">Cute</option>
          </select>

          <button
            onClick={handleGenerate}
            disabled={busy}
            className="bday-btn px-4 py-2 text-sm"
          >
            ✨ Generate birthday letter
          </button>
        </div>
      </section>

      <section className="bday-card p-5 space-y-2">
        <h2 className="text-sm font-semibold">💌 Birthday letter</h2>
        <textarea
          rows={10}
          className="bday-input"
          aria-label="Birthday letter"
          placeholder="Your birthday letter will appear here — you can also write your own."

          value={letter}
          onChange={(e) => setLetter(e.target.value)}
        />
      </section>

      <button
        onClick={handleSave}
        disabled={busy}
        className="bday-btn w-full py-3 text-sm"
      >
        {busy ? "Working..." : "🎁 Save & get shareable link"}
      </button>
    </main>
  );
}
