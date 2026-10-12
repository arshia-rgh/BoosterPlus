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

it("renders independently described inline images without treating captions as markup", () => {
  const { container } = render(
    <ArticleContent
      value={{
        ...emptyDefinition,
        blocks: [
          {
            ...emptyBlock("gallery"),
            text: "Match comparison",
            images: [
              {
                url: "/catalog-assets/test.webp",
                alt: "Before the match",
                source: "Synthetic source",
                caption: "<b>Before</b>",
              },
              {
                url: "javascript:alert(1)",
                alt: "After the match",
                source: "Synthetic source",
                caption: "After",
              },
            ],
          },
        ],
      }}
    />,
  );
  expect(screen.getByRole("group", { name: "Match comparison" })).toBeVisible();
  expect(screen.getByAltText("Before the match")).toBeVisible();
  expect(container.querySelector("b, script")).toBeNull();
  expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
  expect(screen.getByText("<b>Before</b> · Synthetic source")).toBeVisible();
});
