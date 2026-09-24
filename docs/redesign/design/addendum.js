/* DI00 design fixtures only. No network, persistent data, credentials or payment calls. */
"use strict";
const views = {
  SH01: "Game shop",
  SH02: "Product details",
  SH03: "Recipient details",
  SH04: "Review purchase",
  SH05: "Your shop order",
  SH06: "Shop products",
  SH07: "Product editor",
  SH08: "Shop fulfillment",
  SH09: "Fulfillment record",
  NW01: "News & guides",
  NW02: "Article",
  NW03: "Articles",
  NW04: "Article editor",
  NW05: "Private article preview",
  NW06: "Publication",
};
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const drafts = new Map();
const saved = new Map();
let publicRevision = {
  title: "Build a better plan before your next match.",
  type: "Guide",
  source: "PLAYORA editorial · demo",
};
let productRevision = {
  title: "Season cosmetic bundle",
  price: "2000",
  region: "SEA",
  stock: "3",
};
let orderSnapshot = {
  ...productRevision,
  quantity: "1",
  player: "42",
  server: "SEA",
};
let productPreview = false;
let pendingReason = "";
let deliveryNote = "";
const listDrafts = new Map();
let fixture = "ready",
  published = true,
  scheduled = false,
  productPublished = true;
const nav = (id, label, primary = false) =>
  `<a class="button ${primary ? "primary" : ""}" href="#${id}">${esc(label)}</a>`;
const action = (id, label, disabled = false) =>
  `<button type="button" data-action="${id}" ${disabled ? "disabled" : ""}>${esc(label)}</button>`;
const input = (label, name, value = "", type = "text", help = "") =>
  `<label>${esc(label)}<input required aria-label="${esc(label)}" ${help ? `aria-describedby="${name}-help"` : ""} name="${name}" type="${type}" value="${esc(value)}" ${type === "number" ? 'min="1" step="1"' : ""}>${help ? `<small id="${name}-help">${esc(help)}</small>` : ""}</label>`;
const select = (label, name, values) =>
  `<label>${esc(label)}<select name="${name}" aria-label="${esc(label)}">${values.map((x) => `<option>${esc(x)}</option>`).join("")}</select></label>`;
function summary(record = false) {
  const d = record
    ? orderSnapshot
    : { ...productRevision, ...drafts.get("SH02") };
  const quantity = Number(d.quantity || 1);
  const total =
    Number.isSafeInteger(quantity) && quantity > 0
      ? ((Number(d.price) * quantity) / 100).toFixed(2)
      : "—";
  return `<aside class="summary"><span class="eyebrow">${record ? "ORDER SNAPSHOT" : "YOUR SELECTION"}</span><h3>${esc(d.title)}</h3><p>Mobile Legends · example product</p><dl><dt>Region</dt><dd>${esc(d.region)}</dd><dt>Quantity</dt><dd>${esc(d.quantity || "1")}</dd><dt>Total</dt><dd>USD ${total}</dd></dl><p class="muted">Fictional price. Actual products, delivery and commercial terms must be configured before publication.</p></aside>`;
}
function dirty(id) {
  return (
    drafts.has(id) &&
    JSON.stringify(drafts.get(id)) !== JSON.stringify(saved.get(id))
  );
}
function editorStatus(id) {
  return `<p class="feedback" data-dirty="${id}" role="status">${dirty(id) ? "Unsaved changes · retained in this preview" : saved.has(id) ? "Saved draft · this preview only" : "No saved working revision yet"}</p>`;
}
const form = (id, body, next, label) =>
  `<form ${["SH07", "NW04"].includes(id) ? "novalidate" : ""} data-form="${id}" data-next="${next}">${["SH07", "NW04"].includes(id) ? editorStatus(id) : ""}<div class="fields">${body}</div><div class="actions"><button class="primary">${label}</button></div><p class="feedback" role="status"></p></form>`;
const notice =
  "This is illustrative editorial copy, not factual patch notes or a real purchasable item.";
