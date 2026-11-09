// Development guardrails only; final device capacity remains an acceptance task.
export const PDF_DEVELOPMENT_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxSelectedPages: 10,
  maxCharacters: 60_000,
  maxTextBytes: 256_000,
  deadlineMs: 20_000,
  maxCanvasPixels: 1_000_000,
  maxCanvasDimension: 2048,
} as const;
