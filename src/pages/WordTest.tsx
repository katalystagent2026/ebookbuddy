import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, Mic, Square, Loader2, Check, X, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { speak, recordWav } from "@/lib/wordCoachAudio";

type Word = { id: string; word: string; simple_definition: string; ipa: string };
type Item = { id: string; box: number; words: Word };
type QType = "listen" | "meaning" | "speak";
type Question = { item: Item; type: QType; options: string[] };
type Answer = { item: Item; correct: boolean; pron?: number };

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const PASS = 70;

const WordTest = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [checking, setChecking] = useState(false);
  const [speakScore, setSpeakScore] = useState<number | null>(null);
  const stopRef = useRef<{ stop?: () => void }>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("user_words").select("id, box, words(id, word, simple_definition, ipa)");
      const deck = ((data as unknown as Item[]) ?? []).filter((d) => d.words);
      const chosen = shuffle(deck).slice(0, 10);
      // Extra wrong-answer choices from the shared word list when the deck is small
      let pool = deck.map((d) => d.words.word);
      if (pool.length < 4) {
        const { data: extra } = await supabase.from("words").select("word").limit(50);
        pool = [...new Set([...pool, ...(extra ?? []).map((e) => e.word), "happy", "garden", "quickly", "bridge", "listen", "window"])];
      }
      const types = shuffle(chosen.map((_, k) => (["listen", "meaning", "speak"] as QType[])[k % 3]));
      setQuestions(chosen.map((item, k) => ({
        item, type: types[k],
        options: shuffle([item.words.word, ...shuffle(pool.filter((w) => w.toLowerCase() !== item.words.word.toLowerCase())).slice(0, 3)]),
      })));
      setLoading(false);
    })();
  }, []);

  const q = questions[i];
  const done = !loading && i >= questions.length;

  const play = async () => {
    if (!q || playing) return;
    setPlaying(true);
    try {
      const { audio } = await speak(q.item.words.word, { ipa: q.item.words.ipa });
      audio.onended = () => setPlaying(false);
      await audio.play();
    } catch { toast.error("Could not play the sound."); setPlaying(false); }
  };

  useEffect(() => { if (q?.type === "listen") play(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [i, loading]);

  const record = async (correct: boolean, pron?: number) => {
    setAnswers((a) => [...a, { item: q.item, correct, pron }]);
    if (!correct) await supabase.from("user_words").update({ box: 1 }).eq("id", q.item.id);
  };

  const choose = async (opt: string) => {
    if (picked) return;
    setPicked(opt);
    await record(opt === q.item.words.word);
  };

  const sayIt = async () => {
    if (recording) { stopRef.current.stop?.(); return; }
    try {
      setRecording(true);
      const wav = await recordWav(5000, stopRef.current);
      setRecording(false); setChecking(true);
      const { data, error } = await supabase.functions.invoke("assess-pronunciation", { body: { word_id: q.item.words.id, audio: wav } });
      if (error) {
        let body: any = null;
        try { body = await (error as any).context?.json(); } catch { /* ignore */ }
        toast.error(body?.error ?? "We couldn't check that. Please try again.");
        return;
      }
      setSpeakScore(data.score);
      await record(data.score >= PASS, data.score);
    } catch {
      toast.error("Please allow the microphone to answer this question.");
    } finally { setRecording(false); setChecking(false); }
  };

  const next = () => { setI((n) => n + 1); setPicked(null); setSpeakScore(null); };
  const answered = picked !== null || speakScore !== null;

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;

  const header = (
    <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
      <div className="max-w-xl mx-auto flex items-center gap-3 px-4 h-16">
        <Button variant="ghost" size="icon" aria-label="Back to Word Coach" onClick={() => navigate("/word-coach")}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-heading text-2xl font-bold flex-1">Test</h1>
        {!done && <span className="text-muted-foreground">{i + 1} / {questions.length}</span>}
      </div>
    </header>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen bg-background">{header}
      <p className="text-center text-lg text-muted-foreground py-16 px-4">Add some words first, then come back for a test.</p>
    </div>
  );

  if (done) {
    const right = answers.filter((a) => a.correct).length;
    const prons = answers.filter((a) => a.pron !== undefined).map((a) => a.pron!);
    const avg = prons.length ? Math.round(prons.reduce((x, y) => x + y, 0) / prons.length) : null;
    const missed = answers.filter((a) => !a.correct);
    return (
      <div className="min-h-screen bg-background">{header}
        <main className="max-w-xl mx-auto px-4 py-8 space-y-6 text-center">
          <Trophy className="h-16 w-16 text-primary mx-auto" />
          <h2 className="font-heading text-4xl font-bold">{right} / {questions.length}</h2>
          <p className="text-lg text-muted-foreground">
            Average pronunciation: <strong className="text-foreground">{avg === null ? "—" : `${avg} / 100`}</strong>
          </p>
          {missed.length > 0 ? (
            <Card className="rounded-2xl text-left">
              <CardContent className="p-5">
                <h3 className="font-semibold text-lg mb-3">Words to practice</h3>
                <ul className="space-y-2">
                  {missed.map((m) => (
                    <li key={m.item.id} className="flex justify-between gap-3">
                      <span className="font-heading text-xl font-bold">{m.item.words.word}</span>
                      <span className="text-muted-foreground text-sm text-right">{m.item.words.simple_definition}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : <p className="text-lg">Perfect! You didn't miss any words.</p>}
          <div className="flex flex-col gap-3">
            {missed.length > 0 && (
              <Button variant="hero" className="h-14 text-lg rounded-2xl"
                onClick={() => navigate(`/word-coach/practice?ids=${missed.map((m) => m.item.id).join(",")}`)}>
                Practice missed words
              </Button>
            )}
            <Button variant="outline" className="h-14 text-lg rounded-2xl" onClick={() => navigate("/word-coach")}>Back to My Words</Button>
          </div>
        </main>
      </div>
    );
  }

  const isRight = answers[answers.length - 1]?.correct;

  return (
    <div className="min-h-screen bg-background flex flex-col">{header}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 flex flex-col gap-6">
        <Progress value={(i / questions.length) * 100} aria-label="Test progress" />
        <Card className="rounded-3xl border-2 shadow-lg">
          <CardContent className="p-6 flex flex-col items-center gap-4 text-center min-h-[12rem] justify-center">
            {q.type === "listen" && (<>
              <p className="text-lg text-muted-foreground">Listen. Which word do you hear?</p>
              <Button variant="outline" className="h-16 px-8 text-lg rounded-full" onClick={play} disabled={playing}>
                {playing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Volume2 className="h-6 w-6" />} Play again
              </Button>
            </>)}
            {q.type === "meaning" && (<>
              <p className="text-lg text-muted-foreground">Which word means…</p>
              <p className="text-2xl font-semibold">“{q.item.words.simple_definition}”</p>
            </>)}
            {q.type === "speak" && (<>
              <p className="text-lg text-muted-foreground">Say this word</p>
              <p className="font-heading text-5xl font-bold">{q.item.words.word}</p>
              {speakScore === null ? (
                <Button variant={recording ? "destructive" : "secondary"} className="h-14 px-8 text-lg rounded-full" onClick={sayIt} disabled={checking}>
                  {checking ? <Loader2 className="h-5 w-5 animate-spin" /> : recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  {checking ? "Checking…" : recording ? "Stop" : "Say it"}
                </Button>
              ) : <p className="text-xl">Score: <strong>{speakScore}</strong> / 100</p>}
            </>)}
          </CardContent>
        </Card>

        {q.type !== "speak" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options.map((o) => {
              const correct = o === q.item.words.word;
              const state = picked ? (correct ? "border-primary bg-primary/15" : o === picked ? "border-destructive bg-destructive/15" : "opacity-60") : "";
              return (
                <Button key={o} variant="outline" onClick={() => choose(o)} disabled={!!picked}
                  className={`h-16 text-xl rounded-2xl border-2 disabled:opacity-100 ${state}`}>
                  {o}
                </Button>
              );
            })}
          </div>
        )}

        {answered && (
          <div className="mt-auto space-y-3" aria-live="polite">
            <p className={`flex items-center justify-center gap-2 text-xl font-semibold ${isRight ? "text-primary" : "text-destructive"}`}>
              {isRight ? <><Check className="h-6 w-6" /> Correct!</> : <><X className="h-6 w-6" /> The answer is “{q.item.words.word}”</>}
            </p>
            <Button variant="hero" className="w-full h-14 text-lg rounded-2xl" onClick={next}>
              {i + 1 >= questions.length ? "See results" : "Next"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default WordTest;
