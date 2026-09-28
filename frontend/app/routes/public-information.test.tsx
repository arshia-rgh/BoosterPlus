import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Policy, { loader as policyLoader } from "./policy";
import Information, { loader as infoLoader } from "./how-it-works";
import { defaultHome } from "../site/model";
import PolicyDocument from "../site/policy-document";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function reply(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(data))),
      ),
  );
}
const legal = {
  kind: "legal",
  version: 2,
  release_id: "release",
  label: "approved-v2",
  data: {
    text: "Approved account terms for qualification.",
    sections: [
      {
        kind: "privacy",
        title: "Privacy policy",
        text: "Owner-published privacy policy for isolated qualification.",
      },
    ],
  },
  updated_at: "2026-09-28T00:00:00Z",
};
it("reads only published policy sections and preserves requested version navigation", async () => {
  reply(legal);
  const data = await policyLoader({
    request: new Request(
      "https://example.test/policies/privacy?version=approved-v1",
    ),
    params: { kind: "privacy" },
  });
  render(<Policy loaderData={data} />);
  expect(screen.getByRole("heading", { name: "Privacy policy" })).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Read the current published version" }),
  ).toHaveAttribute("href", "/policies/privacy");
  expect(screen.getByRole("link", { name: "Account terms" })).toHaveAttribute(
    "href",
    "/terms?version=approved-v1",
  );
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  fireEvent.click(screen.getByRole("button", { name: "Print this policy" }));
  expect(print).toHaveBeenCalledOnce();
  print.mockRestore();
  await expect(
    policyLoader({
      request: new Request("https://example.test/policies/missing"),
      params: { kind: "missing" },
    }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    policyLoader({
      request: new Request("https://example.test/policies/refunds"),
      params: { kind: "refunds" },
    }),
  ).rejects.toMatchObject({ status: 404 });
});
it("explains current service flows and shows contact details only when configured", async () => {
  reply({
    kind: "home",
    version: 1,
    release_id: "home",
    label: "home-v1",
    data: defaultHome,
    updated_at: "2026-09-28T00:00:00Z",
  });
  const data = await infoLoader();
  const view = render(<Information loaderData={data} />);
  expect(
    screen.getByRole("heading", { name: "How PLAYORA works." }),
  ).toBeVisible();
  expect(screen.queryByText(/Support hours:/)).not.toBeInTheDocument();
  view.rerender(
    <Information
      loaderData={{
        ...data,
        contact_email: "support@example.test",
        support_hours: "Published fixture hours",
      }}
    />,
  );
  expect(
    screen.getByRole("link", { name: "support@example.test" }),
  ).toHaveAttribute("href", "mailto:support@example.test");
  expect(screen.getByText(/Published fixture hours/)).toBeVisible();
});
it("labels requested agreement versions without inventing effective dates", () => {
  render(
    <PolicyDocument
      data={{
        text: "Versioned terms",
        version: "v1",
        preview: false,
        sections: [],
      }}
      requestedVersion="v1"
    />,
  );
  expect(
    screen.getByRole("link", { name: "Read the current published version" }),
  ).toHaveAttribute("href", "/terms");
});
