import { createHash } from "node:crypto";
import layout from "./policy-layout.json";

// The initial published bootstrap flattened the approved paragraphs/tables.
// Restore only whitespace for those exact public bytes, never guess boundaries
// in another version or rewrite the stored agreement/acceptance records.
export function readablePolicyText(text: string) {
  if (createHash("sha256").update(text).digest("hex") !== layout.sha256)
    return text;
  const paragraphs = new Set(layout.paragraphBreaks);
  let result = "";
  let start = 0;
  for (const offset of layout.lineBreaks) {
    result += text.slice(start, offset);
    result += paragraphs.has(offset) ? "\n\n" : "\n";
    start = offset + 1;
  }
  return result + text.slice(start);
}
