import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, Mic, ThumbsDown, Meh, ThumbsUp, Loader2, Square, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import Mouth, { MouthShape } from "@/components/wordcoach/Mouth";
import { speak, recordWav, tokenizeIpa, localDate, BOX_INTERVAL, Viseme } from "@/lib/wordCoachAudio";

type Word = {
  id: string; word: string; part_of_speech: string; definition: string; simple_definition: string;
  ipa: string; example_sentence: string; needs_review: boolean;
};
type Item = { id: string; box: number; next_review: string; words: Word };
type Sound = { symbol: string; name: string; mouth_shape: string; examples: string[]; tip: string; audio_url: string | null };
type Result = { score: number; weak: { phoneme: string; score: number }[] };

const ringColor = (s: number) => (s >= 80 ? "hsl(142 70% 40%)" : s >= 60 ? "hsl(45 95% 50%)" : "hsl(0 75% 55%)");

const ScoreRing = ({ score }: { score: number }) => {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`Score ${score} out of 100`}>
      <circle cx="44" cy="44" r={r} strokeWidth="8" className="stroke-muted fill-none" />
      <circle cx="44" cy="44" r={r} strokeWidth="8" fill="none" stroke={ringColor(score)} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 44 44)" />
      <text x="44" y="50" textAnchor="middle" className="fill-foreground font-bold" fontSize="22">{score}</text>
    </svg>
  );
};

