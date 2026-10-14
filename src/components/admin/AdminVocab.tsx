import { useCallback, useEffect, useState } from "react";
import { Volume2, Search, CheckCircle2, Pencil, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { speak, tokenizeIpa } from "@/lib/wordCoachAudio";
import WordEditDialog from "@/components/wordcoach/WordEditDialog";

export const WORD_REVIEW_EVENT = "word-review-changed";
const notifyChanged = () => window.dispatchEvent(new Event(WORD_REVIEW_EVENT));
const PAGE = 25;

const sourceLabel = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v.includes("datamuse")) return "Datamuse";
  if (v.includes("dict")) return "Dictionary";
  if (v.includes("ai")) return "AI";
  return s || "—";
};

const Ipa = ({ ipa }: { ipa: string }) => (
  <span className="font-mono">
    /{tokenizeIpa(ipa || "").map((t, i) => (
      <span key={i} className={t.stressed ? "font-bold text-primary" : ""}>{t.symbol}</span>
    ))}/
  </span>
);

const AdminVocab = () => {
  const [tab, setTab] = useState<"review" | "all">("review");
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { count } = await supabase.from("words").select("id", { count: "exact", head: true }).eq("needs_review", true);
    setReviewCount(count ?? 0);
    let q = supabase.from("words").select("*", { count: "exact" });
    if (tab === "review") {
      q = q.eq("needs_review", true).order("created_at", { ascending: true });
    } else {
      if (search.trim()) q = q.ilike("word", `%${search.trim()}%`);
      q = q.order("word", { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
    }
    const { data, count: c, error } = await q;
    if (error) toast.error("Could not load words");
    setRows(data ?? []);
    setTotal(c ?? 0);
    setLoading(false);
  }, [tab, search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [search, tab]);
  useEffect(() => { setSelected(new Set()); }, [tab]);

  const refresh = () => { load(); notifyChanged(); };

  const setReview = async (ids: string[], value: boolean) =>
    supabase.from("words").update({ needs_review: value }).in("id", ids);

  const approve = async (w: any) => {
    const { error } = await setReview([w.id], false);
    if (error) { toast.error("Could not approve"); return; }
    refresh();
    toast.success(`Approved "${w.word}"`, {
      duration: 5000,
      action: { label: "Undo", onClick: async () => { await setReview([w.id], true); refresh(); } },
    });
  };

  const approveSelected = async () => {
    const ids = [...selected];
    const { error } = await setReview(ids, false);
    setConfirmBulk(false);
    if (error) { toast.error("Could not approve"); return; }
    setSelected(new Set());
    refresh();
    toast.success(`Approved ${ids.length} word${ids.length === 1 ? "" : "s"}`, {
      duration: 5000,
      action: { label: "Undo", onClick: async () => { await setReview(ids, true); refresh(); } },
    });
  };

  const listen = async (w: any) => {
    setPlaying(w.id);
    try { await speak(w.word, { ipa: w.ipa }); } catch { toast.error("Could not play audio"); }
    setPlaying(null);
  };

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const selectedWords = rows.filter((r) => selected.has(r.id));
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Word Review</CardTitle>
        <CardDescription>Check words added to Word Coach and approve or fix them. Changes apply for every learner.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="review">Needs review ({reviewCount})</TabsTrigger>
              <TabsTrigger value="all">All words</TabsTrigger>
            </TabsList>
          </Tabs>
          {tab === "review" ? (
            <Button disabled={selected.size === 0} onClick={() => setConfirmBulk(true)}>
              <CheckCircle2 className="h-4 w-4" /> Approve selected{selected.size ? ` (${selected.size})` : ""}
            </Button>
          ) : (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by word"
                aria-label="Search by word" className="pl-9" />
            </div>
          )}
        </div>

        {tab === "review" && rows.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={allChecked}
              onCheckedChange={(c) => setSelected(c ? new Set(rows.map((r) => r.id)) : new Set())} />
            Select all
          </label>
        )}

        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {tab === "review" ? "Nothing to review — all words are approved." : "No words found."}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {rows.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-3 p-3">
                {tab === "review" && (
                  <Checkbox checked={selected.has(w.id)} onCheckedChange={() => toggle(w.id)} aria-label={`Select ${w.word}`} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-lg font-bold">{w.word}</span>
                    {w.part_of_speech && <em className="text-sm text-muted-foreground">{w.part_of_speech}</em>}
                    {w.needs_review && <Badge variant="secondary" className="text-xs">AI-generated</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {w.ipa ? <Ipa ipa={w.ipa} /> : <span>No IPA</span>}
                    <span>Source: {sourceLabel(w.source)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button variant="ghost" size="sm" onClick={() => listen(w)} disabled={playing === w.id} aria-label={`Listen to ${w.word}`}>
                    {playing === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />} Listen
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(w.word.toLowerCase())}`}
                      target="_blank" rel="noopener noreferrer" aria-label={`Check ${w.word} in Cambridge Dictionary`}>
                      <ExternalLink className="h-4 w-4" /> Check
                    </a>
                  </Button>
                  {w.needs_review && (
                    <Button variant="ghost" size="sm" onClick={() => approve(w)} aria-label={`Approve ${w.word}`}>
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEditing(w)} aria-label={`Edit ${w.word}`}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "all" && total > PAGE && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span>Page {page + 1} of {pages}</span>
            <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {selectedWords.length} word{selectedWords.length === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>These words will no longer be marked as needing review:</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-60 overflow-y-auto list-disc pl-6 text-sm">
            {selectedWords.map((w) => <li key={w.id}>{w.word}</li>)}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={approveSelected}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WordEditDialog word={editing} onClose={() => setEditing(null)} onChanged={refresh} />
    </Card>
  );
};

export default AdminVocab;
