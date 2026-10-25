import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 4183;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [".output/server/index.mjs"], {
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk;
});
server.stderr.on("data", (chunk) => {
  output += chunk;
});
try {
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 15000);
    server.once("error", reject);
    server.once("exit", (code) => reject(new Error(`Server exited ${code}: ${output}`)));
    server.stdout.on("data", () => {
      if (output.includes("Listening on")) {
        clearTimeout(deadline);
        resolve();
      }
    });
  });
  for (const path of ["/", "/intro", "/quests", "/progress", "/study"]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes("ProofQuest"), `${path} did not render the app`);
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)[^"]*"/g)].map(
      (match) => match[1],
    );
    assert.ok(assets.length, `${path} has no client assets`);
    for (const asset of new Set(assets))
      assert.equal((await fetch(origin + asset)).status, 200, asset);
    console.log(`PASS ${path}: SSR and linked assets`);
  }
  for (const path of ["/login", "/register", "/welcome"]) {
    const response = await fetch(origin + path + "?redirect=https://example.com", {
      redirect: "manual",
    });
    assert.equal(response.status, 307, path);
    assert.equal(
      response.headers.get("location"),
      "/",
      "Legacy account URL must redirect only to Home",
    );
    console.log(`PASS ${path}: safe guest redirect`);
  }
} finally {
  server.kill();
}
