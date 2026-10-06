/* PLAYORA compose-only branding. No network, storage, recipient or send hooks. */
(function () {
  "use strict";
  const wrapperID = "playora-support-template";
  const messageID = "playora-support-message";
  const headerID = "playora-support-header";
  const footerID = "playora-support-footer";

  function parse(html) {
    const fragment = document.createElement("template");
    fragment.innerHTML = html;
    return fragment;
  }

  function marked(node, id) {
    // Roundcube namespaces IDs when a saved draft is washed and reopened.
    return new RegExp("^(?:v[0-9]+)*" + id + "$").test(node.id);
  }

  function existing(fragment) {
    return Array.from(fragment.content.querySelectorAll("table[id]")).find(
      (node) => marked(node, wrapperID) && !node.closest("blockquote"),
    );
  }

  function part(wrapper, selector, id) {
    return Array.from(wrapper.querySelectorAll(selector)).find((node) =>
      marked(node, id),
    );
  }

  function apply(html) {
    const fragment = parse(html);
    // Never nest the current template; quoted earlier replies remain untouched.
    if (existing(fragment)) return html;
    const shell = parse(
      '<table id="' +
        wrapperID +
        '" role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#182c23;background:#ffffff"><tbody>' +
        '<tr id="' +
        headerID +
        '"><td style="padding:24px;background:#103c2a;border-top:4px solid #42df95"><p style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:2px">PLAYORA</p><p style="margin:8px 0 0;color:#c6e8d7;font-size:13px">A message from your support team</p></td></tr>' +
        '<tr><td id="' +
        messageID +
        '" style="padding:24px;font-size:16px;line-height:1.65;overflow-wrap:anywhere"></td></tr>' +
        '<tr id="' +
        footerID +
        '"><td style="padding:20px 24px;background:#f0f6f2;border-top:1px solid #d8e6de;font-size:13px;line-height:1.6;color:#395747">PLAYORA team<br>Need anything else? Reply to this email.<br><a href="https://playoragames.com" style="color:#147347;text-decoration:underline">playoragames.com</a></td></tr></tbody></table>',
    );
    shell.content.querySelector("#" + messageID).append(fragment.content);
    return shell.innerHTML;
  }

  function remove(html) {
    const fragment = parse(html);
    const wrapper = existing(fragment);
    if (!wrapper) return html;
    // Preserve the current edited message, never a pre-apply snapshot. Unwrap
    // layout nodes, retaining additional text/rows an operator may have added.
    part(wrapper, ":scope > tbody > tr[id]", headerID)?.remove();
    part(wrapper, ":scope > tbody > tr[id]", footerID)?.remove();
    const content = part(wrapper, ":scope > tbody > tr > td[id]", messageID);
    if (content) content.removeAttribute("style");
    for (const node of Array.from(
      wrapper.querySelectorAll("tbody,thead,tfoot,tr,td,th"),
    )
      .filter((node) => node.closest("table") === wrapper)
      .reverse()) {
      // Do not flatten tables authored within the customer's message itself.
      if (content && node !== content && content.contains(node)) continue;
      node.replaceWith(...node.childNodes);
    }
    wrapper.replaceWith(...wrapper.childNodes);
    return fragment.innerHTML;
  }

  // Expose pure DOM transforms for the isolated browser regression harness.
  window.playoraSupportTemplate = Object.freeze({ apply, remove });
  if (!window.rcmail) return;
  let bar,
    button,
    status,
    pending = false,
    timer;
  function editor() {
    return rcmail.editor;
  }
  function update() {
    if (!button || pending) return;
    const ed = editor();
    const rich = ed && ed.is_html();
    const active = rich && existing(parse(ed.get_content({ refresh: false })));
    button.textContent = active
      ? "Remove PLAYORA template"
      : rich
        ? "Apply PLAYORA template"
        : "Use rich text & apply template";
    button.disabled = !ed || !!rcmail.mailvelope_editor;
  }
  function change() {
    const ed = editor();
    if (!ed || rcmail.mailvelope_editor) return;
    if (!ed.is_html()) {
      pending = true;
      button.disabled = true;
      status.textContent = "Opening rich-text editor…";
      timer = window.setTimeout(function () {
        if (!pending) return;
        pending = false;
        status.textContent =
          "The editor is taking too long. Your message is kept; try again when the connection recovers.";
        update();
      }, 20000);
      if (!rcmail.toggle_editor({ html: true })) {
        window.clearTimeout(timer);
        pending = false;
        status.textContent =
          "Your message is unchanged. Enable rich text to use this template.";
        update();
      }
      return;
    }
    const before = ed.get_content({ refresh: false });
    const active = !!existing(parse(before));
    ed.editor.undoManager.transact(function () {
      ed.editor.setContent(active ? remove(before) : apply(before));
      // End with a text caret, not a selected layout table whose floating
      // controls can cover the mobile Send/Save footer.
      const wrapper = existing({ content: ed.editor.getBody() });
      const target =
        (wrapper && part(wrapper, ":scope > tbody > tr > td[id]", messageID)) ||
        ed.editor.getBody();
      ed.editor.selection.setCursorLocation(target, target.childNodes.length);
    });
    ed.editor.nodeChanged();
    ed.editor.setDirty(true);
    ed.editor.fire("change");
    status.textContent = active
      ? "Template removed. Your message and edits are kept."
      : "Template applied. Review your message before sending.";
    update();
    button.focus();
  }
  rcmail.addEventListener("init", function () {
    const container = document.getElementById("composebodycontainer");
    if (!container || document.getElementById("playora-template-tools")) return;
    bar = document.createElement("div");
    bar.id = "playora-template-tools";
    button = document.createElement("button");
    button.type = "button";
    // Elastic's surrounding subject/editor fields explicitly use tabindex=1.
    // Match that group so Tab reaches this control before entering the editor.
    button.tabIndex = 1;
    button.className = "btn btn-secondary";
    button.setAttribute("aria-describedby", "playora-template-status");
    button.addEventListener("click", change);
    status = document.createElement("span");
    status.id = "playora-template-status";
    status.setAttribute("role", "status");
    status.textContent =
      "Add PLAYORA branding around your message. Sending stays manual.";
    bar.append(button, status);
    container.before(bar);
    update();
  });
  rcmail.addEventListener("editor-init", function (event) {
    // Email layout tables are framing, not draggable objects. Keep the normal
    // Table menu available without a floating toolbar covering mobile Send.
    event.config.table_toolbar = "";
    event.config.table_resize_bars = false;
    event.config.object_resizing = "img";
  });
  rcmail.addEventListener("editor-load", function (event) {
    event.ref.editor.on("change undo redo SetContent", update);
    if (pending) {
      window.clearTimeout(timer);
      pending = false;
      change();
    } else update();
  });
})();
