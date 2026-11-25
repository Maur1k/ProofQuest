# Local AI setup

Checkpoint: 2026-11-17. Phase 6 is still in progress; no deployment or Phase 7 approval.

The owner supplied Groq and Upstash credentials locally and requested reconnection after intentionally removing the previous uncommitted integration. Credentials remain in ignored `.env.local`; never use VITE_ prefixes for secrets.

## Configuration

Use `.env.example` for names. Set GROQ_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, a random PROOFQUEST_GUEST_SECRET of at least 32 characters, and PROOFQUEST_ORIGIN to the exact application origin (no trailing slash). Only PROOFQUEST_GENERATION_ENABLED=true enables generation. Keep it false until this host is validated. Both active hosts must share the same Redis database and guest signing secret; configure each host's exact origin separately.

For the Node build, run `node scripts/build-target.mjs node`, then set PORT=4191 and HOST=127.0.0.1 and run `node --env-file=.env.local .output/server/index.mjs`. Environment credentials alone do not publish or configure Lovable or Vercel.

## Behavior and allowances

- Groq generates only the selected quiz, reviewer or flashcard format after explicit consent. Quiz and Exam share question content and preserve existing practice/test behavior.
- The server checks the origin, a signed HttpOnly guest cookie, consent version, body limits and structured output. Provider errors never expose source text or credentials.
- Upstash atomically reserves 3 requests per guest per UTC day and 20 globally, with a shared 65-second interval. Failed calls remain charged to the allowance. Guest cookies are not accounts: clearing cookies can reset a guest identity, so the global cap is the backstop.
- Sources are limited to 3,500 encoded bytes, with a conservative complete-payload byte budget and 2,500 completion tokens. These are initial service guards, not a promise of provider capacity or zero billing. Account billing settings have not been verified or changed.
- Completed results, including generated source excerpts, expire within 24 hours; counters expire within 48 hours. Full PDF files stay local. Groq retention is disclosed in the consent panel; account-specific retention settings have not been verified.
- Same-request retries reuse committed results. Reload recovery lasts up to 24 hours in the same browser tab, requires unchanged source and guest cookie, and asks for consent again. Browser storage failure prevents transmission.

## Verification and outstanding work

The offline regression suite passes 248 tests, with 3 opt-in live tests skipped. Live Redis concurrency, idempotency and guest/global caps passed. Live quiz, reviewer and flashcard generation passed structural and citation-location validation on a public educational text fixture. TypeScript, the Node production build, artifact verification and route smoke tests also pass. ESLint reports zero errors and nine existing Fast Refresh warnings. A build scan found no embedded credential values. Citation matching does not establish factual correctness.

The live tests require PROOFQUEST_LIVE_TEST=true and PROOFQUEST_LIVE_FORMAT=quiz, reviewer or flashcards. Run `node --env-file=.env.local node_modules/vitest/vitest.mjs run src/test/ai-live.test.ts`. Each generation consumes the shared allowance; wait at least 65 seconds between formats. Test counters use isolated expiring keys; generated fixtures use the normal shared limits.

Before Phase 6 completion: evaluate representative public PDF extraction and factual quality, demonstrate PDF to study material to saved result and reload in the browser, validate actual hosting configuration, and resolve the larger-PDF acceptance scope. No physical-phone validation, publication, unlimited free access or finished Phase 6 is claimed.

API references: [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).

## Browser quality checkpoint — 2026-11-17

Quiz/Exam results, reload and history were verified in the browser. Factual acceptance failed: an MCQ marked a source-supported alternative incorrect. Reviewer generation also failed in the browser. Local generation was disabled again pending correction. See [full review](phase-6-browser-quality-review.md). Earlier structural test passes do not establish factual quality.

## Phase 6A capability gate

Global opt-in alone no longer enables a format. PROOFQUEST_APPROVED_FORMATS is a comma-separated allowlist of quiz,reviewer,flashcards and defaults to empty. Only set entries after their host quality acceptance. Reviewer notes and flashcard answers currently use exact server-selected source passages. See [6A progress and outstanding checks](phase-6a-progress.md).


## Current checkpoint — 2026-11-24

Supersedes earlier current-status notes: 6B unified-source implementation and workflow checks are complete locally, including schema 4/backup v5. 6A remains incomplete because live factual review found wrongly keyed/ambiguous PDF questions despite structural success. See [6A quality gate](phase-6a-progress.md), [6B handoff](phase-6b-progress.md) and [validation record](phase-6-validation-2026-11-24.md). Model: Groq `openai/gpt-oss-120b`; unified prompt profile `source-evidence-v2`. Generation is disabled, shared cap is the normal 20, and 6C/push/publication are not authorized.
