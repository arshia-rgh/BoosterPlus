import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const assets = new URL("../build/storefront/client/assets/", import.meta.url);
const files = await readdir(assets);
// Budgets apply to the new route surface; existing domain/API chunks are shared.
for (const [pattern, limit, label] of [
  [/^experience-.*\.css$/, 6 * 1024, "Customer experience CSS"],
  [/^experience-.*\.js$/, 2 * 1024, "Customer motion surface"],
  [/^workspace-.*\.js$/, 2 * 1024, "Customer workspace layout"],
  [/^browse-.*\.js$/, 1024, "Catalog layout"],
]) {
  const matches = files.filter((name) => pattern.test(name));
  if (matches.length !== 1)
    throw new Error(`Expected one built asset for ${label}`);
  const size = gzipSync(await readFile(new URL(matches[0], assets))).byteLength;
  if (size > limit) throw new Error(`${label}: ${size} bytes exceeds ${limit}`);
  console.log(`${label} (gzip): ${size}/${limit} bytes`);
}
