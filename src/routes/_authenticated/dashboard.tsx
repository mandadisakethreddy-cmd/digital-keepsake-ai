import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Birthday Wishes — Birthday Surprise" },
      { name: "description", content: "Manage the birthday surprises you've created, copy their share links, and see which ones are still open for viewing." },
      { property: "og:title", content: "Your Birthday Wishes — Birthday Surprise" },
      { property: "og:description", content: "Manage your birthday surprises and share links." },
      { property: "og:url", content: "https://digital-keepsake-ai.lovable.app/dashboard" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://digital-keepsake-ai.lovable.app/dashboard" }],
  }),

  component: Dashboard,
});

type Wish = {
  id: string;
  sender_name: string;
  recipient_name: string;
  share_token: string;
  created_at: string;
};

function Dashboard() {
  const navigate = useNavigate();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? null);
      const { data, error } = await supabase
        .from("wishes")
        .select("id, sender_name, recipient_name, share_token, created_at")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setWishes((data as Wish[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  async function del(id: string) {
    if (!confirm("Delete this wish?")) return;
    const { error } = await supabase.from("wishes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setWishes((w) => w.filter((x) => x.id !== id));
  }

  function shareUrl(token: string) {
    return `${window.location.origin}/wish/${token}`;
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">🎂 Your birthday wishes</h1>
          {email && <p className="text-xs text-muted-foreground">{email}</p>}
        </div>
        <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
      </header>

      <div className="flex gap-2">
        <Link to="/new" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">
          + Create new wish
        </Link>
        <Link to="/chat" className="px-4 py-2 rounded-md border text-sm">
          💬 Talk to AI about your feelings
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : wishes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No wishes yet. Create your first one!</p>
      ) : (
        <ul className="space-y-3">
          {wishes.map((w) => (
            <li key={w.id} className="border rounded-md p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">For {w.recipient_name}</div>
                  <div className="text-xs text-muted-foreground">From {w.sender_name}</div>
                </div>
                <button onClick={() => del(w.id)} className="text-xs text-destructive hover:underline">Delete</button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <input
                  readOnly
                  value={shareUrl(w.share_token)}
                  className="flex-1 border rounded px-2 py-1 bg-muted text-muted-foreground"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl(w.share_token));
                    toast.success("Link copied!");
                  }}
                  className="px-2 py-1 border rounded"
                >
                  Copy
                </button>
                <a href={shareUrl(w.share_token)} target="_blank" rel="noreferrer" className="px-2 py-1 border rounded">
                  Open
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
