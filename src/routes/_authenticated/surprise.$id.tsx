import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EditUnlockDialog, type EditableEvent } from "@/components/EditUnlockDialog";
import { formatInTz } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/surprise/$id")({
  head: () => ({
    meta: [
      { title: "Surprise Details — Birthday Surprise" },
      { name: "description", content: "See everything in this birthday surprise — photos, videos, the letter and when it unlocks — and reschedule the unlock time." },
      { property: "og:title", content: "Surprise Details — Birthday Surprise" },
      { property: "og:description", content: "Review your birthday surprise and change its unlock time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SurpriseDetails,
});

type Media = { url: string; type: "image" | "video"; name: string };
type Detail = EditableEvent & {
  sender_name: string;
  letter: string;
  media_urls: Media[];
  share_token: string;
  created_at: string;
  view_duration_hours: number;
};

function SurpriseDetails() {
  const { id } = Route.useParams();
  const [wish, setWish] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("wishes")
        .select(
          "id, sender_name, recipient_name, letter, media_urls, share_token, created_at, view_duration_hours, unlock_time_utc, timezone, event_status, is_unlocked, unlock_version",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) toast.error(error.message);
      setWish((data as unknown as Detail) ?? null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen max-w-2xl mx-auto p-6">
        <h1 className="text-xl bday-title">Loading surprise…</h1>
      </main>
    );
  }

  if (!wish) {
    return (
      <main className="min-h-screen max-w-2xl mx-auto p-6 space-y-3">
        <h1 className="text-xl bday-title">Surprise not found</h1>
        <Link to="/dashboard" className="text-sm underline">Back to your wishes</Link>
      </main>
    );
  }

  const opened = wish.is_unlocked || wish.event_status === "unlocked";

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6 space-y-6">
      <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
        ← Back to your wishes
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold">🎁 Surprise for {wish.recipient_name}</h1>
        <p className="text-xs text-muted-foreground">
          From {wish.sender_name} · status <b>{opened ? "unlocked" : wish.event_status}</b>
        </p>
      </header>

      <section className="bday-card p-4 space-y-2">
        <h2 className="text-sm font-semibold">🔓 Unlock schedule</h2>
        <p className="text-sm">{formatInTz(new Date(wish.unlock_time_utc), wish.timezone || "UTC")}</p>
        <p className="text-xs text-muted-foreground">
          Time zone: {wish.timezone || "UTC"} · viewable for {wish.view_duration_hours}h after unlock
        </p>
        {opened ? (
          <p className="text-xs text-muted-foreground">
            This surprise has already been opened and can no longer be rescheduled.
          </p>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1.5 border rounded hover:bg-muted"
          >
            🕐 Edit Unlock Time
          </button>
        )}
      </section>

      {wish.media_urls?.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">📸 Memories ({wish.media_urls.length})</h2>
          <div className="grid grid-cols-3 gap-2">
            {wish.media_urls.map((m, i) =>
              m.type === "image" ? (
                <img key={i} src={m.url} alt={`Memory ${i + 1}`} className="rounded-md aspect-square object-cover" />
              ) : (
                <video key={i} src={m.url} controls className="rounded-md aspect-square object-cover" />
              ),
            )}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">💌 Letter</h2>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{wish.letter}</p>
      </section>

      {editing && (
        <EditUnlockDialog
          event={wish}
          onClose={() => setEditing(false)}
          onSaved={(res) =>
            setWish((w) =>
              w
                ? {
                    ...w,
                    unlock_time_utc: res.unlockTimeUTC,
                    timezone: res.timezone,
                    event_status: res.eventStatus,
                    unlock_version: res.unlockVersion,
                  }
                : w,
            )
          }
        />
      )}
    </main>
  );
}
