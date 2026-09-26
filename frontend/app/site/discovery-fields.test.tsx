import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { HomeDiscoveryFields, PolicyFields } from "./discovery-fields";
import { defaultHome, homeDiscoverySchema, legalSchema } from "./model";
it("preserves existing home content and publishes only explicitly enabled section copy", () => {
  const { container } = render(<HomeDiscoveryFields data={defaultHome} />);
  const field = () =>
    container.querySelector<HTMLInputElement>(
      'input[name="discovery_content"]',
    );
  expect(field()?.value).toBe("{}");
  fireEvent.click(screen.getByLabelText("Use reviewed service introductions"));
  for (const kind of ["boost", "accounts", "shop", "payment", "news"]) {
    fireEvent.change(screen.getByLabelText(`${kind} section title`), {
      target: { value: `Reviewed ${kind}` },
    });
    fireEvent.change(screen.getByLabelText(`${kind} section description`), {
      target: { value: `Approved description of ${kind}.` },
    });
  }
  const data = homeDiscoverySchema.parse(
    JSON.parse(field()?.value ?? "null") as unknown,
  );
  expect(data.introductions?.map((i) => i.kind)).toEqual([
    "boost",
    "accounts",
    "shop",
    "payment",
    "news",
  ]);
  expect(data.metrics).toBeUndefined();
  fireEvent.click(screen.getByLabelText("Use reviewed service introductions"));
  expect(field()?.value).toBe("{}");
  fireEvent.click(screen.getByLabelText("Use reviewed service introductions"));
  expect(screen.getByLabelText("boost section title")).toHaveValue(
    "Reviewed boost",
  );
});
it("keeps policy kinds unique and serializes reviewed plain text", () => {
  const { container } = render(
    <PolicyFields data={{ text: "Complete approved account agreement." }} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Add policy section" }));
  fireEvent.change(screen.getByLabelText("Policy section title"), {
    target: { value: "Terms" },
  });
  fireEvent.change(screen.getByLabelText("Policy section text"), {
    target: { value: "Reviewed terms with sufficient detail." },
  });
  const raw =
    container.querySelector<HTMLInputElement>('input[name="sections"]')
      ?.value ?? "null";
  expect(
    legalSchema.parse({
      text: "Complete approved account agreement.",
      sections: JSON.parse(raw) as unknown,
    }).sections?.[0]?.kind,
  ).toBe("terms");
  fireEvent.click(screen.getByRole("button", { name: "Add policy section" }));
  expect(screen.getAllByLabelText("Policy kind")[1]).toHaveValue("privacy");
  fireEvent.click(
    screen.getByRole("button", { name: "Remove policy section 2" }),
  );
  expect(screen.getAllByLabelText("Policy kind")).toHaveLength(1);
});
