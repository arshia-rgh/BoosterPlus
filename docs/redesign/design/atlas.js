/* Design-only renderer: no API, identity, storage or provider integrations. */
"use strict";
const { screens, flows } = window.PLAYORA_DESIGN;
const byId = new Map(screens.map((s) => [s.id, s]));
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let current = screens[0],
  stateName = "",
  activeFlow = null;
const link = (label, to, cls = "") =>
  `<a class="${cls}" href="#${esc(to)}">${esc(label)}</a>`;
const chip = (label, tone = "") =>
  `<span class="chip ${tone}">${esc(label)}</span>`;
const card = (title, body) =>
  `<section class="card"><h3>${esc(title)}</h3><p>${esc(body)}</p></section>`;
const actions = (s) =>
  `<div class="actions">${s.actions.map((a, i) => link(a.label, a.to, "button " + (i === 0 ? "primary" : ""))).join("")}</div>`;
let fieldSequence = 0;
function fields(s, filter = false) {
  const sequence = fieldSequence++;
  return `<div class="${filter ? "filters" : "formgrid"}">${s.fields
    .map((f, i) => {
      const fid = `${s.id}-field-${sequence}-${i}`,
        help = f.help ? `<small id="${fid}-help">${esc(f.help)}</small>` : "";
      const described = f.help ? ` aria-describedby="${fid}-help"` : "";
      if (f.type === "checkbox")
        return `<label class="field check" for="${fid}"><input id="${fid}" type="checkbox"><span>${esc(f.label)}${help}</span></label>`;
      let input;
      if (f.type === "select")
        input = `<select id="${fid}"${described}>${f.options.map((o) => `<option${o === f.value ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
      else if (f.type === "textarea")
        input = `<textarea id="${fid}"${described} placeholder="${f.label.includes("Message") ? "Write your message…" : ""}">${esc(f.value)}</textarea>`;
      else if (f.type === "file")
        input = `<input id="${fid}" type="file"${described}><small>Design control only. Files are not uploaded.</small>`;
      else
        input = `<input id="${fid}" type="${esc(f.type)}" value="${esc(f.value)}" autocomplete="off"${described}>`;
      return `<label class="field" for="${fid}"><span>${esc(f.label)}</span>${input}${help}</label>`;
    })
    .join("")}</div>`;
}
function table(s) {
  if (!s.table) return "";
  return `<div class="tablewrap"><table><caption class="sr-only">${esc(s.title)}</caption><thead><tr>${s.table.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${s.table.rows.map((r) => `<tr>${r.map((v, i) => `<td data-label="${esc(s.table.columns[i])}">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function isAdmin(s) {
  return ["Administration", "Catalog", "Finance", "Resale admin"].includes(
    s.group,
  );
}
function nav(s) {
  const internal = isAdmin(s) || s.group === "Booster";
  const signedIn =
    internal ||
    ["Customer", "Seller", "Payments"].includes(s.group) ||
    s.id === "P06";
  return `<nav class="topnav" aria-label="Main"><a href="#P01" class="brand"><img src="assets/logo.svg" alt="PLAYORA"></a><div class="toplinks">${(internal
    ? [
        ["Overview", isAdmin(s) ? "A01" : "B01"],
        ["Orders", isAdmin(s) ? "A02" : "B02"],
        ["Messages", isAdmin(s) ? "A05" : "B05"],
      ]
    : [
        ["Games", "P02"],
        ["Accounts", "P12"],
        ["Sell an account", "S01"],
        ["How it works", "P16"],
      ]
  )
    .map(([a, b]) => link(a, b))
    .join(
      "",
    )}</div><button class="menu" id="menuToggle" aria-expanded="false" aria-controls="mobileNav">Menu</button><div class="navend">${link("Support", "C11")}${link(signedIn ? "My account" : "Sign in", signedIn ? "C01" : "I01", "button primary")}</div></nav><nav class="mobilemenu" id="mobileNav" hidden aria-label="Mobile navigation">${(isAdmin(
    s,
  )
    ? [
        ["Overview", "A01"],
        ["Orders", "A02"],
        ["Messages", "A05"],
        ["Calendars", "A07"],
        ["Customers & staff", "A08"],
        ["Catalog", "A10"],
        ["Accounts", "A22"],
        ["Submissions", "A20"],
        ["Finance", "A15"],
        ["Reports", "A30"],
        ["Coupons", "A27"],
        ["Reviews", "A28"],
        ["Content", "A34"],
        ["Privacy", "A35"],
        ["Media", "A32"],
        ["Alerts", "A33"],
        ["Tasks", "A31"],
      ]
    : s.group === "Booster"
      ? [
          ["Overview", "B01"],
          ["Assigned orders", "B02"],
          ["Calendar", "B04"],
          ["Messages", "B05"],
          ["Security", "C17"],
        ]
      : [
          ["Games", "P02"],
          ["Accounts", "P12"],
          ["My orders", "C02"],
          ["Messages", "C11"],
          ["My sales", "S01"],
          ["Settings", "C22"],
        ]
  )
    .map(([a, b]) => link(a, b))
    .join("")}</nav>`;
}
function sidebar(s) {
  let links;
  if (isAdmin(s))
    links = [
      ["Overview", "A01", "◈"],
      ["Orders", "A02", "▤"],
      ["Messages", "A05", "◌"],
      ["Calendars", "A07", "▦"],
      ["Customers & staff", "A08", "◎"],
      ["Catalog", "A10", "◇"],
      ["Accounts", "A22", "▣"],
      ["Submissions", "A20", "▧"],
      ["Finance", "A15", "◉"],
      ["Reports", "A30", "▥"],
      ["Coupons", "A27", "%"],
      ["Reviews", "A28", "☆"],
      ["Content", "A34", "≡"],
      ["Privacy", "A35", "◎"],
      ["Media", "A32", "▧"],
      ["Alerts", "A33", "◌"],
      ["Tasks", "A31", "↻"],
    ];
  else if (s.group === "Booster")
    links = [
      ["Overview", "B01", "◈"],
      ["Assigned orders", "B02", "▤"],
      ["Calendar", "B04", "▦"],
      ["Messages", "B05", "◌"],
      ["Security", "C17", "◎"],
    ];
  else
    links = [
      ["Overview", "C01", "◈"],
      ["Orders", "C02", "▤"],
      ["Messages", "C11", "◌"],
      ["My sales", "S01", "◇"],
      ["Saved items", "C10", "♡"],
      ["Notifications", "C14", "◌"],
      ["Reviews", "C15", "☆"],
      ["Availability alerts", "C20", "◉"],
      ["Settings", "C22", "⚙"],
      ["Security", "C17", "◎"],
      ["Preferences", "C19", "☷"],
      ["Privacy", "C18", "◇"],
    ];
  return `<aside class="sidebar"><p class="eyebrow">${isAdmin(s) ? "PLAYORA / OPERATIONS" : s.group === "Booster" ? "BOOSTER WORKSPACE" : "YOUR PLAYORA"}</p>${links.map(([a, b, c]) => `<a href="#${b}" class="${s.id === b ? "active" : ""}"${s.id === b ? ' aria-current="page"' : ""}><span class="icon" aria-hidden="true">${c}</span>${a}</a>`).join("")}</aside>`;
}
function heading(s) {
  return `<header class="pagehead ${s.kind === "chat" ? "chatpagehead" : ""}"><div class="crumb">${link(isAdmin(s) ? "Operations" : "PLAYORA", isAdmin(s) ? "A01" : "P01")} <span aria-hidden="true"> / </span> ${esc(s.group)}</div><div class="eyebrow">${esc(s.group)}</div><h1>${esc(s.title)}</h1><p>${esc(s.summary)}</p></header>`;
}
function stateBanner(s) {
  if (!stateName) return "";
  let st = s.states.find((x) => x.name === stateName);
  return st
    ? `<section class="statebanner" role="status"><h2>${esc(st.name)}</h2><p>${esc(st.copy)}</p>${st.name === "Loading" ? '<div class="loadingbar"></div>' : ""}</section>`
    : "";
}
function gameCards() {
  const games = [
    [
      "G01",
      "Mobile Legends",
      "miya",
      "Custom boosts & packages",
      "Available at launch",
    ],
    [
      "G02",
      "World of Warcraft",
      "illidan",
      "Dungeons, raids & more",
      "Template preview",
    ],
    [
      "G03",
      "League of Legends",
      "ahri",
      "Rank & role goals",
      "Template preview",
    ],
    ["G04", "VALORANT", "", "Your competitive milestone", "Template preview"],
    ["G05", "Dota 2", "", "Your next MMR goal", "Template preview"],
    ["G06", "Wild Rift", "", "Your next rank", "Template preview"],
  ];
  return `<div class="gamegrid">${games.map(([id, title, img, sub, status]) => `<a href="#${id}" class="gamecard ${img ? "art-" + img : ""}">${chip(status, "neutral")}<div class="gamebottom"><div><h3>${esc(title)}</h3><p>${esc(sub)}</p></div><span class="arrow" aria-hidden="true">↗</span></div></a>`).join("")}</div>`;
}
function home() {
  return `<section class="hero"><div class="eyebrow">YOUR GAME. YOUR NEXT CHAPTER.</div><h1>Your next level.<br><em>Closer than ever.</em></h1><p>Make your next gaming goal a clear plan. Choose a boost, find an account, and follow every step with your PLAYORA team.</p><div class="actions">${link("Find your game ↗", "P02", "button primary")}${link("Browse accounts", "P12", "button")}</div><div class="herofoot"><span>Clear quotes</span><span>Direct crypto payment</span><span>Order support</span></div></section><section class="section"><div class="sectionhead"><div><div class="eyebrow">CHOOSE YOUR WORLD</div><h2>Where are we heading?</h2></div><p>Start with Mobile Legends.<br>More game templates, ready to grow.</p></div>${gameCards()}</section><section class="section"><div class="scene"><img src="assets/miya.jpg" alt="Mobile Legends character scene reference"><div class="copy"><div class="eyebrow">MOBILE LEGENDS</div><h2>Find your<br><em>fighting spirit.</em></h2><p>A climb shaped around your goal, your hero and how you want to play.</p><div class="actions">${link("Explore Mobile Legends ↗", "G01", "button primary")}</div><p class="quiet">Motion placement study · static artwork in this review</p></div></div></section><section class="section"><div class="sectionhead"><div><div class="eyebrow">A CLEAR PATH</div><h2>From your goal to your next win.</h2></div></div><div class="three">${[
    ["01", "Make it yours", "Choose a custom boost or a ready-made package."],
    [
      "02",
      "Know the next step",
      "Accept a clear quote or package scope before paying.",
    ],
    ["03", "Stay in the loop", "Keep messages, progress and proof together."],
  ]
    .map(
      ([n, t, b]) =>
        `<article class="card"><span class="num">${n}</span><h3>${t}</h3><p>${b}</p></article>`,
    )
    .join(
      "",
    )}</div><div class="actions">${link("See how it works", "P16", "textlink")}</div></section><section class="section"><div class="attention"><div><div class="eyebrow">HAVE A QUESTION?</div><h2>Let’s find the right fit.</h2><p>Ask the team before you commit to an order.</p></div>${link("Talk to PLAYORA ↗", "C13", "button primary")}</div></section>`;
}
function summary(s) {
  let payable = ["P07", "P08", "P09"].includes(s.id);
  return `<aside class="aside"><div class="summary"><div class="eyebrow">${payable ? "YOUR PACKAGE" : "YOUR BOOST"}</div><h2>Mobile Legends</h2><div class="rank"><span>Epic II</span><span aria-hidden="true">→</span><strong>Legend V</strong></div><dl><div><dt>Play mode</dt><dd>Play together</dd></div><div><dt>Region</dt><dd>SEA</dd></div><div><dt>${payable ? "Fixed package" : "Base estimate"}</dt><dd>$48.00</dd></div>${!payable ? "<div><dt>Play together</dt><dd>$12.00</dd></div>" : ""}</dl><div class="divider"></div><p>${payable ? "Package total" : "Estimated total"}</p><div class="price">$${payable ? "48" : "60"}.00 <small>USD</small></div><p>Illustrative design price</p>${s.actions[0] ? link(s.actions[0].label, s.actions[0].to, "button primary") : ""}<p class="disclaimer">${payable ? "Review the exact package scope and eligibility before paying." : "Final quote after staff review. Nothing is charged when you send a request."}</p></div><section class="smallsection"><h3>Need a little guidance?</h3><p>${link("Ask our team", "C13", "textlink")}</p></section></aside>`;
}
function configuration(s) {
  const subset = (indexes) => ({
    ...s,
    fields: indexes.map((i) => ({
      ...s.fields[i],
      help:
        i === 2
          ? "Stars within your current rank."
          : i === 7
            ? "Choose from the supported heroes."
            : "",
    })),
  });
  return `<div class="cols"><div><section class="card formcard"><div class="eyebrow">01 / YOUR GOAL</div><h2>Where are you now?<br>Where do you want to go?</h2>${fields(subset([0, 1, 2, 3]))}</section><section class="card formcard"><div class="eyebrow">02 / YOUR PLAY STYLE</div><h2>How would you like to play?</h2>${fields(subset([4]))}<p class="smallsection">Play together: keep control of your account and coordinate a session with your booster.</p></section><section class="card formcard"><div class="eyebrow">03 / MAKE IT YOURS</div><h2>Any preferences?</h2>${fields(subset([6, 8, 9]))}<details><summary>Choose a specific hero</summary>${fields(subset([7]))}</details><p class="quiet smallsection">Your final quote confirms which requests can be fulfilled.</p></section>${actions(s)}</div>${summary(s)}</div>`;
}
function reports(s) {
  return `${fields(s, true)}<div class="stats"><section class="stat"><strong>24</strong><p>Orders · illustrative data</p></section><section class="stat"><strong>3</strong><p>Open cases · illustrative data</p></section><section class="stat"><strong>18</strong><p>Completed · illustrative data</p></section></div><section class="card"><h2>Orders by status</h2><div class="reportbars"><div><span>Completed</span><meter min="0" max="24" value="18">18</meter><strong>18</strong></div><div><span>In progress</span><meter min="0" max="24" value="4">4</meter><strong>4</strong></div><div><span>On hold</span><meter min="0" max="24" value="2">2</meter><strong>2</strong></div></div><p class="quiet">Design example · Report generated 21 September 2026, 14:20</p></section><div class="sectionsgrid smallsection">${s.sections
    .slice(1)
    .map((x) => card(x.title, x.body))
    .join("")}</div>${actions(s)}`;
}
function formContent(s) {
  return `<div class="cols"><div><section class="card formcard"><h2>${["P04", "A12"].includes(s.id) ? "Your choices" : s.id === "I07" ? "Verify the new address" : "Details"}</h2>${fields(s)}</section>${s.sections
    .slice(0, 2)
    .map((x) => card(x.title, x.body))
    .join("")}${actions(s)}</div>${
    ["P04", "P05", "P08", "P09"].includes(s.id)
      ? summary(s)
      : `<aside class="aside">${s.sections
          .slice(2)
          .map((x) => card(x.title, x.body))
          .join(
            "",
          )}<section class="smallsection"><p class="quiet">${isAdmin(s) ? "Changes affect only the reviewed record and permitted actions." : "You can review your information before confirming."}</p></section></aside>`
  }</div>`;
}
function listContent(s) {
  let defaultRows =
    s.id === "C11" || s.id === "A05"
      ? [
          "PL-1042 · Your quote",
          "Question about a package",
          "Account sale · SA-204",
        ]
      : ["Needs your attention", "Recently updated", "Completed history"];
  return `${s.fields.length ? fields(s, true) : ""}${s.table ? table(s) : `<div class="listrows">${defaultRows.map((t, i) => `<a class="listrow" href="#${s.actions[0]?.to || s.id}"><span class="avatar" aria-hidden="true">${i === 0 ? "◈" : "◇"}</span><div class="rowcopy"><strong>${esc(t)}</strong><p>${i === 0 ? "Please review the latest update." : "Open to view the full details."}</p></div>${chip(i === 0 ? "Action needed" : "View", i === 0 ? "amber" : "neutral")}<span aria-hidden="true">↗</span></a>`).join("")}</div>`}${actions(s)}<div class="sectionsgrid smallsection">${s.sections.map((x) => card(x.title, x.body)).join("")}</div>`;
}
function dashboard(s) {
  const staff = isAdmin(s),
    booster = s.group === "Booster";
  return `<div class="attention"><div><div class="eyebrow">${staff ? "PRIORITY QUEUE" : booster ? "UP NEXT" : "YOUR NEXT STEP"}</div><h2>${staff ? "3 requests are ready for review" : booster ? "Your next session is Thursday" : "Your quote is ready to review"}</h2><p>${staff ? "Check their scope and send a clear final quote." : booster ? "PL-1042 · Play together · 19:00 Asia/Tehran" : "Mobile Legends · Epic II → Legend V · PL-1042"}</p></div>${link(staff ? "Open review queue ↗" : booster ? "Open assignment ↗" : "Review quote ↗", staff ? "A02" : booster ? "B03" : "C03", "button primary")}</div><div class="stats">${(staff
    ? [
        ["3", "Awaiting review"],
        ["2", "Payment exceptions"],
        ["4", "Unread conversations"],
      ]
    : booster
      ? [
          ["2", "Assigned orders"],
          ["1", "Upcoming session"],
          ["1", "Unread message"],
        ]
      : [
          ["2", "Active orders"],
          ["1", "Needs your action"],
          ["1", "Unread message"],
        ]
  )
    .map(
      ([n, t]) =>
        `<section class="stat"><strong>${n}</strong><p>${t}</p></section>`,
    )
    .join(
      "",
    )}</div><div class="cols"><div><section class="card"><div class="sectionhead"><h2>${staff ? "Waiting longest" : "Active orders"}</h2>${link("View all", staff ? "A02" : booster ? "B02" : "C02", "textlink")}</div><div class="listrows"><a href="#${staff ? "A03" : booster ? "B03" : "C03"}" class="listrow"><span class="avatar">ML</span><div class="rowcopy"><strong>Epic II → Legend V</strong><p>Mobile Legends · PL-1042</p></div>${chip(staff ? "Needs review" : "Quote ready", "amber")}</a><a href="#C05" class="listrow"><span class="avatar">ML</span><div class="rowcopy"><strong>Rank progress package</strong><p>Mobile Legends · PL-1038</p></div>${chip("In progress")}</a></div></section>${actions(s)}</div><aside class="aside"><section class="card"><h3>Recent activity</h3><ol class="timeline"><li><strong>Quote ready</strong><p>PL-1042 · Today, 14:20</p></li><li><strong>New message</strong><p>PLAYORA support · Today, 13:40</p></li><li><strong>Session confirmed</strong><p>PL-1038 · Yesterday</p></li></ol></section></aside></div>`;
}
function chat(s) {
  let staff = isAdmin(s),
    seller = s.id === "S07" || s.id === "A37";
  return `<div class="chatlayout"><aside class="threadlist" aria-label="Conversations"><div class="eyebrow">MESSAGES</div>${["PL-1042 · Your order", "Question about a package", "SA-204 · Account sale"].map((x, i) => `<a class="listrow" href="#${s.id}"><div class="rowcopy"><strong>${x}</strong><p>${i === 0 ? "You: Thanks for the update." : "View conversation"}</p></div></a>`).join("")}</aside><section><div class="chathead"><strong>${seller ? "Account sale SA-204" : staff ? "Player · Order PL-1042" : "PLAYORA support"}</strong><small>${seller ? "Private seller–staff conversation" : staff ? "Customer-visible conversation" : "Private order conversation"} · ${link("Open " + (seller ? "submission" : "order"), seller ? (staff ? "A21" : "S03") : staff ? "A03" : "C03")}</small></div><div class="messages" aria-label="Message history"><div class="day">Today · Example conversation</div><div class="bubble"><p>${seller ? "We have reviewed your account submission. Please read the proposed arrangement before accepting." : "Your quote is ready. Please review the scope and let us know if anything needs to change."}</p><small>PLAYORA support · 14:20</small></div><div class="bubble mine"><p>Thanks for the update. I’ll take a look.</p><small>You · 14:22 · Sent</small></div><div class="bubble"><p>Of course. You can keep all your questions here.</p><small>PLAYORA support · 14:23</small></div></div><div class="composer">${staff ? '<label for="audience">Message audience</label><select id="audience"><option>Reply to participant</option><option>Internal note · staff only</option></select>' : ""}<label for="messageDraft">${staff ? (seller ? "Reply to seller" : "Reply to customer") : "Message"}</label><textarea id="messageDraft" placeholder="Write your message…"></textarea><div class="actions"><button id="attachDemo">Attach file</button><button id="sendDemo" class="primary">Send message ↗</button></div><p class="quiet">Keep passwords and recovery codes out of messages.</p><div id="chatFeedback" role="status"></div></div></section></div><div class="actions">${link("Back to " + (staff ? "support inbox" : "messages"), staff ? "A05" : "C11", "textlink")}</div>`;
}
function order(s) {
  const quote = s.id === "C03";
  return `${quote ? '<div class="statusline">' + chip("Quote ready", "amber") + chip("Unpaid", "neutral") + "</div>" : ""}${
    ["C03", "C05", "A03", "B03"].includes(s.id)
      ? `<nav class="subnav" aria-label="Order sections">${(isAdmin(s)
          ? [
              ["Overview", "A03"],
              ["Messages", "A06"],
              ["Sessions", "A07"],
              ["Finance", "A15"],
            ]
          : s.group === "Booster"
            ? [
                ["Overview", "B03"],
                ["Messages", "B05"],
                ["Sessions", "B04"],
              ]
            : [
                ["Overview", "C03"],
                ["Messages", "C12"],
                ["Progress", "C05"],
                ["Payment", "C07"],
                ["Help", "C08"],
              ]
        )
          .map(([t, id]) => link(t, id))
          .join("")}</nav>`
      : ""
  }<div class="cols"><div>${quote ? `<div class="attention"><div><div class="eyebrow">QUOTE REVISION 2</div><h2>Your final quote: USD 60.00</h2><p>Epic II → Legend V · Play together · SEA<br>Design example · Review the scope before accepting.</p></div></div>` : ""}${s.sections
    .slice(0, 2)
    .map((x) => card(x.title, x.body))
    .join(
      "",
    )}${s.fields.length ? '<section class="card formcard">' + fields(s) + "</section>" : ""}${actions(s)}</div><aside class="aside">${s.sections
    .slice(2)
    .map((x) => card(x.title, x.body))
    .join(
      "",
    )}<section class="card"><h3>Activity</h3><ol class="timeline"><li><strong>Latest update</strong><p>Today, 14:20 · Design example</p></li><li><strong>Review completed</strong><p>Today, 13:40</p></li><li><strong>Request received</strong><p>Yesterday</p></li></ol></section></aside></div>`;
}
function market(s) {
  return `${fields(s, true)}<div class="productgrid">${[0, 1].map((_, i) => `<article class="productcard"><div class="productart"><span>${i ? "Legend" : "Mythic"} · Mobile Legends</span></div><div class="productbody">${chip("Available")}<h3 class="smallsection">${i ? "Legend account" : "Mythic account"} · ${i ? "EU" : "SEA"}</h3><p>Review rank, cosmetics and included transfer details before purchasing.</p><div class="money">USD ${i ? "85" : "120"}.00 <small>example</small></div><div class="actions">${link("View account ↗", "P13", "button primary")}</div></div></article>`).join("")}</div>${actions(s)}`;
}
function invoice() {
  return `<section class="card"><div class="invoice"><div>${chip("Waiting for payment", "amber")}<p class="smallsection">Send exactly</p><div class="amount">48.000000 <small>USDT</small></div><p>Network: <strong>TRON · example only</strong></p><div class="copybox">DEMO-ADDRESS-NOT-PAYABLE</div><p class="quiet">Illustration only. No real payment address or QR code.</p><div class="steps"><span>1 · Waiting</span><span>2 · Detected</span><span>3 · Confirming</span><span>4 · Verified</span></div></div><div class="qr"><strong>DESIGN ONLY<br>NOT A PAYMENT QR</strong></div></div><div class="divider"></div><h3>Your invoice is waiting for payment</h3><p class="smallsection">You can leave this page. Check your order for updates and avoid sending a second payment.</p></section>${actions(current)}`;
}
function renderBody(s) {
  switch (s.kind) {
    case "hero":
      return home();
    case "games":
      return `<section class="section">${fields(s, true)}${gameCards()}</section>`;
    case "game":
      return `<div class="content"><div class="scene"><img src="assets/${s.id === "G02" ? "illidan" : s.id === "G03" ? "ahri" : s.id === "G01" ? "miya" : "ascension"}.jpg" alt="${s.id === "G01" ? "Mobile Legends" : s.id === "G02" ? "World of Warcraft" : s.id === "G03" ? "League of Legends" : "Game art placeholder — final art required"} scene reference"><div class="copy"><div class="eyebrow">${s.id === "G01" ? "BUILD YOUR BOOST" : "GAME TEMPLATE PREVIEW"}</div><h2>${s.id === "G01" ? "Your rank.<br>Your way." : esc(s.title)}</h2><p>${esc(s.summary)}</p>${actions(s)}</div></div><nav class="subnav"><a href="#P04">Custom boost</a><a href="#P07">Fixed packages</a><a href="#P15">Reviews</a><a href="#C13">Questions</a></nav><div class="three">${card("Custom boost", "Choose your goal and preferences. Receive a final quote after staff review.")}${card("Fixed packages", "Review the included scope and price, then proceed directly to checkout.")}${card("Stay connected", "Messages, updates and proof stay together in your order.")}</div></div>`;
    case "configure":
      return `<div class="content">${configuration(s)}</div>`;
    case "form":
    case "editor":
    case "checkout":
      return `<div class="content">${formContent(s)}</div>`;
    case "dashboard":
      return `<div class="content">${s.id === "A30" ? reports(s) : dashboard(s)}</div>`;
    case "list":
    case "inbox":
      return `<div class="content">${listContent(s)}</div>`;
    case "chat":
      return `<div class="content">${chat(s)}</div>`;
    case "order":
      return `<div class="content">${order(s)}</div>`;
    case "market":
      return `<div class="content">${market(s)}</div>`;
    case "auth":
      return `<section class="autharea"><div class="authcard"><div class="eyebrow">PLAYORA / ${s.id === "I01" ? "WELCOME" : "VERIFICATION"}</div><h1>${esc(s.title)}</h1><p>${esc(s.summary)}</p>${s.id === "I01" ? '<div class="actions">' + link("Continue with Google · demo", "I02", "button") + '</div><div class="divider"></div>' : ""}${fields(s)}${actions(s.id === "I01" ? { ...s, actions: s.actions.slice(1) } : s)}<details><summary>What happens next?</summary><p>${esc(s.sections[0].body)}</p></details></div></section>`;
    case "invoice":
      return `<div class="content">${invoice()}</div>`;
    case "product":
      return `<div class="content"><div class="cols"><div><div class="gallery"><span>Reviewed listing screenshot placement</span></div><div class="sectionsgrid smallsection">${s.sections
        .slice(1, 3)
        .map((x) => card(x.title, x.body))
        .join(
          "",
        )}</div></div><aside class="summary">${chip("Available")}<h2 class="smallsection">Mythic account</h2><p class="smallsection">Mobile Legends · SEA</p><div class="price smallsection">$120.00 <small>USD</small></div><p>Illustrative design price</p>${actions(s)}<p class="disclaimer">Read the exact listing and transfer terms before reserving.</p></aside></div></div>`;
    case "package":
      return `<div class="content"><div class="cols"><div>${s.sections.map((x) => card(x.title, x.body)).join("")}</div>${summary(s)}</div></div>`;
    case "review":
      return `<div class="content"><div class="cols"><div>${s.sections
        .slice(0, 3)
        .map((x) => card(x.title, x.body))
        .join(
          "",
        )}${s.fields.length ? '<div class="card smallsection">' + fields(s) + "</div>" : ""}${actions(s)}</div><aside class="aside">${s.sections
        .slice(3)
        .map((x) => card(x.title, x.body))
        .join(
          "",
        )}<section class="card"><h3>Before you confirm</h3><p>Check the scope, terms and next step. Go back to make a change before continuing.</p></section></aside></div></div>`;
    case "calendar":
      return `<div class="content"><div class="calendargrid">${["Mon 21", "Tue 22", "Wed 23", "Thu 24", "Fri 25"].map((day, i) => `<section class="calday"><strong>${day}</strong>${i === 3 ? '<div class="slot">19:00 – 20:00<br>PL-1042 · Proposed<br>Asia/Tehran</div>' : ""}</section>`).join("")}</div>${formContent(s)}</div>`;
    case "policy":
      return `<div class="content policy">${s.sections.map((x) => card(x.title, x.body)).join("")}${actions(s)}</div>`;
    case "success":
    case "error":
      return `<div class="content"><div class="successmark" aria-hidden="true">${s.kind === "error" ? "?" : s.id === "P11" ? "…" : "✓"}</div><div class="sectionsgrid">${s.sections.map((x) => card(x.title, x.body)).join("")}</div>${actions(s)}</div>`;
    default:
      return `<div class="content">${s.sections.map((x) => card(x.title, x.body)).join("")}${actions(s)}</div>`;
  }
}
function renderInspector() {
  const s = current;
  $("inspector").innerHTML =
    `<button id="closeSpec" aria-label="Close specifications">Close ×</button><div class="eyebrow">${s.id} / ${esc(s.kind)}</div><h2>${esc(s.title)}</h2><p>${esc(s.summary)}</p><p><strong>Current route:</strong> ${esc(s.route)}</p><h3>Page anatomy</h3>${s.sections.map((x) => `<div class="specstate"><strong>${esc(x.title)}</strong><p>${esc(x.body)}</p></div>`).join("")}<h3>Fields</h3>${s.fields.map((f) => `<p><strong>${esc(f.label)}</strong> · ${esc(f.type)}<br>${esc(f.help)}${f.options.length ? "<br>Options: " + esc(f.options.join(", ")) : ""}</p>`).join("") || "<p>No input fields in this view.</p>"}<h3>States & recovery</h3>${s.states.map((x) => `<div class="specstate"><strong>${esc(x.name)}</strong><p>${esc(x.copy)}</p></div>`).join("")}<h3>Responsive behavior</h3><p>${esc(s.mobile)}</p><h3>Guardrails</h3><p>${esc(s.notes || "Follow the shared interaction specification.")}</p><h3>Journey coverage</h3><p>${esc(s.flowIds.join(", "))}</p><p><a href="../SCREENS.md">Full specifications</a> · <a href="../INTERACTIONS.md">Interaction contract</a></p>`;
  $("closeSpec").onclick = () => toggleInspector(false);
}
function toggleInspector(open) {
  $("inspector").hidden = !open;
  $("inspect").setAttribute("aria-expanded", String(open));
  if (open) {
    renderInspector();
    $("closeSpec").focus();
  } else $("inspect").focus();
}
function renderFlow() {
  const target = $("journeySteps");
  target.innerHTML = activeFlow
    ? activeFlow.path
        .map(
          (id, i) =>
            `<a href="#${id}"${id === current.id ? ' aria-current="step"' : ""} title="${esc(byId.get(id).title)}">${i + 1}. ${id}</a>`,
        )
        .join("")
    : "";
}
function render() {
  const s = current;
  const workspace =
    ["Customer", "Seller", "Booster"].includes(s.group) || isAdmin(s);
  const head = s.kind === "hero" || s.kind === "auth" ? "" : heading(s);
  let body = renderBody(s);
  const chosen = s.states.find((x) => x.name === stateName);
  if (
    chosen &&
    /403|404|Access (lost|removed|revoked)|Reassigned|Unauthorized|Restricted/.test(
      chosen.name,
    )
  )
    body = `<div class="content"><div class="emptybox"><h2>Access unavailable</h2><p>${esc(chosen.copy)}</p>${link("Return safely", "X01", "button smallsection")}</div></div>`;
  $("canvas").innerHTML =
    `${nav(s)}${workspace ? '<div class="workspace">' + sidebar(s) + '<main class="maincol">' : "<main>"}${head}${stateBanner(s)}${body}</main>${workspace ? "</div>" : ""}<footer class="footer"><strong>PLAYORA</strong>${link("Support", "C13")}${link("Terms & privacy", "P17")}${link("Motion & sound", "C19")}</footer><div class="specHint">${s.id} · ${esc(s.kind)} · ${esc(s.route)} · DESIGN SAMPLE · <a href="../SCREENS.md">Screen specification ↗</a></div>`;
  $("screenSelect").value = s.id;
  $("stateSelect").innerHTML =
    '<option value="">Default view</option>' +
    s.states
      .map(
        (x) =>
          `<option value="${esc(x.name)}"${x.name === stateName ? " selected" : ""}>${esc(x.name)}</option>`,
      )
      .join("");
  renderFlow();
  if (!$("inspector").hidden) renderInspector();
  document.title = `${s.id} · ${s.title} — PLAYORA design`;
  $("announce").textContent =
    `${s.id}. ${s.title}${stateName ? ". " + stateName : ""}`;
  const menu = $("menuToggle");
  menu.onclick = () => {
    const open = menu.getAttribute("aria-expanded") === "true";
    menu.setAttribute("aria-expanded", String(!open));
    $("mobileNav").hidden = open;
  };
  if ($("sendDemo"))
    $("sendDemo").onclick = () => {
      const draft = $("messageDraft");
      if (!draft.value.trim()) {
        $("chatFeedback").textContent = "Write a message before sending.";
        draft.focus();
        return;
      }
      $("chatFeedback").className = "previewfeedback";
      $("chatFeedback").textContent =
        "Design preview: message would be sent to the selected audience. Nothing was transmitted.";
    };
  if ($("attachDemo"))
    $("attachDemo").onclick = () => {
      $("chatFeedback").textContent =
        "Design preview: file chooser → upload progress → scan → available or rejected. No file is uploaded.";
    };
  if ($("audience"))
    $("audience").onchange = () => {
      $("chatFeedback").textContent = $("audience").value.startsWith("Internal")
        ? "Internal note · Only authorized staff will see this."
        : "Participant reply · Visible to the named customer or seller.";
    };
}
const groups = [...new Set(screens.map((s) => s.group))];
$("screenSelect").innerHTML = groups
  .map(
    (g) =>
      `<optgroup label="${esc(g)}">${screens
        .filter((s) => s.group === g)
        .map(
          (s) => `<option value="${s.id}">${s.id} · ${esc(s.title)}</option>`,
        )
        .join("")}</optgroup>`,
  )
  .join("");
$("flowSelect").innerHTML += flows
  .map((f) => `<option value="${f.id}">${f.id} · ${esc(f.title)}</option>`)
  .join("");
$("screenSelect").onchange = (e) => {
  location.hash = e.target.value;
};
$("stateSelect").onchange = (e) => {
  stateName = e.target.value;
  render();
};
$("flowSelect").onchange = (e) => {
  activeFlow = flows.find((f) => f.id === e.target.value) || null;
  if (activeFlow) {
    location.hash = activeFlow.path[0];
  }
  renderFlow();
};
$("inspect").onclick = () => toggleInspector($("inspector").hidden);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("inspector").hidden) toggleInspector(false);
});
document.querySelectorAll("[data-width]").forEach(
  (button) =>
    (button.onclick = () => {
      const width = button.dataset.width;
      $("canvas").className =
        width === "390" ? "phone" : width === "768" ? "tablet" : "";
      document
        .querySelectorAll("[data-width]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    }),
);
window.addEventListener("hashchange", () => {
  if (location.hash === "#canvas") return;
  current =
    byId.get(decodeURIComponent(location.hash.slice(1))) || byId.get("X01");
  stateName = "";
  render();
  $("canvas").focus({ preventScroll: true });
  $("canvas").scrollIntoView({ block: "start" });
});
current = byId.get(location.hash.slice(1)) || screens[0];
render();
