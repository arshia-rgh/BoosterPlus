import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixture } from "./identity-fixtures";

// These are isolated published presentation templates, not live offers or prices.
for (const game of ["mlbb", "wow", "lol", "valorant", "dota", "wildrift"]) {
  test(`${game} configuration validates its published fields inside the persistent game shell`, async ({
    page,
  }, info) => {
    const slug = fixture(info.project.name, `discovery_${game}`);
    await page.goto(`/games/${slug}/services/boost`);
    const heading = page.getByRole("heading", { level: 1 });
    const identity = await heading.textContent();
    const mode = page.getByLabel("Mode (required)");
    if (game === "wildrift") {
      await expect(
        page.getByText("Ordering is paused for this game."),
      ).toBeVisible();
      await expect(mode).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "Continue to order information →" }),
      ).toBeDisabled();
    } else {
      await heading.evaluate((element) => {
        element.setAttribute("data-configuration-identity", "original");
      });
      await page
        .getByRole("button", { name: "Continue to order information →" })
        .click();
      await expect(
        page.getByText("This field is required.", { exact: true }),
      ).toBeVisible();
      await expect(page).not.toHaveURL(/step=review/);
      await expect(mode).toBeFocused();
      await expect(mode).toHaveAttribute("aria-invalid", "true");
      await expect(
        page.getByRole("link", { name: "Mode: This field is required." }),
      ).toBeVisible();
      await mode.selectOption("solo");
      await page
        .getByRole("button", { name: "Continue to order information →" })
        .click();
      await expect(page).toHaveURL(/step=review/);
      await expect(heading).toHaveAttribute(
        "data-configuration-identity",
        "original",
      );
      await expect(heading).toHaveText(identity ?? "");
      await expect(
        page.getByRole("complementary", { name: "Selection summary" }),
      ).toContainText("Solo");
      await page
        .getByRole("button", { name: "Check selections", exact: true })
        .click();
      await expect(
        page.getByRole("link", { name: "Sign in and complete verification" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Edit choices", exact: true })
        .click();
      await expect(mode).toHaveValue("solo");
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
