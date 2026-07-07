// FormationStage — a live top-down stage preview. Turns a formation string
// like "Triangle, lead at apex" from prose into an actual diagram: performer
// dots positioned by the shape they describe, with a movement-arrow preview
// into the next choreographed section's formation when one exists.
import { layoutFor } from "@/apps/music-video/lib/choreographyLayouts";

export function FormationStage({
  formation,
  performerCount,
  accent,
  nextFormation,
}: {
  formation: string;
  performerCount: number;
  accent: string;
  /** The next choreographed section's formation, if any — draws transition arrows. */
  nextFormation?: string;
}) {
  const slots = layoutFor(formation, performerCount);
  const nextSlots = nextFormation ? layoutFor(nextFormation, performerCount) : null;

  // Stage coordinate space: 100 wide x 60 tall, matching a typical top-down
  // camera aspect so dots read as "on a stage floor," not a scatter plot.
  const W = 100;
  const H = 60;
  const px = (x: number) => x * W;
  const py = (y: number) => y * H;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-elevated/30 p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label={`Formation: ${formation}`}>
        {/* Stage floor */}
        <rect x={2} y={2} width={W - 4} height={H - 4} rx={3} className="fill-background/40 stroke-border" strokeWidth={0.5} />
        {/* Depth guides — upstage/downstage hint, purely visual. */}
        <line x1={2} y1={py(0.5)} x2={W - 2} y2={py(0.5)} className="stroke-border/40" strokeWidth={0.3} strokeDasharray="1.5,1.5" />

        {/* Transition arrows to the next section's formation. */}
        {nextSlots &&
          slots.map((s, i) => {
            const to = nextSlots[i] ?? nextSlots[nextSlots.length - 1];
            if (!to) return null;
            const dx = px(to.x) - px(s.x);
            const dy = py(to.y) - py(s.y);
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return null;
            return (
              <line
                key={`arrow-${i}`}
                x1={px(s.x)}
                y1={py(s.y)}
                x2={px(s.x) + dx * 0.7}
                y2={py(s.y) + dy * 0.7}
                stroke={accent}
                strokeOpacity={0.4}
                strokeWidth={0.6}
                markerEnd="url(#formation-arrow)"
              />
            );
          })}

        <defs>
          <marker id="formation-arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 Z" fill={accent} opacity={0.6} />
          </marker>
        </defs>

        {/* Performer dots. */}
        {slots.map((s, i) => (
          <g key={i}>
            <circle
              cx={px(s.x)}
              cy={py(s.y)}
              r={s.lead ? 4.2 : 3}
              fill={s.lead ? accent : "var(--color-elevated)"}
              stroke={accent}
              strokeWidth={s.lead ? 0 : 0.8}
            />
            {s.lead && (
              <text x={px(s.x)} y={py(s.y) + 8} textAnchor="middle" className="fill-muted" fontSize="3.2">
                lead
              </text>
            )}
          </g>
        ))}
      </svg>
      <p className="mt-1 text-center text-[11px] text-muted">{formation}</p>
    </div>
  );
}
