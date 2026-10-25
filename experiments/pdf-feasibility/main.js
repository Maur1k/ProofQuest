import { getDocument, PDFWorker, version } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./style.css";

const limits = {
  maxBytes: 20 * 1024 * 1024,
  maxPages: 30,
  maxCharacters: 120000,
  maxPayloadBytes: 512000,
  deadlineMs: 30000,
};
const fixtures = [
  ["text-three-pages.pdf", "Three-page text"],
  ["text-thirty-pages.pdf", "Thirty-page text"],
  ["image-only.pdf", "Image-only scan"],
  ["malformed.pdf", "Malformed PDF"],
  ["password-protected.pdf", "Password-protected PDF"],
];
document.querySelector("#app").innerHTML = `
  <main><header><p class="eyebrow">PROOFQUEST · PHASE 1 EXPERIMENT</p><h1>Local PDF feasibility</h1>
  <p>Separate parser experiment. Documents are read in this browser with a real PDF.js worker. No document content is uploaded or stored.</p></header>
  <section aria-label="Experiment controls"><h2>Run a fixture</h2><div id="fixtures" class="buttons"></div>
  <div class="buttons"><button id="cancel-test">Test cancellation after page 1</button><button id="timeout-test">Test expired deadline</button><button id="cancel" disabled>Cancel current run</button></div>
  <label class="file-label">Or choose a local PDF <input id="file" type="file" accept="application/pdf,.pdf"></label>
  <p>Provisional ceilings: 20 MiB, first 30 selected pages, 120,000 extracted characters, 512,000 serialized UTF-8 bytes, 30 seconds. These are safety ceilings for this experiment, not verified phone support.</p></section>
  <section aria-label="Run outcome"><h2>Outcome</h2><p id="status" role="status" aria-live="polite">Ready</p><pre id="summary">No run yet.</pre></section>
  <section><h2>First selected page</h2><p>Single-page canvas capped at 800 pixels wide. Other pages are extracted sequentially without rendering.</p><canvas id="page" aria-label="First selected PDF page preview"></canvas></section>
  <section><h2>Measurement limits</h2><p>Elapsed time is measured in this browser. If available, heap figures describe only Chromium's main JavaScript heap, not total process/worker memory or a peak. A desktop browser does not establish low-memory phone limits.</p>
  <p id="runtime"></p></section></main>`;

const status = document.querySelector("#status");
const summary = document.querySelector("#summary");
const canvas = document.querySelector("#page");
document.querySelector("#runtime").textContent = `PDF.js ${version} · worker asset ${workerUrl}`;
let activeController;
let runSequence = 0;

function errorCode(error) {
  if (error?.name === "PasswordException") return "password-protected";
  if (error?.name === "InvalidPDFException") return "invalid-pdf";
  if (error?.name === "AbortError") return "cancelled";
  if (error?.name === "TimeoutError") return "timed-out";
  if (error?.name === "LimitError") return "limit-exceeded";
  return "parser-or-render-error";
}

function fail(name, message) {
  const error = new Error(message);
  error.name = name;
  throw error;
}