function article(preview = false) {
  if (preview && !saved.has("NW04"))
    return `<section class="card"><h1>No saved revision yet</h1><p>Save your draft before previewing it.</p>${nav("NW04", "Back to editor")}</section>`;
  if (!preview && !published)
    return `<section class="card"><h2>This article is unavailable</h2><p>It is no longer published.</p>${nav("NW01", "Back to news")}</section>`;
  const d = preview ? saved.get("NW04") : publicRevision;
  return `<article class="article"><span class="eyebrow">${esc(d.type || "Guide")} / MOBILE LEGENDS</span><${preview ? "h1" : "h2"}>${esc(d.title || "Build a better plan before your next match.")}</${preview ? "h1" : "h2"}><p class="muted">${esc(d.source || "PLAYORA editorial · demo")} · 25 September 2026 · Fictional design example</p><aside>${notice}</aside><nav aria-label="Article contents"><h3>In this guide</h3><a href="#NW02/plan" data-article-anchor>Start with a plan</a></nav><h3 id="article-plan" tabindex="-1">Start with a plan</h3><p>${esc(d.body || "A clear goal makes your next session easier to prepare for. This layout shows how a staff-written guide can place useful context before longer details, keep paragraphs readable, and explain when its advice was last reviewed.")}</p><h3>Keep the context visible</h3><p>Published articles include the game version where relevant, sources and an honest updated date. Practical guides, patch summaries and announcements use this same readable structure.</p><div class="actions">${nav(preview ? "NW04" : "NW01", preview ? "Back to editor" : "Back to news")}</div></article>`;
}
function record(admin, section) {
  const tabs = admin
    ? ["overview", "delivery", "messages", "payment", "help"]
    : ["overview", "delivery", "messages", "payment", "help"];
  const root = admin ? "SH09" : "SH05";
  const states = {
    ready: "Verified paid · ready",
    unpaid: "Awaiting payment",
    processing: "Processing",
    submitted: "Delivery under review",
    completed: "Completed",
    held: "On hold",
  };
  let content = "";
  if (section === "payment")
    content = `<section class="card"><h2>Payment & receipt</h2><p>${fixture === "unpaid" ? "This order is unpaid. Delivery cannot begin. In the application, verified provider evidence updates this section." : "Verified payment · fictional receipt. Financial exceptions and refunds remain individually tracked."}</p><p>No real address or payment QR is present in this prototype. Review the existing invoice design in the accepted atlas.</p><a href="index.html#P09">Open invoice design reference ↗</a></section>`;
  else if (section === "messages")
    content = `<section class="card"><h2>Order support</h2><span class="pill">Customer and PLAYORA support only</span><p>Messages stay with PL-S104. Shop recipient details are not shared with boosters.</p>${form(root + "-message", '<label>Message<textarea required name="message" placeholder="Ask about this delivery"></textarea></label>', "", "Send demo message")}<p class="muted">A separate internal-note composer is available only in the actual admin conversation contract; this mock does not share private notes.</p></section>`;
  else if (section === "help")
    content = `<section class="card"><h2>Get help with PL-S104</h2><p>Report a delivery problem or ask about the accepted cancellation terms. A case is reviewed before any refund is approved.</p>${form(root + "-help", select("Reason", "reason", ["Delivery question", "Delivery problem", "Cancellation request"]) + '<label>Details<textarea name="details" required></textarea></label>', "", "Create demo support request")}<p class="muted">The completed app opens the existing case workflow inside this order. No immediate refund promise.</p></section>`;
  else
    content = `<div class="cols"><section class="card"><h2>${section === "delivery" ? "Delivery details" : "What happens next"}</h2><p>${fixture === "unpaid" ? "Complete payment first. Staff cannot claim or deliver this order." : fixture === "ready" ? "Payment has been verified. Staff will claim the order and begin delivery." : fixture === "processing" ? "Your delivery is in progress. The agreed product details remain attached to this order." : fixture === "submitted" ? "Delivery evidence is awaiting staff review. You can contact support at any time." : fixture === "completed" ? "Delivery was reviewed and completed. Evidence and payment receipt stay available here." : "This order is on hold. Staff must explain the next step before delivery resumes."}</p><dl><dt>Recipient</dt><dd>Player ••${esc(orderSnapshot.player.slice(-2))}</dd><dt>Server</dt><dd>${esc(orderSnapshot.server)} · example</dd><dt>Last update</dt><dd>25 Sep · design sample</dd></dl>${deliveryNote ? `<p><strong>Staff update:</strong> ${esc(deliveryNote)}</p>` : ""}${admin ? `<div class="actions">${action("claim", "Claim order", fixture !== "ready")}${action("hold", "Put on hold", !["processing", "ready"].includes(fixture))}${action("resume", "Resume delivery", fixture !== "held")}</div>${fixture === "processing" ? form("evidence", input("Delivery reference", "reference", "", "text", "No game credentials.") + '<label>Evidence notes<textarea name="evidence" required></textarea></label>', "", "Submit delivery for review") : ""}${fixture === "submitted" ? `<p>Example required evidence is present. In production, scan/access checks and configured review policy must pass.</p><div class="actions">${action("complete", "Approve delivery")}${action("correct", "Return for correction")}</div>` : ""}` : `<div class="actions">${nav(root + "/messages", "Chat with support")}${nav(root + "/help", "Report a problem")}</div>`}</section>${summary(true)}</div>`;
  return `<header class="record"><a class="crumb" href="${admin ? "#SH08" : "index.html#C02"}">← ${admin ? "Shop queue" : "My orders"}</a><h1>Order PL-S104</h1><span class="pill">${states[fixture]}</span><p>${esc(orderSnapshot.title)} · Shop · ${admin ? "Admin workspace" : "My account"}</p></header><nav class="tabs" aria-label="Order sections">${tabs.map((t) => `<a href="#${root}/${t}" ${section === t ? 'aria-current="page"' : ""}>${t[0].toUpperCase() + t.slice(1)}</a>`).join("")}</nav>${pendingReason && admin ? `<section class="card">${form("delivery-reason", `<h2>${pendingReason === "hold" ? "Explain the hold" : "Explain the correction"}</h2><label>Reason<textarea required name="reason"></textarea></label><label>Next step<textarea required name="next"></textarea></label>`, "", "Confirm update")}${action("cancel-reason", "Cancel update")}</section>` : ""}${content}`;
}
function body(id, section) {
  const shopDraft = saved.get("SH07") || productRevision;
  const articleDraft = saved.get("NW04") || publicRevision;
  if (["SH02", "SH03", "SH04"].includes(id) && !productPublished)
    return `<section class="card"><h2>This product is paused</h2><p>No new purchase can continue. Existing orders stay available.</p>${nav("SH01", "Back to shop")}</section>`;
  if (id === "SH07" && productPreview) {
    const d = saved.get("SH07") || {};
    return `<span class="pill">ADMIN / SAVED DRAFT PREVIEW</span><h1>${esc(d.title || "Untitled product")}</h1><div class="cols"><section class="card"><div class="product-art" aria-hidden="true">✦</div><h2>Product details</h2><p>Mobile Legends · ${esc(d.region || "Region not set")}</p><h3>Contents and compatibility</h3><p>Standard collection · recipient Player identifier and Server required. Product family remains illustrative.</p><h3>Delivery and cancellation terms</h3><p>${esc(d.terms || "Required terms are missing. Publication is blocked.")}</p><label>Region<select disabled><option>${esc(d.region || "Not set")}</option></select></label><p>Reservation: ${esc(d.duration || "Not configured")} minutes · Available quantity: ${esc(d.stock || "Not configured")}</p></section><aside class="summary"><h2>Purchase summary</h2><p>USD ${(Number(d.price || 0) / 100).toFixed(2)} · one item</p><button disabled>Checkout unavailable in staff preview</button></aside></div><div class="actions">${action("close-product-preview", "Back to product editor")}</div>`;
  }
  switch (id) {
    case "SH01":
      return `<div class="headrow"><div><span class="eyebrow">SHOP / MOBILE LEGENDS</span><h2>A little more for your game.</h2><p>Explore extras with clear eligibility and delivery details.</p></div><span class="pill">Illustrative catalog</span></div><div class="filters"><label>Search<input data-search placeholder="Find a product"></label>${select("Region", "region", ["All regions", "SEA", "EU"])}</div><div class="cards" data-results><article class="card" data-item="${esc(productRevision.title)} ${esc(productRevision.region)}"><div class="product-art" aria-hidden="true">✦</div><span class="pill">Limited offer · design sample</span><h3>${esc(productRevision.title)}</h3><p>SEA · Staff delivery after verified payment. Check contents and requirements.</p><div class="money">USD ${(Number(productRevision.price) / 100).toFixed(2)}</div>${productPublished ? nav("SH02", "View product", true) : `<span class="pill">Paused</span><button disabled>Unavailable</button>`}</article><article class="card" data-item="collection bundle EU"><div class="product-art" aria-hidden="true">◇</div><span class="pill">Temporarily unavailable</span><h3>Collection bundle</h3><p>EU · No checkout while this product is paused.</p><button disabled>Unavailable</button></article></div><p data-no-match hidden>No matching products. Change or clear your filters.</p>`;
    case "SH02":
      return `<h2>${esc(productRevision.title)}</h2><div class="cols"><div class="stack"><section class="card"><div class="product-art" aria-hidden="true">✦</div><h3>Know what you’re choosing.</h3><p>Example cosmetic collection for layout review. A live offer must name exact contents and eligibility before purchase.</p><p>Manual staff fulfillment after verified payment. No account password is required for this sample delivery method.</p></section><section class="card">${form(id, select("Region", "region", ["SEA"]) + select("Variant", "variant", ["Standard collection"]) + input("Quantity", "quantity", "1", "number"), "SH03", "Continue to recipient")}</section></div>${summary()}</div>`;
    case "SH03":
      return `<h2>Who is this for?</h2><div class="cols"><section class="card">${form(id, input("Player identifier", "player", "", "text", "Example only. Do not enter actual private account information.") + select("Server", "server", ["SEA"]) + input("Display name", "display", "", "text", "Used to help you double-check the intended recipient."), "SH04", "Review purchase")}<div class="actions">${nav("SH02", "Back to product")}</div></section>${summary()}</div>`;
    case "SH04":
      return `<h2>Review your purchase.</h2><div class="cols"><section class="card"><h3>Recipient</h3><p>${esc(drafts.get("SH03")?.display || "Demo player")} · ${drafts.get("SH03")?.player ? "Player ••" + esc(drafts.get("SH03").player.slice(-2)) + " · Server " + esc(drafts.get("SH03").server) : "Recipient not yet entered"}</p><p>Read the final contents, region, delivery and cancellation terms before accepting. These sample terms do not define any live policy.</p>${form(id, '<label class="check"><input required type="checkbox" name="accepted"><span>I have checked the recipient and illustrative purchase details.</span></label>', "SH05", "Create demo order")}<p class="muted">Next: payment in your named order. No funds are requested by this prototype.</p><div class="actions">${nav("SH03", "Edit recipient")}</div></section>${summary()}</div>`;
    case "SH05":
      return record(false, section || "overview");
    case "SH06":
      return `<div class="headrow"><div><h1>Shop products</h1><p>Manage what is available in each game.</p></div>${nav("SH07", "Create product", true)}</div><div class="filters"><label>Search<input data-search placeholder="Product name"></label>${select("Status", "status", ["All statuses", "Draft", "Published"])}</div><section class="card" data-item="${esc(shopDraft.title)} ${esc(shopDraft.region)}"><span class="pill">${productPublished ? "Published · demo" : "Draft"}</span><h2>${esc(shopDraft.title)}</h2><p>Mobile Legends · ${esc(shopDraft.region)} · USD ${(Number(shopDraft.price) / 100).toFixed(2)} sample</p>${nav("SH07", "Edit " + shopDraft.title)}</section><p data-no-match hidden>No matching products.</p>`;
    case "SH07":
      return `<a class="crumb" href="#SH06">← Shop products</a><h1>Season cosmetic bundle</h1><span class="pill">${productPublished ? "Published design fixture" : "Draft"}</span><div class="cols"><section class="card">${form(id, input("Product name", "title", "Season cosmetic bundle") + select("Game", "game", ["Mobile Legends"]) + select("Region", "region", ["SEA"]) + input("Price in USD minor units", "price", "2000", "number") + input("Available quantity", "stock", "3", "number") + input("Reservation duration in minutes", "duration", "", "number", "Required owner-configured policy; no default duration.") + '<label>Delivery and cancellation terms<textarea required name="terms" placeholder="Owner-approved terms required before publishing"></textarea></label>', "", "Save draft")}</section><aside class="summary"><h2>Publication</h2><p>Save required terms, availability and reservation policy before publishing. Preview is labeled inside admin.</p><div class="actions">${action("product-preview", "Preview saved draft")}${action("publish-product", "Publish demo product")}${action("pause-product", "Pause demo product", !productPublished)}</div><p class="feedback" id="product-feedback" role="status"></p></aside></div>`;
    case "SH08":
      return `<h1>Shop fulfillment</h1><p>Claim verified paid work and keep each delivery traceable.</p><div class="filters"><label>Search<input data-search placeholder="Order or product"></label>${select("Status", "status", ["All statuses", "Ready", "Processing", "On hold"])}</div><section class="card" data-item="PL-S104 season cosmetic bundle"><span class="pill">${fixture}</span><h2>PL-S104 · Season cosmetic bundle</h2><p>Recipient masked · SEA · Last update: 25 Sep, design sample</p>${nav("SH09", "View order PL-S104", true)}</section><p data-no-match hidden>No matching orders.</p>`;
    case "SH09":
      return record(true, section || "overview");
    case "NW01":
      return `<span class="eyebrow">NEWS / MOBILE LEGENDS</span><h2>Stay in the game.</h2><p>Updates, patches and practical guides, with context.</p><div class="filters"><label>Search<input data-search placeholder="Find an article"></label>${select("Type", "type", ["All types", "Guide", "Patch notes", "Update"])}</div><div class="cards"><article class="card" data-item="${esc(publicRevision.title)} ${esc(publicRevision.type)}"><span class="pill">${esc(publicRevision.type)}</span><h3>${esc(publicRevision.title)}</h3><p>25 Sep · ${esc(publicRevision.source)}</p><p>Illustrative guide text, not an actual gameplay recommendation or patch claim.</p>${nav("NW02", "Read article", true)}</article></div><p data-no-match hidden>No matching articles. Try another search or type.</p>`;
    case "NW02":
      return article();
    case "NW03":
      return `<div class="headrow"><div><h1>Articles</h1><p>One place for updates, patch notes and guides.</p></div>${nav("NW04", "Write an article", true)}</div><div class="filters"><label>Search<input data-search placeholder="Search title"></label>${select("Status", "status", ["All statuses", "Draft", "Scheduled", "Published"])}</div><section class="card" data-item="${esc(articleDraft.title)} ${esc(articleDraft.type)}"><span class="pill">${published ? "Published" : scheduled ? "Scheduled" : "Draft"}</span><h2>${esc(articleDraft.title)}</h2><p>${esc(articleDraft.type)} · Mobile Legends · ${esc(articleDraft.source)}</p>${nav("NW04", "Edit article")}</section><p data-no-match hidden>No matching articles.</p>`;
    case "NW04":
      return `<a class="crumb" href="#NW03">← Articles</a><h1>Article editor</h1><p>Save your working revision before preview or publication.</p><div class="cols"><section class="card">${form(id, input("Title", "title", "Build a better plan before your next match.") + input("Slug", "slug", "plan-before-your-next-match") + select("Type", "type", ["Guide", "Patch notes", "Update"]) + select("Game", "game", ["Mobile Legends"]) + '<label>Summary<textarea aria-label="Summary" required name="summary">Illustrative editorial content.</textarea></label><label>Body<textarea aria-label="Body" required name="body">A clear goal makes your next session easier to prepare for. This is fictional editorial copy.</textarea></label>' + input("Author or source attribution", "source", "PLAYORA editorial · demo"), "", "Save draft")}</section><aside class="summary"><h2>Working revision</h2><p>Text is treated as plain content in this prototype. Production structured content will be validated and sanitized.</p><div class="actions">${nav("NW05", "Preview saved draft")}${nav("NW06", "Publication settings")}</div><p class="muted">Published revisions remain independent from unpublished edits.</p></aside></div>`;
    case "NW05":
      return `<div class="card"><span class="pill">ADMIN / UNPUBLISHED PREVIEW</span><p>Saved revision only. This preview does not publish and cannot be shared anonymously.</p>${nav("NW04", "Back to article editor")}</div>${article(true)}`;
    case "NW06":
      return `<a class="crumb" href="#NW04">← Article editor</a><h1>Publication</h1><div class="cols"><section class="card"><span class="pill">${published ? "Published" : scheduled ? "Scheduled" : "Draft"}</span><h2>Choose when it goes live.</h2><p>Publish the saved revision after checking accuracy, attribution and media rights.</p>${form("schedule", input("Publish at · UTC", "at", "", "datetime-local", "Time is entered in UTC, not your local timezone."), "", "Schedule demo publication")}<div class="actions">${action("publish", "Publish saved revision now")}${action("unpublish", "Unpublish article", !published)}${action("unschedule", "Cancel scheduled publication", !scheduled)}</div><p class="feedback" id="publication-feedback" role="status"></p></section><aside class="summary"><h2>Revision history</h2><p>Draft saved · design example</p><p>Unpublishing removes public discovery and cached reader content. History stays with staff.</p>${nav("NW05", "Preview saved revision")}</aside></div>`;
  }
}
function validArticle(d) {
  return (
    d &&
    ["title", "slug", "summary", "body", "source"].every((k) => d[k]?.trim())
  );
}
function render() {
  const [raw, section] = location.hash.slice(1).split("/");
  const id = views[raw] ? raw : "SH01";
  const admin = [
    "SH06",
    "SH07",
    "SH08",
    "SH09",
    "NW03",
    "NW04",
    "NW05",
    "NW06",
  ].includes(id);
  const game = ["SH01", "SH02", "SH03", "SH04", "NW01", "NW02"].includes(id);
  const state = $("state").value;
  $("view").value = id;
  const states = {
    loading: [
      "Loading this view",
      "Content is being retrieved. The surrounding game or workspace stays visible.",
    ],
    empty: [
      "Nothing to show yet",
      "No records are available in this example. Return to the list or choose another service.",
    ],
    invalid: [
      "Check the highlighted details",
      "Required information is missing or invalid. Return to your retained form and correct it before continuing.",
    ],
    changed: [
      "The information has changed",
      "The selected version, availability or price changed. Review the latest details before accepting again.",
    ],
    unavailable: [
      "This is currently unavailable",
      "No new purchase or publication can proceed. Existing orders and support remain accessible.",
    ],
    denied: [
      "Access is no longer available",
      "Private details are hidden. Return to your workspace or sign in with the correct portal.",
    ],
    failed: [
      "We couldn’t complete that action",
      "Your safe draft is retained. Retry once the service is available; repeated requests must not create duplicate records.",
    ],
  };
  const isRecord = ["SH05", "SH09"].includes(id);
  let content = body(id, section);
  if (state !== "default") {
    const keepRecord = isRecord && state !== "denied";
    const chrome = keepRecord
      ? content.slice(0, content.indexOf("</nav>") + 6)
      : "";
    const level = game || keepRecord ? 2 : 1;
    content = `${chrome}${isRecord && !keepRecord ? `<p><a href="${admin ? "#SH08" : "index.html#C02"}">← Back to ${admin ? "shop queue" : "my orders"}</a></p>` : ""}<section class="error"><h${level}>${states[state][0]}</h${level}><p>${states[state][1]}</p>${action("reset", "Return to retained view")}</section>`;
  }
  $("preview").innerHTML =
    `<header class="topbar"><a class="brand" href="index.html#${admin ? "A01" : "P01"}">PLAYORA</a><span class="role">${admin ? "Admin workspace" : id === "SH05" ? "My account" : "Mobile Legends"}</span><a href="${admin ? "#SH06" : "index.html#C13"}">${admin ? "Shop & editorial" : "Support"}</a></header>${game ? `<section class="game-hero"><a class="crumb" href="index.html#G01">← Back to choose service</a><h1>Mobile Legends</h1><p>Choose your next step. The game stays with you.</p></section><div class="metrics"><span><strong>24</strong>Active orders · sample</span><span><strong>2,480</strong>Completed · sample</span></div>` : ""}<div class="body"><p class="feedback" id="feedback" role="status"></p>${content}</div><footer class="footer">${admin ? `<a href="index.html#A05">Staff support inbox</a><a href="index.html#A34">Content & policies</a>` : `<a href="index.html#C13">Contact & support</a><a href="index.html#P17">Terms & privacy</a><a href="index.html#P16">How it works</a>`}</footer>`;
  $("preview").dataset.width = $("width").value;
  document.querySelectorAll("[data-form]").forEach((f) => {
    const stored = drafts.get(f.dataset.form);
    if (stored)
      Object.entries(stored).forEach(([k, v]) => {
        const el = f.elements.namedItem(k);
        if (el) el.type === "checkbox" ? (el.checked = !!v) : (el.value = v);
      });
    f.oninput = () => {
      const values = Object.fromEntries(new FormData(f));
      drafts.set(f.dataset.form, values);
      const cue = f.querySelector("[data-dirty]");
      if (cue) cue.textContent = "Unsaved changes · retained in this preview";
      if (f.dataset.form === "SH02")
        document.querySelector(".summary").outerHTML = summary();
    };
    f.onsubmit = (e) => {
      e.preventDefault();
      if (!["SH07", "NW04"].includes(f.dataset.form) && !f.reportValidity())
        return;
      drafts.set(f.dataset.form, Object.fromEntries(new FormData(f)));
      saved.set(f.dataset.form, Object.fromEntries(new FormData(f)));
      if (f.dataset.form === "SH04" && !drafts.get("SH03")?.player) {
        $("feedback").textContent =
          "Enter recipient details before creating your order.";
        return;
      }
      if (f.dataset.form === "SH04") {
        if (!productPublished) {
          $("feedback").textContent =
            "This product is paused. Return to the shop.";
          return;
        }
        orderSnapshot = {
          ...productRevision,
          ...drafts.get("SH02"),
          ...drafts.get("SH03"),
        };
        fixture = "unpaid";
        $("order-state").value = fixture;
      }
      if (f.dataset.form === "delivery-reason") {
        const d = saved.get("delivery-reason");
        deliveryNote = `${d.reason} Next step: ${d.next}`;
        fixture = pendingReason === "hold" ? "held" : "processing";
        pendingReason = "";
        $("order-state").value = fixture;
        render();
        return;
      }
      if (f.dataset.form === "evidence") {
        fixture = "submitted";
        $("order-state").value = fixture;
        render();
        return;
      }
      if (f.dataset.form === "schedule") {
        if (!validArticle(saved.get("NW04"))) {
          f.querySelector(".feedback").textContent =
            "Save the article draft first.";
          return;
        }
        if (new Date(f.elements.at.value + "Z").getTime() <= Date.now()) {
          f.querySelector(".feedback").textContent =
            "Choose a future UTC date and time.";
          return;
        }
        scheduled = true;
        render();
        $("feedback").textContent =
          "Demo publication scheduled; no worker or public site changed.";
        return;
      }
      if (f.dataset.next) {
        location.hash = f.dataset.next;
        return;
      }
      const cue = f.querySelector("[data-dirty]");
      if (cue) cue.textContent = "Saved draft · this preview only";
      f.querySelector(".feedback:not([data-dirty])").textContent =
        f.dataset.form.endsWith("message")
          ? "Demo message added to this order. Nothing was sent."
          : f.dataset.form.endsWith("help")
            ? "Demo support request recorded. Nothing was sent."
            : "Draft saved in this preview session only.";
    };
  });
  document.querySelectorAll("[data-action]").forEach(
    (b) =>
      (b.onclick = () => {
        const a = b.dataset.action;
        if (a === "reset") {
          $("state").value = "default";
          render();
          return;
        }
        if (a === "claim" && fixture === "ready") fixture = "processing";
        if (a === "hold" && ["processing", "ready"].includes(fixture))
          pendingReason = "hold";
        if (a === "resume" && fixture === "held") fixture = "processing";
        if (a === "complete" && fixture === "submitted") fixture = "completed";
        if (a === "correct" && fixture === "submitted")
          pendingReason = "correct";
        if (a === "cancel-reason") pendingReason = "";
        if (a === "close-product-preview") productPreview = false;
        if (["publish", "publish-product", "product-preview"].includes(a)) {
          const d = saved.get(a === "publish" ? "NW04" : "SH07");
          if (
            !d ||
            (a === "publish" && !validArticle(d)) ||
            (a === "publish-product" &&
              (!d.title?.trim() ||
                !d.terms?.trim() ||
                !(Number(d.duration) > 0) ||
                !(Number(d.price) > 0) ||
                !(Number(d.stock) > 0)))
          ) {
            (
              document.querySelector(
                "#product-feedback,#publication-feedback",
              ) || $("feedback")
            ).textContent =
              "Save all required draft information first. Missing terms or content cannot be published.";
            return;
          }
          if (a === "publish") {
            published = true;
            publicRevision = { ...d };
            scheduled = false;
          }
          if (a === "publish-product") {
            productPublished = true;
            productRevision = { ...d };
          }
          if (a === "product-preview") {
            productPreview = true;
            render();
            focusHeading();
            return;
          }
        }
        if (a === "unpublish") published = false;
        if (a === "unschedule") scheduled = false;
        if (a === "pause-product") productPublished = false;
        $("order-state").value = fixture;
        render();
        $("feedback").textContent =
          "Design fixture updated. No real record was changed.";
        if (a === "close-product-preview")
          document.querySelector('[data-action="product-preview"]')?.focus();
        if (["hold", "correct"].includes(a))
          document
            .querySelector('[data-form="delivery-reason"] textarea')
            ?.focus();
      }),
  );
  const search = document.querySelector("[data-search]");
  if (search) {
    const filter = document.querySelector(".filters select");
    const stored = listDrafts.get(id);
    if (stored) {
      search.value = stored.q;
      if (filter) filter.value = stored.filter;
    }
    const applyFilters = () => {
      let visible = 0;
      document.querySelectorAll("[data-item]").forEach((el) => {
        const q = search.value.toLowerCase();
        const value = filter?.value.toLowerCase() || "all";
        const extra =
          id === "SH06"
            ? productPublished
              ? "published"
              : "draft"
            : id === "SH08"
              ? fixture === "held"
                ? "on hold"
                : fixture
              : id === "NW03"
                ? (published ? "published" : "draft") +
                  (scheduled ? " scheduled" : "")
                : "";
        const haystack = (el.dataset.item + " " + extra).toLowerCase();
        el.hidden =
          !haystack.includes(q) ||
          (!value.startsWith("all") && !haystack.includes(value)) ||
          (id === "NW01" && !published);
        if (!el.hidden) visible++;
      });
      document.querySelector("[data-no-match]").hidden = visible > 0;
      listDrafts.set(id, { q: search.value, filter: filter?.value });
    };
    search.oninput = applyFilters;
    if (filter) filter.onchange = applyFilters;
    applyFilters();
  }
  document
    .querySelector("[data-article-anchor]")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      $("article-plan").focus();
      $("article-plan").scrollIntoView({ block: "start" });
    });
  $("announce").textContent = `${views[id]} · ${state} design state`;
}
$("view").innerHTML = Object.entries(views)
  .map(([k, v]) => `<option value="${k}">${k} · ${v}</option>`)
  .join("");
$("view").onchange = () => {
  $("state").value = "default";
  location.hash = $("view").value;
};
$("state").onchange = render;
$("width").onchange = () => {
  $("preview").dataset.width = $("width").value;
};
$("order-state").onchange = () => {
  fixture = $("order-state").value;
  render();
};
function focusHeading() {
  const heading = document.querySelector(".body h1, .body h2");
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}
window.addEventListener("hashchange", () => {
  $("state").value = "default";
  render();
  const heading = document.querySelector(".body h1, .body h2");
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
});
render();

window.addEventListener("beforeunload", (event) => {
  if (["SH07", "NW04"].some(dirty)) {
    event.preventDefault();
    event.returnValue = "";
  }
});
