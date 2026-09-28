import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { ArticleContent } from "./content";
import { emptyDefinition, emptyBlock } from "./model";
it("renders editorial markup literally and rejects unsafe links without losing readable content", () => {
  const { container } = render(
    <ArticleContent
      value={{
        ...emptyDefinition,
        title: "Fixture",
        blocks: [
          { ...emptyBlock("paragraph"), text: "<script>private()</script>" },
          {
            ...emptyBlock("link"),
            text: "Unsafe reference",
            url: "javascript:alert(1)",
          },
          {
            ...emptyBlock("table"),
            text: "Comparison",
            headers: ["Column"],
            rows: [["Cell"]],
          },
        ],
      }}
    />,
  );
  expect(container.querySelector("script")).toBeNull();
  expect(screen.getByText("<script>private()</script>")).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "Unsafe reference" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Column" })).toBeVisible();
  expect(screen.getByRole("region", { name: "Comparison" })).toHaveAttribute(
    "tabindex",
    "0",
  );
});
