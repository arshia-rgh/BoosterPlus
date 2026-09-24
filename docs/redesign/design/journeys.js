/* Memory-only interaction examples for the design atlas. Never performs real operations. */
const pageDrafts = new Map();
const conversationDrafts = new WeakMap();
let recordScenario = null;
const isAccessLoss = (name) =>
  /Access (lost|removed|revoked)|Reassigned|Unauthorized|Restricted|No access|403|404/i.test(
    name,
  );
function applyDesignState() {
  document.querySelectorAll("[data-state-href]").forEach((el) => {
    el.setAttribute("href", el.dataset.stateHref);
    el.removeAttribute("aria-disabled");
    delete el.dataset.stateHref;
  });
  document.querySelectorAll("[data-state-disabled]").forEach((el) => {
    el.disabled = false;
    delete el.dataset.stateDisabled;
  });
  document
    .querySelectorAll("[data-identity-input][aria-invalid]")
    .forEach((el) => {
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-describedby");
    });

  document.querySelectorAll("[data-state-hidden]").forEach((el) => {
    el.hidden = false;
    delete el.dataset.stateHidden;
  });
  document.querySelectorAll(".designState").forEach((el) => el.remove());
  document.querySelectorAll("[data-original-status]").forEach((el) => {
    el.innerHTML = el.dataset.originalStatus;
    delete el.dataset.originalStatus;
  });
  const s = reviewScreen(),
    ctxNow = panelContext();
  const scenarioKey = ctxNow?.family
    ? `${ctxNow.family.root}/${ctxNow.entity}`
    : "";
  const st =
    recordScenario?.key === scenarioKey
      ? recordScenario.state
      : s.states.find((x) => x.name === stateName);
  const pageHead = document.querySelector(".pagehead");
  if (pageHead) {
    if (pageHead.dataset.originalHeading) {
      pageHead.innerHTML = pageHead.dataset.originalHeading;
      delete pageHead.dataset.originalHeading;
    }
  }
  if (!st || st.name === "Reduced motion") return;
  if (current.id.startsWith("I") && applyIdentityState(st)) return;
  if (pageHead) {
    pageHead.dataset.originalHeading = pageHead.innerHTML;
    pageHead.querySelector("h1").textContent = s.title;
    const p = pageHead.querySelector(":scope > p");
    if (p) p.textContent = "";
  }
  const ctx = panelContext();
  if (ctx?.family && isAccessLoss(st.name))
    document.querySelectorAll(".recordIdentity,.recordTabs").forEach((el) => {
      el.hidden = true;
      el.dataset.stateHidden = "true";
    });
  const status = document.querySelector(".recordIdentity .statusline");
  if (status) {
    status.dataset.originalStatus = status.innerHTML;
    status.innerHTML = chip(st.name, "amber");
  }
  const host =
    document.querySelector("#recordView") ||
    document.querySelector("#gameFlow:not([hidden])") ||
    document.querySelector("#designBody");
  if (!host) return;
  // Keep the owning record/header visible; replace contradictory actionable default content.
  if (current.kind === "game" && host.id === "designBody") {
    host
      .querySelectorAll(".hubservice,.serviceentry,.pinnedoffers")
      .forEach((el) => {
        if (!el.hidden) {
          el.hidden = true;
          el.dataset.stateHidden = "true";
        }
      });
  } else if (
    !["P04", "G07", "G08", "G09", "G10", "G11"].includes(s.id) &&
    !(ctx?.family && ctx.view === "messages" && !isAccessLoss(st.name))
  )
    [...host.children].forEach((el) => {
      if (!el.hidden) {
        el.hidden = true;
        el.dataset.stateHidden = "true";
      }
    });
  if (["P04", "G07", "G08", "G09", "G10", "G11"].includes(s.id))
    host.querySelectorAll(".summary,.actions").forEach((el) => {
      el.hidden = true;
      el.dataset.stateHidden = "true";
    });
  const panel = document.createElement("section");
  panel.className = "card designState";
  panel.setAttribute("role", "status");
  const missingHeading = ![...document.querySelectorAll("#canvas h1")].some(
    (h) => !h.closest("[hidden]"),
  );
  const heading = missingHeading ? "h1" : "h2";
  const risky =
    /unpaid|hold|disabled|unavailable|unverified|expired|processing|pending|failed|conflict|invalid|revoked|denied|access|ineligible|sold|superseded|missing|stale|changed/i.test(
      st.name,
    );
  panel.innerHTML =
    targetedState(s, st, ctx, heading) ||
    `<${heading}>${esc(st.name)}</${heading}><p>${esc(st.copy)}</p>${ctx?.entity ? `<p><strong>${esc(ctx.entity)}</strong> · ${esc(panelRoleNames[ctx.role])}</p>` : ""}${risky ? "<p>This action is unavailable until the stated issue is resolved. Your information remains unchanged.</p><button disabled>Action unavailable</button>" : ""}<div class="actions"><button data-return-default>Return to default preview</button>${ctx?.family ? `<a class="textlink" href="#${ctx.family.parent}">Back to ${esc(ctx.family.label.toLowerCase())}</a>` : ""}</div><p class="quiet">Alternate design state · original draft retained. No records were changed.</p>`;
  host.append(panel);
  panel.querySelector("[data-return-default]").onclick = () => {
    stateName = "";
    recordScenario = null;
    applyDesignState();
    syncReviewControls();
  };
  bindPanelActions();
}
function preservePageDraft() {
  const body = document.querySelector("#designBody");
  if (body && body.dataset.draftKey && !body.querySelector(".recordWorkspace"))
    pageDrafts.set(body.dataset.draftKey, body);
}
function restorePageDraft() {
  const body = document.querySelector("#designBody");
  if (!body || panelContext()?.family || current.kind === "game") return;
  if (
    ["P05", "G12", "G13", "G14", "G15", "G16"].includes(reviewScreen().id) ||
    reviewScreen().id.startsWith("I")
  )
    return;
  const key =
    (location.hash || "#P01") +
    (current.id === "C13"
      ? `/${previewSignedIn ? "customer" : "visitor"}`
      : "");
  body.dataset.draftKey = key;
  const old = pageDrafts.get(key);
  if (old) body.replaceWith(old);
  else pageDrafts.set(key, body);
}
function checkoutKind() {
  const parts = location.hash.split("/");
  if (
    parts.includes("account") ||
    parts[1] === "accounts" ||
    ["P13", "P14"].includes(current.id)
  )
    return "account";
  return "package";
}
function checkoutDesign(s) {
  const account = checkoutKind() === "account",
    kind = account ? "account" : "package";
  const amount = account ? "120.00" : "48.00",
    title = account
      ? "Mythic account · SEA · AC-208"
      : "Rank progress package · Epic II → Legend V";
  const href = (id) =>
    current.kind === "game"
      ? `${current.id}/${account ? "accounts" : "boost"}/${id}`
      : `${id}/${kind}`;
  const back = account ? "P14" : "P08";
  const header = `<section class="card"><p class="eyebrow">${account ? "ACCOUNT PURCHASE" : "FIXED PACKAGE"} · DESIGN EXAMPLE</p><h2>${title}</h2><p>Mobile Legends · USD ${amount} · Unpaid checkout preview</p></section>`;
  if (s.id === "P09")
    return `<div class="content">${header}<section class="card formcard"><h2>Review your payment route</h2><label class="field">Asset and network<select data-checkout-network><option value="">Choose an asset and exact network</option><option>USDT / TRON · illustrative route</option></select></label><label class="field check"><input type="checkbox" data-checkout-consent><span>I reviewed the scope and <a href="#P17/terms">terms</a>, including <a href="#P17/refunds">cancellation and refunds</a>.</span></label><div class="actions"><button class="primary" data-checkout-next="${href("P10")}">Preview payment instructions</button><a href="#${href(back)}">Back to ${account ? "account" : "package"} review</a></div><p data-form-feedback role="status"></p><p class="quiet">No invoice is created and no provider is contacted.</p></section></div>`;
  if (s.id === "P10")
    return `<div class="content">${header}<section class="card"><h2>Waiting for payment · invoice example</h2><p>Example amount: ${amount} USDT · TRON. Confirm the exact provider amount and network in the implemented checkout.</p><div class="copybox">DEMO-ADDRESS-NOT-PAYABLE</div><p>No payable address or QR code exists in this design.</p><p>Payment has not been detected. Do not send a duplicate payment if you already paid.</p><div class="actions"><a class="button" href="#${href("P11")}">Preview confirmation status</a><a href="#${href(back)}">Return to purchase review</a></div><p>For payment problems, keep this purchase reference when contacting support.</p></section></div>`;
  return `<div class="content">${header}<section class="card"><h2>Confirmation pending</h2><p>Provider evidence has not confirmed this purchase. Do not pay again. Fulfillment remains unavailable.</p><div class="actions"><a class="button" href="#${href("P10")}">Back to invoice example</a><a href="#${href(back)}">Return to purchase review</a></div><p class="quiet">This is a status illustration, not a completed payment.</p></section></div>`;
}
// Separate entry surfaces and role-scoped verification; these are not real sessions.
function identityPortal() {
  const parts = location.hash.slice(1).split("/");
  if (current.id === "I09") return "admin";
  if (current.id === "I10") return "booster";
  if (current.id === "I01") return "customer";
  if (current.id.startsWith("I") && ["admin", "booster"].includes(parts[1]))
    return parts[1];
  return "customer";
}
function portalHome(role) {
  return role === "admin" ? "A01" : role === "booster" ? "B01" : "P01";
}
function portalEntry(role) {
  return role === "admin" ? "I09" : role === "booster" ? "I10" : "I01";
}
function destinationRole(origin) {
  const screen = byId.get(origin.split("/")[0]);
  return screen && isAdmin(screen)
    ? "admin"
    : screen?.group === "Booster"
      ? "booster"
      : "customer";
}
function identityReturn() {
  const parts = location.hash.split("/"),
    index = parts.indexOf("return"),
    role = identityPortal();
  if (index >= 0) {
    try {
      const dest = decodeURIComponent(parts[index + 1] || "");
      if (
        byId.has(dest.split("/")[0]) &&
        !dest.startsWith("I") &&
        destinationRole(dest) === role
      )
        return dest;
    } catch {}
  }
  if (current.kind === "game")
    return `${current.id}/${parts[1]}/${parts[3]?.replace("from-", "") || "P05"}`;
  if (current.id === "I07")
    return role === "customer" ? "C17" : `${portalHome(role)}/view/C17`;
  if (current.id === "I08") return "C23/PL-1048/delivery";
  return portalHome(role);
}
function identityHref(id, origin = identityReturn()) {
  const role = destinationRole(origin);
  if (id === "I01") id = portalEntry(role);
  return `${id}${!["I01", "I09", "I10"].includes(id) ? "/" + role : ""}/return/${encodeURIComponent(origin)}`;
}
function unscopedStaffIdentity() {
  return (
    ["I03", "I04", "I05"].includes(current.id) &&
    identityPortal() === "customer"
  );
}
function identityDesign(s) {
  if (unscopedStaffIdentity())
    return `<section class="autharea"><div class="authcard"><div class="eyebrow">PLAYORA / STAFF PORTALS</div><h1>Choose your staff portal</h1><p>Open your assigned portal to verify Google or email, then your authenticator. Customer accounts do not require staff verification and cannot grant staff access.</p><div class="actions"><a class="button" href="#I09">Admin sign-in</a><a class="button" href="#I10">Booster sign-in</a></div><a href="#P01">Back to website</a><p class="quiet">Design preview · No sign-in or role change occurs.</p></div></section>`;

  const role = identityPortal(),
    origin = identityReturn(),
    staff = role !== "customer",
    roleName =
      role === "admin" ? "Admin" : role === "booster" ? "Booster" : "Customer",
    entry = portalEntry(role),
    entryStep = ["I01", "I09", "I10"].includes(s.id),
    google = location.hash.includes("/google/"),
    href = (id) => identityHref(id, origin),
    destination = origin === "P01" ? "C01" : origin;
  const title = google
    ? `Continue with Google · ${roleName.toLowerCase()}`
    : entryStep
      ? `${roleName} sign-in`
      : staff
        ? `${roleName} · ${s.title}`
        : s.title;
  const intro = entryStep
    ? staff
      ? `For authorized ${role === "admin" ? "administrators" : "boosters"} only. Verify with Google or email, then your authenticator. This portal does not create staff access.`
      : "Sign in or create your customer account with Google or a one-time email code. No password needed."
    : s.id === "I02"
      ? "Enter the one-time code sent to your email. Do not enter a real code in this design."
      : s.id === "I03"
        ? "Google or email verification comes first. An authenticator code is required every time you sign in to this portal."
        : s.id === "I05"
          ? "An unused recovery code replaces only the authenticator step. Recent Google or email verification is still required."
          : s.id === "I07"
            ? "Verify the new address before it replaces your current sign-in email."
            : "Verify your identity before continuing. No account or permissions change in this preview.";
  let body = "";
  if (["I03", "I04", "I05"].includes(s.id) && !staff)
    body = `<p>Staff verification belongs to a separate portal. Customer sign-in cannot open a staff workspace.</p><div class="actions"><a href="#I09">Admin sign-in</a><a href="#I10">Booster sign-in</a></div>`;
  else if (s.id === "I04")
    body = `<ol><li>Add PLAYORA ${roleName} to your authenticator using the setup QR or manual key.</li><li>Enter the generated six-digit code to verify setup.</li><li>Save the single-use recovery codes privately.</li></ol><div class="copybox">SETUP QR / MANUAL KEY PLACEMENT · NOT A REAL SECRET</div><label class="field">Example authenticator code<input type="text" inputmode="numeric" autocomplete="one-time-code" data-identity-input></label><details><summary>Recovery-code storage preview</summary><p>Recovery codes appear once after verification. Store them privately before leaving setup.</p><code>DEMO-RECOVERY-NOT-VALID</code></details><label class="field check"><input type="checkbox" data-recovery-saved><span>I understand recovery codes must be saved before leaving setup.</span></label><button class="primary" data-identity-next="${destination}" data-input-kind="enrollment">Preview completed setup and return</button>`;
  else if (google)
    body = `<p>Google opens its own identity screen. Cancellation returns to this ${roleName.toLowerCase()} portal. ${staff ? "An eligible staff role and second factor are required before the workspace opens." : "Successful verification restores your original task."}</p><a class="button primary" data-identity-return="${role}" href="#${staff ? href("I03") : destination}">Preview ${staff ? "eligible identity → authenticator" : "return to your task"}</a><a class="textlink" href="#${href(entry)}">Cancel Google and return to ${roleName.toLowerCase()} sign-in</a>`;
  else if (entryStep)
    body = `<a class="button" href="#${entry}/google/return/${encodeURIComponent(origin)}">Continue with Google · preview</a><div class="divider"></div><label class="field">${staff ? "Work email address" : "Email address"}<input type="email" autocomplete="email" data-identity-input></label><button class="primary" data-identity-next="${href("I02")}" data-input-kind="email">Send email code · preview</button>${staff ? "<details><summary>Need access or help signing in?</summary><p>Contact your PLAYORA administrator through your established staff contact. An existing customer or other staff session does not grant access to this portal. No public staff signup is available.</p></details>" : ""}`;
  else if (["I06", "I08"].includes(s.id))
    body = `<p>Return destination: ${esc(byId.get(origin.split("/")[0])?.title || "your task")}</p><a class="button primary" href="#${href("I01")}">Verify with Google or email</a>`;
  else if (s.id === "I07")
    body = `<label class="field">New email address<input type="email" autocomplete="email" data-identity-input></label><button class="primary" data-identity-next="${href("I02")}" data-input-kind="email">Preview verification email</button>`;
  else
    body = `<label class="field">${s.id === "I02" ? "Email code" : s.id === "I05" ? "Recovery code" : "Authenticator code"}<input type="text" ${s.id === "I05" ? "" : 'inputmode="numeric"'} autocomplete="one-time-code" data-identity-input></label><p>Use a fictional ${s.id === "I05" ? "recovery code" : "six-digit code"} for this preview.</p><button class="primary" data-identity-next="${s.id === "I02" && staff ? href("I03") : destination}" data-input-kind="${s.id === "I05" ? "recovery" : "code"}">${s.id === "I02" && staff ? "Preview eligible identity → authenticator" : "Preview verified return"}</button>${s.id === "I02" ? `<div class="actions"><a href="#${href(entry)}">Change email or request a new code</a></div>` : staff ? `<div class="actions"><a href="#${href(s.id === "I05" ? "I03" : "I05")}">${s.id === "I05" ? "Use authenticator" : "Use a recovery code"}</a></div>${s.id === "I05" ? "<p>No codes left? Contact your administrator for reviewed recovery. Access stays unavailable during review.</p>" : ""}` : ""}`;
  const cancel = staff ? href(entry) : origin;
  return `<section class="autharea"><div class="authcard" data-auth-portal="${role}"><div class="eyebrow">PLAYORA / ${roleName.toUpperCase()} PORTAL</div><h1>${esc(title)}</h1><p>${intro}</p>${staff ? `<p class="quiet">${entryStep ? "Step 1 · Google or email" : s.id === "I02" ? "Step 1 · Email verification" : "Step 2 · Authenticator or recovery"} · ${roleName} access only</p>` : ""}${body}<p data-form-feedback role="status"></p><div class="actions"><a href="#${cancel}">${staff ? "Start over at " + roleName.toLowerCase() + " sign-in" : "Cancel and return to " + esc(byId.get(origin.split("/")[0])?.title || "your task")}</a>${staff ? '<a href="#P01">Leave portal</a>' : ""}</div><p class="quiet">Design journey only. No sign-in, code delivery or account change occurs.</p></div></section>`;
}
function applyIdentityState(st) {
  if (
    /Session expired|Access unavailable|Owner review|Enrollment required|Other portal/i.test(
      st.name,
    )
  )
    return false;
  const box = document.querySelector(".authcard");
  if (!box) return false;
  const waiting = /Loading|Rate limited|Too many attempts/i.test(st.name),
    input = box.querySelector("[data-identity-input]"),
    emailStep = reviewScreen().id === "I02",
    google = /Google/.test(st.name),
    role = identityPortal();
  const messages = {
    Loading: `Checking this ${role} sign-in step… Please wait before trying again.`,
    "Request failed":
      "We couldn’t complete this check. Your place is kept. Try this step again; no sign-in has been completed.",
    "Rate limited":
      "Too many attempts. Please wait before retrying. The retry time will be shown when it is available.",
    "Too many attempts":
      "Verification is temporarily paused. Wait for the retry time from the service; no sign-in has been completed.",
    "Invalid email": "Enter an email address in the format name@example.com.",
    "Google cancelled":
      "Google sign-in was cancelled. Try Google again or use email in this same portal.",
    "Google unavailable":
      "Google sign-in is unavailable. Try again later or use email in this same portal.",
    Expired:
      "This email code expired. Request a new code; your intended destination stays the same.",
    "Already used":
      "This email code was already used. Request a new code to continue securely.",
    "Used or invalid":
      "This recovery code could not be used. Try another unused code, or use your authenticator.",
    "Invalid code":
      "That authenticator code could not be verified. Check your app and enter a current code below.",
    "Wrong code":
      "That email code did not work. Check the code and try again below.",
  };
  const note = document.createElement("section");
  note.className = "designState";
  note.id = "identityStateFeedback";
  note.setAttribute("role", waiting ? "status" : "alert");
  note.innerHTML = `<h2>${esc(st.name)}</h2><p>${esc(messages[st.name] || "This verification step needs attention. Review the details and try again.")}</p>${emailStep && /Expired|Already used/.test(st.name) ? `<a href="#${identityHref(portalEntry(role))}">Request a new email code</a>` : google ? `<a href="#${identityHref(portalEntry(role))}">Choose Google or email again</a>` : ""}<button data-auth-state-reset>${waiting || (emailStep && /Expired|Already used/.test(st.name)) ? "Return to default preview" : "Retry this step · preview"}</button>`;
  box.querySelector("h1").insertAdjacentElement("afterend", note);
  if (input && /Invalid|Wrong|Used or invalid/i.test(st.name)) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", note.id);
  }
  if (waiting || (emailStep && /Expired|Already used/.test(st.name)))
    box.querySelectorAll("[data-identity-next]").forEach((button) => {
      button.disabled = true;
      button.dataset.stateDisabled = "true";
    });
  if (waiting)
    box
      .querySelectorAll(
        'a[href*="/google/"], [data-identity-return], a[href*="/return/"]',
      )
      .forEach((a) => {
        if (a.textContent.startsWith("Start over")) return;
        a.dataset.stateHref = a.getAttribute("href");
        a.removeAttribute("href");
        a.setAttribute("aria-disabled", "true");
      });
  note.querySelector("[data-auth-state-reset]").onclick = () => {
    stateName = "";
    applyDesignState();
    syncReviewControls();
    input?.focus();
  };
  return true;
}
function bindJourneyControls() {
  document.querySelectorAll('[data-identity-return="customer"]').forEach(
    (a) =>
      (a.onclick = (event) => {
        if (a.getAttribute("aria-disabled") === "true") {
          event.preventDefault();
          return;
        }
        previewSignedIn = true;
        $("identityPreview").value = "customer";
      }),
  );
  document.querySelectorAll("[data-checkout-next]").forEach(
    (b) =>
      (b.onclick = () => {
        const box = b.closest(".card"),
          select = box.querySelector("[data-checkout-network]"),
          consent = box.querySelector("[data-checkout-consent]"),
          feedback = box.querySelector("[data-form-feedback]");
        if (!select.value || !consent.checked) {
          feedback.textContent =
            "Choose the exact asset/network and confirm you reviewed the terms.";
          (!select.value ? select : consent).focus();
          return;
        }
        if (b.hasAttribute("data-checkout-demo")) {
          feedback.textContent =
            "Design preview: required choices are complete. A live invoice would be requested next. No provider was contacted.";
        } else location.hash = b.dataset.checkoutNext;
      }),
  );
  document.querySelectorAll("[data-identity-next]").forEach(
    (b) =>
      (b.onclick = () => {
        const box = b.closest(".authcard"),
          input = box.querySelector("[data-identity-input]"),
          value = input.value.trim(),
          kind = b.dataset.inputKind;
        const valid =
          kind === "email"
            ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
            : kind === "code" || kind === "enrollment"
              ? /^\d{6}$/.test(value) &&
                (kind !== "enrollment" ||
                  box.querySelector("[data-recovery-saved]").checked)
              : value.length >= 8;
        if (!valid) {
          box.querySelector("[data-form-feedback]").textContent =
            kind === "email"
              ? "Enter a valid example email address."
              : kind === "code" || kind === "enrollment"
                ? "Enter a six-digit example code and, for setup, confirm recovery-code storage."
                : "Enter an example recovery code with at least eight characters.";
          input.focus();
          return;
        }
        if (kind !== "email" && identityPortal() === "customer") {
          previewSignedIn = true;
          $("identityPreview").value = "customer";
        }
        location.hash = b.dataset.identityNext;
      }),
  );
}
function journeyDestination(to) {
  const ctx = panelContext();
  if (to === "I01" && !ctx) {
    const origin = location.hash.slice(1) || current.id;
    return identityHref("I01", origin);
  }
  if (["P09", "P10", "P11"].includes(to) && !ctx && current.kind !== "game")
    return `${to}/${checkoutKind()}`;
  if (to === "P14" && !ctx && current.kind !== "game")
    return `P14/account${location.hash.includes("/saved") ? "/saved" : ""}`;
  if (["I04", "I07"].includes(to) && ctx)
    return identityHref(to, location.hash.slice(1));
  return null;
}
function refinedBody(s) {
  if (["P09", "P10", "P11"].includes(s.id)) return checkoutDesign(s);
  if (s.id.startsWith("I")) return identityDesign(s);
  if (s.id === "P17") {
    const key = location.hash.split("/")[1] || "terms",
      title =
        {
          terms: "Terms of service",
          privacy: "Privacy policy",
          refunds: "Refund & cancellation terms",
        }[key] || "Terms of service";
    return `<div class="content policy"><nav class="subnav" aria-label="Policies">${[
      ["terms", "Terms"],
      ["privacy", "Privacy"],
      ["refunds", "Refunds & cancellation"],
    ]
      .map(
        ([id, label]) =>
          `<a href="#P17/${id}" ${id === key ? 'aria-current="page"' : ""}>${label}</a>`,
      )
      .join(
        "",
      )}</nav><section class="card"><h2>${title}</h2><p>Publication pending · no effective version yet.</p><p>The owner must approve and publish this policy before customers can accept it. This design does not provide binding legal terms.</p><p>${key === "privacy" ? "Retention periods, data export and deletion conditions will be stated here. Deletion stays disabled until an owner policy is enabled." : key === "refunds" ? "Eligibility, evidence, review timelines and any fees will be stated here before checkout." : "The service scope, responsibilities and dispute process will be stated here before purchase."}</p></section><a href="#P01">Back to PLAYORA</a></div>`;
  }
  if (s.id === "P02")
    return `<section class="section"><div class="filters"><label class="field">Search games<input type="search" data-game-search></label><label class="field">Availability<select data-game-status><option>All games</option><option>Available</option><option>Paused</option></select></label></div><p data-game-count role="status"></p>${gameCards()}<p data-game-empty hidden>No games match. Clear your search or change availability.</p></section>`;
  if (["P12", "C10"].includes(s.id))
    return `<div class="content"><div class="filters"><label class="field">Search accounts<input type="search" data-market-search></label><label class="field">Region<select data-market-region><option>All regions</option><option>SEA</option><option>EU</option><option>NA</option></select></label></div><p data-market-count role="status"></p><div class="productgrid"><article class="productcard" data-market-card><div class="productart"><span>Mythic · Mobile Legends</span></div><div class="productbody"><h2>Mythic account · SEA</h2><p>Listing AC-208 · USD120.00 · fictional example</p><p>Review progression, cosmetics and transfer terms before purchasing.</p><a class="button primary" href="#${current.kind === "game" ? `${current.id}/accounts/P13` : `P13${s.id === "C10" ? "/saved" : ""}`}">View Mythic account AC-208</a></div></article></div><p data-market-empty hidden>No matching example accounts. Clear your search or select All regions.</p></div>`;
  if (["P05", "G12", "G13", "G14", "G15", "G16"].includes(s.id))
    return customReview(s);
  if (s.id === "P13")
    return `<div class="content"><section class="card"><h2>Mythic account · SEA · AC-208</h2><p>Mobile Legends · USD120.00 · fictional example</p><p>Reviewed listing screenshot placement. The exact rank, cosmetics, region and ownership evidence must be available before purchase.</p><p>Supported private handover follows verified payment. No login credentials are displayed here.</p><div class="actions">${link("Review this account purchase", "P14", "button primary")}<a href="#${location.hash.includes("/saved") ? "C10" : current.kind === "game" ? `${current.id}/accounts/P12` : "P12"}">Back to ${location.hash.includes("/saved") ? "saved accounts" : "accounts"}</a></div></section></div>`;
  if (s.id === "P14")
    return `<div class="content"><section class="card"><h2>Mythic account · SEA · AC-208</h2><p>Mobile Legends · USD120.00 · fictional purchase example</p><p>Review account details, eligible region and the transfer procedure. Reservation does not mean ownership has transferred.</p><div class="actions">${link("Review direct crypto checkout", "P09", "button primary")}${link("Back to account details", "P13", "textlink")}</div><p>Real checkout requires published transfer, cancellation and service terms.</p></section></div>`;
  if (s.id === "S02") return sellerIntake(s);
  return null;
}
function refinedRecordBody(ctx) {
  const t = ctx.family.type;
  if (t === "moderation")
    return `<section class="card"><h3>Review REV-12 · Publication held</h3><dl class="recordFacts"><div><dt>Public alias</dt><dd>Example player</dd></div><div><dt>Rating</dt><dd>4 / 5</dd></div><div><dt>Submitted</dt><dd>24 Sep · 14:00 · fictional example</dd></div><div><dt>Related order</dt><dd>PL-1038 · In progress</dd></div></dl><blockquote>“The team kept me updated and arranging a session was straightforward.”</blockquote><p>Original text · no edits recorded. No personal information is present in this example. A low rating alone is not grounds to hide a review.</p><p>Eligibility conflict: the linked order is not completed. Resolve the record mismatch and verify eligibility before publication. Do not change an order merely to publish a review.</p><button disabled>Publish review</button><label class="field">Review note<textarea placeholder="Record the eligibility issue for staff"></textarea></label>${panelDemo("Preview moderation note", "Design preview: the eligibility concern would be recorded for review. Nothing was published.")}<a class="textlink" href="#A03/PL-1038/overview/from-review">Inspect related order PL-1038</a></section>`;
  if (t === "sale") {
    if (ctx.view === "messages") return null;
    const names = {
      overview: "Submission under review",
      offer: "Consignment offer · terms incomplete",
      handover: "Handover is not ready",
      payout: "Payout is not due",
    };
    return `<section class="card"><h3>${names[ctx.view] || "Account sale"}</h3><p>SA-204 · Mobile Legends · Consignment draft</p><p>${ctx.view === "payout" ? "No accepted payout obligation exists yet. This is not a wallet or withdrawable balance." : ctx.view === "handover" ? "Accept a complete offer and verify your identity before account transfer begins. Do not share account secrets in chat." : "Staff must provide the complete sale terms before you can accept this offer."}</p><dl class="recordFacts"><div><dt>Arrangement</dt><dd>Consignment · payout after a buyer receives the account</dd></div><div><dt>Seller proceeds</dt><dd>Not agreed</dd></div><div><dt>Fees</dt><dd>Not agreed</dd></div><div><dt>Payout timing</dt><dd>Not agreed</dd></div><div><dt>Expiry & transfer terms</dt><dd>Not provided</dd></div></dl><button disabled>${ctx.view === "handover" ? "Start secure handover" : ctx.view === "payout" ? "Confirm payout recipient" : "Accept offer"}</button><p>These requirements must be completed before this action becomes available.</p>${panelLocal(ctx, "Ask staff about the terms", "messages", "textlink")}</section>`;
  }
  if (t === "payout" || (t === "submission" && ctx.view === "payout"))
    return `${card("Authorization unavailable", "SA-204 has no accepted amount, due condition or verified recipient in this fixture. Staff must complete and review those terms before authorizing a payout.")}<button disabled>Authorize payout</button><div class="actions"><a href="#A21/SA-204/overview">Review seller submission SA-204</a><a href="#A19">Review reconciliation examples</a></div>`;
  if (t === "privacy" && ctx.view === "overview")
    return `${card("Erasure held · owner retention policy required", "DEL-12 cannot be erased until an owner policy is enabled and active orders, disputes and evidence holds have been reviewed. No irreversible action is available.")}<button disabled>Erase customer data</button><div class="actions"><a href="#A36">Review retention policy</a><a href="#A35">Back to privacy queue</a></div>`;
  if (t === "listing" && ctx.view === "delivery")
    return `${card("No buyer delivery is available", "AC-208 is an unpublished inventory draft. It has no buyer reservation, verified payment or delivery order. Publishing this listing alone never authorizes a transfer.")}<button disabled>Record buyer transfer</button>${panelLocal(ctx, "Back to listing draft", "listing", "textlink")}`;
  return null;
}
function refinedPanelBody(ctx) {
  const s = ctx.screen;
  if (s.id === "I06" && ctx.origin)
    return `<div class="content"><section class="card"><h2>${["A08", "A09"].includes(ctx.origin) ? "Verification layout preview" : "Verify the pending action"}</h2><p>${esc(byId.get(ctx.origin).title)} · ${panelRoleNames[ctx.role]}</p><p>${["A08", "A09"].includes(ctx.origin) ? "No identity or pending change is selected. This is a layout example only. " : ""}Recent Google/email verification and an authenticator or unused recovery code are required. The record and your permissions must be checked again before confirming.</p><a class="button" href="#${identityHref("I01", ctx.origin)}">Preview verification journey</a><a class="textlink" href="#${ctx.origin}">Cancel and return to ${esc(byId.get(ctx.origin).title)}</a><p>No action has been authorized or applied.</p></section></div>`;
  if (s.id === "C17")
    return `<div class="content"><section class="card"><h2>Sign-in methods</h2><dl class="recordFacts"><div><dt>Email</dt><dd>player@example.test · verified example</dd></div><div><dt>Google</dt><dd>Not connected</dd></div></dl><p>Use one-time email codes or Google. There is no password.</p><div class="actions"><a href="#${identityHref("I07", location.hash.slice(1))}">Change email</a>${panelDemo("Preview Google linking", "Design preview: verify both identities before linking. No accounts were linked.")}</div></section>${ctx.role !== "customer" ? `<section class="card"><h2>Staff authenticator</h2><p>Required at every staff sign-in. Sensitive changes require recent first and second factors.</p><a href="#${identityHref("I04", location.hash.slice(1))}">Review authenticator setup</a></section>` : ""}<section class="card"><h2>Your sessions</h2><p>This browser · current session · fictional example</p><p>Another browser · last active yesterday · fictional example</p><details><summary>Revoke the other session</summary><p>That device will need to sign in again. This browser stays signed in.</p>${panelDemo("Confirm revocation · preview", "Design preview: the other session would end. No real session was revoked.")}</details><details><summary>Sign out all devices</summary><p>Every session, including this browser, will end. You will need Google or email to return.</p>${panelDemo("Confirm sign out everywhere · preview", "Design preview: no sessions changed.")}</details></section></div>`;
  if (s.id === "C18")
    return `<div class="content"><section class="card"><h2>Export your data</h2><label class="field">Export category<select><option>Profile</option><option>Orders</option><option>Messages</option><option>Payments</option><option>Submissions</option></select></label>${panelDemo("Preview export request", "Design preview: an export would be prepared privately, with status and expiry shown here. No export was created.", true)}</section><section class="card"><h2>Deletion is currently unavailable</h2><p>An owner-entered retention policy must be published and enabled first. Active orders and disputes remain protected by holds.</p><button disabled>Request account deletion</button><div class="actions"><a href="#P17/privacy">Read privacy policy status</a><a href="#C13">Contact support</a></div></section></div>`;
  if (s.id === "C15")
    return `<div class="content"><section class="card"><h2>No completed orders to review yet</h2><p>Your active order PL-1038 is still in progress. Reviews become available after completion.</p><button disabled>Write a review</button><a href="#C05/PL-1038/progress">Track PL-1038</a></section></div>`;
  if (s.id === "C20")
    return `<div class="content"><section class="card"><h2>Your availability alert</h2><p>Mobile Legends · rank progress package · email alert example</p><p>One notification when the selected package becomes available. Availability is not guaranteed.</p><a href="#C21">Review unsubscribe for this package</a></section></div>`;
  if (s.id === "C21")
    return `<div class="content"><section class="card"><h2>Unsubscribe from this alert?</h2><p>Mobile Legends · rank progress package · example email alert</p><p>This removes only this availability notification. Order and security messages continue.</p>${panelDemo("Confirm unsubscribe · preview", "Design preview: this alert would be removed. Nothing was changed.", true)}<a href="#C20">Keep alert and return</a></section></div>`;
  if (s.id === "C19" || s.id === "C22")
    return `<div class="content"><section class="card formcard"><h2>${s.id === "C19" ? "Your preferences" : "Your public display name"}</h2><p>${s.id === "C19" ? "Choose optional notifications and how PLAYORA looks and sounds. Order and security notices remain available." : "Your display name appears in your profile and conversations. It does not change your verified sign-in identity."}</p>${fields(s)}${panelDemo("Save changes · preview", "Your example choices are retained in this browser preview until reload. No account was changed.", true)}</section></div>`;
  if (s.id === "C13")
    return `<div class="content"><section class="card formcard"><h2>Contact PLAYORA support</h2><p>Describe your question. Never send passwords, recovery codes or payment secrets.</p>${fields(s)}${previewSignedIn ? '<label class="field">Related item<select><option>General question</option><option>PL-1042 · Custom quote</option><option>PL-1038 · Active boost</option><option>PL-1048 · Account delivery</option><option>SA-204 · Account sale</option></select></label><button class="primary" data-support-preview>Preview support request</button>' : `<a class="button primary" href="#${identityHref("I01", "C13")}">Sign in to send your request</a>`}<p data-form-feedback role="status"></p></section></div>`;
  return null;
}
function sellerIntake(s) {
  return `<div class="content"><section class="card formcard" data-intake><a class="textlink" href="#${current.kind === "game" ? `${current.id}/accounts` : "S01"}">← Back to ${current.kind === "game" ? "accounts" : "my sales"}</a><h2>Account details for review</h2><p>Tell us what you own. Staff review eligibility before proposing complete sale terms.</p>${fields(s)}<p><a href="#P17/terms">Submission terms · publication status</a></p><button class="primary" data-intake-review>Review submission</button><p data-form-feedback role="status"></p><div data-intake-summary hidden></div></section></div>`;
}
const customChoices = new Map();
function customKey() {
  if (current.kind === "game") return current.id;
  const game = gameProfiles.find(
    (g) =>
      g.config === current.id ||
      { G07: "G12", G08: "G13", G09: "G14", G10: "G15", G11: "G16" }[
        g.config
      ] === current.id,
  );
  return game?.id || "G01";
}
function customReview() {
  const values = customChoices.get(customKey()) || {};
  return `<div class="content"><section class="card"><h2>Review your requested scope</h2>${
    Object.keys(values).length
      ? `<dl class="recordFacts">${Object.entries(values)
          .map(
            ([name, value]) =>
              `<div><dt>${esc(name)}</dt><dd>${esc(value || "No preference")}</dd></div>`,
          )
          .join("")}</dl>`
      : "<p>No configured request selected. Return to the form to choose your scope.</p>"
  }<p>Final scope and price require staff review. No payment is due when submitting a request.</p><div class="actions">${link("Back to edit request", gameProfiles.find((g) => g.id === customKey())?.config || "P04", "button")}${Object.keys(values).length ? (!previewSignedIn ? `<a class="button primary" href="#${identityHref("I01", location.hash.slice(1))}">Sign in to send request</a>` : panelDemo("Preview request submission", "Design preview: staff would review this requested scope before issuing a final quote. No request was submitted.", true)) : "<button disabled>Submit request</button>"}</div></section></div>`;
}
function bindRefinedForms() {
  const gameSearch = document.querySelector("[data-game-search]");
  if (gameSearch) {
    const status = document.querySelector("[data-game-status]");
    const update = () => {
      let count = 0;
      document.querySelectorAll(".discoverygames .gamecard").forEach((el) => {
        const paused = el.classList.contains("gamepaused");
        el.hidden = !(
          el.textContent
            .toLowerCase()
            .includes(gameSearch.value.toLowerCase()) &&
          (status.value === "All games" ||
            (status.value === "Paused" ? paused : !paused))
        );
        if (!el.hidden) count++;
      });
      document.querySelector("[data-game-count]").textContent =
        `${count} matching games`;
      document.querySelector("[data-game-empty]").hidden = count > 0;
    };
    gameSearch.oninput = update;
    status.onchange = update;
    update();
  }
  const search = document.querySelector("[data-market-search]");
  if (search) {
    const region = document.querySelector("[data-market-region]");
    const update = () => {
      const match =
        "mythic mobile legends sea ac-208".includes(
          search.value.toLowerCase(),
        ) && ["All regions", "SEA"].includes(region.value);
      document.querySelector("[data-market-card]").hidden = !match;
      document.querySelector("[data-market-empty]").hidden = match;
      document.querySelector("[data-market-count]").textContent = match
        ? "1 matching account"
        : "0 matching accounts";
    };
    search.oninput = update;
    region.onchange = update;
    update();
  }
  const intake = document.querySelector("[data-intake]");
  if (intake)
    intake.querySelector("[data-intake-review]").onclick = () => {
      const inputs = [
          ...intake.querySelectorAll(
            'input:not([type="file"]),textarea,select',
          ),
        ],
        missing = inputs.find((i) =>
          i.type === "checkbox" ? !i.checked : !i.value.trim(),
        );
      const feedback = intake.querySelector("[data-form-feedback]");
      if (missing) {
        feedback.textContent =
          "Complete the account details and ownership confirmation before reviewing.";
        missing.focus();
        return;
      }
      const summary = intake.querySelector("[data-intake-summary]");
      summary.hidden = false;
      summary.innerHTML = `<h3>Review this submission</h3><dl class="recordFacts">${inputs
        .filter((i) => i.type !== "checkbox")
        .map(
          (i) =>
            `<div><dt>${esc(i.closest("label").querySelector("span")?.textContent || "Detail")}</dt><dd>${esc(i.value)}</dd></div>`,
        )
        .join(
          "",
        )}</dl><p>Ownership evidence must be provided privately in the implemented flow. Staff will review before any sale offer. Submission terms remain unpublished in this design.</p><button disabled>Submit account</button><p>Submission becomes available after published terms and required evidence are available.</p>`;
      feedback.textContent =
        "Review your details below. Edit the fields and review again to update them.";
    };
  document.querySelectorAll("[data-support-preview]").forEach(
    (b) =>
      (b.onclick = () => {
        const card = b.closest(".card"),
          subject = card.querySelector('input[type="text"]'),
          message = card.querySelector("textarea");
        const valid = subject.value.trim() && message.value.trim();
        card.querySelector("[data-form-feedback]").textContent = valid
          ? "Design preview: your selected topic and related item would stay attached to this conversation. No message was sent."
          : "Enter a subject and message before continuing.";
        if (!valid) (!subject.value.trim() ? subject : message).focus();
      }),
  );
  if (["P04", "G07", "G08", "G09", "G10", "G11"].includes(reviewScreen().id)) {
    const host =
      document.querySelector("#gameFlow:not([hidden])") ||
      document.querySelector("#designBody");
    const inputs = [
      ...host.querySelectorAll(
        ".formcard input,.formcard textarea,.formcard select",
      ),
    ];
    const update = () => {
      const values = {};
      inputs.forEach((i) => {
        const label = i.closest("label");
        if (label)
          values[
            label.dataset.fieldLabel ||
              label.querySelector("span")?.textContent ||
              "Choice"
          ] = i.type === "checkbox" ? String(i.checked) : i.value;
      });
      customChoices.set(customKey(), values);
      const summary = host.querySelector(".summary");
      if (summary && customKey() === "G01")
        summary.innerHTML = `<div class="eyebrow">YOUR REQUEST</div><h2>Mobile Legends</h2><dl>${Object.entries(
          values,
        )
          .filter(([key]) =>
            ["Region", "Current rank", "Target rank", "Play mode"].includes(
              key,
            ),
          )
          .map(
            ([key, value]) =>
              `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`,
          )
          .join(
            "",
          )}</dl><p>Staff estimate required</p><p>Your final price follows a review of these choices.</p>${link("Review request", "P05", "button primary")}`;
      const invalid =
        values["Current rank"] &&
        values["Target rank"] &&
        { "Epic II": 0, "Legend V": 1, Mythic: 2 }[values["Target rank"]] <=
          { "Epic II": 0, "Legend V": 1, Mythic: 2 }[values["Current rank"]];
      let error = host.querySelector("[data-goal-error]");
      if (!error) {
        error = document.createElement("p");
        error.dataset.goalError = "";
        error.setAttribute("role", "status");
        host.prepend(error);
      }
      error.textContent = invalid
        ? "Choose a target rank above your current rank before reviewing."
        : "";
      host.querySelectorAll('a[href*="P05"]').forEach((a) => {
        if (invalid) {
          a.setAttribute("aria-disabled", "true");
          a.onclick = (e) => {
            e.preventDefault();
            error.textContent = "Choose a higher target rank to continue.";
          };
        } else {
          a.removeAttribute("aria-disabled");
          a.onclick = null;
        }
      });
      const hero = inputs.find(
        (i) => i.closest("label")?.dataset.fieldLabel === "Hero",
      );
      if (hero) {
        const single = values["Single hero"] === "Choose hero";
        hero.closest("details").hidden = !single;
      }
    };
    inputs.forEach((i) => {
      i.onchange = update;
      i.oninput = update;
    });
    update();
  }
  const audience = document.querySelector("#audience");
  if (audience) {
    const update = () => {
      const internal = audience.value.startsWith("Internal"),
        composer = audience.closest(".composer");
      const nextAudience = internal ? "internal" : "participant";
      const previousAudience = composer.dataset.activeAudience || "participant";
      const draft = composer.querySelector("#messageDraft");
      let drafts = conversationDrafts.get(composer);
      if (!drafts) {
        drafts = new Map();
        conversationDrafts.set(composer, drafts);
      }
      if (previousAudience !== nextAudience) {
        drafts.set(previousAudience, draft.value);
        draft.value = drafts.get(nextAudience) || "";
      }
      composer.dataset.activeAudience = nextAudience;
      composer.classList.toggle("internalNote", internal);
      composer.querySelector('label[for="messageDraft"]').textContent = internal
        ? "Internal note · staff only"
        : panelContext()?.family?.type === "submission"
          ? "Reply to seller"
          : location.hash.endsWith("/booster")
            ? "Reply to customer and assigned booster"
            : "Reply to customer";
      document.querySelector("#sendDemo").textContent = internal
        ? "Add internal note · demo"
        : "Send reply · demo";
      document.querySelector("#chatFeedback").textContent = internal
        ? "Only authorized support/admin staff can see this note. Customers, sellers and boosters cannot see it."
        : location.hash.endsWith("/booster")
          ? "Visible to the customer and assigned booster in this thread."
          : "Visible to the named customer or seller; not the booster.";
    };
    audience.onchange = update;
    update();
  }
}
function targetedState(s, st, ctx, h) {
  const reset =
    "<button data-return-default>Return to default preview</button>";
  const title = `<${h}>${esc(st.name)}</${h}>`;
  if (s.id.startsWith("I")) {
    const role = identityPortal(),
      entry = identityHref(portalEntry(role)),
      name = role === "customer" ? "customer" : role;
    const action =
      /Enrollment required/i.test(st.name) && role !== "customer"
        ? `<a class="button" href="#${identityHref("I04")}">Set up your ${name} authenticator</a>`
        : `<a class="button" href="#${entry}">Return to ${name} sign-in</a>`;
    return `${title}<p>${esc(st.copy)}</p><p>${name === "customer" ? "Customer" : name === "admin" ? "Admin" : "Booster"} portal · no session or new access has been granted.</p>${action}<div class="actions">${reset}</div>`;
  }
  if (ctx?.family && isAccessLoss(st.name))
    return `${title}<p>This record is no longer available in your workspace. Its details and conversation are hidden.</p><a class="button" href="#${ctx.family.parent}">Back to ${esc(ctx.family.label.toLowerCase())}</a><div class="actions">${reset}</div>`;
  if (ctx?.family && ctx.view === "messages")
    return `${title}<p>${esc(ctx.entity)} remains in this scenario while you use Messages. The conversation above stays attached to this record.</p>${reset}`;
  if (ctx?.role === "customer" && ctx.family?.type === "order") {
    const id = ctx.entity;
    if (/Completed/.test(st.name))
      return `${title}<p>${id} · Agreed goal: Epic II → Legend V. Final milestone: Legend V reached (fictional scenario).</p><details><summary>Completion evidence</summary><p>Final milestone report and private proof placement. No real player media is present.</p></details><label class="field">Your review<textarea placeholder="Describe your experience"></textarea></label>${panelDemo("Preview review submission", "Design preview: this review would be moderated after completion. No review was submitted.", true)}<div class="actions">${panelLocal(ctx, "Ask about this completed order", "messages", "textlink")}${reset}</div>`;
    if (/Delivery ready/.test(st.name))
      return `${title}<p>${id} · Account purchase · USD120.00 verified in this fictional scenario.</p><ol><li>Verify your Google or email identity.</li><li>Open the private transfer instructions.</li><li>Check that access and the agreed account details match.</li><li>Acknowledge only after those checks succeed, or report an issue.</li></ol><a class="button" href="#${identityHref("I08", panelHref(ctx, "delivery"))}">Review secure verification</a><button disabled>Acknowledge receipt after access check</button><div class="actions">${panelLocal(ctx, "Report a delivery issue", "messages", "textlink")}${reset}</div>`;
    if (/Expired|Superseded/i.test(st.name))
      return `${title}<p>${id} · This quote cannot be accepted or paid. Ask support for the latest reviewed scope and price.</p><button disabled>Checkout unavailable</button><div class="actions">${panelLocal(ctx, "Request an updated quote", "messages", "button")}${reset}</div>`;
  }
  if (["P09", "P10", "P11"].includes(s.id)) {
    const account = checkoutKind() === "account";
    const back =
      current.kind === "game"
        ? `${current.id}/${account ? "accounts" : "boost"}/${account ? "P14" : "P08"}`
        : `${account ? "P14/account" : "P08/package"}`;
    const text = /expired/i.test(st.name)
      ? "This invoice expired. Do not send funds to its old address. If you already sent funds, contact support and wait for reconciliation before considering another payment."
      : /confirm|detect|paid|processing/i.test(st.name)
        ? "Payment evidence is being checked. Do not send a second payment. Fulfillment waits for verified confirmation."
        : /paused|unavailable/i.test(st.name)
          ? "New checkout is unavailable. Existing payments continue to be checked. Keep your purchase reference and try again later."
          : "This payment requires review. Keep the purchase reference and any existing transaction details; do not send a duplicate payment.";
    return `${title}<p><strong>${account ? "AC-208 · Mythic account · SEA · USD120.00" : "Rank progress package · Epic II → Legend V · USD48.00"}</strong></p><p>${text}</p><div class="actions"><a href="#${back}">Return to this purchase review</a><a href="#C13">Contact payment support</a>${reset}</div><p>No payable address is displayed in this state.</p>`;
  }
  if (["P04", "G07", "G08", "G09", "G10", "G11"].includes(s.id))
    return `${title}<p>${/price|estimate/i.test(st.name) ? "A reliable price is not available for this request. No amount is due. Review your choices or ask staff for an estimate." : "Check the selected goals and required details before continuing. Your entered choices remain below."}</p><div class="actions"><a href="#C13">Ask staff about this request</a><button data-return-default>Return to editing with my choices</button></div>`;
  if (
    ctx?.role === "admin" &&
    ["case", "payout", "privacy"].includes(ctx.family?.type)
  )
    return `${title}<p>${ctx.entity} · ${ctx.family.type === "privacy" ? "Erasure remains unavailable until policy and holds permit it." : "No outgoing transfer is authorized in this state. Verify the accepted obligation, recipient and any existing provider evidence before acting."}</p><button disabled>${ctx.family.type === "privacy" ? "Erasure unavailable" : "Authorization unavailable"}</button><div class="actions"><a href="#${ctx.family.type === "privacy" ? "A36" : "A19"}">${ctx.family.type === "privacy" ? "Review retention policy" : "Review reconciliation"}</a>${reset}</div>`;
  return null;
}
