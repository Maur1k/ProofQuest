# Phase 6 — approximately 15% checkpoint

Historical checkpoint. Later authorization and delivery are recorded in the [25% checkpoint](phase-6-25-checkpoint.md).

Owner: Maur1k. Date: 2026-11-11. Status: authorized foundation complete locally; stop at 15%. Percentages describe approximate scope, not measured effort.

## Entry decisions and bounded scope

The AI provider/model, operator credentials, generation backend, monthly budget and guest allowance remain undecided. General-subject MCQs are the planned format. This authorization permits provider-neutral groundwork only; it does not settle those choices or authorize provisioning/spend. No secret was requested or read.

## Delivered

- `src/domain/generation.ts`: a small `QuestionGenerator` interface for the later server adapter. It accepts selected text and a cancellation signal and returns unknown structured output for mandatory validation. No SDK, implementation, network call, endpoint or UI is attached.
- Strict input validation accepts only document identity, selected page numbers/text and exactly five questions. Provisional guards: 10 pages, 60,000 total characters, distinct positive safe-integer page numbers, nonempty text and at least 40 non-whitespace characters overall. Oversized input is rejected, never truncated. These are development character guards, not token limits, factual sufficiency tests or validated device capacity.
- Output validation requires exactly five MCQs, distinct prompts, unique option IDs/text, one existing correct-option ID, explanations and at least one source per question. It rejects unknown fields, unsupported shapes, malformed/oversized output, repeated citations, unselected-page references and excerpts not present in the selected page after whitespace normalization. The application supplies version identity and timestamps; generated question IDs are assigned deterministically within the new version. The caller must allocate a new version ID per successful generation.
- Returned records conform to the existing immutable QuizVersion contract. Validation returns detached records and performs no persistence. Acceptance is all-or-nothing.
- Validation errors expose fixed messages/codes without raw input, provider response, Zod details or nested causes. Synthetic sentinel tests cover this boundary only; application-wide logging/telemetry redaction is still pending.

## Validation

196 tests across 21 files pass, including seven new generation-contract tests. TypeScript and scoped ESLint pass. Existing quiz/PDF regression tests remain green. No UI, runtime route, schema or dependency change; no new browser/build acceptance is claimed for these unconnected pure modules.

## Important limits

Citation location is not evidence that the answer is factually supported. Semantic ambiguity, factual correctness, prompt injection handling and insufficient source evidence require provider behavior, evaluation and human review. A short matching excerpt alone is not adequate proof of support.

Before enabling real requests, the server must revalidate input, verify the selected-page mapping, cap raw HTTP bytes and provider tokens before large allocations, enforce consent/transfer disclosure, timeouts/cancellation, durable atomic guest quotas and global spend limits, concurrency and idempotency. Output character guards run after receiving a value and do not replace transport/stream byte caps. Browser-provided document identity/text is untrusted. No security, spend or privacy guarantee is claimed from these pure validators alone.

## Remaining Phase 6 packages (not yet authorized)

1. 0–15%, complete: provider-neutral contracts and validation foundation.
2. 15–30%: settle provider/backend/budget/allowance decisions and evaluation thresholds; implement one server-only adapter with portable configuration and safe errors.
3. 30–55%: durable quotas/global budget, deduplicated jobs, concurrency, deadlines and redaction enforcement.
4. 55–75%: consent and selected-page generation UI, status/cancel/retry and validated version persistence.
5. 75–100%: controlled real-provider PDF-to-quiz evaluation, failure/cost evidence, end-to-end acceptance and handoff.

Existing sample quizzes remain explicitly labeled and are not used to pretend PDF generation works. No push, publication, Lovable AI edit, paid service or external document transfer occurred. Stop and obtain owner confirmation before progressing beyond 15%.
