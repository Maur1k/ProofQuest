# ProofQuest roadmap

Updated 2026-11-28. This file is the short project-facing roadmap; the [system progress handoff](docs/system-progress-handoff.md) has the current architecture and AI/hosting status. The detailed, approval-gated sequence remains in [development-phases.md](docs/development-phases.md).

## Complete

- **Phases 0–5:** preserve the Lovable source, prove technical foundations, responsive guest experience, durable data and grading, local PDF import/reader, and saved Quiz/Exam/results.
- **Phase 6 product foundation:** source revisions, selected-text consent path, four study modes, saved materials, progress, compatibility, and backup v5.
- **Simplification S1–S3:** two primary destinations (New study and Library), one guided flow, one source-centered Library, and preserved read-only Archive.
- **UI/UX checkpoints 1–5:** New study, Library, study screens, Results, Settings and Archive.

## Active release blocker

**Phase 6A factual-quality acceptance is incomplete. AI generation stays disabled.** Manual review rejected public-PDF-generated questions for incorrect keys and ambiguity. Structural schemas, exact citations, unit tests, and valid browser workflows do not establish factual correctness. Review [phase-6a-progress.md](docs/phase-6a-progress.md) and [the November 24 validation record](docs/phase-6-validation-2026-11-24.md).

Phase 6B unified-source implementation is complete; its work does not waive the 6A gate. The owner still needs to decide whether to pursue the proposed independent semantic review call and agree quality criteria. No 6C–6G milestone or Phase 7 public beta has begun.

## Next eligible work

Follow the owner's next explicit objective. If continuing AI, first resolve the Phase 6A decision and complete its factual and quota/security gates. If preparing release, Phase 7 requires testing Lovable and the planned Vercel backup, recovery rehearsal, privacy and contributor guidance, and owner-authorized publication. Physical-device validation remains outstanding/excluded from earlier checkpoints.

No paid service, provider call, public release, backup deployment, domain change, or AI enablement is authorized by this roadmap.

## Historical records

Phase-by-phase implementation evidence remains in the dated files under `docs/`. Historical checkpoints record what was true at that time and should not override newer status. The cancelled Flutter proposal and original design handoff are retained as reference material; the current product is the web application.
