import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const target = process.argv[2];
const roots = { node: ".output", cloudflare: ".output", lovable: "dist", vercel: ".vercel/output" };
assert.ok(Object.hasOwn(roots, target), "Unknown target");
const root = roots[target];
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const manifest = await readJson(join(root, "nitro.json"));
assert.equal(
  manifest.preset,
  {
    node: "node-server",
    cloudflare: "cloudflare-module",
    lovable: "cloudflare-module",
    vercel: "vercel",
  }[target],
);
if (target === "vercel") {
  const config = await readJson(join(root, "config.json"));
  assert.equal(config.version, 3);
  assert.ok(config.routes.some((route) => route.dest === "/__server"));
  const fn = join(root, "functions/__server.func");
  const runtime = await readJson(join(fn, ".vc-config.json"));
  assert.equal(runtime.runtime, "nodejs22.x");
  await access(join(fn, runtime.handler));
  await access(join(root, "static/assets"));
} else {
  await access(join(root, manifest.serverEntry));
  await access(join(root, manifest.publicDir, "assets"));
  if (target === "lovable") assert.equal(manifest.publicDir, "client");
}
console.log(`PASS ${target}: expected runtime, server entry and assets`);

const publicRoot = target === "vercel" ? join(root, "static") : join(root, manifest.publicDir);
const pdfVersion = (await readJson("node_modules/pdfjs-dist/package.json")).version;
const pdfRoot = join(publicRoot, "pdfjs", pdfVersion);
await access(join(pdfRoot, "LICENSE"));
for (const directory of ["cmaps", "standard_fonts", "wasm"])
  assert.ok((await readdir(join(pdfRoot, directory))).length, `Missing PDF ${directory}`);
assert.ok(
  (await readdir(join(publicRoot, "assets"))).some((name) => /^pdf\.worker.*\.mjs$/.test(name)),
  "Missing real PDF worker",
);
console.log(`PASS ${target}: PDF worker, local character maps, fonts, decoders and license`);
