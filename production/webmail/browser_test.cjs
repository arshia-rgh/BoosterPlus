const {
  chromium,
  expect,
} = require("../../frontend/node_modules/@playwright/test");
const fs = require("fs");
const path = require("path");
const root = process.env.WEBMAIL_TEST_DIRECTORY;
if (!root || !path.isAbsolute(root))
  throw Error(
    "Set WEBMAIL_TEST_DIRECTORY to a private synthetic fixture directory",
  );
const login = JSON.parse(fs.readFileSync(path.join(root, "login.json")));
if (login.address !== "support@qualification.test")
  throw Error("Synthetic mailbox only");
(async () => {
  const browser = await chromium.launch({
    headless: process.env.WEBMAIL_HEADED !== "true",
    args: ["--host-resolver-rules=MAP mail.playoragames.com 127.0.0.1"],
  });
  const results = [];
  for (const [label, width, height] of [
    ["desktop", 1366, 900],
    ["tablet", 768, 1024],
    ["mobile", 375, 812],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    let sends = 0;
    page.on("dialog", (d) => d.accept());
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (
        (r.url().includes("_action=send") ||
          r.postData()?.includes("_action=send")) &&
        !(
          /(?:^|&)_draft=1(?:&|$)/.test(r.postData() || "") ||
          /name="_draft"\r\n\r\n1\r\n/.test(r.postData() || "")
        )
      )
        sends++;
    });
    await page.goto("https://mail.playoragames.com:19443", {
      waitUntil: "networkidle",
    });
    await page.locator("[name=_user]").fill(login.address);
    await page.locator("[name=_pass]").fill(login.password);
    await page.locator("button[type=submit]").click();
    await page.waitForURL(/_task=mail/);
    await page.goto(
      "https://mail.playoragames.com:19443/?_task=mail&_action=compose",
      { waitUntil: "networkidle" },
    );
    await expect(page.locator("#playora-template-tools")).toBeVisible();
    await page.locator("#_to").fill("customer@qualification.test");
    await page.locator("#_to").press("Tab");
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles({
        name: "fixture.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Synthetic attachment only"),
      });
    await expect(page.locator("#attachment-list")).toContainText("fixture.txt");
    await page
      .locator("#compose-subject")
      .fill("Synthetic support template review");
    await page
      .locator("#composebody")
      .fill(
        "Hello Alex,\n\nWe have received your question. Here are the next steps.\n\nThank you,\nPLAYORA support",
      );
    const button = page.locator("#playora-template-tools button");
    await expect(button).toHaveText("Use rich text & apply template");
    await page.locator("#compose-subject").focus();
    for (
      let i = 0;
      i < 20 && !(await button.evaluate((e) => e === document.activeElement));
      i++
    )
      await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(button).toHaveText("Remove PLAYORA template", {
      timeout: 20000,
    });
    const content = () =>
      page.evaluate(() => rcmail.editor.get_content({ refresh: false }));
    await expect.poll(content).toContain("We have received your question.");
    await expect(page.locator("#compose-subject")).toHaveValue(
      "Synthetic support template review",
    );
    await expect(page.locator("#playora-template-status")).toContainText(
      "Review your message",
    );
    await page.screenshot({
      path: root + "/template-" + label + ".png",
      fullPage: true,
    });
    await page
      .frameLocator("iframe.tox-edit-area__iframe")
      .locator("#playora-support-message")
      .click();
    await page.keyboard.press("End");
    await page.keyboard.type(
      " This edit was added after applying the template.",
    );
    await button.click();
    await expect(button).toHaveText("Apply PLAYORA template");
    await expect
      .poll(content)
      .toContain("This edit was added after applying the template.");
    if ((await content()).includes("A message from your support team"))
      throw Error("Branding not removed");
    await button.click();
    await expect(button).toHaveText("Remove PLAYORA template");
    const counts = await page.evaluate(
      () =>
        rcmail.editor.editor
          .getBody()
          .querySelectorAll("#playora-support-template").length,
    );
    if (counts !== 1) throw Error("Duplicate template");
    await page.evaluate(() => rcmail.editor.editor.undoManager.undo());
    await expect(button).toHaveText("Apply PLAYORA template");
    await page.evaluate(() => rcmail.editor.editor.undoManager.redo());
    await expect(button).toHaveText("Remove PLAYORA template");
    await page.locator("a.draft:visible").click();
    await expect
      .poll(() => page.evaluate(() => rcmail.env.draft_id), { timeout: 15000 })
      .toBeTruthy();
    const draftID = await page.evaluate(() => rcmail.env.draft_id);
    await page.goto(
      "https://mail.playoragames.com:19443/?_task=mail&_action=compose&_draft_uid=" +
        encodeURIComponent(draftID) +
        "&_mbox=Drafts",
      { waitUntil: "networkidle" },
    );
    fs.writeFileSync(root + "/reloaded-" + label + ".html", await content());
    await expect(button).toHaveText("Remove PLAYORA template");
    await expect
      .poll(content)
      .toContain("This edit was added after applying the template.");
    await expect(page.locator("#attachment-list")).toContainText("fixture.txt");
    await expect(page.locator("#compose_to")).toContainText(
      "customer@qualification.test",
    );
    await page.screenshot({
      path: root + "/saved-" + label + ".png",
      fullPage: true,
    });
    if (label === "desktop") {
      await page
        .frameLocator("iframe.tox-edit-area__iframe")
        .locator("body")
        .click();
      await page.keyboard.press("ArrowRight");
      await page.evaluate(() =>
        document.documentElement.classList.add("dark-mode"),
      );
      await page.screenshot({
        path: root + "/template-dark.png",
        fullPage: true,
      });
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    if (overflow) throw Error("Page overflow " + label);
    if (sends || errors.length) throw Error(JSON.stringify({ sends, errors }));
    results.push({
      label,
      template: true,
      editsPreserved: true,
      undoRedo: true,
      manualSend: true,
      recipientAttachmentPreserved: true,
      draftReload: true,
      keyboard: true,
      overflow: false,
    });
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://mail.playoragames.com:19443", {
    waitUntil: "networkidle",
  });
  await page.locator("[name=_user]").fill(login.address);
  await page.locator("[name=_pass]").fill(login.password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/_task=mail/);
  await page.goto(
    "https://mail.playoragames.com:19443/?_task=mail&_action=compose",
    { waitUntil: "networkidle" },
  );
  await page
    .locator("#composebody")
    .fill("Preserve this synthetic text during conversion failures.");
  page.once("dialog", (d) => d.dismiss());
  await page.locator("#playora-template-tools button").click();
  await expect(page.locator("#composebody")).toHaveValue(
    "Preserve this synthetic text during conversion failures.",
  );
  await expect(page.locator("#playora-template-status")).toContainText(
    "unchanged",
  );
  await page.route("**/*_action=text2html*", (route) => route.abort());
  await page.locator("#playora-template-tools button").click();
  await expect(page.locator("#playora-template-status")).toContainText(
    "taking too long",
    { timeout: 25000 },
  );
  await expect(page.locator("#composebody")).toHaveValue(
    "Preserve this synthetic text during conversion failures.",
  );
  await expect(page.locator("#playora-template-tools button")).toBeEnabled();
  await page.unroute("**/*_action=text2html*");
  await page.locator("#playora-template-tools button").click();
  await expect(page.locator("#playora-template-tools button")).toHaveText(
    "Remove PLAYORA template",
    { timeout: 15000 },
  );
  results.push({
    conversionCancelPreservesText: true,
    conversionFailurePreservesText: true,
    retry: true,
  });
  await context.close();
  await browser.close();
  fs.writeFileSync(
    root + "/browser-result.json",
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results));
})().catch((e) => {
  console.error(e.stack.slice(0, 1800));
  process.exit(1);
});
