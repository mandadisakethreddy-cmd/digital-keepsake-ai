import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const APP_NAME = "Birthday Surprise";
const SERVER_SLUG = "birthday-surprise";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect an AI Assistant — Birthday Surprise" },
      {
        name: "description",
        content:
          "Step-by-step instructions to connect ChatGPT, Claude, Claude Code or another AI assistant to your Birthday Surprise account so it can create and manage surprises for you.",
      },
      { property: "og:title", content: "Connect an AI Assistant — Birthday Surprise" },
      {
        property: "og:description",
        content:
          "Paste one link into ChatGPT or Claude and let your assistant write and manage birthday surprises for you.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://digital-keepsake-ai.lovable.app/connect" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://digital-keepsake-ai.lovable.app/connect" }],
  }),
  component: ConnectPage,
});

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — select the text and copy manually.");
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="shrink-0 rounded-md border bg-white/60 px-3 py-1.5 text-xs font-medium hover:bg-white"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function ConnectPage() {
  const [mcpUrl, setMcpUrl] = useState("");

  useEffect(() => {
    setMcpUrl(new URL("/mcp", window.location.origin).toString());
  }, []);

  const claudeLink =
    mcpUrl &&
    `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(
      APP_NAME,
    )}&connectorUrl=${encodeURIComponent(mcpUrl)}`;

  const claudeCodeCmd = `claude mcp add --scope user --transport http ${SERVER_SLUG} '${mcpUrl.replace(/'/g, "'\\''")}'`;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🤖🎂</div>
          <h1 className="text-3xl bday-title">Connect an AI assistant</h1>
          <p className="text-sm text-muted-foreground">
            Link ChatGPT, Claude or another AI assistant to your {APP_NAME} account so it can write
            and manage birthday surprises for you. You'll sign in once and approve the connection.
          </p>
        </div>

        <section className="bday-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">Your connection link</h2>
          <div className="flex items-center gap-2 rounded-md border bg-white/60 px-3 py-2">
            <code className="flex-1 break-all text-sm">{mcpUrl || "Loading…"}</code>
            {mcpUrl && <CopyButton value={mcpUrl} label="Copy the connection link" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Keep this page handy — every set of steps below ends with pasting this link.
          </p>
        </section>

        <section className="bday-card p-6 space-y-5">
          <h2 className="text-lg font-semibold">How to connect</h2>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">ChatGPT</h3>
            <Steps
              items={[
                <>
                  Open{" "}
                  <a
                    href="https://chatgpt.com/#settings/Connectors/Advanced"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    ChatGPT Apps settings
                  </a>{" "}
                  and turn on Developer mode (read the risk notice shown there). If you don't see
                  it, ask your ChatGPT admin to enable it.
                </>,
                <>Click the “Create app” button next to the back button.</>,
                <>
                  Give it a name like “{APP_NAME}” and paste the connection link from above.
                </>,
                <>Click “Create”.</>,
                <>Enable the app from the chat box, then ask ChatGPT to use it.</>,
              ]}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Claude</h3>
            <Steps
              items={[
                <>
                  {claudeLink ? (
                    <a href={claudeLink} target="_blank" rel="noreferrer" className="underline">
                      Open Claude with the connection prefilled
                    </a>
                  ) : (
                    "Open Claude's connector settings"
                  )}
                  .
                </>,
                <>Review the details and click “Add”.</>,
                <>
                  If the prefilled form doesn't open, go to Claude's Connectors page, choose “Add
                  custom connector”, name it “{APP_NAME}” and paste the link from above.
                </>,
                <>Enable the connector from the chat box, then ask Claude to use it.</>,
              ]}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Claude Code</h3>
            <div className="flex items-center gap-2 rounded-md border bg-white/60 px-3 py-2">
              <code className="flex-1 break-all text-xs">{mcpUrl ? claudeCodeCmd : "Loading…"}</code>
              {mcpUrl && <CopyButton value={claudeCodeCmd} label="Copy the Claude Code command" />}
            </div>
            <Steps
              items={[
                <>Run that command in a terminal.</>,
                <>
                  Start Claude Code and run <code>/mcp</code> to confirm it's connected, signing in
                  if it asks.
                </>,
                <>Ask Claude Code to use the app.</>,
              ]}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Other AI assistants</h3>
            <Steps
              items={[
                <>Open the assistant's MCP server or custom connector settings.</>,
                <>Create a new remote MCP server connection.</>,
                <>Name it “{APP_NAME}” and paste the connection link from above.</>,
                <>Finish any sign-in or approval prompts.</>,
                <>Enable the connection, then ask the assistant to use it.</>,
              ]}
            />
          </div>
        </section>

        <section className="bday-card p-6 space-y-5">
          <h2 className="text-lg font-semibold">Refresh after this app changes</h2>
          <p className="text-sm text-muted-foreground">
            Assistants remember what the app could do when they first connected. If something new
            is missing, refresh the connection.
          </p>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">ChatGPT</h3>
            <Steps
              items={[
                <>Open ChatGPT's app preferences and pick this app under “Enabled apps”.</>,
                <>Next to “Information”, click “Refresh”.</>,
                <>If the link above changed, paste the latest one.</>,
                <>Start a new chat and ask ChatGPT to use the app.</>,
              ]}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Claude</h3>
            <Steps
              items={[
                <>Open the Connectors page and select this connector.</>,
                <>Refresh or update its tools.</>,
                <>If the link above changed, paste the latest one.</>,
                <>Ask Claude to use the app.</>,
              ]}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Claude Code</h3>
            <Steps
              items={[
                <>Start a new Claude Code session — it picks up the latest tools on connect.</>,
                <>
                  If the link above changed, run <code>claude mcp remove {SERVER_SLUG}</code> and
                  run the install command again.
                </>,
                <>Ask Claude Code to use the app.</>,
              ]}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Other AI assistants</h3>
            <Steps
              items={[
                <>Open the assistant's MCP server or connector settings.</>,
                <>Select the connection you made for this app.</>,
                <>Refresh its tools, reload the server, or reconnect it.</>,
                <>If the link above changed, paste the latest one.</>,
                <>Start a new chat and ask the assistant to use the app.</>,
              ]}
            />
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">
            ← Back home
          </Link>
        </p>
      </div>
    </main>
  );
}
