/* Design fixtures only. No sessions, API writes, persisted drafts or payment simulation. */
const panelDrafts = new Map();
const panelLists = new Map();
const panelListScroll = new Map();
let panelTabObserver;
const panelFamilies = [
  {
    root: "C03",
    role: "customer",
    parent: "C02",
    label: "Orders",
    entity: "PL-1042",
    type: "order",
    views: {
      overview: "C03",
      messages: "C12",
      progress: "C05",
      payment: "C07",
      help: "C08",
      session: "C06",
      preparation: "C04",
      review: "C16",
    },
    aliases: ["C03", "C07", "C08", "C12"],
  },
  {
    root: "C05",
    role: "customer",
    parent: "C02",
    label: "Orders",
    entity: "PL-1038",
    type: "order",
    views: {
      overview: "C05",
      messages: "C12",
      progress: "C05",
      payment: "C07",
      help: "C08",
      session: "C06",
      preparation: "C04",
      review: "C16",
    },
    aliases: ["C05", "C04", "C06", "C09", "C16"],
  },
  {
    root: "C23",
    role: "customer",
    parent: "C02",
    label: "Orders",
    entity: "PL-1048",
    type: "order",
    views: {
      overview: "C23",
      messages: "C12",
      delivery: "I08",
      payment: "C07",
      help: "C08",
    },
    aliases: ["C23"],
  },
  {
    root: "B03",
    role: "booster",
    parent: "B02",
    label: "Assigned orders",
    entity: "PL-1038",
    type: "order",
    views: {
      overview: "B03",
      progress: "B03",
      sessions: "B04",
      messages: "B05",
    },
    aliases: ["B03"],
  },
  {
    root: "A03",
    role: "admin",
    parent: "A02",
    label: "Orders",
    entity: "PL-1042",
    type: "order",
    views: {
      overview: "A03",
      quote: "A04",
      fulfillment: "C04",
      messages: "A06",
      sessions: "A07",
      payment: "A15",
      case: "A16",
      verification: "I06",
    },
    aliases: ["A03", "A04", "A06"],
  },
  {
    root: "S03",
    role: "customer",
    parent: "S01",
    label: "My sales",
    entity: "SA-204",
    type: "sale",
    views: {
      overview: "S03",
      offer: "S04",
      handover: "S05",
      payout: "S06",
      messages: "S07",
    },
    aliases: ["S03", "S04", "S05", "S06", "S07"],
  },
  {
    root: "A21",
    role: "admin",
    parent: "A20",
    label: "Submissions",
    entity: "SA-204",
    type: "submission",
    views: {
      overview: "A21",
      messages: "A37",
      payout: "A17",
      verification: "I06",
    },
    aliases: ["A21", "A37"],
  },
  {
    root: "A11",
    role: "admin",
    parent: "A10",
    label: "Game catalog",
    entity: "MLBB",
    type: "catalog",
    views: {
      general: "A11",
      form: "A12",
      pricing: "A13",
      packages: "A24",
      seller: "A25",
      release: "A14",
    },
    aliases: ["A11", "A12", "A13", "A14", "A24", "A25"],
  },
  {
    root: "A23",
    role: "admin",
    parent: "A22",
    label: "Inventory",
    entity: "AC-208",
    type: "listing",
    views: { listing: "A23", delivery: "A26", verification: "I06" },
    aliases: ["A23", "A26"],
  },
  {
    root: "A16",
    role: "admin",
    parent: "A15",
    label: "Finance",
    entity: "CASE-1038",
    type: "case",
    views: { overview: "A16", evidence: "A19", verification: "I06" },
    aliases: ["A16"],
  },
  {
    root: "A17",
    role: "admin",
    parent: "A15",
    label: "Finance",
    entity: "SA-204",
    type: "payout",
    views: { overview: "A17", evidence: "A19", verification: "I06" },
    aliases: ["A17"],
  },
  {
    root: "A35",
    role: "admin",
    parent: "A35",
    label: "Privacy requests",
    entity: "DEL-12",
    type: "privacy",
    views: { overview: "A35", verification: "I06" },
    aliases: ["A35"],
  },
  {
    root: "A29",
    role: "admin",
    parent: "A28",
    label: "Review moderation",
    entity: "REV-12",
    type: "moderation",
    views: { overview: "A29" },
    aliases: ["A29"],
  },
];
const panelRoleNames = {
  customer: "My account",
  booster: "Booster workspace",
  admin: "Admin workspace",
};
const panelHomes = { customer: "C01", booster: "B01", admin: "A01" };
const panelNavigation = {
  customer: [
    ["Overview", "C01"],
    ["Orders", "C02"],
    ["Messages", "C11"],
    ["My sales", "S01"],
    ["Saved items", "C10"],
    ["Notifications", "C14"],
    ["Reviews", "C15"],
    ["Availability alerts", "C20"],
    ["Profile", "C22"],
    ["Security", "C17"],
    ["Preferences", "C19"],
    ["Privacy", "C18"],
  ],
  booster: [
    ["Overview", "B01"],
    ["Assigned orders", "B02"],
    ["Calendar & availability", "B04"],
    ["Messages", "B05"],
    ["Security", "C17"],
  ],
  admin: [
    ["Overview", "A01"],
    ["Orders", "A02"],
    ["Support inbox", "A05"],
    ["Calendars", "A07"],
    ["Customers & staff", "A08"],
    ["Audit history", "A09"],
    ["Game catalog", "A10"],
    ["Inventory", "A22"],
    ["Submissions", "A20"],
    ["Finance", "A15"],
    ["Reports", "A30"],
    ["Coupons", "A27"],
    ["Reviews", "A28"],
    ["Content & policies", "A34"],
    ["Privacy", "A35"],
    ["Media", "A32"],
    ["Alerts", "A33"],
    ["Tasks", "A31"],
  ],
};
function panelContext(s = current) {
  const parts = location.hash.slice(1).split("/");
  const role = isAdmin(s)
    ? "admin"
    : s.group === "Booster"
      ? "booster"
      : ["Customer", "Seller"].includes(s.group)
        ? "customer"
        : null;
  if (!role) return null;
  if (parts[1] === "view") {
    const target = byId.get(parts[2]);
    const allowed =
      role === "admin"
        ? target && !isAdmin(target)
        : role === "booster" && ["C17", "I04", "I06", "I07"].includes(parts[2]);
    return {
      role,
      screen: allowed ? target : s,
      origin: s.id,
      invalid: !allowed,
    };
  }
  const family = panelFamilies.find((f) => f.aliases.includes(s.id));
  if (!family || (s.id === "A35" && !parts[1])) return { role, screen: s };
  const entity = parts[1] || family.entity;
  const validEntities =
    family.root === "A03" ? ["PL-1042", "PL-1038"] : [family.entity];
  const aliasView = Object.entries(family.views).find(
    ([, id]) => id === s.id,
  )?.[0];
  const view =
    parts[2] ||
    (s.id === "C09" ? "case-status" : null) ||
    aliasView ||
    Object.keys(family.views)[0];
  return {
    role,
    family,
    entity,
    view,
    screen: byId.get(family.views[view]) || s,
    invalid:
      !validEntities.includes(entity) ||
      (!family.views[view] &&
        !(
          (role === "customer" &&
            family.type === "order" &&
            ["invoice", "case-status"].includes(view)) ||
          (role === "admin" &&
            family.type === "order" &&
            ["quote-preview", "completion"].includes(view)) ||
          (role === "booster" && view === "completion") ||
          (role === "admin" &&
            /^preview-[A-Z]\d\d$/.test(view) &&
            byId.has(view.slice(8)))
        )),
  };
}
function panelHref(ctx, view) {
  return `${ctx.family.root}/${ctx.entity}/${view}`;
}
function panelLocal(ctx, label, view, cls = "button") {
  return `<a class="${cls}" href="#${panelHref(ctx, view)}">${esc(label)}</a>`;
}
function panelDestination(to) {
  const ctx = panelContext();
  if (!ctx) return null;
  if (ctx.family) {
    if (ctx.family.root === "A29" && to === "A03")
      return "A03/PL-1038/overview";
    const target = Object.entries(ctx.family.views).find(([, id]) => id === to);
    if (target) return panelHref(ctx, target[0]);
    if (ctx.role === "admin" && /^[PCSG]/.test(to))
      return `${panelHref(ctx, `preview-${to}`)}/from-${ctx.view}`;
    if (
      ctx.role === "customer" &&
      ctx.family.type === "order" &&
      ["P09", "P10", "P11"].includes(to)
    )
      return panelHref(ctx, "invoice");
  }
  if (["A07", "A32"].includes(ctx.screen.id) && to === "A03")
    return "A03/PL-1038/overview";
  if (ctx.screen.id === "B04" && to === "B03") return "B03/PL-1038/overview";
  if (
    ctx.role !== "customer" &&
    ["C17", "C19", "C22", "I06", "I04", "I07"].includes(to)
  )
    return `${current.id}/view/${to}`;
  if (
    ctx.role === "admin" &&
    !isAdmin(byId.get(to) || { group: "" }) &&
    byId.has(to) &&
    to !== "P01"
  )
    return `${current.id}/view/${to}`;
  return null;
}
function panelActive(ctx) {
  if (ctx.family) return ctx.family.parent;
  const id = ctx.screen.id;
  const parents = {
    S02: "S01",
    C21: "C20",
    A16: "A15",
    A17: "A15",
    A18: "A15",
    A19: "A15",
    A29: "A28",
    A36: "A35",
  };
  return parents[id] || id;
}
function panelNavHref(role, id) {
  return role !== "customer" && id.startsWith("C")
    ? `${panelHomes[role]}/view/${id}`
    : id;
}
function panelSidebar(ctx) {
  return `<aside class="sidebar panelSidebar"><p class="eyebrow">${panelRoleNames[ctx.role]}</p><nav aria-label="${panelRoleNames[ctx.role]} navigation">${panelNavigation[ctx.role].map(([label, id]) => `<a href="#${panelNavHref(ctx.role, id)}" ${panelActive(ctx) === id ? 'class="active" aria-current="page"' : ""}>${esc(label)}</a>`).join("")}</nav></aside>`;
}
function panelMobileNav(ctx) {
  return `<label class="workspaceSelect">${panelRoleNames[ctx.role]}<select id="workspaceSelect" aria-label="Navigate ${panelRoleNames[ctx.role]}">${panelNavigation[ctx.role].map(([label, id]) => `<option value="${panelNavHref(ctx.role, id)}" ${panelActive(ctx) === id ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>`;
}
function panelHeading(ctx) {
  const s = ctx.screen,
    parent = panelActive(ctx),
    p = byId.get(parent);
  return `<header class="pagehead"><nav class="crumb" aria-label="Breadcrumb"><a href="#${panelHomes[ctx.role]}">${panelRoleNames[ctx.role]}</a>${parent !== s.id ? ` / <a href="#${parent}">${esc(p?.title || "Workspace")}</a>` : ""} / <span aria-current="page">${esc(s.title)}</span></nav><h1>${esc(s.title)}</h1><p>${esc(s.summary)}</p>${ctx.origin ? `<a class="textlink" href="#${ctx.origin}">← Back to ${esc(byId.get(ctx.origin).title)}</a>` : ""}</header>`;
}
function panelFixture(ctx) {
  if (ctx.entity === "PL-1048")
    return {
      name: "Mobile Legends account",
      goal: "Reviewed account · SEA",
      status: "Preparing handover",
      payment: "Verified",
      amount: "120.00",
      paid: true,
    };
  if (ctx.entity === "PL-1038")
    return {
      name: "Mobile Legends boost",
      goal: "Epic II → Legend V · Play together · SEA",
      status: "In progress",
      payment: "Verified",
      amount: "48.00",
      paid: true,
    };
  return {
    name: "Mobile Legends boost",
    goal: "Epic II → Legend V · Play together · SEA",
    status: "Quote ready",
    payment: "Unpaid",
    amount: "60.00",
    paid: false,
  };
}
const panelViewNames = {
  overview: "Overview",
  messages: "Messages",
  progress: "Progress",
  payment: "Payment",
  help: "Help",
  session: "Session",
  preparation: "Player details",
  review: "Review experience",
  delivery: "Delivery",
  sessions: "Sessions",
  quote: "Quote",
  fulfillment: "Fulfillment",
  case: "Case & refund",
  verification: "Verify identity",
  offer: "Offer",
  handover: "Handover",
  payout: "Payout",
  general: "General",
  form: "Order form",
  pricing: "Pricing",
  packages: "Packages",
  seller: "Seller rules",
  release: "Release",
  listing: "Listing",
  invoice: "Checkout",
  "case-status": "Case status",
  "quote-preview": "Customer quote preview",
  completion: "Completion review",
  evidence: "Reconciliation",
};
function panelTabs(ctx) {
  let views;
  if (ctx.family.type === "order")
    views =
      ctx.role === "customer"
        ? [
            "overview",
            "messages",
            ctx.entity === "PL-1048" ? "delivery" : "progress",
            "payment",
            "help",
          ]
        : ctx.role === "booster"
          ? ["overview", "progress", "sessions", "messages"]
          : [
              "overview",
              "quote",
              "fulfillment",
              "messages",
              "sessions",
              "payment",
              "case",
            ];
  else
    views = Object.keys(ctx.family.views).filter((v) => v !== "verification");
  return `<nav class="recordTabs" aria-label="${esc(ctx.entity)} sections"><span class="tabContext">${esc(ctx.entity)} · ${esc(panelRoleNames[ctx.role])}</span>${views.map((v) => `<a href="#${panelHref(ctx, v)}" data-record-view="${v}" ${ctx.view === v ? 'aria-current="page"' : ""}>${panelViewNames[v]}</a>`).join("")}</nav>`;
}
function panelRecord(ctx) {
  if (ctx.invalid)
    return `<div class="content"><h1>Record or section unavailable</h1><p>No record data is shown for this address.</p><a class="button" href="#${ctx.family.parent}">Back to ${ctx.family.label.toLowerCase()}</a></div>`;
  const f = ctx.family,
    order = f.type === "order",
    fx = panelFixture(ctx);
  const name = order
    ? fx.name
    : f.type === "catalog"
      ? "Mobile Legends · Catalog"
      : f.type === "listing"
        ? "Mobile Legends · Account listing"
        : {
            case: "Case & refund · PL-1038",
            payout: "Seller payout · SA-204",
            privacy: "Privacy request",
            moderation: "Review moderation",
          }[f.type] || "Mobile Legends · Account sale";
  return `<section class="recordWorkspace" data-record-key="${f.root}/${esc(ctx.entity)}"><header class="recordHeader"><nav class="crumb" aria-label="Breadcrumb"><a href="#${panelHomes[ctx.role]}">${panelRoleNames[ctx.role]}</a> / <a href="#${f.parent}">${f.label}</a> / <span aria-current="page">${esc(ctx.entity)}</span></nav><a class="textlink recordBack" href="#${f.parent}">← Back to ${f.label.toLowerCase()}</a><div class="recordIdentity"><div><p class="eyebrow">${name}</p><h1>${esc(ctx.entity)}</h1><p>${order ? fx.goal : "One record. All related work stays here."}</p></div><div class="statusline">${chip(order ? fx.status : f.type === "catalog" ? "Draft · revision 5" : f.type === "listing" ? "Draft" : ["case", "payout", "privacy", "moderation"].includes(f.type) ? "Awaiting review" : "Terms incomplete", order && !fx.paid ? "amber" : "neutral")}${order && ctx.role !== "booster" ? chip(fx.payment, fx.paid ? "" : "neutral") : ""}</div></div><p class="quiet">Design example · ${ctx.role === "booster" ? "Only this assigned order and its permitted conversation." : "No actions change real records."}</p></header>${location.hash.endsWith("/from-media") ? '<a class="textlink" href="#A32">← Back to media directory</a>' : location.hash.endsWith("/from-review") ? '<a class="textlink" href="#A29/REV-12/overview">← Back to review REV-12</a>' : ""}${panelTabs(ctx)}<div id="recordView" class="recordView"></div></section>`;
}
function panelDemo(label, message, primary = false) {
  return `<button class="${primary ? "primary" : ""}" data-panel-feedback="${esc(message)}">${esc(label)}</button>`;
}
function panelFields(id, title, action) {
  const s = byId.get(id);
  return `<section class="card formcard"><h3>${title}</h3>${fields(s)}${action || ""}</section>`;
}
function panelConversation(ctx) {
  const seller = ["sale", "submission"].includes(ctx.family.type),
    assigned = ctx.entity === "PL-1038",
    boosterThread =
      ctx.role === "booster" ||
      (assigned && location.hash.split("/")[3] === "booster"),
    audience = seller
      ? "Seller ↔ authorized staff"
      : boosterThread
        ? "Customer ↔ assigned booster · Support can review"
        : "Customer ↔ support · Private from booster";
  const choice =
    assigned && ctx.role !== "booster"
      ? `<nav class="subnav" aria-label="Order conversations"><a href="#${panelHref(ctx, "messages")}" ${!boosterThread ? 'aria-current="page"' : ""}>Private support</a><a href="#${panelHref(ctx, "messages")}/booster" ${boosterThread ? 'aria-current="page"' : ""}>Assigned booster</a></nav>`
      : "";
  const history = boosterThread
    ? `<div class="bubble"><p>Can we confirm the next play session?</p><small>Customer · 14:20</small></div><div class="bubble"><p>Yes. Please review the proposed time in Sessions.</p><small>Assigned booster · 14:22</small></div>`
    : `<div class="bubble"><p>${seller ? "Please review the offer and ask any questions here." : ctx.entity === "PL-1042" ? "Your quote is ready. Please review its scope before accepting." : "Your latest update is available. Contact us here for private order or payment questions."}</p><small>Support · 14:20</small></div><div class="bubble"><p>Thank you. I’ll check the details here.</p><small>${seller ? "Seller" : "Customer"} · 14:22</small></div>`;
  return `<section class="recordChat">${choice}<header class="chathead"><strong>${esc(ctx.entity)} · ${audience}</strong><p>This conversation belongs only to this ${seller ? "sale" : "order"}. ${boosterThread ? (ctx.role === "booster" ? "Only assignment coordination belongs here. Ask the customer to use their private support thread for payment or private questions. You cannot view that conversation." : "Only assignment coordination belongs here. Keep payment and private support questions in Private support.") : "This thread is not shared with the assigned booster."}</p></header><div class="messages" aria-label="Message history"><div class="day">Design conversation · Today</div>${history}</div><div class="composer">${ctx.role === "admin" ? '<label>Audience<select id="audience"><option>Reply to participant</option><option>Internal note · staff only</option></select></label>' : ""}<label for="messageDraft">${boosterThread ? (ctx.role === "booster" ? "Message customer" : "Message assigned booster") : seller ? "Message about this sale" : "Message private support"}</label><textarea id="messageDraft" placeholder="Write your message…"></textarea><p class="quiet">Never send passwords or recovery codes here. Drafts stay separate for each conversation and audience.</p><div class="actions"><button id="attachDemo">Attach file</button><button id="sendDemo" class="primary">Send message · demo</button></div><p id="chatFeedback" role="status"></p></div></section>`;
}
function panelOrderBody(ctx) {
  const f = panelFixture(ctx),
    v = ctx.view,
    staff = ctx.role === "admin",
    booster = ctx.role === "booster";
  if (v === "messages") return panelConversation(ctx);
  if (v === "overview")
    return `<div class="recordGrid"><section class="card nextStep"><div class="eyebrow">NEXT STEP</div><h3>${booster ? "Keep your assigned customer updated" : ctx.entity === "PL-1048" ? "Wait for secure delivery" : f.paid ? "Follow your current boost" : staff ? "Review the current quote" : "Review your final quote"}</h3><p>${ctx.entity === "PL-1048" ? "The account is being prepared. You will receive a private handover here." : f.paid ? "Current milestone: Epic I. Three of five agreed milestones reported. Last update: today, 14:20 (example)." : "USD 60.00 · Final quote revision 2. Read the agreed scope; no payment has been verified."}</p><div class="actions">${panelLocal(ctx, ctx.entity === "PL-1048" ? "View delivery" : f.paid ? "View progress" : staff ? "Review quote" : "Review quote & payment", ctx.entity === "PL-1048" ? "delivery" : f.paid ? (staff ? "fulfillment" : "progress") : staff ? "quote" : "payment", "button primary")}${panelLocal(ctx, "Message about " + ctx.entity, "messages", "textlink")}</div></section><section class="card"><h3>Agreed scope</h3><dl class="recordFacts"><div><dt>Service</dt><dd>${f.name}</dd></div><div><dt>Goal</dt><dd>${f.goal}</dd></div><div><dt>Record status</dt><dd>${f.status}</dd></div></dl><p class="quiet">Progress and status are recorded updates, not live game telemetry.</p></section></div>`;
  if (v === "progress" || v === "fulfillment")
    return !f.paid
      ? card(
          "Fulfillment has not started",
          "This order is unpaid. A verified payment and required preparation are needed before work starts.",
        )
      : `<section class="card"><h3>Epic I · current milestone</h3><progress value="3" max="5" aria-label="3 of 5 agreed milestones">3 / 5</progress><p>3 of 5 milestones reported · last update today at 14:20 (sample)</p><ol class="timeline"><li><strong>Epic I reached</strong><p>Latest reported milestone. Evidence preview below.</p></li><li><strong>Session completed</strong><p>Today, 13:40 · example</p></li><li><strong>Order started</strong><p>After payment verification and preparation.</p></li></ol><details><summary>Proof for this update</summary><p>Private proof image placement · no real customer media.</p></details></section>${booster || staff ? panelFields("B03", "Post a progress update", panelDemo("Preview progress update", "Design preview: update and evidence would be reviewed before publishing.", true)) + `<div class="actions">${panelLocal(ctx, "Review completion", "completion", "textlink")}</div>` : `<div class="actions">${panelLocal(ctx, "Arrange a session", "session")}${panelLocal(ctx, "Update player details", "preparation")}</div>`}`;
  if (v === "quote" && f.paid)
    return card(
      "Accepted scope · USD " + f.amount,
      "This paid order’s accepted scope is read-only. Changes require a separate reviewed amendment; this preview cannot rewrite the paid contract.",
    );
  if (v === "quote-preview" && f.paid)
    return card(
      "Accepted quote · USD " + f.amount,
      "The accepted contract stays read-only. Return to the order sections above.",
    );
  if (v === "quote")
    return panelFields(
      "A04",
      "Edit quote revision",
      `<div class="actions">${panelLocal(ctx, "Preview customer quote", "quote-preview", "button primary")}${panelDemo("Save draft · demo", "Design preview: this quote draft has not been issued.")}</div>`,
    );
  if (v === "quote-preview") {
    const draft = panelDrafts.get(
      `${ctx.family.root}/${ctx.entity}/quote/${stateName}`,
    );
    const amount = draft?.querySelector('input[type="number"]')?.value || "";
    const scope = draft?.querySelector("textarea")?.value || "";
    const valid = Number(amount) > 0 && scope.trim();
    return `<div class="previewfeedback">Read-only customer preview of your draft · ${ctx.entity} · Admin workspace</div>${card(valid ? "Proposed quote · USD " + Number(amount).toFixed(2) : "Quote draft incomplete", valid ? scope : "Return to the editor and enter a positive total and scope.")}<p>The currently issued quote and order status have not changed.</p><div class="actions">${panelLocal(ctx, "← Back to quote editor", "quote")}${valid ? panelDemo("Issue reviewed quote · demo", "Design preview: review and recent staff verification are required. No quote was issued.", true) : "<button disabled>Issue reviewed quote</button>"}</div>`;
  }
  if (v === "payment")
    return `<section class="card"><h3>${f.paid ? "Payment verified" : "Quote ready · payment required"}</h3><dl class="recordFacts"><div><dt>Order</dt><dd>${ctx.entity}</dd></div><div><dt>Total</dt><dd>USD ${f.amount} · example</dd></div><div><dt>Status</dt><dd>${f.payment}</dd></div></dl><p>${f.paid ? "Verified payment evidence belongs to this order. No new payment is needed." : "Review the quote and terms before accepting and opening direct crypto checkout. There is no stored balance."}</p>${!f.paid && !staff ? `<div class="actions">${panelLocal(ctx, "Review checkout", "invoice", "button primary")}</div>` : ""}${staff ? `<div class="actions">${panelDemo("Request reconciliation · demo", "Design preview: reconciliation would check existing provider evidence; it cannot grant payment success.")}${panelLocal(ctx, "Review case or refund", "case", "textlink")}</div>` : ""}</section>`;
  if (v === "invoice")
    return `<section class="card"><h3>Checkout · ${ctx.entity}</h3><p>USD ${f.amount} · illustrative total. Payment is still ${f.payment.toLowerCase()}.</p><label class="field">Crypto asset / network<select data-checkout-network><option value="">Select a supported asset and exact network</option><option>Example only · USDT / TRON</option></select></label><label class="field check"><input type="checkbox" data-checkout-consent><span>I have reviewed this order’s scope and <a href="#P17/terms">terms</a> and <a href="#P17/refunds">refund policy</a>.</span></label><button class="primary" data-checkout-next="${panelHref(ctx, "invoice")}" data-checkout-demo>Continue to provider · demo</button><p data-form-feedback role="status"></p><p>No payable address or QR code is generated in this design.</p></section>`;
  if (["session", "sessions"].includes(v))
    return !f.paid
      ? card(
          "Scheduling is not available yet",
          "This order needs verified payment and preparation first.",
        )
      : panelFields(
          "C06",
          "Session for " + ctx.entity,
          panelDemo(
            "Preview session proposal",
            "Design preview: the proposal would be sent for confirmation. No booking was changed.",
            true,
          ),
        );
  if (v === "preparation")
    return panelFields(
      "C04",
      "Player details for " + ctx.entity,
      panelDemo(
        "Save details · demo",
        "Design preview: player details are not stored or transmitted.",
        true,
      ),
    );
  if (v === "delivery")
    return `${card("Secure handover is being prepared", "You will receive private delivery instructions here once staff release this account. Keep credentials out of chat.")}<p>No handover is available yet. Receipt can only be acknowledged after viewing the delivered account.</p><button disabled>Acknowledge receipt</button>`;
  if (v === "help" || v === "case")
    return `${card(staff ? "Case & refund review" : "Help with " + ctx.entity, "Every message and case stays attached to this order. A request is not an approved cancellation, refund or payout.")} ${panelFields("C08", staff ? "Record case details" : "Describe the issue", panelDemo(staff ? "Preview case decision" : "Preview support request", "Design preview: case validation and review would happen next. No case or refund has been created.", true))}<div class="actions">${panelLocal(ctx, "Ask in order messages", "messages", "textlink")}</div>`;
  if (v === "completion")
    return `${card("Review completion", "Check the agreed goal, final evidence and unresolved issues. A booster submission needs staff review; it does not directly complete an order.")} ${panelDemo("Submit for staff review · demo", "Design preview: completion would be sent for staff review. Order remains unchanged.", true)}`;
  if (v === "case-status")
    return card(
      "Support case · " + ctx.entity,
      "This example case is under review. No refund or cancellation has been approved. Use Messages to discuss this same order.",
    );
  if (v === "review")
    return card(
      "Reviews open after completion",
      "This order is not completed. You can return here after the service is finished.",
    );
  return panelGenericView(ctx);
}
function panelGenericView(ctx) {
  const s = ctx.screen;
  const refined = refinedRecordBody(ctx);
  if (refined !== null) return refined;
  if (ctx.view === "verification")
    return `<section class="card"><h3>Verify identity for ${esc(ctx.entity)}</h3><p>Reverify Google/email, then an authenticator or an unused recovery code. Return to this record and revalidate the pending action before confirmation.</p>${panelDemo("Preview verification flow", "Design preview: no authentication or record action was performed.")}<div class="actions">${panelLocal(ctx, "← Return to record", Object.keys(ctx.family.views)[0], "textlink")}</div></section>`;
  if (ctx.view === "messages") return panelConversation(ctx);
  if (ctx.view.startsWith("preview-")) {
    const target = byId.get(ctx.view.slice(8));
    if (!target)
      return card(
        "Preview unavailable",
        "Return to the record sections above.",
      );
    return `<div class="previewfeedback">Illustrative layout only · not generated from the current editor draft · ${esc(ctx.entity)} · Your admin workspace remains open</div><section class="card"><h3>${esc(target.title)}</h3>${target.sections
      .slice(0, 3)
      .map((x) => `<h4>${esc(x.title)}</h4><p>${esc(x.body)}</p>`)
      .join(
        "",
      )}</section>${panelLocal(ctx, "← Return to editing", ctx.family.views[location.hash.split("/")[3]?.replace("from-", "")] ? location.hash.split("/")[3].replace("from-", "") : Object.keys(ctx.family.views)[0], "textlink")}`;
  }
  return `<div class="sectionsgrid">${s.sections
    .slice(0, 2)
    .map((x) => card(x.title, x.body))
    .join(
      "",
    )}</div>${s.fields.length ? panelFields(s.id, "Details for " + ctx.entity) : ""}${actions(s)}`;
}
function updateRecordView(focus = false) {
  const ctx = panelContext();
  if (!ctx?.family || !$("recordView")) return;
  const key = `${ctx.family.root}/${ctx.entity}/${ctx.view}/${stateName}${ctx.view === "messages" ? "/" + (location.hash.split("/")[3] || "support") : ""}`;
  if (ctx.view.startsWith("preview-") || ctx.view === "quote-preview")
    panelDrafts.delete(key);
  let node = panelDrafts.get(key);
  if (!node) {
    node = document.createElement("div");
    node.innerHTML = ctx.invalid
      ? '<h2 tabindex="-1" id="recordSectionTitle">Section unavailable</h2><p>This record or section is not part of this design. Return using its section navigation or the record list.</p>'
      : `<h2 tabindex="-1" id="recordSectionTitle">${esc(panelViewNames[ctx.view] || "Customer preview")}</h2>${ctx.family.type === "order" ? panelOrderBody(ctx) : panelGenericView(ctx)}<p class="panelFeedback" role="status"></p>`;
    panelDrafts.set(key, node);
  }
  $("recordView").replaceChildren(node);
  document.querySelectorAll("[data-record-view]").forEach((a) => {
    if (a.dataset.recordView === ctx.view)
      a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  bindPanelActions();
  bindJourneyControls();
  bindRefinedForms();
  syncReviewControls();
  if (focus) {
    const title = $("recordSectionTitle");
    title?.focus({ preventScroll: true });
    if (title) scrollPanelContent(title);
  }
  $("announce").textContent =
    `${ctx.entity}, ${panelViewNames[ctx.view] || "preview"}, ${panelRoleNames[ctx.role]}`;
}
function bindPanelActions() {
  document.querySelectorAll("[data-panel-reset]").forEach(
    (b) =>
      (b.onclick = () => {
        stateName = "";
        render();
      }),
  );
  panelTabObserver?.disconnect();
  const tabs = document.querySelector(".recordTabs");
  const syncPadding = () => {
    $("canvas").style.scrollPaddingTop = tabs
      ? `${tabs.offsetHeight + 16}px`
      : "0px";
  };
  syncPadding();
  if (tabs && typeof ResizeObserver !== "undefined") {
    panelTabObserver = new ResizeObserver(syncPadding);
    panelTabObserver.observe(tabs);
  }
  document.querySelectorAll("[data-panel-feedback]").forEach(
    (b) =>
      (b.onclick = () => {
        const target =
          b.closest("#recordView")?.querySelector(".panelFeedback") ||
          $("panelFeedback");
        if (target) target.textContent = b.dataset.panelFeedback;
      }),
  );
  if ($("workspaceSelect"))
    $("workspaceSelect").onchange = (e) => {
      location.hash = e.target.value;
    };
  if ($("sendDemo"))
    $("sendDemo").onclick = () => {
      const draft = $("messageDraft");
      $("chatFeedback").textContent = draft.value.trim()
        ? "Design preview: nothing was transmitted. This draft belongs to the visible record and audience."
        : "Write a message before sending.";
      if (!draft.value.trim()) {
        draft.focus({ preventScroll: true });
        scrollPanelContent(draft, true);
      }
    };
  if ($("attachDemo"))
    $("attachDemo").onclick = () => {
      $("chatFeedback").textContent =
        "Design preview: choose file, upload, scan, then attach or recover. No file is uploaded.";
    };
  if ($("audience"))
    $("audience").onchange = () => {
      $("chatFeedback").textContent = $("audience").value.startsWith("Internal")
        ? "Internal note · authorized staff only."
        : "Reply · visible to the named participant.";
    };
}
function panelRows(s, ctx) {
  let rows = {
    A09: [
      [
        "Audit · 21 Sep 14:20",
        "Actor: Owner example · Target: Demo staff",
        "Role changed",
        "",
        "",
      ],
    ],
    A31: [
      [
        "JOB-12",
        "Payment reconciliation · Attempts: 3 · Failure: provider unavailable · Next retry: awaiting review",
        "Failed",
        "",
        "",
      ],
    ],
    A32: [
      [
        "proof-demo.png",
        "Order proof · Private · Linked order: PL-1038",
        "Available",
        "View related order PL-1038",
        "A03/PL-1038/overview/from-media",
      ],
    ],

    A35: [
      [
        "DEL-12",
        "Customer deletion request",
        "Held · Retention policy review",
        "Review request",
        "A35/DEL-12/overview",
      ],
    ],
    A15: [
      [
        "CASE-1038",
        "PL-1038 · Service case / refund review",
        "Payment verified · Remedy pending",
        "Review case",
        "A16/CASE-1038/overview",
      ],
      [
        "SA-204",
        "Seller payout obligation",
        "Eligibility review pending",
        "Review payout",
        "A17/SA-204/overview",
      ],
    ],
    C02: [
      [
        "PL-1042",
        "Mobile Legends · Epic II → Legend V",
        "Quote ready · Unpaid",
        "Review quote",
        "C03/PL-1042/payment",
      ],
      [
        "PL-1038",
        "Mobile Legends · Rank progress package",
        "In progress · Payment verified",
        "Track progress",
        "C05/PL-1038/progress",
      ],
      [
        "PL-1048",
        "Mobile Legends · Account purchase",
        "Preparing handover · Payment verified",
        "View delivery",
        "C23/PL-1048/delivery",
      ],
    ],
    B05: [
      [
        "PL-1038",
        "Assigned order · Mobile Legends",
        "Customer ↔ assigned booster · Support can review",
        "Read assigned-order messages",
        "B03/PL-1038/messages",
      ],
    ],
    B02: [
      [
        "PL-1038",
        "Mobile Legends · Play together",
        "In progress · Next session: 24 Sep, 19:00 Asia/Tehran",
        "View assignment",
        "B03/PL-1038/overview",
      ],
    ],
    A02: [
      [
        "PL-1042",
        "Player · Mobile Legends custom boost",
        "Quote ready · Unpaid",
        "Review quote",
        "A03/PL-1042/quote",
      ],
      [
        "PL-1038",
        "Sample player · Mobile Legends package",
        "In progress · Payment verified",
        "Review fulfillment",
        "A03/PL-1038/fulfillment",
      ],
    ],
    S01: [
      [
        "SA-204",
        "Mobile Legends · Account sale",
        "Terms incomplete · Consignment example",
        "Review offer",
        "S03/SA-204/offer",
      ],
    ],
    A20: [
      [
        "SA-204",
        "Mobile Legends · Seller submission",
        "Terms incomplete · Consignment example",
        "Review submission",
        "A21/SA-204/overview",
      ],
    ],
    A22: [
      [
        "AC-208",
        "Mobile Legends · Linked seller record SA-204",
        "Draft · Not published",
        "Edit listing",
        "A23/AC-208/listing",
      ],
    ],
    C11: [
      [
        "PL-1042",
        "Order conversation · Quote ready",
        "Customer ↔ support",
        "Read order messages",
        "C03/PL-1042/messages",
      ],
      [
        "PL-1038",
        "Order conversations · Private support and assigned booster",
        "Choose a conversation",
        "Read order messages",
        "C05/PL-1038/messages",
      ],
      [
        "SA-204",
        "Private sale conversation",
        "Seller ↔ authorized staff",
        "Read sale messages",
        "S03/SA-204/messages",
      ],
    ],
    A05: [
      [
        "PL-1042",
        "Player · Order conversation",
        "Customer-visible replies / staff-only notes",
        "Read customer thread",
        "A03/PL-1042/messages",
      ],
      [
        "SA-204",
        "Seller · Sale conversation",
        "Seller-visible replies / staff-only notes",
        "Read seller thread",
        "A21/SA-204/messages",
      ],
    ],
    A10: [
      [
        "MLBB",
        "Mobile Legends · Catalog",
        "Published revision 4 · Draft revision 5",
        "Edit game",
        "A11/MLBB/general",
      ],
    ],
  }[s.id];
  if (!rows && s.table && ["list", "inbox"].includes(s.kind)) {
    const rowTargets = {
      A28: ["A29/REV-12/overview"],
      A32: ["A03/PL-1038/overview"],
      C14: ["C03/PL-1042/payment", "C03/PL-1042/messages"],
    };
    rows = s.table.rows.map((r, i) => [
      r[0],
      r.slice(1, -1).join(" · "),
      r.at(-1),
      rowTargets[s.id]?.[i] ? "View " + r[0] : "",
      rowTargets[s.id]?.[i] || "",
    ]);
  }
  if (!rows && ["list", "inbox"].includes(s.kind))
    return `<div class="content"><section class="card"><h2>No example records to show</h2><p>${esc(s.summary)}</p><p>Use the named actions below to explore this section.</p></section>${actions(s)}</div>`;
  if (!rows) return null;
  const listing = `<div class="entityList">${rows.map(([id, name, status, label, to]) => `<article class="entityRow" data-entity-search="${esc(id + " " + name + " " + status)}" data-entity-status="${esc(status.split(" · ")[0])}"><div><h2>${esc(id)}</h2><p>${esc(name)}</p><p class="entityStatus">${esc(status)}</p></div>${to ? `<a class="button" href="#${to}" aria-label="${esc(label)} for ${esc(id)}">${esc(label)} <span aria-hidden="true">→</span></a>` : '<span class="quiet">Read-only record</span>'}</article>`).join("")}</div>`;
  return `<div class="content panelList"><div class="filters"><label class="field">Search records<input type="search" data-list-search placeholder="ID, game or name"></label><label class="field">${s.id === "A09" ? "Action" : "Status"}<select data-list-status><option value="All statuses">${s.id === "A09" ? "All actions" : "All statuses"}</option>${[...new Set(rows.map((r) => r[2].split(" · ")[0]))].map((st) => `<option>${esc(st)}</option>`).join("")}</select></label></div><p class="listCount quiet" role="status"></p><p class="listEmpty" hidden>No matching records. Clear your search or reset the filter.</p><p class="quiet">Example records · Each action identifies its record and next step.</p>${listing}${!["C02", "B02", "A02", "S01", "A20", "A22", "C11", "A05", "B05", "A10", "A15", "A35"].includes(s.id) ? actions(s) : ""}${s.id === "A15" ? '<div class="actions"><a class="textlink" href="#A18">Payment policy</a><a class="textlink" href="#A19">Provider reconciliation</a></div>' : ""}${s.id === "S01" ? '<div class="actions"><a class="button primary" href="#S02">Submit another account</a></div>' : ""}${s.id === "C11" ? '<div class="actions"><a class="textlink" href="#C13">Start a general support conversation</a></div>' : ""}</div>`;
}
function panelDashboard(s, ctx) {
  const next =
    ctx.role === "admin"
      ? [
          "PL-1042",
          "Review the quote before issuing a revision.",
          "Review quote",
          "A03/PL-1042/quote",
        ]
      : ctx.role === "booster"
        ? [
            "PL-1038",
            "Your assigned boost is in progress. Check the next session and latest customer message.",
            "View assignment",
            "B03/PL-1038/overview",
          ]
        : [
            "PL-1042",
            "Your final quote is ready. Review the scope and terms before payment.",
            "Review quote",
            "C03/PL-1042/payment",
          ];
  const list =
    ctx.role === "admin" ? "A02" : ctx.role === "booster" ? "B02" : "C02";
  return `<div class="content"><section class="attention"><div><div class="eyebrow">NEEDS YOUR ATTENTION</div><h2>${next[0]} · Mobile Legends</h2><p>${next[1]}</p></div><a class="button primary" href="#${next[3]}">${next[2]} →</a></section><div class="workspaceQuicklinks">${panelNavigation[
    ctx.role
  ]
    .slice(1, 4)
    .map(
      ([label, id]) =>
        `<a href="#${id}">${label} <span aria-hidden="true">→</span></a>`,
    )
    .join(
      "",
    )}</div><div class="sectionhead"><h2>${ctx.role === "booster" ? "Your assignment" : "Recent orders"}</h2><a class="textlink" href="#${list}">View ${ctx.role === "admin" ? "order queue" : "all orders"} →</a></div>${panelRows(byId.get(list), ctx)}</div>`;
}
function panelBody(ctx) {
  if (ctx.invalid && !ctx.family)
    return `<div class="content"><h2>View unavailable in this workspace</h2><a href="#${panelHomes[ctx.role]}">Return to workspace home</a></div>`;
  if (ctx.family) return panelRecord(ctx);
  if (
    ["Loading", "Empty", "No match", "Load failed", "Request failed"].includes(
      stateName,
    )
  )
    return `<div class="content"><h2>${esc(stateName)}</h2><p>${stateName === "Loading" ? "Loading this workspace’s records…" : stateName === "Empty" ? "There are no records in this example state." : stateName === "No match" ? "No records match. Clear the filters to continue." : "Records could not be loaded. Your workspace navigation remains available."}</p><button data-panel-reset>Return to example records</button></div>`;
  const s = ctx.screen;
  const refined = refinedPanelBody(ctx);
  if (refined !== null) return refined;
  if (ctx.origin && ctx.role === "admin" && !isAdmin(s))
    return `<div class="content"><div class="previewfeedback">Read-only preview · ${panelRoleNames[ctx.role]}</div>${s.sections.map((x) => card(x.title, x.body)).join("")}<p>Return to the originating workspace before changing this record.</p></div>`;
  if (["C01", "B01", "A01"].includes(s.id)) return panelDashboard(s, ctx);
  const rows = panelRows(s, ctx);
  if (rows) return rows;
  return renderBody(s);
}
function canonicalPanelScreen(s) {
  const ctx = panelContext(s);
  if (ctx?.family && s.id !== ctx.family.root) {
    history.replaceState(null, "", `#${panelHref(ctx, ctx.view)}`);
    return byId.get(ctx.family.root);
  }
  return s;
}
function panelActionLinks(s) {
  const ctx = panelContext();
  if (!ctx) return null;
  return `<div class="actions">${s.actions.map((a, i) => (/demo|Publish reviewed|Continue verification/.test(a.label) ? panelDemo(a.label, `Design preview: ${a.label.replace(" · demo", "")}. No real data or status changed.`, i === 0) : link(a.label, a.to, "button " + (i === 0 ? "primary" : "")))).join("")}</div>`;
}
function bindPanelLists() {
  const ctx = panelContext();
  if (!ctx || ctx.family) return;
  let list = document.querySelector(".panelList");
  if (!list) return;
  const key = ctx.screen.id;
  if (panelLists.has(key)) {
    const retained = panelLists.get(key);
    if (list !== retained) list.replaceWith(retained);
    list = retained;
  } else panelLists.set(key, list);
  const search = list.querySelector("[data-list-search]"),
    status = list.querySelector("[data-list-status]");
  const update = () => {
    let count = 0;
    list.querySelectorAll(".entityRow").forEach((row) => {
      row.hidden = !(
        row.dataset.entitySearch
          .toLowerCase()
          .includes(search.value.toLowerCase()) &&
        (status.value === "All statuses" ||
          row.dataset.entityStatus === status.value)
      );
      if (!row.hidden) count++;
    });
    list.querySelector(".listCount").textContent =
      `${count} matching ${count === 1 ? "record" : "records"}`;
    list.querySelector(".listEmpty").hidden = count > 0;
  };
  search.oninput = update;
  status.onchange = update;
  update();
  list
    .querySelectorAll("a")
    .forEach(
      (a) =>
        (a.onclick = () => panelListScroll.set(key, $("canvas").scrollTop)),
    );
}
function restorePanelListScroll() {
  const ctx = panelContext();
  if (ctx && !ctx.family && panelListScroll.has(ctx.screen.id))
    $("canvas").scrollTo({
      top: panelListScroll.get(ctx.screen.id),
      behavior: "instant",
    });
}

function scrollPanelContent(element, center = false) {
  const canvas = $("canvas"),
    rect = element.getBoundingClientRect(),
    viewport = canvas.getBoundingClientRect();
  const padding = Math.max(
    24,
    parseFloat(getComputedStyle(canvas).scrollPaddingTop) || 0,
  );
  const extra = center
    ? Math.max(0, (canvas.clientHeight - padding - rect.height) / 2)
    : 0;
  canvas.scrollTo({
    top: canvas.scrollTop + rect.top - viewport.top - padding - extra,
    behavior: "instant",
  });
}
