import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import {
  DirectoryFilters,
  directorySearch,
  mediaReturn,
} from "./directory-filters";
it("commits complete filters only on submit and strips undeclared return destinations", () => {
  const apply = vi.fn();
  render(<DirectoryFilters query="" apply={apply} states={["ready"]} />);
  fireEvent.change(screen.getByLabelText("Customer ID"), {
    target: { value: "partial" },
  });
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Customer ID")).toBeInvalid();
  fireEvent.change(screen.getByLabelText("Customer ID"), {
    target: { value: "00000000-0000-4000-8000-000000000001" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(apply).toHaveBeenCalledWith(
    "00000000-0000-4000-8000-000000000001",
    "",
  );
  expect(
    directorySearch("customer=partial&state=bad&after=../../&token=secret"),
  ).toBe("");
  expect(
    mediaReturn({
      mediaSearch: "state=ready&after=cursor&url=https://evil.test",
    }),
  ).toBe("/admin/media?state=ready&after=cursor");
  expect(mediaReturn({ returnTo: "https://evil.test" })).toBeNull();
});
