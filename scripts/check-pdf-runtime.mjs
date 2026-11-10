// Desktop parser diagnostic, not a browser-worker or mobile memory benchmark.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getDocument, version } from "pdfjs-dist/legacy/build/pdf.mjs";
const path = process.argv[2];
if (!path)
  throw new Error("Pass a local PDF path. Run with --expose-gc for comparable heap samples.");
const bytes = await readFile(path);
if (bytes.length > 5 * 1024 * 1024) throw new Error("Above development file bound");
const runs = [];
for (let iteration = 0; iteration < 12; iteration++) {
  global.gc?.();
  const before = process.memoryUsage();
  const start = performance.now();
  const task = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    stopAtErrors: true,
    verbosity: 0,
  });
  let pageCount = 0,
    characters = 0;
  try {
    const pdf = await task.promise;
    pageCount = pdf.numPages;
    for (const number of [
      ...new Set([1, 2, 3, 10, 20, 30, 40, 50, 100, pageCount].filter((n) => n <= pageCount)),
    ]) {
      const page = await pdf.getPage(number);
      try {
        const content = await page.getTextContent();
        characters += content.items.reduce(
          (sum, item) => sum + ("str" in item ? item.str.length : 0),
          0,
        );
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await task.destroy();
  }
  global.gc?.();
  const after = process.memoryUsage();
  runs.push({
    iteration,
    pageCount,
    characters,
    elapsedMs: Math.round(performance.now() - start),
    heapBefore: before.heapUsed,
    heapAfter: after.heapUsed,
    rssAfter: after.rss,
  });
}
console.log(
  JSON.stringify(
    {
      scope: "Node legacy PDF parser; not browser or physical device memory",
      pdfjs: version,
      fileBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      forcedGc: !!global.gc,
      runs,
    },
    null,
    2,
  ),
);
