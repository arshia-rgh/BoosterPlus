import { readdir, readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const assets = new URL("../build/client/assets/", import.meta.url);
const files = await readdir(assets);
for (const [pattern, limit, label] of [
  [/^home-.*\.js$/, 12 * 1024, "Homepage JavaScript (gzip)"],
  [/^home-.*\.css$/, 8 * 1024, "Homepage CSS (gzip)"],
  [/^root-.*\.css$/, 4 * 1024, "Shared CSS (gzip)"],
]) {
  const matches = files.filter((name) => pattern.test(name));
  if (matches.length !== 1)
    throw new Error(`Expected one built asset for ${label}`);
  const size = gzipSync(await readFile(new URL(matches[0], assets))).byteLength;
  if (size > limit) throw new Error(`${label}: ${size} bytes exceeds ${limit}`);
  console.log(`${label}: ${size}/${limit} bytes`);
}
for (const [name, limit] of [
  ["ascension-1536.jpg", 400000],
  ["ascension-768.jpg", 120000],
]) {
  const path = fileURLToPath(
    new URL(`../public/artwork/${name}`, import.meta.url),
  );
  const { size } = await stat(path);
  if (size > limit)
    throw new Error(`Hero artwork ${name} exceeds ${limit} bytes`);
  console.log(`Hero artwork ${name}: ${size}/${limit} bytes`);
}
