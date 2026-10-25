import { spawnSync } from "node:child_process";

const targets = {
  node: "node_server",
  vercel: "vercel",
  cloudflare: "cloudflare-module",
  lovable: "cloudflare-module",
};
const target = process.argv[2];
if (!Object.hasOwn(targets, target)) {
  throw new Error("Choose a build target: node, vercel, cloudflare, lovable.");
}
if (
  target !== "lovable" &&
  (process.env.LOVABLE_SANDBOX === "1" || process.env.DEV_SERVER__PROJECT_PATH)
) {
  throw new Error(
    "Run portable target builds outside the Lovable sandbox, which overrides runtime presets.",
  );
}
const env = { ...process.env, NITRO_PRESET: targets[target] };
if (target === "lovable") {
  env.LOVABLE_SANDBOX = "1";
  env.LOVABLE_NITRO_PRESET = "cloudflare-module";
}
const result = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
  env,
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
