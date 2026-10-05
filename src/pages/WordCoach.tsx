import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, ClipboardCheck, BarChart3, Plus, Search, Trash2, Volume2, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Word = {
  id: string; word: string; part_of_speech: string; definition: string; simple_definition: string;
  ipa: string; example_sentence: string; audio_url: string | null;
  syllables: { text: string; stress: number }[];
};
type UserWord = { id: string; box: number; next_review: string; words: Word };

const formatDate = (d: string) => {
  const today = new Date().toISOString().slice(0, 10);
  if (d <= today) return "Today";
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

type EditDraft = {
  id: string; word: string; word_code: string; part_of_speech: string; definition: string;
  simple_definition: string; ipa: string; example_sentence: string;
  image_url: string | null; audio_url: string | null; origIpa: string;
};

const WordCoach = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<{ message: string; suggestions: string[] } | null>(null);
  const [latest, setLatest] = useState<Word | null>(null);
  const [items, setItems] = useState<UserWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<UserWord | null>(null);
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<"image" | "audio" | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);

  useEffect(() => { resolveWordMedia(editing?.image_url).then(setImagePreview); }, [editing?.image_url]);
  useEffect(() => { resolveWordMedia(editing?.audio_url).then(setAudioPreview); }, [editing?.audio_url]);

  const openEdit = (w: Word & { definition?: string }) => {
    const a = w as any;
    setEditing({
      id: w.id,
      word: w.word,
      word_code: a.word_code ?? "",
      part_of_speech: w.part_of_speech ?? "",
      definition: a.definition ?? "",
      simple_definition: w.simple_definition ?? "",
      ipa: w.ipa ?? "",
      origIpa: w.ipa ?? "",
      example_sentence: w.example_sentence ?? "",
      image_url: a.image_url ?? null,
      audio_url: w.audio_url ?? null,
    });
  };

  const uploadMedia = async (kind: "image" | "audio", file?: File) => {
    if (!editing || !file) return;
    setMediaBusy(kind);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "image" ? "png" : "mp3");
      const path = await uploadWordMedia(editing.id, kind, file, ext);
      const old = kind === "image" ? editing.image_url : editing.audio_url;
      await supabase.from("words").update(kind === "image" ? { image_url: path } : { audio_url: path } as any).eq("id", editing.id);
      await removeWordMedia(old);
      setEditing((e) => e && { ...e, [kind === "image" ? "image_url" : "audio_url"]: path });
      toast.success(kind === "image" ? "Image uploaded" : "Audio uploaded");
      load();
    } catch { toast.error("Upload failed"); }
    setMediaBusy(null);
  };

  const deleteMedia = async (kind: "image" | "audio") => {
    if (!editing) return;
    setMediaBusy(kind);
    const old = kind === "image" ? editing.image_url : editing.audio_url;
    const { error } = await supabase.from("words").update(kind === "image" ? { image_url: null } : { audio_url: null } as any).eq("id", editing.id);
    if (error) { toast.error("Could not delete"); setMediaBusy(null); return; }
    await removeWordMedia(old);
    setEditing((e) => e && { ...e, [kind === "image" ? "image_url" : "audio_url"]: null });
    toast.success(kind === "image" ? "Image deleted" : "Audio deleted");
    setMediaBusy(null);
    load();
  };

  const regenerateAudio = async () => {
    if (!editing?.ipa.trim()) { toast.error("Add the IPA first"); return; }
    setMediaBusy("audio");
    try {
      const path = await generateWordAudio(editing.id, editing.word.trim(), editing.ipa.trim());
      await supabase.from("words").update({ audio_url: path }).eq("id", editing.id);
      await removeWordMedia(editing.audio_url);
      setEditing((e) => e && { ...e, audio_url: path });
      toast.success("Audio generated from IPA");
      load();
    } catch { toast.error("Could not generate audio"); }
    setMediaBusy(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const ipa = editing.ipa.trim();
    let audio_url = editing.audio_url;
    // Automatically create the pronunciation audio when missing or when the IPA changed.
    if (ipa && (!audio_url || ipa !== editing.origIpa.trim())) {
      try {
        const path = await generateWordAudio(editing.id, editing.word.trim(), ipa);
        await removeWordMedia(audio_url);
        audio_url = path;
      } catch { toast.error("Saved, but audio could not be generated"); }
    }
    const { error } = await supabase.from("words").update({
      word: editing.word.trim(),
      word_code: editing.word_code.trim() || null,
      part_of_speech: editing.part_of_speech.trim(),
      definition: editing.definition.trim(),
      simple_definition: editing.simple_definition.trim(),
      ipa,
      example_sentence: editing.example_sentence.trim(),
      audio_url,
    } as any).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error("Could not save changes"); return; }
    toast.success(`Saved "${editing.word}"`);
    setEditing(null);
    load();
  };

  const load = async () => {
    const { data, error } = await supabase
      .from("user_words")
      .select("id, box, next_review, words(*)")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load your words");
    setItems((data as unknown as UserWord[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addWord = async (w = input) => {
    const word = w.trim();
    if (!word) return;
    setAdding(true); setError(null); setLatest(null);
    const { data, error } = await supabase.functions.invoke("get-word-data", { body: { word } });
    setAdding(false);
    if (error) {
      let body: any = null;
      try { body = await (error as any).context?.json(); } catch { /* ignore */ }
      setError({ message: body?.error ?? "Something went wrong. Please try again.", suggestions: body?.suggestions ?? [] });
      return;
    }
    setLatest(data.word);
    setInput("");
    toast.success(data.alreadyAdded ? `"${data.word.word}" is already in your deck` : `Added "${data.word.word}"`);
    load();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("user_words").delete().eq("id", toDelete.id);
    if (error) toast.error("Could not delete"); else toast.success("Word removed");
    setToDelete(null);
    load();
  };

  const filtered = useMemo(
    () => items.filter((i) => i.words?.word.toLowerCase().includes(query.trim().toLowerCase())),
    [items, query],
  );

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dueCount = items.filter((i) => i.next_review <= todayStr).length;

  const play = (url: string | null) => url && new Audio(url).play().catch(() => {});

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-xl mx-auto flex items-center gap-3 px-4 h-16">
          <Button variant="ghost" size="icon" aria-label="Back to dashboard" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-heading text-2xl font-bold">Word Coach</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-8">
        <Button variant="hero" className="w-full h-16 text-xl rounded-2xl" onClick={() => navigate("/word-coach/practice")}>
          <Play className="h-6 w-6" /> Practice{dueCount > 0 ? ` (${dueCount} due)` : ""}
        </Button>
        <div className="grid grid-cols-2 gap-3 -mt-4">
          <Button variant="outline" className="h-14 text-lg rounded-2xl border-2" onClick={() => navigate("/word-coach/test")}>
            <ClipboardCheck className="h-5 w-5" /> Test
          </Button>
          <Button variant="outline" className="h-14 text-lg rounded-2xl border-2" onClick={() => navigate("/word-coach/progress")}>
            <BarChart3 className="h-5 w-5" /> Progress
          </Button>
        </div>
        <section aria-labelledby="add-heading" className="space-y-3">
          <h2 id="add-heading" className="font-heading text-xl font-semibold">Add a word</h2>
          <form onSubmit={(e) => { e.preventDefault(); addWord(); }} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a word, like “curious”"
              aria-label="New word"
              className="h-14 text-lg rounded-2xl"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <Button type="submit" variant="hero" disabled={adding || !input.trim()} className="h-14 text-lg rounded-2xl px-6">
              {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              {adding ? "Finding…" : "Add Word"}
            </Button>
          </form>

          {error && (
            <Card className="rounded-2xl border-2 border-accent/40" role="alert">
              <CardContent className="p-5 space-y-3">
                <p className="text-lg">{error.message}</p>
                {error.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-semibold">Did you mean…?</p>
                    <div className="flex flex-wrap gap-2">
                      {error.suggestions.map((s) => (
                        <Button key={s} variant="outline" className="h-11 rounded-full text-base"
                          onClick={() => { setInput(s); addWord(s); }}>
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {latest && (
            <Card className="rounded-2xl border-2 border-primary/30 shadow-md">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-3xl font-bold">{latest.word}</p>
                    <p className="text-muted-foreground">
                      {latest.part_of_speech && <em>{latest.part_of_speech}</em>} {latest.ipa}
                    </p>
                  </div>
                  {latest.audio_url && (
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" aria-label="Listen" onClick={() => play(latest.audio_url)}>
                      <Volume2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                {latest.syllables?.length > 0 && (
                  <p className="text-lg tracking-wide" aria-label="Syllables">
                    {latest.syllables.map((s, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-muted-foreground"> · </span>}
                        <span className={s.stress === 1 ? "font-bold text-primary" : ""}>{s.text}</span>
                      </span>
                    ))}
                  </p>
                )}
                <p className="text-lg">{latest.simple_definition}</p>
                {latest.example_sentence && <p className="italic text-muted-foreground">“{latest.example_sentence}”</p>}
              </CardContent>
            </Card>
          )}
        </section>

        <section aria-labelledby="mine-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="mine-heading" className="font-heading text-xl font-semibold">My Words</h2>
            <span className="text-muted-foreground">{items.length} words</span>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search my words"
              aria-label="Search my words" className="h-12 pl-12 text-base rounded-2xl" />
          </div>

          {loading ? (
            <p className="text-muted-foreground py-6 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">
              {items.length === 0 ? "No words yet. Add your first word above!" : "No words match your search."}
            </p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((item) => (
                <li key={item.id}>
                  <Card className="rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-xl font-bold truncate">{item.words.word}</p>
                        <p className="text-sm text-muted-foreground truncate">{item.words.simple_definition}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="rounded-full">Box {item.box}</Badge>
                          <span className="text-sm text-muted-foreground">Review: {formatDate(item.next_review)}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full"
                          aria-label={`Edit ${item.words.word}`} onClick={() => openEdit(item.words)}>
                          <Pencil className="h-5 w-5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full"
                        aria-label={`Delete ${item.words.word}`} onClick={() => setToDelete(item)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{toDelete?.words.word}”?</AlertDialogTitle>
            <AlertDialogDescription>This takes the word out of your deck. You can add it again any time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-xl">Keep it</AlertDialogCancel>
            <AlertDialogAction className="h-12 rounded-xl" onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit word</DialogTitle>
            <DialogDescription>Changes apply to this word for every learner who has it.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-word">Word</Label>
                <Input id="edit-word" value={editing.word}
                  onChange={(e) => setEditing({ ...editing, word: e.target.value })} className="h-12 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pos">Part of speech</Label>
                  <Input id="edit-pos" value={editing.part_of_speech}
                    onChange={(e) => setEditing({ ...editing, part_of_speech: e.target.value })} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-ipa">IPA</Label>
                  <Input id="edit-ipa" value={editing.ipa}
                    onChange={(e) => setEditing({ ...editing, ipa: e.target.value })} className="h-12 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-simple">Simple definition</Label>
                <Textarea id="edit-simple" value={editing.simple_definition}
                  onChange={(e) => setEditing({ ...editing, simple_definition: e.target.value })} className="rounded-xl" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-def">Full definition</Label>
                <Textarea id="edit-def" value={editing.definition}
                  onChange={(e) => setEditing({ ...editing, definition: e.target.value })} className="rounded-xl" rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-example">Example sentence</Label>
                <Textarea id="edit-example" value={editing.example_sentence}
                  onChange={(e) => setEditing({ ...editing, example_sentence: e.target.value })} className="rounded-xl" rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="h-12 rounded-xl" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="hero" className="h-12 rounded-xl" disabled={saving || !editing?.word.trim()} onClick={saveEdit}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WordCoach;
