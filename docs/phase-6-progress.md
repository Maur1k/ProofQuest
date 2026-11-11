# Phase 6 — implementation progress

Owner: Maur1k. Date: 2026-11-11. Status: in progress, not complete.
The owner authorized finishing this phase, but remains undecided about the AI provider. This supersedes the earlier 25% work limit, not the entry decisions or exit criteria.

## Implemented locally

- Reader generation panel with selected-page text preview, explicit transfer consent, cancellation, fixed public errors and retry states. Disabled hosts show an honest unavailable message.
- Client retains a request ID within the mounted panel. If saving fails after generation, retry reuses the returned version without another provider call.
- Atomic generated-version and Test-session storage checks the original document checksum, selected text and citations. Stale sources and partial writes are rejected; repeated saves return the same session.
- Server orchestration validates consent, request size and structured output; reserves through an injected ledger before generation and records completion before returning success. Cached jobs bypass the provider. This is an interface and tested orchestration, not an implemented durable quota service.
- Production config reports generation disabled and POST returns unavailable without reading the body. No provider credentials or external calls are wired.

## Validation

214 tests across 25 files pass. TypeScript passes. ESLint passes with the existing nine Fast Refresh warnings. Node production build, artifact verification and route smoke checks pass.

Desktop browser check imported public RFC 9110, extracted pages 1–2, saved the document and opened the reader. The original preview, extracted text and disabled generation message rendered correctly. Screenshot: `C:/Users/maurik/Documents/ChatGPT/ProofQuest/validation/phase6-generation-unavailable.jpg`.

Enabled generation UI behavior is covered by mocked component tests, not a live provider browser run. No physical phone test or public hosting check is claimed.

## Provider research and owner decision

Proposed, not selected: Groq Free for inference and Upstash Free Redis for shared limits. Owner answered that they remain undecided and asked about Groq limits. No accounts were provisioned and no spending is authorized.

[Groq limits](https://console.groq.com/docs/rate-limits) currently list gpt-oss-20b at 30 requests/minute, 1,000/day, 8,000 tokens/minute and 200,000/day. Limits are organization-wide and the actual account limits are authoritative. At an illustrative 5,000 tokens per quiz, the daily token ceiling permits roughly 40 quizzes before other limits and overhead; this is not a measured capacity promise. [Free-plan FAQ](https://community.groq.com/t/do-i-get-charged-for-anything-on-the-groq-free-plan/832) says excess usage returns 429 rather than a charge.

[Structured outputs](https://console.groq.com/docs/structured-outputs), [data handling](https://console.groq.com/docs/your-data), [Upstash pricing](https://upstash.com/pricing/redis) and [Redis REST API](https://upstash.com/docs/redis/features/restapi) were reviewed. Provider privacy disclosure must reflect actual account settings; do not promise zero retention without verifying them.

## Required before Phase 6 completion

1. Select provider/backend, agree guest/global allowance and measurable quality acceptance. Keep paid billing disabled unless separately authorized. Owner supplies credentials through an ignored local environment file, never chat.
2. Implement the selected server-only adapter with token/output byte bounds, cancellation and safe diagnostics. Configure host-specific secrets without exposing them to the browser.
3. Implement and test atomic durable guest/global reservations, concurrency limits, idempotent completion and conservative failure accounting across both hosts. A completion write followed by a transport failure must never be overwritten as failed. Add guest identity and origin/CSRF protection before enabling the route.
4. Persist recovery metadata for generation requests across reload; the current panel's in-memory request ID is lost on navigation/reload. Bound cached result retention and document deletion behavior.
5. Verify live quotas, counter outages, concurrent requests, retry recovery and synthetic document/secret leakage checks. Align library privacy copy with enabled generation behavior.
6. Evaluate representative public PDFs for factual correctness and citation support, then demonstrate real PDF → five MCQs → completed result → reload with evidence. Citation substring matching alone does not prove an answer is correct.

No Phase 6 push, publication, Lovable AI edits or Phase 7 work occurred. Earlier checkpoints remain historical records.
