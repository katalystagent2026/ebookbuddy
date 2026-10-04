import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import SoundPanel, { Sound } from "@/components/wordcoach/SoundPanel";

const WordProgress = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [boxes, setBoxes] = useState<{ box: string; words: number }[]>([]);
  const [trend, setTrend] = useState<{ day: string; score: number }[]>([]);
  const [missed, setMissed] = useState<{ symbol: string; count: number }[]>([]);
  const [sounds, setSounds] = useState<Record<string, Sound>>({});
  const [panel, setPanel] = useState<Sound | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: uw }, { data: at }, { data: s }] = await Promise.all([
        supabase.from("user_words").select("box"),
        supabase.from("attempts").select("score, weak_phonemes, created_at").order("created_at"),
        supabase.from("ipa_sounds").select("symbol, name, mouth_shape, examples, tip, audio_url"),
      ]);
      const list = uw ?? [];
      setTotal(list.length);
      setBoxes([1, 2, 3, 4, 5].map((b) => ({ box: `Box ${b}`, words: list.filter((x) => x.box === b).length })));

      const byDay: Record<string, number[]> = {};
      const counts: Record<string, number> = {};
      for (const a of at ?? []) {
        const day = new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        (byDay[day] ??= []).push(a.score);
        for (const p of (a.weak_phonemes as { phoneme: string }[]) ?? []) if (p?.phoneme) counts[p.phoneme] = (counts[p.phoneme] ?? 0) + 1;
      }
      setTrend(Object.entries(byDay).map(([day, v]) => ({ day, score: Math.round(v.reduce((x, y) => x + y, 0) / v.length) })));
      setMissed(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([symbol, count]) => ({ symbol, count })));
      setSounds(Object.fromEntries((s ?? []).map((x) => [x.symbol, x as Sound])));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-xl mx-auto flex items-center gap-3 px-4 h-16">
          <Button variant="ghost" size="icon" aria-label="Back to Word Coach" onClick={() => navigate("/word-coach")}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="font-heading text-2xl font-bold">My Progress</h1>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {loading ? <p className="text-center text-muted-foreground py-16">Loading…</p> : (<>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Total words</p>
              <p className="font-heading text-5xl font-bold">{total}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-xl">Words in each box</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={{ words: { label: "Words", color: "hsl(var(--primary))" } }} className="h-56 w-full">
                <BarChart data={boxes}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="box" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="words" fill="var(--color-words)" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-xl">Pronunciation score over time</CardTitle></CardHeader>
            <CardContent>
              {trend.length === 0 ? <p className="text-muted-foreground">Use “Say it” to see your scores here.</p> : (
                <ChartContainer config={{ score: { label: "Average score", color: "hsl(var(--accent))" } }} className="h-56 w-full">
                  <LineChart data={trend}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} width={32} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="score" stroke="var(--color-score)" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-xl">Sounds to practice</CardTitle></CardHeader>
            <CardContent>
              {missed.length === 0 ? <p className="text-muted-foreground">No tricky sounds yet. Great work!</p> : (
                <ul className="grid grid-cols-1 gap-2">
                  {missed.map((m) => (
                    <li key={m.symbol}>
                      <button
                        onClick={() => setPanel(sounds[m.symbol] ?? { symbol: m.symbol, name: "", mouth_shape: "rest", examples: [], tip: "", audio_url: null })}
                        className="w-full flex items-center justify-between h-14 px-4 rounded-2xl border-2 hover:bg-muted text-left">
                        <span className="text-2xl font-bold">/{m.symbol}/ <span className="text-base font-normal text-muted-foreground">{sounds[m.symbol]?.name}</span></span>
                        <span className="text-muted-foreground">missed {m.count}×</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>)}
      </main>
      <SoundPanel sound={panel} onClose={() => setPanel(null)} />
    </div>
  );
};

export default WordProgress;
