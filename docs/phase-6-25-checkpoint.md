# Phase 6 — approximately 25% checkpoint

Owner: Maur1k. Date: 2026-11-11. Status: authorized increment complete locally; stop at 25%. Percentages describe approximate scope, not measured effort.

## Decision status

The owner said: “I'm undecided, I prefer free.” Record free generation as the preference, not as an approved provider or a promise of unlimited free usage. No spend, API credentials, paid service or deployment is authorized. Provider/model, backend, guest allowance and operational limits remain unresolved. Current free-tier options and their terms have not yet been researched or verified.

The earlier 15–30% work package included provider selection and an adapter. With those decisions pending, this 15–25% increment completes provider-neutral server safeguards; it does not claim adapter completion. Research and selection are the next prerequisite before provider-specific implementation.

## Delivered

- `src/server/generation/boundary.server.ts`: unconnected server helpers. No route or client code imports them; no API endpoint is exposed and no provider is instantiated.
- Request reading accepts POST JSON only, rejects unsupported encoding/invalid headers, and limits actual streamed UTF-8 bytes to 256,000 before JSON parsing. Content-Length is an early check, never the sole enforcement. Text decoding handles split multibyte characters and rejects malformed input. Existing selected-page validation runs after parsing.
- Request reading and provider execution have a provisional 30-second deadline. Caller cancellation aborts the internal signal without propagating private abort reasons. A timeout returns promptly even if an injected adapter ignores cancellation, and late output is not accepted. Deadline configuration is server-controlled and bounded to 1–60,000 ms.
- The execution helper validates input before calling the injected generator, retains its own source copy against adapter mutation, and validates all generated questions before returning a detached quiz version. It performs no database writes, retry loop or persistence.
- Fixed public failure codes/messages cover invalid request, oversized input, invalid output, unavailable service, timeout and cancellation. Raw provider responses, document text, nested causes and stack traces are not returned or logged by these helpers.

## Validation

203 tests across 22 files pass. TypeScript and scoped ESLint pass. Seven new server-boundary tests cover request format checks, actual UTF-8 byte limits despite a misleading Content-Length, split UTF-8 decoding, stalled request cancellation, valid/invalid provider output, adapter mutation, invalid/pre-aborted requests, uncooperative-provider timeout and late output, caller cancellation, and nested synthetic secret/document error sentinels. Earlier quiz/PDF and validation regression tests remain green.

No UI, route, dependency or persistence schema changed. These helpers are not connected to the deployed entry point, so no new browser or production-build acceptance is claimed at this checkpoint.

## Limits and remaining work

These helpers are not an authorized generation service. The future server orchestrator must obtain consent and reserve a durable, atomic guest/global allowance BEFORE calling the provider. Quotas, budget enforcement, identity/abuse controls, concurrency, deduplicated jobs, response-stream byte caps, provider token limits and persistence are not implemented here. A future adapter must honor cancellation and avoid logging private content; the wrapper cannot undo vendor billing or redact an adapter's own logging. Timeout does not prove a remote request stopped or was free.

The HTTP reader bounds bytes delivered by its stream, not buffering performed earlier by a hosting platform. Host-level body limits remain necessary. Source citation matching still establishes location, not factual correctness; real-provider quality evaluation remains pending.

Next proposed scope: verify free-provider options and deployment compatibility, agree allowance/quality thresholds, then implement one server-only adapter. Later packages retain durable controls, consent/generation UI and real end-to-end evaluation. Do not begin them without owner confirmation.

Phase 5 is pushed at b9adce9; publication was not performed by the agent. Phase 6 remains local. No live provider calls, external document transfer, key access, paid provisioning, push, publication or Lovable AI edits occurred in this checkpoint.
