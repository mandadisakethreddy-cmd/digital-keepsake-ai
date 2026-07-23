import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/wish/$token")({
  head: () => ({
    meta: [
      { title: "A Birthday Surprise for You 🎂" },
      { name: "description", content: "Someone made you a birthday surprise with photos, videos and a personal letter." },
      { property: "og:title", content: "A Birthday Surprise for You 🎂" },
      { property: "og:description", content: "Open your birthday surprise." },
    ],
  }),
  component: WishView,
});

type Media = { url: string; type: "image" | "video"; name: string };
type Wish = { sender_name: string; recipient_name: string; letter: string; media_urls: Media[] };

function WishView() {
  const { token } = Route.useParams();
  const [wish, setWish] = useState<Wish | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("wishes")
        .select("sender_name, recipient_name, letter, media_urls")
        .eq("share_token", token)
        .maybeSingle();
      if (!data) setNotFound(true);
      else setWish(data as unknown as Wish);
    })();
  }, [token]);

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">This surprise link is invalid or has been removed.</p>
      </main>
    );
  }
  if (!wish) {
    return <main className="min-h-screen flex items-center justify-center p-6">Loading your surprise…</main>;
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6 space-y-8">
      <header className="text-center space-y-2">
        <div className="text-6xl">🎂</div>
        <h1 className="text-3xl font-bold">Happy Birthday, {wish.recipient_name}!</h1>
        <p className="text-sm text-muted-foreground">A surprise from {wish.sender_name}</p>
      </header>

      {wish.media_urls.length > 0 && (
        <section className="grid grid-cols-2 gap-3">
          {wish.media_urls.map((m, i) =>
            m.type === "image" ? (
              <img key={i} src={m.url} alt="" className="w-full rounded-md object-cover aspect-square" />
            ) : (
              <video key={i} src={m.url} controls className="w-full rounded-md aspect-square object-cover" />
            ),
          )}
        </section>
      )}

      <section className="border rounded-md p-5 whitespace-pre-wrap text-sm leading-relaxed bg-card">
        {wish.letter}
      </section>

      <footer className="text-center text-xs text-muted-foreground">
        Made with ❤️ by {wish.sender_name}
      </footer>
    </main>
  );
}
