export const GENERATION_CONSENT_VERSION = "2026-11-11";
export interface GenerationAvailability {
  enabled: boolean;
  allowedFormats?: ("quiz" | "reviewer" | "flashcards")[] | undefined;
  provider: string;
  retention: string;
  maxInputBytes: number;
  guestDailyLimit: number;
}
