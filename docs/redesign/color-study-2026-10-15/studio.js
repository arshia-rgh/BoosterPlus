const frame = document.getElementById("product-frame");
const options = {
  "green-champagne": {
    name: "Green + champagne",
    accent: "#E7C78A",
    copy: "Your current green backgrounds, cards and buttons. Champagne adds warmth to selected headlines, service icons and navigation details.",
  },
  current: {
    name: "Current theme",
    accent: "#B8F776",
    copy: "Your existing green theme, unchanged. Switch to Green + champagne to compare only the accent details on the same page.",
  },
};
const pages = {
  boost: {
    name: "Boost packages",
    path: "playoragames.com/games/mobile-legends · Boosting",
    sections: [
      ["top", "Game hero"],
      ["game-grid", "Packages ↓"],
    ],
  },
  states: {
    name: "Chat & states",
    path: "Design samples · Chat, alerts & verification",
    sections: [["top", "Top"]],
  },
  home: {
    name: "Homepage",
    path: "playoragames.com",
    sections: [
      ["top", "Top"],
      ["services", "Service sections ↓"],
      ["games", "Game selection ↓"],
    ],
  },
  game: {
    name: "MLBB services",
    path: "playoragames.com/games/mobile-legends",
    sections: [
      ["top", "Game hero"],
      ["game-grid", "Service cards ↓"],
    ],
  },
  customer: {
    name: "Customer panel",
    path: "playoragames.com/account",
    sections: [["top", "Overview"]],
  },
  admin: {
    name: "Admin panel",
    path: "admin.playoragames.com/orders",
    sections: [["top", "Order queue"]],
  },
  booster: {
    name: "Pro panel",
    path: "pro.playoragames.com/orders",
    sections: [["top", "Assigned work"]],
  },
};
const query = new URLSearchParams(location.search);
let palette = Object.hasOwn(options, query.get("palette"))
  ? query.get("palette")
  : "green-champagne";
let page = Object.hasOwn(pages, query.get("page")) ? query.get("page") : "home";
let size = query.get("size") === "mobile" ? "mobile" : "desktop";
function update(reload = false) {
  document.documentElement.style.setProperty(
    "--accent",
    options[palette].accent,
  );
  document
    .querySelectorAll("[data-palette]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.palette === palette)),
    );
  document
    .querySelectorAll("[data-page]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.page === page)),
    );
  document
    .querySelectorAll("[data-size]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.size === size)),
    );
  document.getElementById("direction-copy").textContent = options[palette].copy;
  document.getElementById("palette-hex").textContent =
    palette === "current"
      ? "Original green palette"
      : "Original green + #E7C78A";
  document.getElementById("preview-path").textContent = pages[page].path;
  document.getElementById("screen-status").textContent =
    options[palette].name +
    " · " +
    pages[page].name +
    " · " +
    (size === "mobile" ? "Phone" : "Desktop");
  document
    .querySelector(".frame-wrap")
    .classList.toggle("mobile", size === "mobile");
  frame.title =
    "PLAYORA " +
    pages[page].name +
    " — " +
    options[palette].name +
    " color preview";
  const controls = document.querySelector(".section-options");
  controls.replaceChildren(
    ...pages[page].sections.map(([key, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.section = key;
      b.textContent = label;
      return b;
    }),
  );
  if (reload)
    frame.src = "/screen.html?" + new URLSearchParams({ page, palette });
  else
    frame.contentWindow?.postMessage(
      { type: "palette", value: palette },
      location.origin,
    );
  history.replaceState(
    null,
    "",
    "?" + new URLSearchParams({ palette, page, size }),
  );
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.palette) {
    palette = b.dataset.palette;
    update();
  }
  if (b.dataset.page) {
    page = b.dataset.page;
    update(true);
  }
  if (b.dataset.size) {
    size = b.dataset.size;
    update();
  }
  if (b.dataset.section)
    frame.contentWindow?.postMessage(
      { type: "section", value: b.dataset.section },
      location.origin,
    );
});
frame.addEventListener("load", () =>
  frame.contentWindow?.postMessage(
    { type: "palette", value: palette },
    location.origin,
  ),
);
update(true);
