// DOM regressions using the frontend's already pinned jsdom; no mail/network.
const { JSDOM } = require("../../frontend/node_modules/jsdom");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const dom = new JSDOM("", { runScripts: "outside-only" });
dom.window.eval(
  fs.readFileSync(__dirname + "/playora_support/template.js", "utf8"),
);
const { apply, remove } = dom.window.playoraSupportTemplate;
const original =
  '<p>Hello &amp; welcome — سلام!</p><p>Line two <strong>bold</strong></p><table><tbody><tr><td>Keep my table</td></tr></tbody></table><blockquote>Quoted reply</blockquote><img src="cid:fixture">';
const styled = apply(original);
assert.equal(apply(styled), styled, "repeated application must be idempotent");
assert.equal(
  remove(styled),
  original,
  "remove restores content and authored tables",
);
assert.equal(remove(original), original);
const edited = styled.replace("Line two", "Updated after applying");
assert.match(remove(edited), /Updated after applying/);
assert.equal(
  remove("<p>Outside edit</p>" + edited),
  "<p>Outside edit</p>" +
    original.replace("Line two", "Updated after applying"),
);
assert.equal(
  remove(apply('<p>&lt;script&gt; &amp; "quoted"</p>')),
  '<p>&lt;script&gt; &amp; "quoted"</p>',
);
const quoted = "<p>New reply</p><blockquote>" + styled + "</blockquote>";
assert.equal(
  remove(apply(quoted)),
  quoted,
  "previous quoted template must be unchanged",
);
assert.equal(remove(apply("")), "");
const reopened =
  "<div>" + styled.replaceAll('id="playora-', 'id="v1v1playora-') + "</div>";
assert.equal(
  apply(reopened),
  reopened,
  "washed draft must not get a second template",
);
assert.equal(
  remove(reopened),
  "<div>" + original + "</div>",
  "washed draft remains removable",
);
assert.match(
  remove(
    styled.replace(
      "</tbody></table>",
      "<tr><td>Added row</td></tr></tbody></table>",
    ),
  ),
  /Added row/,
);
assert.equal(dom.window.document.querySelector("script"), null);
console.log(
  "Template transforms: idempotency, current edits, quotes, tables, inline images, empty/Unicode and outside content passed",
);
