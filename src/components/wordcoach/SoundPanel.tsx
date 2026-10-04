import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Mouth, { MouthShape } from "@/components/wordcoach/Mouth";
import { speak } from "@/lib/wordCoachAudio";
import { toast } from "sonner";

export type Sound = { symbol: string; name: string; mouth_shape: string; examples: string[]; tip: string; audio_url: string | null };

const SoundPanel = ({ sound, onClose }: { sound: Sound | null; onClose: () => void }) => {
  const play = async (s: Sound) => {
    if (s.audio_url) { new Audio(s.audio_url).play().catch(() => {}); return; }
    const ex = s.examples?.[0];
    if (!ex) return;
    try { const { audio } = await speak(ex); await audio.play(); } catch { toast.error("Could not play the sound."); }
  };
  return (
    <Sheet open={!!sound} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        {sound && (
          <>
            <SheetHeader>
              <SheetTitle className="text-4xl font-heading">/{sound.symbol}/ {sound.name && <span className="text-xl text-muted-foreground">{sound.name}</span>}</SheetTitle>
              <SheetDescription className="text-lg">{sound.tip || "We don't have notes for this sound yet."}</SheetDescription>
            </SheetHeader>
            <div className="flex items-center gap-6 py-6">
              <Mouth shape={(sound.mouth_shape as MouthShape) || "rest"} size={110} />
              <div className="space-y-2">
                {sound.examples?.length > 0 && <p className="text-lg">Examples: <strong>{sound.examples.join(", ")}</strong></p>}
                {(sound.audio_url || sound.examples?.length > 0) && (
                  <Button variant="outline" className="h-12 rounded-full" onClick={() => play(sound)}>
                    <Volume2 className="h-5 w-5" /> Listen
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default SoundPanel;
