// Local artifact validation bridge. Does not emulate platform bindings or deploy.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { pathToFileURL } from "node:url";
const target = process.argv[2];
const settings = {
  lovable: { entry: "dist/server/index.mjs", assets: "dist/client", port: 4185 },
  vercel: {
    entry: ".vercel/output/functions/__server.func/index.mjs",
    assets: ".vercel/output/static",
    port: 4186,
  },
}[target];
if (!settings) throw new Error("Choose lovable or vercel after building that target.");
const handler = (await import(pathToFileURL(resolve(settings.entry)).href)).default;
const root = resolve(settings.assets);
const types = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".bcmap": "application/octet-stream",
};
const server = createServer(async (incoming, outgoing) => {
  try {
    if (incoming.method !== "GET" && incoming.method !== "HEAD") {
      outgoing.writeHead(405).end();
      return;
    }
    const url = new URL(incoming.url, `http://127.0.0.1:${settings.port}`);
    const path = resolve(root, "." + decodeURIComponent(url.pathname));
    if (!path.startsWith(root + sep) && path !== root) {
      outgoing.writeHead(400).end();
      return;
    }
    let bytes;
    try {
      bytes = await readFile(path);
    } catch {
      /* Non-file requests go through the built SSR handler. */
    }
    if (bytes) {
      outgoing.writeHead(200, {
        "content-type": types[extname(path)] ?? "application/octet-stream",
      });
      outgoing.end(incoming.method === "HEAD" ? undefined : bytes);
      return;
    }
    if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/pdfjs/")) {
      outgoing.writeHead(404).end();
      return;
    }
    const request = new Request(url, { method: incoming.method });
    const context = { waitUntil: (promise) => void Promise.resolve(promise).catch(() => {}) };
    const response =
      target === "lovable"
        ? await handler.fetch(request, {}, context)
        : await handler.fetch(request, context);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500).end("Local preview failed");
  }
});
server.listen(settings.port, "127.0.0.1", () =>
  console.log(`Local ${target} artifacts: http://127.0.0.1:${settings.port}`),
);
