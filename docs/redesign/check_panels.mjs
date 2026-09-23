// Dependency-free route/fixture checks for the static design, not runtime authorization tests.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const read = (name) => readFileSync(new URL(name, import.meta.url), "utf8");
const location = { hash: "#C02" };
const context = vm.createContext({
  window: {
    PLAYORA_DESIGN: {
      screens: JSON.parse(read("design/screens.json")),
      flows: JSON.parse(read("design/flows.json")),
    },
  },
  document: { getElementById: () => null },
  location,
  history: {
    replaceState: (_state, _title, hash) => {
      location.hash = hash;
    },
  },
});
vm.runInContext(read("design/panels.js"), context);
vm.runInContext(read("design/atlas.js").split("const groups =")[0], context);
const run = (code) => vm.runInContext(code, context);
function visit(hash) {
  location.hash = hash;
  return run(
    'current = canonicalPanelScreen(byId.get(location.hash.slice(1).split("/")[0])); panelContext()',
  );
}
assert.equal(visit("#C12").entity, "PL-1042");
assert.equal(location.hash, "#C03/PL-1042/messages");
assert.equal(visit("#C06").entity, "PL-1038");
assert.equal(location.hash, "#C05/PL-1038/session");
assert.equal(
  visit("#B05").family,
  undefined,
  "Booster Messages is an inbox, not a hidden order switch",
);
assert.equal(visit("#B03").entity, "PL-1038");
assert.equal(run('panelDestination("B05")'), "B03/PL-1038/messages");
assert.equal(visit("#A03/PL-1048/overview").invalid, true);
assert.equal(visit("#C03/PL-1048/delivery").invalid, true);
assert.equal(visit("#B01/view/A03").invalid, true);
assert.equal(visit("#C03/PL-1042/preview-A03").invalid, true);
visit("#A03/PL-1038/quote");
assert.match(run("panelOrderBody(panelContext())"), /USD 48.00/);
assert.doesNotMatch(run("panelOrderBody(panelContext())"), /<input|<textarea/);
visit("#C03/PL-1042/progress");
assert.match(run("panelOrderBody(panelContext())"), /has not started/);
visit("#C23/PL-1048/delivery");
assert.match(
  run("panelOrderBody(panelContext())"),
  /disabled>Acknowledge receipt/,
);
visit("#A29");
assert.equal(run('panelDestination("A03")'), "A03/PL-1038/overview");
visit("#A11/MLBB/pricing");
assert.equal(
  run('panelDestination("P05")'),
  "A11/MLBB/preview-P05/from-pricing",
);
visit("#B01/view/C17");
assert.equal(run("panelContext().role"), "booster");
visit("#A35");
assert.equal(
  run("panelContext().family"),
  undefined,
  "Privacy entry is a queue",
);
visit("#A35/DEL-12/overview");
assert.equal(run("panelContext().family.type"), "privacy");
console.log(
  "Panel design routes, record identities and fixture guards passed (20 assertions).",
);
