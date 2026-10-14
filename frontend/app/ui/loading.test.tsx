import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Loading } from "./loading";

it("announces one loading status without exposing decorative geometry", () => {
  render(<Loading label="Loading your workspace…" />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Loading your workspace…",
  );
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
