import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://digital-keepsake-ai.lovable.app/blog/how-to-plan-a-surprise-party";
const TITLE = "How to Plan a Surprise Party: A Step-by-Step Guide";
const DESCRIPTION =
  "A practical timeline for planning a surprise party — guest list, venue, secrecy, decoy plan and the digital surprise page that makes the moment last.";

export const Route = createFileRoute("/blog/how-to-plan-a-surprise-party")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Birthday Surprise` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          mainEntityOfPage: URL,
        }),
      },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6 space-y-8">
      <nav className="text-sm">
        <Link to="/" className="text-muted-foreground hover:underline">
          ← Birthday Surprise
        </Link>
      </nav>

      <header className="space-y-3">
        <h1 className="text-3xl bday-title">{TITLE}</h1>
        <p className="text-muted-foreground">
          Surprise parties fail for boring reasons: someone spills the secret, the guest of honour
          shows up early, or the whole thing is over in twenty minutes with nothing to remember it
          by. Here's a timeline that avoids all three.
        </p>
      </header>

      <article className="space-y-8 text-sm leading-relaxed">
        <section className="bday-card p-5 space-y-2">
          <h2 className="text-lg font-semibold">4 weeks out: lock the basics</h2>
          <p>
            Pick a date that is <em>not</em> the actual birthday — people expect something on the
            day itself, so the weekend before or after is far easier to hide. Confirm the venue
            (someone's living room counts), set a rough budget, and choose one co-conspirator who
            knows every detail in case you get stuck at work.
          </p>
        </section>

        <section className="bday-card p-5 space-y-2">
          <h2 className="text-lg font-semibold">3 weeks out: the guest list and the secret</h2>
          <p>
            Keep it to people the guest of honour would genuinely want in the room. Every extra
            person is another chance the secret leaks. Send invites in one group chat that does not
            include them, and write the rule at the top: no posts, no stories, no "can't wait for
            Saturday" texts.
          </p>
          <p>
            Ask each guest for one photo and a one-line memory while you have their attention. This
            is the single step most people skip, and it is the one that makes the party feel
            personal instead of generic.
          </p>
        </section>

        <section className="bday-card p-5 space-y-2">
          <h2 className="text-lg font-semibold">2 weeks out: food, cake and the decoy plan</h2>
          <p>
            Order the cake and decide on food that survives a delay — the guest of honour will be
            late, that is the nature of a decoy. Speaking of which: plan how they actually arrive.
            A friend taking them for "a quick coffee" beats an elaborate lie, because simple decoys
            do not collapse under questions.
          </p>
        </section>

        <section className="bday-card p-5 space-y-2">
          <h2 className="text-lg font-semibold">1 week out: build the digital surprise</h2>
          <p>
            The party lasts an evening. A surprise page lasts as long as you want it to. Collect the
            photos and videos guests sent you, upload them, colorize the old ones, and write a
            birthday letter — you can talk it through with the AI companion if you are stuck on
            words, then generate a letter in the tone that fits your relationship.
          </p>
          <p>
            Set the unlock time for the exact moment of the reveal, and pick a viewing window. The
            link stays locked with a countdown until then, so you can send it to them days in
            advance without spoiling anything.
          </p>
          <p>
            <Link to="/auth" className="bday-btn inline-block px-5 py-2 text-sm">
              Create the surprise page
            </Link>
          </p>
        </section>

        <section className="bday-card p-5 space-y-2">
          <h2 className="text-lg font-semibold">Day of: the run of show</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Guests arrive 45 minutes early — not 15. Someone is always late.</li>
            <li>Phones on silent, lights normal. Crouching in the dark rarely improves anything.</li>
            <li>One person watches the door and gives the signal.</li>
            <li>
              After the reveal and the cake, put the surprise page on the TV. The photos and the
              letter turn a loud moment into a quiet, memorable one.
            </li>
            <li>Send the link to the guest of honour so they can reopen it later.</li>
          </ul>
        </section>

        <section className="bday-card p-5 space-y-2">
          <h2 className="text-lg font-semibold">Common mistakes to avoid</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Inviting too many people — the secret scales badly.</li>
            <li>Planning it on the birthday itself.</li>
            <li>Surprising someone who genuinely hates being surprised. Ask a close friend first.</li>
            <li>No photographer. Assign one person, or you will end up with zero good photos.</li>
            <li>Nothing to take away afterwards. This is what the surprise page solves.</li>
          </ul>
        </section>
      </article>

      <footer className="text-center text-xs text-muted-foreground pb-6">
        Made with ❤️ by Birthday Surprise —{" "}
        <Link to="/" className="underline">
          create your own
        </Link>
      </footer>
    </main>
  );
}
