# Phase 6A — quality acceptance

Owner: Maur1k. Updated 2026-11-24. **Not complete: factual acceptance failed.** No push or publication. Stop before 6C.

## Implemented

New-output checks reject aggregate/equivalent choices, unsupported qualifiers, identity aliases and ambiguous count/value lists. Historical reads and recorded grades remain unchanged. Default global generation is disabled; the format allowlist defaults empty. Cached results are validated again.

Groq uses `openai/gpt-oss-120b`. Unified-source generation now selects evidence IDs for every format; the server supplies original citation text. Strict response schemas bound question/option counts and reviewer/card collections. The new profile is `source-evidence-v2`; v1 saved envelopes remain readable. Model and prompt version participate in request fingerprints. This prevents fabricated quotation strings, not incorrect interpretations of true quotations.

## Evidence and limits

The audited regression corpus contains **25 accepted MCQs**, five each from biology, printing history, Apollo history, astronomy and binary notation. They pass current deterministic checks. Files: `src/test/fixtures/accepted-quality-corpus.json` and its regression test. The binary batch was revalidated after fixing a conservative count false-positive; output was not rewritten. These are earlier legacy-PDF prompt samples, not certification of the new unified-source prompt.

On November 24, all three public USGS source requests passed structural validation. Manual review **rejected the quiz**: Q1 conflates percolation with infiltration, and Q4 offers salt crystals as an allegedly incorrect cloud-condensation nucleus. The browser-generated PDF batch also miskeys the percolation question. Do not count either batch toward acceptance. Reviewer and card evidence is exact, but some labels/fronts still need semantic review; exact quotations alone do not certify the claim.

The browser biology-text deck passed a five-card manual review: roots/water, stomata/gas exchange, chlorophyll/light, photosynthesis/sugars, carbon dioxide/carbon. Its Reviewer retained five exact notes and a supported stomata term. These small successes do not cancel the public-PDF failures.

Public fixture: [USGS General Information Product 235](https://pubs.usgs.gov/gip/235/gip235.pdf), one page, 2,334 extracted characters. No private PDF was transmitted. Earlier NASA and NOAA PDFs lacked usable text layers and were rejected locally. Diagnostic artifacts are in `C:/Users/maurik/Documents/ChatGPT/ProofQuest/validation/source-usgs-nov24`; they are public test content, not production logs. The test harness reports structural success only; manual audit is separate.

## Browser results

PDF import/extraction/save, unified PDF-source consent, live Quiz generation, submitted feedback, persisted result after reload and original-page citation navigation work. These are **workflow passes, factual fail**. The known incorrect local test attempt must not be used as trusted study content. Earlier authored-sample Quiz/Exam checks verified immediate Quiz feedback, editable saved Exam answers, hidden solutions before submission and reused questions without an AI call.

Text-to-Flashcards and text-to-Reviewer live paths saved/reloaded successfully. Editing the text source did not alter the prior material's original paragraph or revision. See [6B handoff](phase-6b-progress.md).

## Remaining decision and acceptance

The 30-MCQ gate and representative-PDF factual gate are unmet. Current deterministic checks plus human evaluation are insufficient to enable AI. All normal generation stays off.

The architecture explicitly reserves the bounded semantic-verifier decision for the owner (section “Decisions at implementation checkpoints”). Concrete proposal for approval: one generation call followed by one separately prompted verification call; verify each key, all distractors, explanations and evidence relationships; reject the whole batch on uncertainty/disagreement; no automatic regeneration loop. Keep the existing 20 shared and 3 guest daily provider-call limits, reserve both calls before work, and show the resulting capacity honestly (normally one fully reviewed batch per guest/day and at most ten shared batches/day). Remain on free services. A second AI pass is not a truth guarantee and must pass the same public regression and browser gates before enablement.

No verifier was added and no extra paid usage is authorized. The temporary November 18 cap of 50 was process-local; those servers were stopped. November 24 validation used the normal cap of 20. Guest caps and 65-second pacing were retained. `.env.local` remains generation-disabled and no approved formats are configured.
