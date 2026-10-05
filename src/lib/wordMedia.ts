import { supabase } from "@/integrations/supabase/client";

export const WORD_MEDIA_BUCKET = "word-media";

/** Stored values are either full URLs or paths inside the private word-media bucket. */
export async function resolveWordMedia(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^(https?:|blob:|data:)/.test(value)) return value;
  const { data } = await supabase.storage.from(WORD_MEDIA_BUCKET).createSignedUrl(value, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function uploadWordMedia(wordId: string, kind: "image" | "audio", file: Blob, ext: string) {
  const path = `${kind}/${wordId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(WORD_MEDIA_BUCKET).upload(path, file, {
    upsert: true, contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export async function removeWordMedia(value: string | null | undefined) {
  if (!value || /^(https?:|blob:|data:)/.test(value)) return;
  await supabase.storage.from(WORD_MEDIA_BUCKET).remove([value]);
}

/** Generate an MP3 of the word pronounced exactly as its IPA, and store it. */
export async function generateWordAudio(wordId: string, word: string, ipa: string) {
  const { data, error } = await supabase.functions.invoke("speak-word", { body: { text: word, ipa, kind: "word" } });
  if (error || !data?.audio) throw new Error("Could not generate audio");
  const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
  return uploadWordMedia(wordId, "audio", new Blob([bytes], { type: "audio/mpeg" }), "mp3");
}
