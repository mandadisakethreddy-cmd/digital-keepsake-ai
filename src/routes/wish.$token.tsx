import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
type Wish = {
  sender_name: string;
  recipient_name: string;
  letter: string;
  media_urls: Media[];
  birthday_date: string | null;
  view_duration_hours: number;
  created_at: string;
};

// Happy Birthday melody (frequencies in Hz + beats)
const MELODY: Array<[number, number]> = [
  [261.63, 0.5], [261.63, 0.5], [293.66, 1], [261.63, 1], [349.23, 1], [329.63, 2],
  [261.63, 0.5], [261.63, 0.5], [293.66, 1], [261.63, 1], [392.0, 1], [349.23, 2],
  [261.63, 0.5], [261.63, 0.5], [523.25, 1], [440.0, 1], [349.23, 1], [329.63, 1], [293.66, 2],
  [466.16, 0.5], [466.16, 0.5], [440.0, 1], [349.23, 1], [392.0, 1], [349.23, 2],
];

function playHappyBirthday(ctx: AudioContext) {
  const now = ctx.currentTime;
  let t = now + 0.1;
  const beat = 0.38;
  for (const [freq, beats] of MELODY) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const dur = beats * beat;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
    gain.gain.linearRampToValueAtTime(0.2, t + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
    t += dur;
  }
  return t - now;
}

function isBirthdayToday(bd: string | null): boolean {
  if (!bd) return true; // no date set = always considered "birthday"
  const today = new Date();
  const b = new Date(bd + "T00:00:00");
  return today.getMonth() === b.getMonth() && today.getDate() === b.getDate();
}

function computeExpiry(wish: Wish): Date | null {
  if (!wish.birthday_date) return null;
  const b = new Date(wish.birthday_date + "T00:00:00");
  // Set to this year's birthday
  const now = new Date();
  b.setFullYear(now.getFullYear());
  if (b.getTime() + wish.view_duration_hours * 3600_000 < now.getTime()) {
    b.setFullYear(now.getFullYear() + 1); // next occurrence
  }
  return new Date(b.getTime() + wish.view_duration_hours * 3600_000);
}

