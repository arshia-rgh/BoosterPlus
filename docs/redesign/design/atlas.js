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
  if (s.id === "P01")
    return `<nav class="topnav minimalnav" aria-label="Main"><a href="#P01" class="brand"><img src="assets/logo.svg" alt="PLAYORA"></a><div class="navend">${link("Support", "C13")}${link("Sign in", "I01", "button primary")}</div></nav>`;
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
const gameProfiles = [
  {
    id: "G01",
    name: "Mobile Legends",
    art: "miya",
    services: ["boost", "accounts", "shop", "news"],
    goal: "Make your next ranked chapter count.",
    config: "P04",
  },
  {
    id: "G02",
    name: "World of Warcraft",
    art: "illidan",
    services: ["boost", "accounts", "news"],
    goal: "Your next adventure starts here.",
    config: "G07",
  },
  {
    id: "G03",
    name: "League of Legends",
    art: "ahri",
    services: ["boost", "accounts", "shop", "news"],
    goal: "Find your next competitive edge.",
    config: "G08",
  },
  {
    id: "G04",
    name: "VALORANT",
    art: "ascension",
    services: ["boost", "news"],
    goal: "A clearer path to your next milestone.",
    config: "G09",
    placeholder: true,
  },
  {
    id: "G05",
    name: "Dota 2",
    art: "ascension",
    services: ["boost", "accounts", "news"],
    goal: "Build your next great play.",
    config: "G10",
    placeholder: true,
  },
  {
    id: "G06",
    name: "Wild Rift",
    art: "ascension",
    services: ["boost", "accounts", "news"],
    goal: "Your next chapter on the Rift.",
    config: "G11",
    placeholder: true,
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
      const body = `<img src="assets/${g.art}.jpg" alt="" loading="lazy"><div class="gamecardtop">${g.paused ? chip("Temporarily unavailable", "amber") : ""}${g.placeholder ? '<span class="artnote">Game artwork pending</span>' : ""}</div><div class="gamebottom"><div><h3>${g.name}</h3><div class="capabilities">${g.services.map((x) => chip(serviceNames[x], "neutral")).join("")}</div>${g.paused ? "<p>Services paused. Check back later.</p>" : ""}</div>${g.paused ? "" : '<span class="arrow" aria-hidden="true">↗</span>'}</div>`;
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
  return `<section class="hero discoveryhero"><div class="eyebrow">MANY WORLDS. ONE PLAYORA.</div><h1>Your next level.<br><em>Closer than ever.</em></h1><p>Boost your progress. Find your next account.<br>Discover more of the games you love.</p><span class="scrollhint">Scroll to explore <span aria-hidden="true">↓</span></span></section><section class="section activitysection" aria-label="PLAYORA activity">${metrics()}</section>${sections.map(([label, title, desc, type, caption, items]) => `<section class="section serviceintro intro-${type}"><div class="introcopy"><div class="eyebrow">${label}</div><h2>${title}</h2><p>${desc}</p>${chooseGame()}</div><div class="servicevisual"><div class="visualheading"><span class="orb" aria-hidden="true">${{ boost: "↗", accounts: "⇄", shop: "✦", payments: "◇", news: "≋" }[type]}</span><span>${caption}</span></div>${items.map(([t, d], i) => `<article class="featureline"><span class="featureindex">0${i + 1}</span><div><h3>${t}</h3><p>${d}</p></div></article>`).join("")}</div></section>`).join("")}<section class="section gamedestination" id="gameSelection"><div class="sectionhead"><div><div class="eyebrow">CHOOSE YOUR WORLD</div><h2 tabindex="-1" id="gameSelectionTitle">Every game.<br><em>A new possibility.</em></h2></div><p>Pick your game to see what’s available.<br>Services vary by game.</p></div><p class="quiet">Design catalog · availability and capabilities shown as examples.</p>${gameCards()}</section>`;
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
  return `<div class="gamehub"><section class="hubhero"><img src="assets/${g.art}.jpg" alt=""><div class="hubherocopy">${link("← All games", "P01/games", "textlink")}<div class="eyebrow">YOUR WORLD / PLAYORA</div><h1>${g.name}</h1><p>${g.goal}</p>${g.placeholder ? '<p class="quiet">Art direction placeholder · dedicated game art pending</p>' : ""}${g.paused ? chip("Services temporarily unavailable", "amber") : ""}</div></section><div class="hubmetrics">${metrics(g.id)}</div><nav class="servicechooser" aria-label="Game services"><a href="#${g.id}/all" data-service="all" class="servicefilter" aria-current="true">All services</a>${g.services.map((k) => `<a href="#${g.id}/${k}" class="servicefilter" data-service="${k}">${serviceNames[k]}</a>`).join("")}</nav><div class="hubcontent"><section class="featuredoffers" aria-labelledby="featuredTitle"><div class="sectionhead"><div><div class="eyebrow">IN THE SPOTLIGHT</div><h2 id="featuredTitle">Worth a closer look.</h2></div><span class="quiet">Illustrative promotions</span></div><div class="offergrid">${g.services.map((k) => `<article class="spotlight" data-offer="${k}">${chip({ boost: "Limited quantity", accounts: "Featured listing", shop: "Limited time", news: "Editor’s pick" }[k], "neutral")}<p class="eyebrow">${serviceNames[k]}</p><h3>${{ boost: "A package for your next goal", accounts: "A fresh start, carefully detailed", shop: "A little extra for your next session", news: "What changed in the latest patch" }[k]}</h3><p>${k === "news" ? "Explore the changes and what they mean for your next game." : "Review scope, availability and terms before choosing."}</p><a class="textlink" href="#${g.id}/${k}">Explore ${serviceNames[k].toLowerCase()} ↗</a></article>`).join("")}</div></section><p id="serviceFeedback" class="sr-only" role="status"></p>${g.services
    .map(
      (k) =>
        `<section class="hubservice" data-panel="${k}"><div class="sectionhead"><div><div class="eyebrow">${serviceNames[k]}</div><h2>${descriptions[k][0]}</h2></div><p>${descriptions[k][1]}</p></div><div class="three">${(k ===
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
          )}</div>${k === "boost" && !g.paused ? `<div class="actions">${link("Build a custom boost ↗", g.config, "button primary")}${g.id === "G01" ? link("View a fixed package", "P07", "button") : ""}</div>` : ""}<details class="smallsection"><summary>${k === "boost" ? "Package preview" : k === "accounts" ? "Account listing preview" : k === "shop" ? "Product preview" : "Article preview"} · design details</summary><p>${g.name} / ${serviceNames[k]}. Final catalog content, commercial terms and ${k === "news" ? "editorial publication" : "eligibility"} require approval. This review demonstrates discovery and filtering; it does not place orders.</p></details></section>`,
    )
    .join("")}</div></div>`;
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
    $("canvas").scrollIntoView({ block: "start" });
  }
  if (current.kind !== "game") return;
  const profile = gameProfiles.find((g) => g.id === current.id);
  const selected = profile.services.includes(destination) ? destination : "all";
  document.querySelectorAll("[data-service]").forEach((el) => {
    if (el.dataset.service === selected)
      el.setAttribute("aria-current", "true");
    else el.removeAttribute("aria-current");
  });
  document.querySelectorAll("[data-panel], [data-offer]").forEach((el) => {
    el.hidden =
      selected !== "all" && (el.dataset.panel || el.dataset.offer) !== selected;
  });
  $("serviceFeedback").textContent =
    selected === "all"
      ? "Showing all services and featured offers."
      : `Showing ${serviceNames[selected]} and related featured offers.`;
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
  const head =
    s.kind === "hero" || s.kind === "auth" || s.kind === "game"
      ? ""
      : heading(s);
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
  const next =
    byId.get(decodeURIComponent(location.hash.slice(1).split("/")[0])) ||
    byId.get("X01");
  if (next !== current) {
    current = next;
    stateName = "";
    render();
    $("canvas").focus({ preventScroll: true });
    $("canvas").scrollIntoView({ block: "start" });
  }
  applyDestination();
});
current = byId.get(location.hash.slice(1).split("/")[0]) || screens[0];
render();
applyDestination();
