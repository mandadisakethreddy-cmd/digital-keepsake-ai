import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Birthday Surprise — Photos, Videos & an AI Birthday Letter" },
      { name: "description", content: "Turn photos and videos into a shareable birthday surprise page with an AI-written letter, music and a timed unlock. Free to create in minutes." },
      { property: "og:title", content: "Birthday Surprise — Photos, Videos & an AI Birthday Letter" },
      { property: "og:description", content: "Upload their photos and videos, generate a heartfelt letter with AI, and share a surprise link that unlocks on their birthday." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://digital-keepsake-ai.lovable.app/" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a663722b-0c65-4436-bab3-f51b7b423ade/id-preview-fb6c01a7--37daea25-4143-4af9-9544-b0e4a347b747.lovable.app-1785062249007.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a663722b-0c65-4436-bab3-f51b7b423ade/id-preview-fb6c01a7--37daea25-4143-4af9-9544-b0e4a347b747.lovable.app-1785062249007.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://digital-keepsake-ai.lovable.app/" }],
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
