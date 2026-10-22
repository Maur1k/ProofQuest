import { ART } from "./slides";

/** Icon + wordmark. The wordmark is real text; the icon is decorative. */
export function Brand({ size = "md" }: { size?: "sm" | "md" }) {
  const px = size === "sm" ? 28 : 40;
  return (
    <span className="inline-flex items-center gap-2">
      <img src={ART.icon} alt="" width={px} height={px} className="shrink-0" decoding="async" />
      <span className={size === "sm" ? "font-display text-base font-bold" : "font-display text-xl font-bold"}>
        Proof<span className="text-gold">Quest</span>
      </span>
    </span>
  );
}
