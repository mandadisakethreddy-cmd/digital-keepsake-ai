import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Birthday Surprise — Make a memory" },
      { name: "description", content: "Create a birthday surprise page with photos, videos and an AI-written birthday letter. Share it with someone you love." },
      { property: "og:title", content: "Birthday Surprise — Make a memory" },
      { property: "og:description", content: "Upload photos & videos, write an AI birthday letter, and share a link with the birthday boy or girl." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="bday-card p-10 max-w-lg text-center space-y-5 bday-pop">
        <div className="text-6xl">🎂</div>
        <h1 className="text-4xl bday-title">Birthday Surprise</h1>
        <p className="text-muted-foreground">
          Surprise the birthday boy or girl with their photos, videos and an
          AI-written letter. Music plays automatically on their special day 🎵
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link to="/auth" className="bday-btn px-6 py-2.5 text-sm">
            Get started
          </Link>
          <Link to="/auth" className="px-6 py-2.5 rounded-md border text-sm font-medium bg-white/50">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
