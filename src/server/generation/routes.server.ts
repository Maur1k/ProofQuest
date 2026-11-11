import { generationResponse } from "./service.server";
/** Fail closed until provider, authenticated guests and a durable quota ledger are configured. */
export function disabledGenerationRoute(request: Request): Response | null {
  const path = new URL(request.url).pathname;
  if (path === "/api/generation/config") {
    if (request.method !== "GET")
      return generationResponse({ code: "method-not-allowed", message: "Use GET." }, 405);
    return generationResponse({
      enabled: false,
      provider: "",
      retention: "",
      maxInputBytes: 256_000,
      guestDailyLimit: 0,
    });
  }
  if (path === "/api/generation" || path === "/api/study-generation")
    return generationResponse(
      { code: "unavailable", message: "Generation is not configured on this host." },
      503,
    );
  return null;
}
