export type MouthShape = "rest" | "open" | "wide" | "round" | "closed" | "teeth" | "tongue";

const SHAPES: Record<MouthShape, { rx: number; ry: number; teeth?: boolean; tongue?: boolean }> = {
  rest: { rx: 26, ry: 3 },
  closed: { rx: 24, ry: 1.5 },
  open: { rx: 24, ry: 18 },
  wide: { rx: 32, ry: 8 },
  round: { rx: 12, ry: 12 },
  teeth: { rx: 28, ry: 7, teeth: true },
  tongue: { rx: 24, ry: 11, tongue: true },
};

const Mouth = ({ shape = "rest", size = 96, label }: { shape?: MouthShape; size?: number; label?: string }) => {
  const s = SHAPES[shape] ?? SHAPES.rest;
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 100 75" role="img" aria-label={label ?? `Mouth shape: ${shape}`}>
      <ellipse cx="50" cy="38" rx={s.rx + 8} ry={s.ry + 8} className="fill-accent/40 transition-all duration-75" />
      <ellipse cx="50" cy="38" rx={s.rx} ry={Math.max(s.ry, 1)} className="fill-foreground/80 transition-all duration-75" />
      {s.teeth && <rect x={50 - s.rx * 0.7} y={38 - s.ry} width={s.rx * 1.4} height={s.ry * 0.8} rx="2" className="fill-card" />}
      {s.tongue && <ellipse cx="50" cy={38 + s.ry * 0.35} rx={s.rx * 0.6} ry={s.ry * 0.5} className="fill-destructive/60" />}
    </svg>
  );
};

export default Mouth;
