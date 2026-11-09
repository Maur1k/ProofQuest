import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/** Keep parser resources local in both Vite dev and every production hosting target. */
export function preparePdfAssets() {
  const require = createRequire(import.meta.url);
  const packageFile = require.resolve("pdfjs-dist/package.json");
  const metadata: unknown = JSON.parse(readFileSync(packageFile, "utf8"));
  if (
    typeof metadata !== "object" ||
    !metadata ||
    !("version" in metadata) ||
    typeof metadata.version !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(metadata.version)
  )
    throw new Error("Unexpected PDF.js version");
  const source = dirname(packageFile);
  const destination = join(process.cwd(), "public", "pdfjs", metadata.version);
  mkdirSync(destination, { recursive: true });
  for (const folder of ["cmaps", "standard_fonts", "wasm"])
    cpSync(join(source, folder), join(destination, folder), { recursive: true });
  cpSync(join(source, "LICENSE"), join(destination, "LICENSE"));
}
