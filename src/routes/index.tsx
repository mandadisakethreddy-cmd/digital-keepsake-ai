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
      <div className="max-w-lg text-center space-y-5">
        <div className="text-5xl">🎂</div>
        <h1 className="text-3xl font-bold">Birthday Surprise</h1>
        <p className="text-muted-foreground">
          Surprise the birthday boy or girl with their photos, videos and an
          AI-written letter. Simple to make, easy to share, a memory for life.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link to="/auth" className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">
            Get started
          </Link>
          <Link to="/auth" className="px-5 py-2 rounded-md border text-sm font-medium">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
