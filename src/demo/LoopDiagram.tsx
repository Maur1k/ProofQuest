/**
 * Flow of `for (let i = 0; i < 3; i++)`: initializer once, condition before every
 * pass, body, then update, back to the condition; exits when the condition is false.
 */
export function LoopDiagram() {
  const box = "fill-secondary stroke-border";
  const txt = "fill-foreground font-mono text-[12px]";
  return (
    <figure className="mt-3 rounded-xl border border-border bg-card p-3">
      <svg
        viewBox="0 0 320 300"
        role="img"
        aria-labelledby="loopdiag-t"
        aria-describedby="loopdiag-d"
        className="mx-auto h-auto w-full max-w-[320px]"
      >
        <title id="loopdiag-t">How a for loop runs</title>
        <desc id="loopdiag-d">
          Step 1, the initializer let i = 0 runs once. Step 2, the condition i less than 3 is
          checked. If true, step 3 runs the body, then step 4 runs the update i++ and control
          returns to the condition. If false, the loop ends. The body runs for i equal to 0, 1 and 2.
        </desc>
        <defs>
          <marker id="loopdiag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" className="fill-muted-foreground" />
          </marker>
        </defs>
        <g className="stroke-muted-foreground" strokeWidth="1.5" fill="none" markerEnd="url(#loopdiag-arrow)">
          <path d="M110 42 V70" />
          <path d="M110 120 V150" />
          <path d="M110 192 V222" />
          <path d="M60 244 H24 V95 H48" />
          <path d="M172 95 H232" />
        </g>
        <rect x="40" y="10" width="140" height="32" rx="8" className={box} />
        <text x="110" y="31" textAnchor="middle" className={txt}>1 · let i = 0</text>
        <path d="M110 70 L172 95 L110 120 L48 95 Z" className="fill-accent stroke-primary" />
        <text x="110" y="99" textAnchor="middle" className={txt}>2 · i &lt; 3 ?</text>
        <text x="118" y="140" className="fill-teal text-[11px] font-semibold">true</text>
        <text x="190" y="88" className="fill-destructive text-[11px] font-semibold">false</text>
        <rect x="40" y="150" width="140" height="42" rx="8" className={box} />
        <text x="110" y="168" textAnchor="middle" className={txt}>3 · body</text>
        <text x="110" y="184" textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">console.log(i)</text>
        <rect x="60" y="222" width="100" height="32" rx="8" className={box} />
        <text x="110" y="243" textAnchor="middle" className={txt}>4 · i++</text>
        <rect x="232" y="78" width="78" height="34" rx="17" className="fill-background stroke-border" />
        <text x="271" y="99" textAnchor="middle" className={txt}>end</text>
        <text x="24" y="285" className="fill-muted-foreground text-[11px]">Passes: i = 0, 1, 2 → body runs 3 times</text>
      </svg>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        The condition is checked before every pass; the update runs after the body. When i
        reaches 3 the condition is false and the loop ends.
      </figcaption>
    </figure>
  );
}
