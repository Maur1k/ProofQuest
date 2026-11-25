# Phase 6 browser and factual-quality review

Date: 2026-11-17. Result: **workflow passed for Quiz/Exam; quality acceptance failed. Phase 6 is not complete.**

## Scope and environment

Local production Node build at http://127.0.0.1:4191, live Groq and Upstash, normal consent and shared quota controls. Source: public RFC 9110, page 1, 1,626 extracted characters from the 194-page PDF. No private user PDF was transmitted. This is a technical-document sample, not evidence of quality across subjects. No phone or hosted deployment check is claimed.

The existing imported PDF was used for the Quiz/Exam run. A separate fresh UI import subsequently exercised file choice, page 1 selection, extraction review and saving before the Reviewer test. These were two runs, not one uninterrupted fresh-import-to-quiz run.

## Browser observations

| Check | Observed result |
|---|---|
| Import and selected-page extraction | Fresh import detected 194 pages; selecting page 1 produced 1,626 characters and saved the PDF. |
| Source review and transfer consent | Source selection and unchecked consent required before generation. |
| Rejected generation | First quiz failed output verification; no quiz was saved. Reload restored the request and required consent again. Same-request retry returned failed rather than regenerating. |
| Successful quiz generation | After format-specific prompt correction, five MCQs generated, saved and opened in Practice. |
| Immediate feedback | Each submitted Quiz answer displayed grading, explanation and source link immediately; saved answers locked. |
| Quiz result and reload | All five answered; app displayed 80% (4/5) and retained the same result after reload. This score exposes the ambiguity defect below, not a valid measure of learner knowledge. |
| Source links | Result link opened the original document at page 1. |
| Reuse in Exam | Saved-library Open Exam reused the same question set without initiating generation. |
| Exam editing and feedback | Saved an incorrect first answer, changed it, and saved again. No solution appeared before submission. Reload resumed at the first unanswered question. |
| Exam result and history | Completed all five using the stored key; 100% persisted after reload. Both Practice and Test attempts appeared in history. |
| Reviewer | Fresh-import Reviewer request returned unavailable; no material saved. Browser Reviewer quality and persistence remain unverified. |
| Flashcards | No additional browser generation attempted after this guest used its three daily reservations. Prior synthetic-text live test is not a substitute for PDF/browser quality review. |

## Factual and question-quality audit

Each question, option set, explanation and displayed citation was compared with the extracted source page.

| Item | Finding |
|---|---|
| Q1: HTTP protocol type | Pass: stateless application-level protocol is explicitly stated; other choices differ in statefulness or layer. |
| Q2: RFC updated | Pass: RFC 3864 is explicitly updated; the other listed RFCs are obsoleted rather than updated. |
| Q3: RFC obsoleted | **Fail: two valid options.** RFC 2818 and RFC 7235 are both explicitly obsoleted. The key selects 2818; selecting 7235 is marked incorrect, despite the explanation supporting both. |
| Q4: status | Pass: the source explicitly calls the document Internet Standards Track. |
| Q5: editor | Factual names and explanation are supported, but the wording “one of the editors” admits all three individual names. “All of the above” is keyed, making this a weak single-answer question. Rewrite the stem/options or reject the item. |

All five citations locate supporting source text; that does not establish a unique correct answer. The acceptance gate fails on one definite grading defect plus another ambiguous item. Do not generalize this small sample to an accuracy percentage.

## Diagnosis and changes

A separate public-PDF diagnostic returned Groq HTTP 400, json_validate_failed: the root object lacked questions. The prompt now includes format-specific root structure and explicit instructions to preserve exact excerpts and qualifiers. A subsequent browser quiz succeeded structurally. This is a demonstrated improvement, not proof that malformed output is eliminated. Existing strict schema and citation validators were preserved.

Next corrective work must address single-answer validity, not merely JSON shape: reject overlapping/all-of-the-above alternatives, assess every distractor against the source, and rerun a representative non-programming PDF evaluation. Prompt guidance alone cannot guarantee correctness. Do not regrade or mutate the saved test attempts; they are immutable evidence of this run.

Local generation is disabled again after the failed quality gate. Existing saved documents/results remain usable. No credentials, quotas, billing settings, public deployment or Git remote were changed.

## Evidence

- Quiz version: generated-770e4dff-7a75-4176-a2c6-4dab389f641e.
- Exam session: 27941522-192b-408e-966f-92063c2e2a8c.
- Local screenshots: C:/Users/maurik/Documents/ChatGPT/ProofQuest/validation/ai-ambiguous-question.png and ai-browser-quality-results.png.
- Sanitized public-PDF diagnostic: C:/Users/maurik/Documents/ChatGPT/ProofQuest/validation/ai-public-pdf-diagnostic.json.

Source: https://www.rfc-editor.org/rfc/rfc9110.pdf (page 1). No publication or Phase 7 work performed.
