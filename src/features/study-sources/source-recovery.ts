import { z } from "zod";
import { sourceRequestSchema, type SourceRequest } from "@/domain/source-material";
export const sourceRecoverySchema = z
  .object({
    id: z.string().uuid(),
    started: z.number().finite().nonnegative(),
    choice: z.enum(["quiz", "exam", "flashcards", "reviewer"]),
    input: sourceRequestSchema,
  })
  .strict();
export function restoreSourceRequest(raw: string, request: SourceRequest, now = Date.now()) {
  if (raw.length > 100000) throw new Error("Recovery too large");
  const saved = sourceRecoverySchema.parse(JSON.parse(raw));
  if (
    saved.started > now ||
    now - saved.started >= 86400000 ||
    JSON.stringify(saved.input) !== JSON.stringify(request) ||
    (saved.choice === "exam" ? "quiz" : saved.choice) !== request.format
  )
    throw new Error("Source recovery expired or changed");
  return saved;
}
