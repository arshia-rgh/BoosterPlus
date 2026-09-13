import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import AccountGallery from "./gallery";
it("switches reviewed screenshots and clamps selection when a release changes", () => {
  const view = render(
    <AccountGallery images={["/first", "/second"]} title="Reviewed account" />,
  );
  fireEvent.click(screen.getByRole("button", { name: "View screenshot 2" }));
  expect(
    screen.getByRole("img", { name: "Reviewed account — reviewed view 2" }),
  ).toHaveAttribute("src", "/second");
  view.rerender(
    <AccountGallery images={["/revised"]} title="Reviewed account" />,
  );
  expect(
    screen.getByRole("img", { name: "Reviewed account — reviewed view 1" }),
  ).toHaveAttribute("src", "/revised");
  expect(screen.getByText("Reviewed screenshot 1 of 1")).toBeVisible();
});
it("handles absent and failed public images without hiding controls", () => {
  const view = render(<AccountGallery images={[]} title="Account" />);
  expect(
    screen.queryByRole("button", { name: "Enlarge screenshot" }),
  ).not.toBeInTheDocument();
  view.rerender(<AccountGallery images={["/failed"]} title="Account" />);
  fireEvent.error(
    screen.getByRole("img", { name: "Account — reviewed view 1" }),
  );
  expect(screen.getByText("Image unavailable")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Enlarge screenshot" }),
  ).toBeVisible();
});