function MediaSlideshow({ media }: { media: Media[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (media.length <= 1) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % media.length), 4200);
    return () => window.clearInterval(id);
  }, [media.length]);
  return (
    <section className="slideshow">
      {media.map((m, i) => (
        <div key={i} className={`slide ${i === idx ? "active" : ""}`}>
          {m.type === "image" ? (
            <img src={m.url} alt="" className={i === idx ? "kenburns" : ""} />
          ) : (
            <video src={m.url} autoPlay={i === idx} muted loop playsInline />
          )}
        </div>
      ))}
      <div className="slide-dots">
        {media.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`slide-dot ${i === idx ? "on" : ""}`}
          />
        ))}
      </div>
    </section>
  );
}

  const { token } = Route.useParams();
  const [wish, setWish] = useState<Wish | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState("");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("wishes")
        .select("sender_name, recipient_name, letter, media_urls, birthday_date, view_duration_hours, created_at")
        .eq("share_token", token)
        .maybeSingle();
      if (!data) setNotFound(true);
      else setWish(data as unknown as Wish);
    })();
  }, [token]);

  const bdayToday = useMemo(() => (wish ? isBirthdayToday(wish.birthday_date) : false), [wish]);
  const expiry = useMemo(() => (wish ? computeExpiry(wish) : null), [wish]);
  const expired = expiry ? expiry.getTime() < Date.now() : false;
  const waiting = wish?.birthday_date && !bdayToday && !expired;

  // Countdown
  useEffect(() => {
    if (!wish) return;
    const tick = () => {
      const target = waiting
        ? (() => {
            const b = new Date(wish.birthday_date + "T00:00:00");
            b.setFullYear(new Date().getFullYear());
            if (b.getTime() < Date.now()) b.setFullYear(b.getFullYear() + 1);
            return b;
          })()
        : expiry;
      if (!target) return;
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setCountdown(""); return; }
      const d = Math.floor(diff / 86400_000);
      const h = Math.floor((diff / 3600_000) % 24);
      const m = Math.floor((diff / 60_000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [wish, waiting, expiry]);

  // Auto-play music loop when opened on birthday
  function startExperience() {
    setStarted(true);
    if (!bdayToday) return;
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const loop = () => {
        if (!audioCtxRef.current) return;
        const dur = playHappyBirthday(audioCtxRef.current);
        musicTimerRef.current = window.setTimeout(loop, (dur + 1.5) * 1000);
      };
      loop();
    } catch { /* ignore */ }
  }

  useEffect(() => {
    return () => {
      if (musicTimerRef.current) clearTimeout(musicTimerRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="bday-card p-8 text-center">
          <p>This surprise link is invalid or has been removed.</p>
        </div>
      </main>
    );
  }
  if (!wish) {
    return <main className="min-h-screen flex items-center justify-center p-6">Loading your surprise…</main>;
  }

  if (expired) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="bday-card p-8 text-center space-y-3 max-w-md">
          <div className="text-5xl">⏰</div>
          <h1 className="text-2xl font-bold">This surprise has ended</h1>
          <p className="text-sm text-muted-foreground">
            The viewing window for this birthday surprise has closed. Ask {wish.sender_name} to send it again!
          </p>
        </div>
      </main>
    );
  }

  if (waiting) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="bday-card p-8 text-center space-y-4 max-w-md">
          <div className="text-6xl">🎁</div>
          <h1 className="text-2xl bday-title">A surprise is waiting for you</h1>
          <p className="text-sm text-muted-foreground">
            {wish.sender_name} has prepared something special for your birthday.
            <br />Come back on the big day!
          </p>
          <div className="text-3xl font-mono font-bold bday-title">{countdown}</div>
        </div>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="bday-card p-8 text-center space-y-4 max-w-md bday-pop">
          <div className="text-6xl">🎂</div>
          <h1 className="text-2xl bday-title">You have a surprise!</h1>
          <p className="text-sm text-muted-foreground">
            From <b>{wish.sender_name}</b> · Tap below to open (music will play 🎵)
          </p>
          <button onClick={startExperience} className="bday-btn px-6 py-3 text-sm">
            🎉 Open my surprise
          </button>
          {countdown && (
            <p className="text-xs text-muted-foreground">Available for {countdown} more</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6 space-y-8 relative">
      {bdayToday && (
        <>
          {["🎈","🎉","🎂","🎁","✨","🎊"].map((e, i) => (
            <span
              key={i}
              className="confetti"
              style={{
                left: `${(i * 17) % 100}%`,
                animationDuration: `${6 + (i % 4)}s`,
                animationDelay: `${i * 0.7}s`,
              }}
            >{e}</span>
          ))}
        </>
      )}

      <header className="text-center space-y-2 bday-pop">
        <div className="text-6xl">🎂</div>
        <h1 className="text-4xl bday-title">Happy Birthday, {wish.recipient_name}!</h1>
        <p className="text-sm text-muted-foreground">A surprise from {wish.sender_name}</p>
        {countdown && (
          <p className="text-xs text-muted-foreground">✨ This surprise disappears in {countdown}</p>
        )}
      </header>

      {wish.media_urls.length > 0 && <MediaSlideshow media={wish.media_urls} />}

      <section className="letter-frame">
        <div className="letter-inner whitespace-pre-wrap text-sm leading-relaxed">
          <div className="letter-corner tl">❦</div>
          <div className="letter-corner tr">❦</div>
          <div className="letter-corner bl">❦</div>
          <div className="letter-corner br">❦</div>
          {wish.letter}
        </div>
      </section>


      <footer className="text-center text-xs text-muted-foreground pb-6">
        Made with ❤️ by {wish.sender_name}
      </footer>
    </main>
  );
}
