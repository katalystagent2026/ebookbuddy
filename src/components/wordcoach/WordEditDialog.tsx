import { useEffect, useState } from "react";
import { Loader2, Upload, Wand2, ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { resolveWordMedia, uploadWordMedia, removeWordMedia, generateWordAudio } from "@/lib/wordMedia";

type EditDraft = {
  id: string; word: string; word_code: string; part_of_speech: string; definition: string;
  simple_definition: string; ipa: string; example_sentence: string;
  image_url: string | null; audio_url: string | null; origIpa: string;
};

/** Admin-only editor for a shared word. Pass `word` to open; null closes. */
export default function WordEditDialog({ word, onClose, onChanged }: {
  word: any | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<"image" | "audio" | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!word) { setEditing(null); return; }
    setEditing({
      id: word.id,
      word: word.word,
      word_code: word.word_code ?? "",
      part_of_speech: word.part_of_speech ?? "",
      definition: word.definition ?? "",
      simple_definition: word.simple_definition ?? "",
      ipa: word.ipa ?? "",
      origIpa: word.ipa ?? "",
      example_sentence: word.example_sentence ?? "",
      image_url: word.image_url ?? null,
      audio_url: word.audio_url ?? null,
    });
  }, [word]);

  useEffect(() => { resolveWordMedia(editing?.image_url).then(setImagePreview); }, [editing?.image_url]);
  useEffect(() => { resolveWordMedia(editing?.audio_url).then(setAudioPreview); }, [editing?.audio_url]);

  const load = () => onChanged?.();

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
      needs_review: false,
    } as any).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error("Could not save changes"); return; }
    toast.success(`Saved "${editing.word}"`);
    onClose();
    load();
  };

  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit word</DialogTitle>
          <DialogDescription>Changes apply to this word for every learner who has it.</DialogDescription>
        </DialogHeader>
        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="edit-word">Word</Label>
                <Input id="edit-word" value={editing.word}
                  onChange={(e) => setEditing({ ...editing, word: e.target.value })} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-code">Word ID#</Label>
                <Input id="edit-code" value={editing.word_code}
                  onChange={(e) => setEditing({ ...editing, word_code: e.target.value })} className="h-12 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Image</Label>
              {imagePreview ? (
                <img src={imagePreview} alt={editing.word} className="max-h-40 rounded-xl border border-border object-contain" />
              ) : (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
                  <ImageIcon className="mr-2 h-5 w-5" /> No image
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="h-10 rounded-xl">
                  <label className={mediaBusy ? "pointer-events-none opacity-50" : "cursor-pointer"}>
                    {mediaBusy === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {editing.image_url ? "Replace image" : "Upload image"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { uploadMedia("image", e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </Button>
                {editing.image_url && (
                  <Button variant="outline" className="h-10 rounded-xl" disabled={!!mediaBusy} onClick={() => deleteMedia("image")}>
                    <Trash2 className="h-4 w-4" /> Delete image
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Audio</Label>
              {audioPreview ? <audio controls src={audioPreview} className="w-full" /> :
                <p className="text-sm text-muted-foreground">No audio yet — it will be created from the IPA when you save.</p>}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="h-10 rounded-xl">
                  <label className={mediaBusy ? "pointer-events-none opacity-50" : "cursor-pointer"}>
                    {mediaBusy === "audio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {editing.audio_url ? "Replace audio" : "Upload audio"}
                    <input type="file" accept="audio/*" className="hidden"
                      onChange={(e) => { uploadMedia("audio", e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </Button>
                <Button variant="outline" className="h-10 rounded-xl" disabled={!!mediaBusy} onClick={regenerateAudio}>
                  <Wand2 className="h-4 w-4" /> Generate from IPA
                </Button>
                {editing.audio_url && (
                  <Button variant="outline" className="h-10 rounded-xl" disabled={!!mediaBusy} onClick={() => deleteMedia("audio")}>
                    <Trash2 className="h-4 w-4" /> Delete audio
                  </Button>
                )}
              </div>
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
          <Button variant="outline" className="h-12 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button variant="hero" className="h-12 rounded-xl" disabled={saving || !editing?.word.trim()} onClick={saveEdit}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
