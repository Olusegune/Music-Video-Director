// MotionPreview — a free, instant, local stick-figure animation that eases
// through a section's key poses, so you can *see* the movement shape before
// spending a generation. This is deliberately NOT the real thing: the
// "Motion Test" button above generates an actual AI video clip. This is the
// rough sketch; that is the render.
import { useEffect, useRef, useState } from "react";
import { Play, Pause, PersonStanding } from "lucide-react";
import { poseFor, lerpPose, type StickPose } from "@/apps/music-video/lib/stickFigurePoses";
import { HelpHint } from "@/platform/components/ui/help-hint";

/** Seconds spent easing from one key pose to the next. */
const SEG_SECONDS = 1.1;

function StickFigure({ pose, accent }: { pose: StickPose; accent: string }) {
  const stroke = accent;
  const line = (a: { x: number; y: number }, b: { x: number; y: number }, key: string) => (
    <line
      key={key}
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={stroke}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
  );
  return (
    <g>
      {/* spine + head */}
      {line(pose.neck, pose.hip, "spine")}
      <circle
        cx={pose.head.x}
        cy={pose.head.y}
        r={5}
        fill="none"
        stroke={stroke}
        strokeWidth={2.4}
      />
      {line(pose.neck, pose.head, "neck")}
      {/* arms */}
      {line(pose.neck, pose.elbowL, "armL1")}
      {line(pose.elbowL, pose.handL, "armL2")}
      {line(pose.neck, pose.elbowR, "armR1")}
      {line(pose.elbowR, pose.handR, "armR2")}
      {/* legs */}
      {line(pose.hip, pose.kneeL, "legL1")}
      {line(pose.kneeL, pose.footL, "legL2")}
      {line(pose.hip, pose.kneeR, "legR1")}
      {line(pose.kneeR, pose.footR, "legR2")}
    </g>
  );
}

export function MotionPreview({ poses, accent }: { poses: string[]; accent: string }) {
  const [playing, setPlaying] = useState(true);
  // Continuous progress: integer part = which pose, fraction = ease toward next.
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Only animate while on-screen — otherwise every section's preview would run
  // its own rAF loop forever, keeping the whole page from ever idling.
  const [onScreen, setOnScreen] = useState(true);

  const rigs = poses.filter(Boolean).map(poseFor);
  const count = rigs.length;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      threshold: 0.05,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !onScreen || count < 2) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => (p + dt / SEG_SECONDS) % count);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, onScreen, count]);

  if (count === 0) return null;

  // Normalize progress into a guaranteed-valid [0, count) window before
  // indexing — a stray NaN or out-of-range value (e.g. a frame straddling an
  // rAF/state race) must never index past the rig array and crash the page.
  const safe = Number.isFinite(progress) ? ((progress % count) + count) % count : 0;
  const seg = Math.floor(safe) % count;
  const local = safe - Math.floor(safe);
  const a = rigs[seg] ?? rigs[0];
  const b = rigs[(seg + 1) % count] ?? a;
  const current = count < 2 ? rigs[0] : lerpPose(a, b, local);
  const nowLabel = poses.filter(Boolean)[seg] ?? "";

  return (
    <div
      ref={wrapRef}
      className="rounded-[var(--radius-card)] border border-border bg-elevated/30 p-3"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <PersonStanding className="h-3.5 w-3.5" /> Motion preview
          <HelpHint
            title="Motion preview"
            body="A free, instant stick-figure sketch that eases through this section's key poses — so you can feel the movement before spending a generation. It's an approximation, not the render."
            example="If the figure snaps awkwardly between two poses, reword or reorder those poses before you run a real Motion test."
          />
        </div>
        {count >= 2 && (
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            className="inline-flex items-center gap-1 rounded bg-elevated px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-primary/15 hover:text-primary"
          >
            {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {playing ? "Pause" : "Play"}
          </button>
        )}
      </div>
      <div className="flex items-center justify-center rounded-[var(--radius-button)] bg-background/40 py-2">
        <svg
          viewBox="-18 -12 96 138"
          className="h-40 w-auto"
          role="img"
          aria-label="Stick-figure motion preview"
        >
          <StickFigure pose={current} accent={accent} />
        </svg>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted">
        {count >= 2 ? (
          <>
            Easing through {count} key poses
            {nowLabel ? (
              <>
                {" "}
                · <span className="text-foreground">{nowLabel}</span>
              </>
            ) : null}
          </>
        ) : (
          "Add a second key pose to preview the movement between them."
        )}
      </p>
      <p className="mt-0.5 text-center text-[10px] text-muted/70">
        A rough local sketch — use <span className="font-medium">Motion test</span> above for a real
        generated clip.
      </p>
    </div>
  );
}
