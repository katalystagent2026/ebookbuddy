import { supabase } from "@/integrations/supabase/client";

export type Viseme = { id: number; t: number };

export async function speak(text: string, opts: { ipa?: string; kind?: "word" | "sentence" } = {}) {
  const { data, error } = await supabase.functions.invoke("speak-word", {
    body: { text, ipa: opts.ipa ?? "", kind: opts.kind ?? "word" },
  });
  if (error || !data?.audio) throw new Error("Could not play the sound");
  const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
  return { audio: new Audio(url), visemes: (data.visemes ?? []) as Viseme[] };
}

/** Record up to `ms` milliseconds and return 16kHz mono 16-bit WAV as base64. */
export async function recordWav(ms = 5000, signal?: { stop?: () => void }): Promise<string> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));
  rec.start();
  const timer = setTimeout(() => rec.state !== "inactive" && rec.stop(), ms);
  if (signal) signal.stop = () => { clearTimeout(timer); if (rec.state !== "inactive") rec.stop(); };
  await done;
  stream.getTracks().forEach((t) => t.stop());

  const buf = await new Blob(chunks).arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(buf);
  ctx.close();
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);

  const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const w = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); view.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); w(36, "data"); view.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(view.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const MULTI = ["tʃ", "dʒ", "eɪ", "aɪ", "ɔɪ", "aʊ", "oʊ"];
const VOWELS = new Set(["i", "ɪ", "ɛ", "æ", "ɑ", "ɔ", "ʊ", "u", "ʌ", "ə", "ɝ", "ɚ", "e", "o", "a", ...MULTI.slice(2)]);

export type IpaToken = { symbol: string; stressed: boolean };

/** Split an IPA string into sound symbols, marking the primary-stressed syllable. */
export function tokenizeIpa(ipa: string): IpaToken[] {
  const s = ipa.replace(/[\/\[\]]/g, "").replace(/r/g, "ɹ").replace(/ː/g, "");
  const out: IpaToken[] = [];
  let stress = false, seenVowel = false;
  for (let i = 0; i < s.length; ) {
    const ch = s[i];
    if (ch === "ˈ") { stress = true; seenVowel = false; i++; continue; }
    if (ch === "ˌ" || ch === "." || ch === " ") { stress = false; i++; continue; }
    const multi = MULTI.find((m) => s.startsWith(m, i));
    const sym = multi ?? ch;
    i += sym.length;
    if (stress && seenVowel && !VOWELS.has(sym)) {
      // a consonant after the stressed vowel stays bold only if no vowel follows it
      const rest = s.slice(i);
      if ([...VOWELS].some((v) => rest.startsWith(v))) stress = false;
    }
    out.push({ symbol: sym, stressed: stress });
    if (VOWELS.has(sym)) { if (seenVowel && stress) stress = false; seenVowel = true; }
  }
  return out;
}

export const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const BOX_INTERVAL: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };
