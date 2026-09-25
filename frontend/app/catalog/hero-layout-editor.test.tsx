import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import HeroLayoutEditor from "./hero-layout-editor";
import {
  emptyConfiguration,
  heroLayoutSchema,
  type Configuration,
} from "./model";
function Editor() {
  const [config, setConfig] = useState<Configuration>({
    ...emptyConfiguration("Example"),
    asset: "/game.png",
    asset_alt: "Example artwork",
  });
  return (
    <HeroLayoutEditor
      config={config}
      change={(hero_layout) => {
        setConfig({ ...config, hero_layout });
      }}
    />
  );
}
it("keeps legacy framing optional and previews bounded desktop and phone edits", () => {
  render(<Editor />);
  expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Customize game artwork framing"));
  fireEvent.change(screen.getByLabelText("Desktop text placement"), {
    target: { value: "right" },
  });
  fireEvent.change(
    screen.getByRole("slider", { name: "Desktop horizontal focus" }),
    { target: { value: "18" } },
  );
  fireEvent.change(
    screen.getByRole("slider", { name: "Mobile horizontal focus" }),
    { target: { value: "25" } },
  );
  const [desktop, phone] = screen.getAllByAltText("Example artwork");
  expect(desktop).toHaveAttribute("data-art-desktop-x", "18");
  expect(phone).toHaveAttribute("data-art-desktop-x", "25");
  expect(desktop?.parentElement).toHaveAttribute("data-copy-side", "right");
  if (!desktop) throw new Error("Missing desktop preview");
  fireEvent.error(desktop);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Artwork could not load",
  );
  const retry = screen.getByRole("button", { name: "Retry artwork" });
  retry.focus();
  fireEvent.click(retry);
  expect(
    screen.getByRole("button", { name: "Reload artwork preview" }),
  ).toHaveFocus();
  expect(screen.getAllByAltText("Example artwork")[0]).toHaveAttribute(
    "data-art-desktop-x",
    "18",
  );
  const restored = screen.getAllByAltText("Example artwork")[0];
  if (!restored) throw new Error("Missing retry preview");
  fireEvent.error(restored);
  expect(screen.getByRole("button", { name: "Retry artwork" })).toHaveFocus();
  fireEvent.click(screen.getByLabelText("Customize game artwork framing"));
  expect(screen.queryByRole("slider")).not.toBeInTheDocument();
});
it("rejects malformed public framing rather than interpreting arbitrary styles", () => {
  const valid = {
    desktop_x: 0,
    desktop_y: 100,
    mobile_x: 50,
    mobile_y: 20,
    copy_side: "left",
  };
  expect(heroLayoutSchema.safeParse(valid).success).toBe(true);
  for (const change of [
    { desktop_x: -1 },
    { mobile_y: 101 },
    { desktop_y: 1.5 },
    { copy_side: "left;display:none" },
  ]) {
    expect(heroLayoutSchema.safeParse({ ...valid, ...change }).success).toBe(
      false,
    );
  }
});
