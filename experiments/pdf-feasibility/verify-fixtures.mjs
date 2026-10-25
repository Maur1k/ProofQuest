import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { getDocument, version } from "pdfjs-dist/legacy/build/pdf.mjs";

const cases = [
  { file: "text-three-pages.pdf", pages: 3 },
  { file: "text-thirty-pages.pdf", pages: 30 },
  { file: "image-only.pdf", pages: 1, empty: true },
  { file: "malformed.pdf", error: "InvalidPDFException" },
  { file: "password-protected.pdf", error: "PasswordException" },
  { file: "password-protected.pdf", pages: 3, password: "proofquest-fixture" },
];
const results = [];
for (const test of cases) {
  const data = new Uint8Array(
    await readFile(new URL(`./public/fixtures/${test.file}`, import.meta.url)),
  );
  const start = performance.now();
  const before = process.memoryUsage();
  const task = getDocument({
    data,
    password: test.password,
    useSystemFonts: true,
    isEvalSupported: false,
    stopAtErrors: true,
  });
  try {
    const pdf = await task.promise;
    assert.equal(test.error, undefined, `${test.file} should have failed`);
    assert.equal(pdf.numPages, test.pages);
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      if (test.empty) assert.equal(text.length, 0);
      else
        assert.ok(
          text.includes(`PAGE_SENTINEL_${String(n).padStart(3, "0")}`),
          `Missing sentinel on page ${n}`,
        );
      pages.push({ page: n, characters: text.length });
      page.cleanup();
    }
    results.push({
      file: test.file,
      passwordSupplied: !!test.password,
      outcome: test.empty ? "no-readable-text" : "extracted",
      pages,
      elapsedMs: +(performance.now() - start).toFixed(1),
      heapDeltaBytes: process.memoryUsage().heapUsed - before.heapUsed,
    });
  } catch (error) {
    assert.equal(error.name, test.error, `${test.file}: unexpected error ${error.name}`);
    results.push({
      file: test.file,
      outcome: error.name,
      elapsedMs: +(performance.now() - start).toFixed(1),
    });
  } finally {
    await task.destroy();
  }
}
await writeFile(
  new URL("./results.local.json", import.meta.url),
  JSON.stringify(
    {
      pdfjs: version,
      runtime: process.version,
      kind: "Node text-extraction checks; not a browser-worker or phone measurement",
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(results, null, 2));
console.log(`${cases.length} fixture checks passed.`);