function bounded(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function heap() {
  return typeof performance.memory?.usedJSHeapSize === "number"
    ? performance.memory.usedJSHeapSize
    : null;
}

async function run(fileOrFixture, { cancelAfterPage = null, deadlineMs = limits.deadlineMs } = {}) {
  if (activeController) return;
  const controller = new AbortController();
  activeController = controller;
  const sequence = ++runSequence;
  const start = performance.now();
  const heapBefore = heap();
  let worker;
  let workerPort;
  let loadingTask;
  let timer;
  let renderTask;
  let outcome;
  const label = typeof fileOrFixture === "string" ? fileOrFixture : fileOrFixture.name;
  const controls = Array.from(document.querySelectorAll("button,input"));
  controls.forEach((control) => {
    control.disabled = control.id !== "cancel";
  });
  canvas.width = canvas.height = 0;
  summary.textContent = "Reading…";
  status.textContent = `Reading ${label}`;
  try {
    if (deadlineMs <= 0) fail("TimeoutError", "The deadline expired before parsing.");
    timer = setTimeout(
      () =>
        controller.abort(new DOMException("PDF processing exceeded the deadline.", "TimeoutError")),
      deadlineMs,
    );
    const blob =
      typeof fileOrFixture === "string"
        ? await bounded(
            fetch(`/fixtures/${fileOrFixture}`, { signal: controller.signal }).then((response) => {
              if (!response.ok) throw new Error("Fixture could not be loaded.");
              return response.blob();
            }),
            controller.signal,
          )
        : fileOrFixture;
    if (blob.size > limits.maxBytes)
      fail("LimitError", "PDF exceeds the provisional 20 MiB ceiling.");
    const bytes = new Uint8Array(await bounded(blob.arrayBuffer(), controller.signal));
    workerPort = new Worker(workerUrl, { type: "module" });
    worker = new PDFWorker({ port: workerPort });
    await bounded(worker.promise, controller.signal);
    loadingTask = getDocument({
      data: bytes,
      worker,
      isEvalSupported: false,
      useSystemFonts: true,
      stopAtErrors: true,
    });
    const pdf = await bounded(loadingTask.promise, controller.signal);
    const selectedCount = Math.min(pdf.numPages, limits.maxPages);
    const pages = [];
    let characters = 0;
    let renderedSize;
    for (let pageNumber = 1; pageNumber <= selectedCount; pageNumber++) {
      status.textContent = `Extracting page ${pageNumber} of ${selectedCount}`;
      const page = await bounded(pdf.getPage(pageNumber), controller.signal);
      const content = await bounded(page.getTextContent(), controller.signal);
      const text = content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
        .join("")
        .trim();
      characters += text.length;
      if (characters > limits.maxCharacters)
        fail("LimitError", "Selected text exceeds the provisional character ceiling.");
      pages.push({ page: pageNumber, text });
      if (pageNumber === 1) {
        const viewport = page.getViewport({
          scale: Math.min(1, 800 / page.getViewport({ scale: 1 }).width),
        });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport });
        await bounded(renderTask.promise, controller.signal);
        renderTask = undefined;
        renderedSize = `${canvas.width}x${canvas.height}`;
      }
      page.cleanup();
      if (pageNumber === cancelAfterPage)
        controller.abort(new DOMException("Deliberate cancellation after page 1.", "AbortError"));
      if (controller.signal.aborted) throw controller.signal.reason;
    }
    const payloadBytes = new TextEncoder().encode(JSON.stringify({ pages })).byteLength;
    if (payloadBytes > limits.maxPayloadBytes)
      fail("LimitError", "Serialized text exceeds the provisional payload ceiling.");
    const emptyPages = pages.filter((page) => page.text.length < 40).map((page) => page.page);
    outcome = {
      result: emptyPages.length === selectedCount ? "no-readable-text" : "extracted",
      message:
        emptyPages.length === selectedCount
          ? "No usable text layer. OCR is not implemented."
          : "Page mapping retained. Review text quality before generation.",
      fileBytes: blob.size,
      totalPages: pdf.numPages,
      selectedPages: selectedCount,
      omittedPages: pdf.numPages - selectedCount,
      warnings: [
        ...(emptyPages.length ? [`Low-text pages: ${emptyPages.join(", ")}`] : []),
        ...(pdf.numPages > selectedCount
          ? [`Only first ${selectedCount} pages selected; remaining pages not processed.`]
          : []),
      ],
      characters,
      payloadBytes,
      renderedSize,
      realWorkerRequested: true,
      pages: pages.map((page) => ({
        page: page.page,
        characters: page.text.length,
        sentinel: page.text.match(/PAGE_SENTINEL_\d+/)?.[0] ?? null,
      })),
    };
  } catch (error) {
    outcome = {
      result: errorCode(controller.signal.aborted ? controller.signal.reason : error),
      message: {
        "password-protected": "Password-protected PDF. Password entry is outside this experiment.",
        "invalid-pdf": "Invalid PDF structure. Choose a readable PDF.",
        cancelled: "Cancelled. No extracted result was committed.",
        "timed-out": "Processing stopped at the configured deadline.",
        "limit-exceeded": error.message,
        "parser-or-render-error":
          "The PDF parser or renderer could not complete. No result was committed.",
      }[errorCode(controller.signal.aborted ? controller.signal.reason : error)],
    };
  } finally {
    clearTimeout(timer);
    renderTask?.cancel();
    if (loadingTask) {
      try {
        await loadingTask.destroy();
      } catch {
        /* The worker can already be stopped by a parser failure. */
      }
    }
    worker?.destroy();
    workerPort?.terminate();
    const final = {
      run: sequence,
      fixture: label,
      ...outcome,
      elapsedMs: Math.round((performance.now() - start) * 10) / 10,
      mainHeapBeforeBytes: heapBefore,
      mainHeapAfterBytes: heap(),
      totalMemoryMeasured: false,
      phoneValidated: false,
      workerTerminated: true,
    };
    summary.textContent = JSON.stringify(final, null, 2);
    status.textContent = `${final.result}: ${final.message}`;
    activeController = undefined;
    controls.forEach((control) => {
      control.disabled = control.id === "cancel";
    });
  }
}

for (const [file, title] of fixtures) {
  const button = document.createElement("button");
  button.textContent = title;
  button.addEventListener("click", () => run(file));
  document.querySelector("#fixtures").append(button);
}
document
  .querySelector("#cancel-test")
  .addEventListener("click", () => run("text-thirty-pages.pdf", { cancelAfterPage: 1 }));
document
  .querySelector("#timeout-test")
  .addEventListener("click", () => run("text-three-pages.pdf", { deadlineMs: 0 }));
document
  .querySelector("#cancel")
  .addEventListener("click", () =>
    activeController?.abort(new DOMException("Cancelled by user.", "AbortError")),
  );
document.querySelector("#file").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) void run(file);
  event.target.value = "";
});
