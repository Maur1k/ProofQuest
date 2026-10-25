# ADR 002: Browser PDF extraction is feasible; limits remain provisional

Date: 2026-10-25. Status: desktop feasibility accepted. Physical-phone validation pending by explicit owner instruction.

Use a separate, pinned PDF.js 6.4.299 experiment before integrating PDF importing into the product in Phase 4. It creates an explicit module Worker from a Vite-emitted asset, extracts pages sequentially, retains page numbers, renders only the first page and destroys the worker after each run. The experiment neither stores documents nor calls an AI service. Existing product routes and data are unchanged.

## Observed evidence

Production Vite preview tested in the desktop in-app Chromium browser on 2026-10-25:

| Fixture | Outcome | Observed elapsed time |
| --- | --- | --- |
| Three text pages, 3,177 bytes | 3 correct page sentinels, 2,733 characters | 95.4 ms |
| Thirty text pages, 29,643 bytes | All 30 correct sentinels, 96,657 characters; 98,729 serialized UTF-8 bytes | 173.4 ms |
| Image-only PDF | No readable text; OCR message | 147.5 ms |
| Malformed PDF | Clear invalid-PDF message | 59.3 ms |
| Password-protected PDF | Clear unsupported-password message | 55.5 ms |
| Cancel after page 1 | Cancelled; no extracted result committed | 77.7 ms |
| Already expired deadline | Timed-out outcome before parsing | 0.2 ms |

These are single local observations, not performance guarantees or benchmark distributions. Node fixture checks also validate all page sentinels, the empty text layer, parser failures and successful decryption with the known synthetic password. Browser production output loaded `/assets/pdf.worker.min-CjEcRF4W.mjs` successfully with explicit Worker construction; there is no intentional fake-worker fallback.

The 30-page run's main JavaScript heap readings were 6,828,629 before and 8,109,019 bytes after. They exclude worker/native/process memory and do not measure a peak. Total-memory claims are not supported. Small compressed synthetic text PDFs are not representative of a 20 MiB image-heavy document. The expired-deadline test does not prove termination of a parser that hangs mid-operation.

## Provisional engineering ceilings

Experiment-only ceilings: 20 MiB file, first 30 pages, 120,000 extracted characters, 512,000 serialized UTF-8 bytes and 30 seconds. They are guardrails, not validated mobile capacity or an AI provider's input contract. Files with more than 30 pages report omitted pages explicitly; the product must add deliberate page selection. Revisit payload/token limits with the provider decision in Phase 6.

OCR and password entry remain unsupported in the proposed initial product. Reject or explain unsupported input; never invent text from images. Low-text pages require review. Preserve cleanup, cancellation and explicit page provenance during integration.

## Required follow-up

The owner has no Android phone available and explicitly requested desktop checks with phone validation pending. Before Phase 4 claims device support, test actual Android hardware with realistic large text/image PDFs, repeated imports, cancellation during work and measured process memory. Validate file/text/payload boundary cases and tall-page canvas limits before using these ceilings as product defaults. Phase 2 layout work does not depend on final parser ceilings.

Run instructions and fixture provenance are in `experiments/pdf-feasibility/README.md`. The fixture corpus is synthetic and covered by the repository MIT license. PDF.js remains under its upstream Apache-2.0 license.