const Highlight = ({ sentence, word }: { sentence: string; word: string }) => {
  const re = new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*)`, "ig");
  return (
    <>
      {sentence.split(re).map((part, i) =>
        re.test(part) || part.toLowerCase().startsWith(word.toLowerCase())
          ? <mark key={i} className="bg-accent/40 text-foreground rounded px-1 font-semibold">{part}</mark>
          : <span key={i}>{part}</span>,
      )}
    </>
  );
};

const WordPractice = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [practiced, setPracticed] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [moreDetail, setMoreDetail] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [sounds, setSounds] = useState<Record<string, Sound>>({});
  const [visemeMap, setVisemeMap] = useState<Record<number, MouthShape>>({});
  const [mouth, setMouth] = useState<MouthShape>("rest");
  const [playing, setPlaying] = useState<"word" | "sentence" | null>(null);
  const [recording, setRecording] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [panel, setPanel] = useState<Sound | null>(null);
  const stopRef = useRef<{ stop?: () => void }>({});

  useEffect(() => {
    (async () => {
      const [{ data: due }, { data: s }, { data: v }] = await Promise.all([
        supabase.from("user_words").select("id, box, next_review, words(*)").lte("next_review", localDate()).order("next_review"),
        supabase.from("ipa_sounds").select("symbol, name, mouth_shape, examples, tip, audio_url"),
        supabase.from("azure_viseme_to_mouth").select("viseme_id, mouth"),
      ]);
      setItems((due as unknown as Item[]) ?? []);
      setSounds(Object.fromEntries((s ?? []).map((x) => [x.symbol, x as Sound])));
      setVisemeMap(Object.fromEntries((v ?? []).map((x) => [x.viseme_id, x.mouth as MouthShape])));
      setLoading(false);
    })();
  }, []);

  const item = items[index];
  const tokens = useMemo(() => (item ? tokenizeIpa(item.words.ipa) : []), [item]);
  const isWeak = (sym: string) => !!result?.weak.some((w) => w.phoneme === sym || w.phoneme.includes(sym));

  const animate = (audio: HTMLAudioElement, visemes: Viseme[]) => {
    let raf = 0;
    const tick = () => {
      const ms = audio.currentTime * 1000;
      let cur: Viseme | undefined;
      for (const v of visemes) if (v.t <= ms) cur = v; else break;
      setMouth(cur ? visemeMap[cur.id] ?? "rest" : "rest");
      if (!audio.paused && !audio.ended) raf = requestAnimationFrame(tick);
    };
    audio.onplay = () => (raf = requestAnimationFrame(tick));
    audio.onended = () => { cancelAnimationFrame(raf); setMouth("rest"); setPlaying(null); };
  };

  const play = async (kind: "word" | "sentence", e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!item || playing) return;
    setPlaying(kind);
    try {
      const { audio, visemes } = kind === "word"
        ? await speak(item.words.word, { ipa: item.words.ipa, kind })
        : await speak(item.words.example_sentence, { kind });
      animate(audio, visemes);
      await audio.play();
    } catch {
      toast.error("Could not play the sound. Please try again.");
      setPlaying(null);
    }
  };

  const sayIt = async () => {
    if (!item) return;
    if (recording) { stopRef.current.stop?.(); return; }
    setResult(null);
    try {
      setRecording(true);
      const wav = await recordWav(5000, stopRef.current);
      setRecording(false);
      setChecking(true);
      const { data, error } = await supabase.functions.invoke("assess-pronunciation", { body: { word_id: item.words.id, audio: wav } });
      if (error) {
        let body: any = null;
        try { body = await (error as any).context?.json(); } catch { /* ignore */ }
        toast.error(body?.error ?? "We couldn't check that. Please try again.");
      } else setResult(data);
    } catch {
      toast.error("Please allow the microphone to use Say it.");
    } finally {
      setRecording(false); setChecking(false);
    }
  };

  const rate = async (choice: "dont" | "practice" | "got") => {
    if (!item || sliding) return;
    const box = choice === "dont" ? 1 : choice === "practice" ? item.box : Math.min(5, item.box + 1);
    const days = choice === "dont" ? 0 : choice === "practice" ? 1 : BOX_INTERVAL[box];
    const { error } = await supabase.from("user_words").update({ box, next_review: localDate(days) }).eq("id", item.id);
    if (error) { toast.error("Could not save. Please try again."); return; }
    setPracticed((n) => n + 1);
    setSliding(true);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setFlipped(false); setMoreDetail(false); setResult(null); setMouth("rest");
      setSliding(false);
    }, 300);
  };

  const openSound = (sym: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPanel(sounds[sym] ?? { symbol: sym, name: "", mouth_shape: "rest", examples: [], tip: "We don't have notes for this sound yet.", audio_url: null });
  };

  const playSound = async (s: Sound) => {
    if (s.audio_url) { new Audio(s.audio_url).play().catch(() => {}); return; }
    const ex = s.examples?.[0];
    if (!ex) return;
    try { const { audio, visemes } = await speak(ex); animate(audio, visemes); await audio.play(); } catch { toast.error("Could not play the sound."); }
  };

  const done = !loading && index >= items.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-xl mx-auto flex items-center gap-3 px-4 h-16">
          <Button variant="ghost" size="icon" aria-label="Back to Word Coach" onClick={() => navigate("/word-coach")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-heading text-2xl font-bold flex-1">Practice</h1>
          {!done && !loading && <span className="text-muted-foreground">{index + 1} / {items.length}</span>}
        </div>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 flex flex-col">
        {loading ? (
          <p className="text-center text-muted-foreground py-16">Loading…</p>
        ) : done ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-16">
            <PartyPopper className="h-16 w-16 text-primary" />
            <h2 className="font-heading text-3xl font-bold">All done for today!</h2>
            <p className="text-lg text-muted-foreground">
              {practiced === 0 ? "No words to practice right now." : `You practiced ${practiced} word${practiced === 1 ? "" : "s"}.`}
            </p>
            <Button variant="hero" className="h-14 px-8 text-lg rounded-2xl" onClick={() => navigate("/word-coach")}>Back to My Words</Button>
          </div>
        ) : item && (
          <>
            <div className={`transition-all duration-300 ${sliding ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"}`}>
              <Card
                role="button"
                tabIndex={0}
                aria-label={flipped ? "Card back. Tap to see the word." : "Card front. Tap to flip."}
                onClick={() => setFlipped((f) => !f)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((f) => !f); } }}
                className="rounded-3xl border-2 shadow-lg cursor-pointer min-h-[22rem] focus-visible:ring-4 focus-visible:ring-ring outline-none"
              >
                <CardContent className="p-6">
                  {!flipped ? (
                    <div className="flex flex-col items-center justify-center gap-6 min-h-[19rem]">
                      <p className="font-heading text-5xl font-bold text-center break-words">{item.words.word}</p>
                      <Mouth shape={mouth} />
                      <Button variant="outline" className="h-14 px-6 text-lg rounded-full" onClick={(e) => play("word", e)} disabled={!!playing}>
                        {playing === "word" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />} Listen
                      </Button>
                      <p className="text-sm text-muted-foreground">Tap the card to flip</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-heading text-3xl font-bold">{item.words.word}</p>
                          {item.words.part_of_speech && <p className="italic text-muted-foreground">{item.words.part_of_speech}</p>}
                        </div>
                        {item.words.needs_review && <Badge variant="outline" className="rounded-full shrink-0">AI-generated</Badge>}
                      </div>

                      <div>
                        <p className="text-xl">{item.words.simple_definition}</p>
                        {item.words.definition && (
                          <>
                            <button className="text-primary underline underline-offset-4 mt-1 py-1"
                              onClick={(e) => { e.stopPropagation(); setMoreDetail((m) => !m); }} aria-expanded={moreDetail}>
                              {moreDetail ? "Less detail" : "More detail"}
                            </button>
                            {moreDetail && <p className="text-muted-foreground mt-1">{item.words.definition}</p>}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <Mouth shape={mouth} size={72} />
                        <div className="flex flex-wrap items-center text-2xl" aria-label="Pronunciation. Tap a sound to learn it.">
                          <span className="text-muted-foreground">/</span>
                          {tokens.map((t, i) => (
                            <button key={i} onClick={(e) => openSound(t.symbol, e)}
                              aria-label={`Sound ${t.symbol}${t.stressed ? ", stressed" : ""}${isWeak(t.symbol) ? ", needs practice" : ""}`}
                              className={`min-w-[2rem] h-11 px-1 rounded-lg hover:bg-muted ${t.stressed ? "font-bold" : ""} ${isWeak(t.symbol) ? "bg-destructive/20 text-destructive ring-2 ring-destructive/50" : ""}`}>
                              {t.symbol}
                            </button>
                          ))}
                          <span className="text-muted-foreground">/</span>
                        </div>
                      </div>

                      {item.words.example_sentence && (
                        <div className="flex items-start gap-3 bg-muted/50 rounded-2xl p-4">
                          <p className="flex-1 text-lg"><Highlight sentence={item.words.example_sentence} word={item.words.word} /></p>
                          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full shrink-0" aria-label="Listen to the sentence"
                            onClick={(e) => play("sentence", e)} disabled={!!playing}>
                            {playing === "sentence" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center justify-center gap-5 mt-6">
                <Button variant={recording ? "destructive" : "secondary"} className="h-14 px-8 text-lg rounded-full" onClick={sayIt} disabled={checking}>
                  {checking ? <Loader2 className="h-5 w-5 animate-spin" /> : recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  {checking ? "Checking…" : recording ? "Stop" : "Say it"}
                </Button>
                {result && <ScoreRing score={result.score} />}
              </div>
              {result && (
                <p className="text-center text-muted-foreground mt-2" aria-live="polite">
                  {result.weak.length === 0 ? "Great job! Every sound was clear." : `Try these sounds again: ${result.weak.map((w) => w.phoneme).join(", ")}. Flip the card and tap them to learn more.`}
                </p>
              )}
            </div>

            <div className="mt-auto pt-8 grid grid-cols-3 gap-3">
              <Button variant="outline" onClick={() => rate("dont")} className="h-24 flex-col gap-2 rounded-2xl text-base border-2">
                <ThumbsDown className="h-8 w-8" /> Don't know
              </Button>
              <Button variant="outline" onClick={() => rate("practice")} className="h-24 flex-col gap-2 rounded-2xl text-base border-2">
                <Meh className="h-8 w-8" /> Practice
              </Button>
              <Button variant="hero" onClick={() => rate("got")} className="h-24 flex-col gap-2 rounded-2xl text-base">
                <ThumbsUp className="h-8 w-8" /> Got it
              </Button>
            </div>
          </>
        )}
      </main>

      <Sheet open={!!panel} onOpenChange={(o) => !o && setPanel(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {panel && (
            <>
              <SheetHeader>
                <SheetTitle className="text-4xl font-heading">/{panel.symbol}/ {panel.name && <span className="text-xl text-muted-foreground">{panel.name}</span>}</SheetTitle>
                <SheetDescription className="text-lg">{panel.tip}</SheetDescription>
              </SheetHeader>
              <div className="flex items-center gap-6 py-6">
                <Mouth shape={(panel.mouth_shape as MouthShape) || "rest"} size={110} />
                <div className="space-y-2">
                  {panel.examples?.length > 0 && <p className="text-lg">Examples: <strong>{panel.examples.join(", ")}</strong></p>}
                  {(panel.audio_url || panel.examples?.length > 0) && (
                    <Button variant="outline" className="h-12 rounded-full" onClick={() => playSound(panel)}>
                      <Volume2 className="h-5 w-5" /> Listen
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default WordPractice;
