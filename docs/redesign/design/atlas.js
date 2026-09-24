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
  `<a class="${cls}" href="#${esc(contextualTarget(to))}">${esc(label)}</a>`;
const chip = (label, tone = "") =>
  `<span class="chip ${tone}">${esc(label)}</span>`;
const card = (title, body) =>
  `<section class="card"><h3>${esc(title)}</h3><p>${esc(body)}</p></section>`;
const actions = (s) =>
  panelActionLinks(s) ||
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
        return `<label class="field check" for="${fid}" data-field-label="${esc(f.label)}"><input id="${fid}" type="checkbox"><span>${esc(f.label)}${help}</span></label>`;
      let input;
      if (f.type === "select")
        input = `<select id="${fid}"${described}>${f.options.map((o) => `<option${o === f.value ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
      else if (f.type === "textarea")
        input = `<textarea id="${fid}"${described} placeholder="${f.label.includes("Message") ? "Write your message…" : ""}">${esc(f.value)}</textarea>`;
      else if (f.type === "file")
        input = `<input id="${fid}" type="file"${described}><small>Design control only. Files are not uploaded.</small>`;
      else
        input = `<input id="${fid}" type="${esc(f.type)}" value="${esc(f.value)}" autocomplete="off"${described}>`;
      return `<label class="field" for="${fid}" data-field-label="${esc(f.label)}"><span>${esc(f.label)}</span>${input}${help}</label>`;
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
let previewSignedIn = false;
let cornerExpanded = false;
let cornerExample = "active";
const gameDraftViews = new Map();
let motionPaused = false;
const embeddedScreens = new Set([
  "P04",
  "P05",
  "P06",
  "P07",
  "P08",
  "P09",
  "P10",
  "P11",
  "P12",
  "P13",
  "P14",
  "S02",
  "I01",
  "I02",
  "G07",
  "G08",
  "G09",
  "G10",
  "G11",
  "G12",
  "G13",
  "G14",
  "G15",
  "G16",
]);
function contextualTarget(to) {
  const journeyTarget = journeyDestination(to);
  if (journeyTarget) return journeyTarget;
  const panelTarget = panelDestination(to);
  if (panelTarget) return panelTarget;
  if (current.kind !== "game" || !embeddedScreens.has(to)) return to;
  const service = ["P12", "P13", "P14", "S02"].includes(to)
    ? "accounts"
    : location.hash.split("/")[1] || "boost";
  return `${current.id}/${service === "all" ? "boost" : service}/${to}`;
}
function nav(s) {
  if (s.id.startsWith("I")) {
    const role = identityPortal();
    return `<nav class="topnav minimalnav" aria-label="Main"><a href="#P01" class="brand"><img src="assets/logo.svg" alt="PLAYORA"></a><span class="workspaceBadge">${unscopedStaffIdentity() ? "Staff portal selection" : (role === "admin" ? "Admin" : role === "booster" ? "Booster" : "Customer") + " sign-in"}</span><a href="#P01">Back to website</a></nav>`;
  }
  const ctx = panelContext(s);
  if (ctx)
    return `<nav class="topnav minimalnav" aria-label="Main"><a href="#P01" class="brand"><img src="assets/logo.svg" alt="PLAYORA"></a><span class="workspaceBadge">${panelRoleNames[ctx.role]}</span><div class="navend"><a class="textlink" href="#${panelHomes[ctx.role]}">Workspace home</a></div></nav>${panelMobileNav(ctx)}`;
  return `<nav class="topnav minimalnav" aria-label="Main"><a href="#P01" class="brand"><img src="assets/logo.svg" alt="PLAYORA"></a><div class="navend">${link("Support", "C13")}${link(previewSignedIn ? "My account" : "Sign in", previewSignedIn ? "C01" : "I01", "button primary")}</div></nav>`;
}
function sidebar(s) {
  const ctx = panelContext(s);
  if (ctx) return panelSidebar(ctx);
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
function reviewScreen() {
  const ctx = panelContext();
  if (ctx?.family) {
    return (
      byId.get(
        { invoice: "P10", "case-status": "C09", "quote-preview": "A04" }[
          ctx.view
        ],
      ) || ctx.screen
    );
  }
  if (ctx) return ctx.screen;
  if (current.kind === "game")
    return byId.get(location.hash.split("/")[2]) || current;
  return current;
}
function syncReviewControls() {
  const s = reviewScreen();
  $("screenSelect").value = s.id;
  $("stateSelect").innerHTML =
    '<option value="">Default view</option>' +
    s.states
      .map(
        (x) =>
          `<option value="${esc(x.name)}"${x.name === stateName ? " selected" : ""}>${esc(x.name)}</option>`,
      )
      .join("");
  if (
    recordScenario &&
    !s.states.some((x) => x.name === recordScenario.state.name)
  ) {
    const option = document.createElement("option");
    option.value = recordScenario.state.name;
    option.textContent = "Record scenario: " + recordScenario.state.name;
    option.selected = true;
    $("stateSelect").append(option);
  }
  document.title = `${s.id} · ${s.title} — PLAYORA design`;
  if (!$("inspector").hidden) renderInspector();
}
function stateBanner(s) {
  if (!stateName) return "";
  let st = s.states.find((x) => x.name === stateName);
  return st
    ? `<section class="statebanner" role="status"><h2>${esc(st.name)}</h2><p>${esc(st.copy)}</p>${st.name === "Loading" ? '<div class="loadingbar"></div>' : ""}</section>`
    : "";
}
const gameProfiles = [
  {
    id: "G01",
    name: "Mobile Legends",
    art: "game-mlbb.png",
    artWidth: 1536,
    artHeight: 1024,
    services: ["boost", "accounts", "shop", "news"],
    goal: "Make your next ranked chapter count.",
    config: "P04",
  },
  {
    id: "G02",
    name: "World of Warcraft",
    art: "game-wow.jpg",
    artWidth: 2600,
    artHeight: 1260,
    services: ["boost", "accounts", "news"],
    goal: "Your next adventure starts here.",
    config: "G07",
  },
  {
    id: "G03",
    name: "League of Legends",
    art: "game-lol.jpg",
    artWidth: 1215,
    artHeight: 717,
    services: ["boost", "accounts", "shop", "news"],
    goal: "Find your next competitive edge.",
    config: "G08",
  },
  {
    id: "G04",
    name: "VALORANT",
    art: "game-valorant.png",
    artWidth: 5120,
    artHeight: 1772,
    services: ["boost", "news"],
    goal: "A clearer path to your next milestone.",
    config: "G09",
  },
  {
    id: "G05",
    name: "Dota 2",
    art: "game-dota.jpg",
    artWidth: 1600,
    artHeight: 947,
    services: ["boost", "accounts", "news"],
    goal: "Build your next great play.",
    config: "G10",
  },
  {
    id: "G06",
    name: "Wild Rift",
    art: "game-wildrift.jpg",
    artWidth: 1280,
    artHeight: 720,
    services: ["boost", "accounts", "news"],
    goal: "Your next chapter on the Rift.",
    config: "G11",
    paused: true,
  },
];
const serviceNames = {
  boost: "Boost",
  accounts: "Accounts",
  shop: "Shop",
  news: "News",
};
const chooseGame = () =>
  link("Choose your game ↘", "P01/games", "button primary");
function gameCards() {
  return `<div class="gamegrid discoverygames">${gameProfiles
    .map((g) => {
      const body = `<img src="assets/${g.art}" alt="" loading="lazy"><div class="gamecardtop">${g.paused ? chip("Temporarily unavailable", "amber") : ""}${g.placeholder ? '<span class="artnote">Game artwork pending</span>' : ""}</div><div class="gamebottom"><div><h3>${g.name}</h3><div class="capabilities">${g.services.map((x) => chip(serviceNames[x], "neutral")).join("")}</div>${g.paused ? "<p>Services paused. Check back later.</p>" : ""}</div>${g.paused ? "" : '<span class="arrow" aria-hidden="true">↗</span>'}</div>`;
      return g.paused
        ? `<article class="gamecard gamepaused" aria-disabled="true">${body}</article>`
        : `<a href="#${g.id}" class="gamecard">${body}</a>`;
    })
    .join("")}</div>`;
}
function metrics(game = false) {
  const objective = game === "G02";
  return `<div class="metricstrip"><div><span class="live-dot" aria-hidden="true"></span><strong>${game ? "24" : "128"}</strong><span>Active orders · live sample</span></div><div><strong>${game ? "2,480" : "12,480"}</strong><span>Completed orders · all time</span></div><div><strong>${objective ? "840" : "89.4<small>%</small>"}</strong><span>${objective ? "Completed objectives · 30 days" : "Win rate · last 30 days"}</span></div></div><details class="metricnote"><summary>Illustrative statistics · how these are measured</summary><p>These numbers are fictional design samples, not live claims. Active orders count paid orders currently in fulfillment. Completed orders exclude cancelled orders. Win rate counts wins divided by completed win/loss matches in eligible boosting orders during the last 30 days; it excludes shop, accounts and non-match services. Show unavailable data as “—”, never a fabricated zero. In production include the sample size, source update time and eligible games; omit win rate for games without a meaningful match metric.</p></details>`;
}
function sectionEmblem(type) {
  const shapes = {
    boost: '<path d="m28 7-13 19h10l-5 15 15-22H25z"/>',
    accounts:
      '<circle cx="24" cy="17" r="7"/><path d="M11 39v-5c0-7 26-7 26 0v5M7 17l-4 4 4 4m34-8 4 4-4 4"/>',
    shop: '<path d="M11 17h26l-2 24H13zM18 17v-5a6 6 0 0 1 12 0v5M20 28l4 4 5-7"/>',
    payments:
      '<path d="M32 14c-3-6-19-5-18 3 1 8 20 5 20 14 0 9-18 10-22 2M24 5v38"/>',
    news: '<path d="M9 8h30v33H9zM15 15h18M15 22h8v8h-8zM28 22h5m-5 7h5M15 35h18"/>',
  };
  const satellites = {
    boost: ["›››", "↗", "⚡", "››"],
    accounts: ["♙", "✓", "⇄", "◇"],
    shop: ["✦", "+", "◇", "✓"],
    payments: ["₿", "Ξ", "₮", "Ł"],
    news: ["#", "≡", "↗", "+"],
  };
  return `<div class="sectionemblem emblem-${type}" aria-hidden="true"><div class="emblemhalo"></div><div class="emblemcore"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shapes[type]}</svg></div>${satellites[type].map((mark, i) => `<span class="emblembadge badge-${i}">${mark}</span>`).join("")}<span class="emblemtrail trail-one"></span><span class="emblemtrail trail-two"></span></div>`;
}
let homepageObserver = null;
function bindHomepageMotion() {
  if (homepageObserver) homepageObserver.disconnect();
  homepageObserver = null;
  if (current.id !== "P01" || !("IntersectionObserver" in window)) return;
  if (stateName === "Reduced motion") {
    document
      .querySelectorAll(".serviceintro")
      .forEach((el) => el.classList.add("motion-preview-off"));
    return;
  }
  homepageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("section-entered");
        homepageObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.18 },
  );
  document
    .querySelectorAll(".serviceintro")
    .forEach((el) => homepageObserver.observe(el));
}
function home() {
  const sections = [
    [
      "01 / BOOST SERVICES",
      "A bigger goal.<br>A clearer way there.",
      "A ready-made package or a plan built around you. Find the right way forward in your game.",
      "boost",
      "Your climb, your choice",
      [
        ["Fixed packages", "Clear scope. A stated price. Ready when you are."],
        [
          "Custom boosts",
          "Choose your goal and preferences. Confirm the final staff quote before paying.",
        ],
        [
          "Limited releases",
          "Discover time-limited offers and small-batch packages, with clear availability.",
        ],
      ],
    ],
    [
      "02 / ACCOUNTS",
      "Your next chapter.<br>Or someone else’s.",
      "Find an account that fits your next adventure, or submit yours for review. Keep the conversation and handover in one place.",
      "accounts",
      "From discovery to handover",
      [
        [
          "Find your fit",
          "Compare the details, region and transfer terms before you buy.",
        ],
        [
          "Sell with a clear agreement",
          "Submit an account for review. Agree the price, arrangement and payout terms.",
        ],
        [
          "Follow every step",
          "Stay connected with staff through the sale and supported handover.",
        ],
      ],
    ],
    [
      "03 / GAME SHOP",
      "A little more<br>for your world.",
      "Explore in-game items and extras for supported games. See exactly what’s included and how delivery works before checkout.",
      "shop",
      "The details come first",
      [
        [
          "Made for your game",
          "Only eligible products for the chosen game and region.",
        ],
        [
          "Know what you’re buying",
          "Clear contents, delivery requirements and availability.",
        ],
        [
          "Keep track",
          "Your purchase and support stay together in your account.",
        ],
      ],
    ],
    [
      "04 / CRYPTO PAYMENTS",
      "One clear payment.<br>Every step visible.",
      "Pay directly with crypto for your order. Follow payment confirmation without loading a wallet or managing a balance.",
      "payments",
      "From checkout to confirmation",
      [
        ["Review", "Check the amount, supported asset and exact network."],
        [
          "Pay directly",
          "Use your order’s payment instructions and follow verification.",
        ],
        [
          "Receive sale proceeds",
          "Seller payouts use crypto under your accepted offer terms and timing.",
        ],
      ],
    ],
    [
      "05 / NEWS & GUIDES",
      "Stay in the game.<br>Ahead of the changes.",
      "Catch up on patches, discover what’s new, and learn something useful before your next session.",
      "news",
      "Your game, in the loop",
      [
        ["Game updates", "The changes that matter, with dates and sources."],
        ["Patch notes", "Find the latest changes for your chosen game."],
        [
          "Practical guides",
          "Learn at your own pace, from first steps to finer details.",
        ],
      ],
    ],
  ];
  return `<section class="hero discoveryhero"><div class="eyebrow">MANY WORLDS. ONE PLAYORA.</div><h1>Your next level.<br><em>Closer than ever.</em></h1><p>Boost your progress. Find your next account.<br>Discover more of the games you love.</p><span class="scrollhint">Scroll to explore <span aria-hidden="true">↓</span></span></section><section class="section activitysection" aria-label="PLAYORA activity">${metrics()}</section>${sections.map(([label, title, desc, type, caption, items]) => `<section class="section serviceintro intro-${type}"><div class="introcopy"><div class="eyebrow">${label}</div><h2>${title}</h2><p>${desc}</p>${chooseGame()}</div><div class="servicevisual">${sectionEmblem(type)}<div class="visualheading"><span class="orb" aria-hidden="true">${{ boost: "↗", accounts: "⇄", shop: "✦", payments: "◇", news: "≋" }[type]}</span><span>${caption}</span></div>${items.map(([t, d], i) => `<article class="featureline"><span class="featureindex">0${i + 1}</span><div><h3>${t}</h3><p>${d}</p></div></article>`).join("")}</div></section>`).join("")}${homeReviews()}${faqSection()}<section class="section gamedestination" id="gameSelection"><div class="sectionhead"><div><div class="eyebrow">CHOOSE YOUR WORLD</div><h2 tabindex="-1" id="gameSelectionTitle">Every game.<br><em>A new possibility.</em></h2></div><p>Pick your game to see what’s available.<br>Services vary by game.</p></div><p class="quiet">Design catalog · availability and capabilities shown as examples.</p>${gameCards()}</section>`;
}
function faqSection(game) {
  const gameQuestions = {
    G01: [
      "Can I choose a hero, role or play-together boost?",
      "Use the published Mobile Legends form to request your preferred mode, hero and role. Staff confirm scope and any win-rate terms in the final quote.",
    ],
    G02: [
      "What do you need for a dungeon or raid request?",
      "Choose the available activity and provide the realm, region and relevant character details requested by the form. Staff confirm eligibility, group arrangement and schedule.",
    ],
    G03: [
      "Can I request a specific role or champion?",
      "Request your rank goal, role and champion preferences in the League form. Availability and exact terms are confirmed before payment.",
    ],
    G04: [
      "How do region and queue affect my VALORANT request?",
      "Select the supported region and queue in the request. Staff check eligibility and agree the scope before you accept a quote.",
    ],
    G05: [
      "How is a Dota 2 MMR goal agreed?",
      "Provide your current and target MMR, region and preferred role. Your final quote defines the eligible queue and the agreed scope.",
    ],
    G06: [
      "Why can’t I order Wild Rift services right now?",
      "This design demonstrates a temporarily paused game. New orders are unavailable while paused; existing customers can still use their order workspace and contact support.",
    ],
  };
  const questions = game
    ? [
        gameQuestions[game.id],
        [
          "Is every service and offer available in my region?",
          "Availability varies by game, region and product. Check the offer’s eligibility and current availability before continuing.",
        ],
        [
          "Where do I see progress and contact the team?",
          "Open My account for order updates, proof and messages. Signed-in customers can also open an order from the corner activity panel.",
        ],
      ]
    : [
        [
          "How do custom boosts and fixed packages differ?",
          "Custom requests receive a final staff quote for approval before payment. Fixed packages have a defined scope and price and can go directly to checkout.",
        ],
        [
          "How do I pay?",
          "Pay directly for an order using the supported crypto asset and exact network shown at checkout. Fulfillment starts only after verified payment and any required order preparation.",
        ],
        [
          "Can I sell an account?",
          "Choose your game, open Accounts and select Sell an account. Staff review the submission and provide an offer with explicit payout terms.",
        ],
        [
          "Do all games offer the same services?",
          "No. Each game shows only its available services. Paused games are labeled and cannot accept new orders.",
        ],
        [
          "How do I get help with an order?",
          "Use your private order conversation in My account or the signed-in corner panel’s Chat with support action.",
        ],
      ];
  return `<section class="section faqsection"><div class="sectionhead"><div><div class="eyebrow">A LITTLE CLARITY</div><h2>${game ? esc(game.name) + " questions" : "Good questions. Clear answers."}</h2></div><p>${link("Contact us ↗", "C13", "textlink")}</p></div><div class="faqlist">${questions.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></section>`;
}
function homeReviews() {
  return `<section class="section reviewsection" aria-labelledby="reviewsTitle"><div class="sectionhead"><div><div class="eyebrow">THE PLAYER PERSPECTIVE</div><h2 id="reviewsTitle">A few words from the community.</h2></div><div class="reviewarrows"><button id="reviewPrevious" aria-label="Previous reviews" aria-controls="reviewTrack">←</button><button id="reviewNext" aria-label="Next reviews" aria-controls="reviewTrack">→</button></div></div><p class="quiet">Fictional review examples for layout review · not customer testimonials.</p><div class="reviewtrack" id="reviewTrack" tabindex="0" aria-label="Review cards; scroll horizontally">${[
    [
      "The next step was always clear.",
      "A clear quote and progress updates in the same place.",
      "Boost order",
    ],
    [
      "Everything I needed to compare.",
      "The listing details made it easy to understand the transfer.",
      "Account purchase",
    ],
    [
      "A conversation, not a guessing game.",
      "I could ask about the offer before accepting the terms.",
      "Account sale",
    ],
    [
      "One place to follow my order.",
      "The payment status and support were easy to find.",
      "Order support",
    ],
  ]
    .map(
      ([t, b, l], i) =>
        `<article class="reviewquote"><span class="quoteMark" aria-hidden="true">“</span><h3>${t}</h3><p>${b}</p><div><span class="avatar" aria-hidden="true">${i + 1}</span><span>Example player ${i + 1}<small>${l} · design sample</small></span></div></article>`,
    )
    .join(
      "",
    )}</div><p class="sr-only" id="reviewFeedback" role="status"></p></section>`;
}
function footer() {
  if (current.id.startsWith("I") && identityPortal() !== "customer")
    return `<footer class="footer fullfooter"><div><strong>PLAYORA · ${identityPortal() === "admin" ? "Admin" : "Booster"} portal</strong><p>For access help, contact your PLAYORA administrator through your established staff contact.</p></div><div><a href="#P01">Back to website</a><button class="textlink" id="toggleAmbient">${motionPaused ? "Resume" : "Pause"} background motion</button></div><p>Design preview · No shared customer session</p></footer>`;
  return `<footer class="footer fullfooter"><div class="footerbrand"><img src="assets/logo.svg" alt="PLAYORA"><p>Your games. Your next chapter.</p><small>Independent service. No publisher affiliation is claimed.</small></div><nav aria-label="Help and contact"><h2>Here to help</h2>${panelContext()?.role === "admin" ? '<a href="#A05">Support inbox</a><a href="#A09">Audit & recovery</a>' : panelContext()?.role === "booster" ? '<a href="#B05">Assignment messages</a><a href="#B02">Assigned orders</a>' : link("Contact us", "C13") + link("Help & FAQ", "C13") + link("Order support", "C11")}</nav><nav aria-label="Policies"><h2>The details</h2>${panelContext()?.role === "admin" ? '<a href="#A34">Content & policies</a><a href="#A18">Payment policy</a>' : '<a href="#P17/terms">Terms of service</a><a href="#P17/privacy">Privacy policy</a><a href="#P17/refunds">Refund & cancellation terms</a>'}</nav><nav aria-label="Your experience"><h2>Your experience</h2>${panelContext() ? `<a href="#${panelHomes[panelContext().role]}">${panelRoleNames[panelContext().role]}</a><a href="#${panelNavHref(panelContext().role, "C17")}">Security</a>` : link("My account", "C01") + link("Accessibility & motion", "C19")}<button class="textlink" id="toggleAmbient">${motionPaused ? "Resume" : "Pause"} background motion</button></nav><div class="footerbottom"><span>© PLAYORA · Design preview</span><span>Direct crypto payments · No stored balance</span></div></footer>`;
}
function renderCorner() {
  const show =
    previewSignedIn &&
    !current.id.startsWith("I") &&
    (!panelContext() || panelContext().role === "customer");
  $("orderCorner").hidden = !show;
  const modal = show && cornerExpanded && $("previewFrame").clientWidth <= 600;
  $("canvas").inert = modal;
  $("previewFrame").classList.toggle("corner-modal", modal);
  $("orderCorner").innerHTML = show
    ? `<aside class="ordercorner" ${modal ? 'role="dialog" aria-modal="true"' : ""} aria-label="Your ongoing orders"><div class="cornerhead"><button id="cornerToggle" aria-expanded="${cornerExpanded}" aria-controls="cornerDetails"><span class="live-dot" aria-hidden="true"></span>${cornerExample === "active" ? "2 ongoing orders" : cornerExample === "empty" ? "Your orders" : "Order updates unavailable"} <span aria-hidden="true">${cornerExpanded ? "Close ×" : "+"}</span></button></div><div id="cornerDetails" ${cornerExpanded ? "" : "hidden"}><div class="eyebrow">YOUR ACTIVITY · DESIGN SAMPLE</div>${cornerExample === "active" ? `<a class="cornerorder" href="#C05"><strong>Mobile Legends · PL-1038</strong><span>In progress · Epic II → Legend V</span><span>Current milestone: Epic I</span><progress value="3" max="5" aria-label="3 of 5 agreed milestones completed">3 of 5</progress><small>3 of 5 agreed milestones · last update 12 min ago (sample)</small><span class="textlink">Open order ↗</span></a><a class="cornerorder" href="#C23"><strong>Account purchase · PL-1048</strong><span>Preparing handover</span><small>Last update 35 min ago (sample)</small><span class="textlink">Open order ↗</span></a><p class="quiet">Progress is based on reported milestones, not a live game feed.</p>` : cornerExample === "empty" ? '<p>No ongoing orders. Your completed orders remain in My account.</p><a class="textlink" href="#C02">View order history ↗</a>' : '<p>We couldn’t refresh your orders. Check My account for the latest recorded update.</p><a class="textlink" href="#C02">Open my orders ↗</a>'}</div><a class="cornerchat" href="#C11">Chat with support ↗</a></aside>`
    : "";
  $("orderCorner")
    .querySelectorAll("a")
    .forEach(
      (a) =>
        (a.onclick = () => {
          cornerExpanded = false;
        }),
    );
  if ($("cornerToggle"))
    $("cornerToggle").onclick = () => {
      cornerExpanded = !cornerExpanded;
      renderCorner();
      $("cornerToggle").focus();
    };
}
function bindExtras() {
  document.body.classList.toggle(
    "preview-reduced",
    stateName === "Reduced motion",
  );
  if ($("reviewTrack")) {
    const track = $("reviewTrack");
    const update = () => {
      $("reviewPrevious").disabled = track.scrollLeft < 2;
      $("reviewNext").disabled =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    [
      ["reviewPrevious", -1],
      ["reviewNext", 1],
    ].forEach(
      ([id, dir]) =>
        ($(id).onclick = () => {
          track.scrollBy({
            left:
              dir *
              (track.querySelector("article").getBoundingClientRect().width +
                20),
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          });
          $("reviewFeedback").textContent =
            dir === 1
              ? "Showing later review examples."
              : "Showing earlier review examples.";
        }),
    );
    track.addEventListener("scroll", update, { passive: true });
    update();
  }
  if ($("toggleAmbient"))
    $("toggleAmbient").onclick = () => {
      motionPaused = !motionPaused;
      document.body.classList.toggle("ambient-paused", motionPaused);
      $("toggleAmbient").textContent =
        `${motionPaused ? "Resume" : "Pause"} background motion`;
    };
  const game =
    current.kind === "game"
      ? gameProfiles.find((g) => g.id === current.id)
      : null;
  $("siteBackdrop").src = `assets/${game ? game.art : "ascension.jpg"}`;
  renderCorner();
}
function embeddedView(game, id) {
  if (game.paused)
    return `<div class="card"><h2 id="embeddedTitle" tabindex="-1">New orders are paused</h2><p>You can still open existing orders in My account or contact support.</p></div>`;
  let screen = byId.get(id);
  if (!screen || !embeddedScreens.has(id))
    return '<p class="quiet">This step is unavailable. Return to the service overview.</p>';
  let body;
  if (["P12", "P13", "P14", "S02"].includes(id) && game.id !== "G01") {
    body =
      id === "P12"
        ? `<div class="three">${card(game.name + " account listings", "Game-specific reviewed inventory appears here. Use region and progression details relevant to this game.")}${card("Availability", "This design has no published example inventory for this game. No account is offered for sale.")}${card("Want to sell?", "Submit your own account for review and agreed terms.")}</div><div class="actions">${link("Sell an account", "S02", "button primary")}</div>`
        : id === "S02"
          ? `<div class="card"><h3>Tell us about your ${game.name} account</h3>${fields({ ...screen, fields: screen.fields.filter((f) => !/rank|hero|skin|game/i.test(f.label)) })}<p class="quiet">The ${game.name} intake schema and transfer terms must be configured before submission is enabled. Design preview only.</p></div>`
          : `<div class="card"><h3>No listing selected</h3><p>Choose an available ${game.name} account before reviewing its details.</p>${link("Back to accounts", "P12", "button")}</div>`;
  } else
    body = renderBody(screen)
      .replace(/<h1>/g, "<h2>")
      .replace(/<\/h1>/g, "</h2>");
  return `<div class="flowheading"><a class="textlink" href="#${game.id}/${location.hash.split("/")[1]}">← Back to ${serviceNames[location.hash.split("/")[1]] || "service"}</a><div class="eyebrow">${esc(game.name)} / ${esc(screen.group)}</div><h2 id="embeddedTitle" tabindex="-1">${esc(id === "P12" ? "Find your next account." : screen.title)}</h2><p>${esc(screen.summary)}</p></div>${body}`;
}
function gameHub(s) {
  const g = gameProfiles.find((x) => x.id === s.id);
  const descriptions = {
    boost: [
      "Your goal. Your way.",
      "Compare fixed packages, request a custom boost, or explore limited releases.",
    ],
    accounts: [
      "A new chapter starts here.",
      "Explore reviewed listings or submit your account for staff review and agreed sale terms.",
    ],
    shop: [
      "More for your game.",
      "Browse in-game extras with explicit region, eligibility and delivery information.",
    ],
    news: [
      "Keep your game knowledge fresh.",
      "Updates, patch notes and practical guides, together in one place.",
    ],
  };
  return `<div class="gamehub hub-${g.id}"><section class="hubhero"><img src="assets/${g.art}" width="${g.artWidth}" height="${g.artHeight}" alt=""><div class="hubherocopy">${link("← All games", "P01/games", "textlink")}<div class="eyebrow">YOUR WORLD / PLAYORA</div><h1>${g.name}</h1><p>${g.goal}</p>${g.placeholder ? '<p class="quiet">Art direction placeholder · dedicated game art pending</p>' : ""}${g.paused ? chip("Services temporarily unavailable", "amber") : ""}</div></section><div class="hubmetrics">${metrics(g.id)}</div><div class="serviceback" id="serviceBack" hidden>${link("← Back to choose service", g.id, "textlink")}</div><section class="featuredoffers pinnedoffers" aria-labelledby="featuredTitle"><div class="sectionhead"><div><div class="eyebrow">PINNED FOR THIS GAME</div><h2 id="featuredTitle">Limited offers.</h2></div><span class="quiet">Design offers · no live prices or availability</span></div><div class="offergrid">${g.services
    .filter((k) => k !== "news")
    .map(
      (k) =>
        `<article class="spotlight" data-offer="${k}">${chip({ boost: "Limited quantity", accounts: "Discounted · example", shop: "Limited time", news: "Editor’s pick" }[k], "neutral")}<p class="eyebrow">${serviceNames[k]}</p><h3>${{ boost: "A package for your next goal", accounts: "A fresh start, carefully detailed", shop: "A little extra for your next session", news: "What changed in the latest patch" }[k]}</h3><p>${k === "news" ? "Explore the changes and what they mean for your next game." : "Review scope, availability and terms before choosing."}</p><a class="textlink" href="#${g.id}/${k}">Explore ${serviceNames[k].toLowerCase()} ↗</a></article>`,
    )
    .join(
      "",
    )}</div></section><section class="serviceentry" id="serviceEntry"><div class="sectionhead"><div><div class="eyebrow">MAKE YOUR NEXT MOVE</div><h2 id="serviceChoiceTitle" tabindex="-1">Choose your service.</h2></div><p>What brings you to ${g.name}?</p></div><nav class="servicechoices" aria-label="Choose a game service">${g.services.map((k) => `<a href="#${g.id}/${k}" class="servicechoice" data-service="${k}"><span class="orb" aria-hidden="true">${{ boost: "↗", accounts: "⇄", shop: "✦", news: "≋" }[k]}</span><strong>${serviceNames[k]}</strong><span>${descriptions[k][1]}</span><span class="choicearrow" aria-hidden="true">↗</span></a>`).join("")}</nav></section><div class="hubcontent"><p id="serviceFeedback" class="sr-only" role="status"></p>${g.services
    .map(
      (k) =>
        `<section class="hubservice" data-panel="${k}"><div class="sectionhead"><div><a class="textlink" href="#${g.id}">← Back to choose service</a><div class="eyebrow">${serviceNames[k]}</div><h2 id="serviceTitle-${k}" tabindex="-1">${descriptions[k][0]}</h2></div><p>${descriptions[k][1]}</p></div><div class="three">${(k ===
        "boost"
          ? [
              [
                "Fixed packages",
                "Choose a defined scope and price. No custom-quote approval is needed.",
              ],
              [
                "Custom boost",
                "Tell us your goal. Staff confirm the final quote before checkout.",
              ],
              [
                "Limited releases",
                "Visible eligibility, expiry and remaining quantity when applicable.",
              ],
            ]
          : k === "accounts"
            ? [
                [
                  "Buy an account",
                  "Compare region, progression, cosmetics and transfer terms.",
                ],
                [
                  "Sell an account",
                  "Submit details privately for review; agree purchase-before-resale or payout-after-sale terms.",
                ],
                [
                  "Supported handover",
                  "Keep transfer instructions, questions and acceptance in your order.",
                ],
              ]
            : k === "shop"
              ? [
                  [
                    "Browse extras",
                    "Game-specific catalog and region eligibility.",
                  ],
                  [
                    "Check delivery",
                    "Contents, expected delivery and required details shown before payment.",
                  ],
                  [
                    "Track your order",
                    "Payment confirmation, fulfillment and support in one place.",
                  ],
                ]
              : [
                  ["Latest updates", "Dated reporting with a clear source."],
                  [
                    "Patch notes",
                    "Version and platform context before the details.",
                  ],
                  [
                    "Guides",
                    "Practical advice with difficulty and last-updated dates.",
                  ],
                ]
        )
          .map(([t, d]) => card(t, d))
          .join(
            "",
          )}</div>${k === "boost" && !g.paused ? `<div class="actions">${link("Build a custom boost ↗", g.config, "button primary")}${g.id === "G01" ? link("View a fixed package", "P07", "button") : ""}</div>` : ""}${k === "accounts" && !g.paused ? `<div class="accountentry actions">${link("Browse accounts ↗", "P12", "button primary")}${link("Sell an account", "S02", "button")}</div>` : ""}<details class="smallsection"><summary>${k === "boost" ? "Package preview" : k === "accounts" ? "Account listing preview" : k === "shop" ? "Product preview" : "Article preview"} · design details</summary><p>${g.name} / ${serviceNames[k]}. Final catalog content, commercial terms and ${k === "news" ? "editorial publication" : "eligibility"} require approval. This review demonstrates discovery and filtering; it does not place orders.</p></details></section>`,
    )
    .join(
      "",
    )}<section id="gameFlow" class="gameflow" hidden></section></div>${faqSection(g)}</div>`;
}
function applyDestination() {
  const destination = location.hash.slice(1).split("/")[1] || "all";
  if (current.id === "P01" && destination === "games") {
    $("gameSelectionTitle").focus({ preventScroll: true });
    $("gameSelection").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  if (current.id === "P01" && destination === "all") {
    $("canvas").scrollTo({ top: 0, behavior: "instant" });
  }
  if (current.kind !== "game") return;
  const signIn = document.querySelector('.topnav .navend a[href^="#I01"]');
  if (signIn) signIn.href = "#" + identityHref("I01", location.hash.slice(1));
  const profile = gameProfiles.find((g) => g.id === current.id);
  const selected = profile.services.includes(destination) ? destination : "all";
  const focusWasInChoice = $("serviceEntry").contains(document.activeElement);
  const focusWasInService =
    $("serviceBack").contains(document.activeElement) ||
    !!document.activeElement.closest(".hubcontent");
  $("serviceEntry").hidden = selected !== "all";
  $("serviceBack").hidden = selected === "all";
  document.querySelectorAll("[data-panel]").forEach((el) => {
    el.hidden = el.dataset.panel !== selected;
  });
  document.querySelectorAll("[data-offer]").forEach((el) => {
    el.hidden = selected !== "all" && el.dataset.offer !== selected;
  });
  document.querySelector(".pinnedoffers").hidden =
    profile.paused ||
    ![...document.querySelectorAll("[data-offer]")].some((el) => !el.hidden);
  const flowId = location.hash.split("/")[2];
  const flow = $("gameFlow");
  if (flowId && selected !== "all") {
    if (flow.dataset.view !== flowId) {
      const key = `${profile.id}/${selected}/${flowId}`;
      let view = gameDraftViews.get(key);
      if (!view) {
        view = document.createElement("div");
        view.innerHTML = embeddedView(profile, flowId);
        gameDraftViews.set(key, view);
      }
      flow.replaceChildren(view);
      flow.dataset.view = flowId;
    }
    flow.hidden = false;
    document
      .querySelectorAll("[data-panel]")
      .forEach((el) => (el.hidden = true));
  } else {
    flow.hidden = true;
    flow.innerHTML = "";
    delete flow.dataset.view;
  }
  $("serviceBack").innerHTML =
    flowId && selected !== "all"
      ? `<a class="textlink" href="#${profile.id}/${selected}">← Back to ${serviceNames[selected].toLowerCase()}</a>`
      : `<a class="textlink" href="#${profile.id}">← Back to choose service</a>`;
  if (selected !== "all" && (focusWasInChoice || focusWasInService)) {
    (flowId ? $("embeddedTitle") : $("serviceTitle-" + selected))?.focus({
      preventScroll: true,
    });
    const destination = flowId
      ? document.querySelector(".flowheading") || $("embeddedTitle")
      : $("serviceTitle-" + selected)?.parentElement;
    if (destination) scrollPanelContent(destination);
  } else if (selected === "all" && focusWasInService) {
    $("serviceChoiceTitle").focus({ preventScroll: true });
    scrollPanelContent($("serviceEntry"));
  }
  $("serviceFeedback").textContent =
    selected === "all"
      ? "Choose a service. Limited offers are pinned above."
      : `Showing ${serviceNames[selected]} and related featured offers.`;
}
function summary(s) {
  const contextGame =
    current.kind === "game"
      ? gameProfiles.find((g) => g.id === current.id)
      : null;
  if (contextGame && contextGame.id !== "G01")
    return `<aside class="summary"><div class="eyebrow">${esc(contextGame.name)}</div><h2>Your request</h2><p>The final scope and quote follow staff review. No MLBB rank or price applies to this game.</p>${s.actions[0] ? link(s.actions[0].label, s.actions[0].to, "button primary") : ""}</aside>`;
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
function invoice(s = current) {
  return `<section class="card"><div class="invoice"><div>${chip("Waiting for payment", "amber")}<p class="smallsection">Send exactly</p><div class="amount">48.000000 <small>USDT</small></div><p>Network: <strong>TRON · example only</strong></p><div class="copybox">DEMO-ADDRESS-NOT-PAYABLE</div><p class="quiet">Illustration only. No real payment address or QR code.</p><div class="steps"><span>1 · Waiting</span><span>2 · Detected</span><span>3 · Confirming</span><span>4 · Verified</span></div></div><div class="qr"><strong>DESIGN ONLY<br>NOT A PAYMENT QR</strong></div></div><div class="divider"></div><h3>Your invoice is waiting for payment</h3><p class="smallsection">You can leave this page. Check your order for updates and avoid sending a second payment.</p></section>${actions(s)}`;
}
function renderBody(s) {
  const refined = refinedBody(s);
  if (refined !== null) return refined;
  switch (s.kind) {
    case "hero":
      return home();
    case "games":
      return `<section class="section">${fields(s, true)}${gameCards()}</section>`;
    case "game":
      return gameHub(s);
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
      return `<div class="content">${invoice(s)}</div>`;
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
      return `<div class="content"><div class="calendargrid">${["Mon 21", "Tue 22", "Wed 23", "Thu 24", "Fri 25"].map((day, i) => `<section class="calday"><strong>${day}</strong>${i === 3 ? '<div class="slot">19:00 – 20:00<br>PL-1038 · Proposed<br>Asia/Tehran</div>' : ""}</section>`).join("")}</div>${formContent(s)}</div>`;
    case "policy":
      return `<div class="content policy">${s.sections.map((x) => card(x.title, x.body)).join("")}${actions(s)}</div>`;
    case "success":
    case "error":
      return `<div class="content"><div class="successmark" aria-hidden="true">${s.kind === "error" ? "?" : s.id === "P11" ? "…" : "✓"}</div><div class="sectionsgrid">${s.sections.map((x) => card(x.title, x.body)).join("")}</div>${actions(s)}</div>`;
    default:
      return `<div class="content">${s.sections.map((x) => card(x.title, x.body)).join("")}${actions(s)}</div>`;
  }
}
function displayedRoute(s) {
  if (s.id.startsWith("I") && identityPortal() !== "customer")
    return `/${identityPortal()}/login · proposed portal flow`;
  return s.route;
}
function renderInspector() {
  const s = reviewScreen();
  $("inspector").innerHTML =
    `<button id="closeSpec" aria-label="Close specifications">Close ×</button><div class="eyebrow">${s.id} / ${esc(s.kind)}</div><h2>${esc(s.title)}</h2><p>${esc(s.summary)}</p><p><strong>Route reference:</strong> ${esc(displayedRoute(s))}</p><h3>Page anatomy</h3>${s.sections.map((x) => `<div class="specstate"><strong>${esc(x.title)}</strong><p>${esc(x.body)}</p></div>`).join("")}<h3>Fields</h3>${s.fields.map((f) => `<p><strong>${esc(f.label)}</strong> · ${esc(f.type)}<br>${esc(f.help)}${f.options.length ? "<br>Options: " + esc(f.options.join(", ")) : ""}</p>`).join("") || "<p>No input fields in this view.</p>"}<h3>States & recovery</h3>${s.states.map((x) => `<div class="specstate"><strong>${esc(x.name)}</strong><p>${esc(x.copy)}</p></div>`).join("")}<h3>Responsive behavior</h3><p>${esc(s.mobile)}</p><h3>Guardrails</h3><p>${esc(s.notes || "Follow the shared interaction specification.")}</p><h3>Journey coverage</h3><p>${esc(s.flowIds.join(", "))}</p><p><a href="../SCREENS.md">Full specifications</a> · <a href="../INTERACTIONS.md">Interaction contract</a></p>`;
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
function flowDestination(id) {
  if (["F09", "F31"].includes(activeFlow?.id) && id.startsWith("I"))
    return identityHref(id, activeFlow.id === "F09" ? "A01" : "B01");
  return id;
}
function renderFlow() {
  const target = $("journeySteps");
  target.innerHTML = activeFlow
    ? activeFlow.path
        .map(
          (id, i) =>
            `<a href="#${flowDestination(id)}"${id === current.id ? ' aria-current="step"' : ""} title="${esc(byId.get(id).title)}">${i + 1}. ${id}</a>`,
        )
        .join("")
    : "";
}
function render() {
  const s = current;
  const panel = panelContext(s);
  const workspace =
    ["Customer", "Seller", "Booster"].includes(s.group) || isAdmin(s);
  const head = panel
    ? panel.family
      ? ""
      : panelHeading(panel)
    : s.kind === "hero" ||
        s.kind === "auth" ||
        s.kind === "game" ||
        s.id.startsWith("I")
      ? ""
      : heading(s);
  let body = panel ? panelBody(panel) : renderBody(s);
  $("canvas").innerHTML =
    `${nav(s)}${workspace ? '<div class="workspace">' + sidebar(s) + '<main class="maincol">' : "<main>"}${head}<div id="designBody">${body}</div>${panel ? '<p class="panelFeedback" id="panelFeedback" role="status"></p>' : ""}</main>${workspace ? "</div>" : ""}${footer()}<div class="specHint">${s.id} · ${esc(s.kind)} · ${esc(displayedRoute(s))} · DESIGN SAMPLE · <a href="../SCREENS.md">Screen specification ↗</a></div>`;
  restorePageDraft();
  syncReviewControls();
  renderFlow();
  $("announce").textContent =
    `${s.id}. ${s.title}${stateName ? ". " + stateName : ""}`;
  bindExtras();
  updateRecordView();
  bindPanelActions();
  bindHomepageMotion();
  applyDestination();
  document.querySelectorAll('a[href="#P01/games"]').forEach((a) => {
    a.onclick = () => {
      if (location.hash === "#P01/games") applyDestination();
    };
  });
  const menu = $("menuToggle");
  if (menu)
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
  bindPanelActions();
  bindPanelLists();
  bindJourneyControls();
  bindRefinedForms();
  applyDesignState();
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
  const ctx = panelContext();
  recordScenario =
    ctx?.family && stateName
      ? {
          key: `${ctx.family.root}/${ctx.entity}`,
          state: reviewScreen().states.find((x) => x.name === stateName),
        }
      : null;
  applyDesignState();
  syncReviewControls();
  document.body.classList.toggle(
    "preview-reduced",
    stateName === "Reduced motion",
  );
};
$("flowSelect").onchange = (e) => {
  activeFlow = flows.find((f) => f.id === e.target.value) || null;
  if (activeFlow) {
    location.hash = activeFlow.path[0];
  }
  renderFlow();
};
$("inspect").onclick = () => toggleInspector($("inspector").hidden);
$("identityPreview").onchange = (e) => {
  previewSignedIn = e.target.value.startsWith("customer");
  cornerExample =
    e.target.value === "customer-empty"
      ? "empty"
      : e.target.value === "customer-error"
        ? "error"
        : "active";
  if (!previewSignedIn) {
    gameDraftViews.clear();
    panelDrafts.clear();
    panelLists.clear();
    panelListScroll.clear();
    pageDrafts.clear();
  }
  cornerExpanded = false;
  render();
};
document.addEventListener("focusin", (e) => {
  if (
    !previewSignedIn ||
    $("orderCorner").hidden ||
    cornerExpanded ||
    !$("canvas").contains(e.target)
  )
    return;
  const corner = $("orderCorner").getBoundingClientRect(),
    target = e.target.getBoundingClientRect();
  const actions =
    e.target.id === "messageDraft"
      ? e.target
          .closest(".composer")
          ?.querySelector(".actions")
          ?.getBoundingClientRect()
      : null;
  const bottom = actions?.bottom || target.bottom;
  if (bottom > corner.top - 12 && target.right > corner.left)
    $("canvas").scrollTop += Math.min(
      bottom - corner.top + 16,
      Math.max(
        0,
        target.top -
          $("canvas").getBoundingClientRect().top -
          (parseFloat(getComputedStyle($("canvas")).scrollPaddingTop) || 0),
      ),
    );
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && $("previewFrame").classList.contains("corner-modal")) {
    const items = [...$("orderCorner").querySelectorAll("button,a")].filter(
      (el) => !el.closest("[hidden]"),
    );
    const first = items[0],
      last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  if (e.key === "Escape" && cornerExpanded) {
    cornerExpanded = false;
    renderCorner();
    $("cornerToggle")?.focus();
  }
  if (e.key === "Escape" && !$("inspector").hidden) toggleInspector(false);
});
document.querySelectorAll("[data-width]").forEach(
  (button) =>
    (button.onclick = () => {
      const width = button.dataset.width;
      const sizeClass =
        width === "390" ? "phone" : width === "768" ? "tablet" : "";
      $("previewFrame").className = sizeClass;
      $("canvas").className = sizeClass;
      renderCorner();
      document
        .querySelectorAll("[data-width]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    }),
);
window.addEventListener("hashchange", () => {
  if (location.hash === "#canvas") return;
  preservePageDraft();
  const nextFamily = panelContext(
    byId.get(location.hash.slice(1).split("/")[0]) || current,
  );
  if (
    recordScenario?.key !==
    (nextFamily?.family ? `${nextFamily.family.root}/${nextFamily.entity}` : "")
  )
    recordScenario = null;
  stateName = recordScenario?.state?.name || "";
  applyDesignState();
  let next = byId.get(location.hash.slice(1).split("/")[0]) || byId.get("X01");
  next = canonicalPanelScreen(next);
  if (next !== current) {
    current = next;
    if (!recordScenario) stateName = "";
    render();
    $("canvas").focus({ preventScroll: true });
    $("canvas").scrollTo({ top: 0, behavior: "instant" });
  }
  if (panelContext()?.family) {
    const ctx = panelContext();
    const shell = document.querySelector(".recordWorkspace");
    if (
      !shell ||
      shell.dataset.recordKey !== `${ctx.family.root}/${ctx.entity}`
    )
      render();
    else updateRecordView(true);
  } else if (panelContext() || current.kind !== "game") render();
  restorePanelListScroll();
  applyDestination();
  syncReviewControls();
  bindJourneyControls();
  bindRefinedForms();
  applyDesignState();
});
current =
  byId.get(location.hash.slice(1).split("/")[0]) ||
  (location.hash ? byId.get("X01") : screens[0]);
current = canonicalPanelScreen(current);
render();
applyDestination();
