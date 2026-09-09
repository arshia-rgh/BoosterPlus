import { readFile, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";
import prettier from "prettier";

const source = new URL("../contracts/openapi.json", import.meta.url);
const target = new URL("../app/api/schema.d.ts", import.meta.url);
const generated = await prettier.format(astToString(await openapiTS(source)), {
  parser: "typescript",
});
if (process.argv.includes("--write")) {
  await writeFile(target, generated);
} else if ((await readFile(target, "utf8")) !== generated) {
  throw new Error("Generated API types are stale. Run make contract-generate.");
}
