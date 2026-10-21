import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText, GripVertical, Inbox } from "lucide-react";
import { DEMO_SAMPLE_FILES, getDemoLesson, type DemoSampleFile } from "./lessons";
import { formatBytes, isPointInRect, validateSampleFile } from "./logic";
import { cn } from "@/lib/utils";

const DRAG_THRESHOLD = 6;
const SUPPORTED = DEMO_SAMPLE_FILES.filter((f) => f.lessonId && !validateSampleFile(f));
const UNSUPPORTED = DEMO_SAMPLE_FILES.filter((f) => validateSampleFile(f));

interface DragState {
  file: DemoSampleFile;
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
}

/**
 * In-app sample "drop" zone. Uses pointer events (mouse, touch, pen) with pointer
 * capture so it works on touch screens; native HTML drag-and-drop is only used to
 * block real files, whose contents are never read.
 */
export function SampleDropZone() {
  const navigate = useNavigate();
  const zoneRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<{ name: string; x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  // Stop real files dropped anywhere on this page from making the browser open them.
  useEffect(() => {
    const block = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  const open = (file: DemoSampleFile) => {
    if (!file.lessonId || !getDemoLesson(file.lessonId)) return;
    void navigate({ to: "/study/lesson/$lessonId", params: { lessonId: file.lessonId } });
  };

  const reset = () => {
    drag.current = null;
    setGhost(null);
    setOver(false);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, file: DemoSampleFile) => {
    if (e.button !== 0) return;
    // On touch, only the grip starts a drag so the rest of the tile still scrolls the page.
    if (e.pointerType !== "mouse" && !(e.target as HTMLElement).closest("[data-grip]")) return;
    drag.current = {
      file,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.dragging) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
      d.dragging = true;
      setMessage(null);
    }
    setGhost({ name: d.file.name, x: e.clientX, y: e.clientY });
    setOver(isPointInRect(e.clientX, e.clientY, zoneRef.current?.getBoundingClientRect() ?? null));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (d.dragging) {
      suppressClick.current = true;
      const inside = isPointInRect(
        e.clientX,
        e.clientY,
        zoneRef.current?.getBoundingClientRect() ?? null,
      );
      reset();
      if (inside) open(d.file);
      else setMessage({ tone: "info", text: "Released outside the drop zone. Nothing opened." });
      return;
    }
    reset();
  };

  const onClick = (file: DemoSampleFile) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    open(file);
  };

  return (
    <section aria-labelledby="drop-h" className="mt-4">
      <div
        ref={zoneRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          // Never touch e.dataTransfer.files: real file contents are not read.
          setMessage({
            tone: "error",
            text: "Real files aren't supported in this demo. Nothing was read or uploaded. Use a sample below.",
          });
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-4 text-center transition-colors",
          over ? "border-primary bg-accent/40" : "border-border bg-card",
        )}
      >
        <Inbox
          className={cn("mx-auto h-7 w-7", over ? "text-primary" : "text-muted-foreground")}
          aria-hidden
        />
        <h2 id="drop-h" className="mt-1 font-display text-base font-semibold text-foreground">
          {over ? "Release to start studying" : "Drop a sample to start studying"}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Drag a sample by its handle, or tap it to open.
        </p>
      </div>

      <ul aria-label="Sample documents" className="mt-3 space-y-2">
        {SUPPORTED.map((f) => {
          const lesson = f.lessonId ? getDemoLesson(f.lessonId) : undefined;
          return (
            <li key={f.id}>
              <button
                type="button"
                onPointerDown={(e) => onPointerDown(e, f)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={reset}
                onLostPointerCapture={() => drag.current?.dragging && reset()}
                onClick={() => onClick(f)}
                aria-label={`Open sample ${f.name}${lesson ? `: ${lesson.title}` : ""}`}
                className={cn(
                  "flex min-h-14 w-full select-none items-center gap-2 rounded-xl border border-border bg-card py-2 pl-1 pr-3 text-left transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  ghost?.name === f.name && "opacity-50",
                )}
              >
                <span
                  data-grip
                  aria-hidden
                  className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground active:cursor-grabbing"
                >
                  <GripVertical className="h-5 w-5" />
                </span>
                <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[13px] text-foreground">
                    {f.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {lesson?.title} · {formatBytes(f.sizeBytes)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className="min-h-0 text-sm">
        {message && (
          <span
            className={cn(
              "mt-2 block",
              message.tone === "error" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {message.text}
          </span>
        )}
      </p>

      <details className="mt-2 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center rounded-lg px-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          What the demo can't open
        </summary>
        <p className="px-1 text-xs text-muted-foreground">
          Tap a sample to see the check a real upload would run. Nothing is opened.
        </p>
        <ul className="mt-2 space-y-2">
          {UNSUPPORTED.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setMessage({ tone: "error", text: validateSampleFile(f) ?? "" })}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
                  {f.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(f.sizeBytes)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>

      {ghost && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 max-w-[80vw] truncate rounded-xl border border-primary bg-popover px-3 py-2 font-mono text-[13px] text-foreground shadow-glow"
          style={{ left: ghost.x, top: ghost.y, transform: "translate(-50%, -130%)" }}
        >
          {ghost.name}
        </div>
      )}
    </section>
  );
}
