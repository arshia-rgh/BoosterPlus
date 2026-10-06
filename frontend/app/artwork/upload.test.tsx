import { useState } from "react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { FieldValidation } from "../ui/form-validation";
import { BlocksEditor } from "../news/blocks";
import { emptyBlock, type Block } from "../news/model";
import ArtworkUpload from "./upload";
import { get } from "../identity/api";
vi.mock("../identity/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../identity/api")>()),
  get: vi.fn(),
}));
const asset = "/api/v1/artwork/11111111-1111-4111-8111-111111111111/wide";
const variant = {
  width: 800,
  height: 400,
  size: 1024,
  checksum: "a".repeat(64),
  content_type: "image/jpeg",
};
const result = {
  id: "11111111-1111-4111-8111-111111111111",
  asset,
  purpose: "game",
  width: 1920,
  height: 1080,
  focus_x: 50,
  focus_y: 50,
  variants: { wide: variant, mobile: variant, card: variant },
};
const bundled = "/catalog-assets/game-mlbb-1536.jpg";
const fetchMock = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState({}, "", "/admin/catalog/game");
  vi.mocked(get).mockResolvedValue({ csrf_token: "test-csrf" });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      naturalWidth = 1920;
      naturalHeight = 1080;
      decode() {
        return Promise.resolve();
      }
    },
  );
  fetchMock.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(result),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function Editor() {
  const [value, set] = useState(bundled);
  return (
    <ArtworkUpload
      purpose="game"
      value={value}
      change={set}
      pathLabel="Public asset path"
      defaultAsset={bundled}
    />
  );
}
async function choose(container: HTMLElement = document.body) {
  fireEvent.change(
    within(container).getByLabelText("Choose a replacement image"),
    {
      target: {
        files: [new File(["test"], "image.png", { type: "image/png" })],
      },
    },
  );
  await within(container).findByText("1920 × 1080 px · 0.00 MiB");
}
async function prepare() {
  fireEvent.click(
    screen.getByRole("button", { name: "Prepare image versions" }),
  );
  await screen.findByRole("button", { name: "Use this image" });
}
function loadPreviews() {
  for (const image of screen.getAllByAltText(/preview$/)) fireEvent.load(image);
}
it("keeps the old image until prepared previews load and the admin applies it, then restores the default", async () => {
  render(<Editor />);
  await choose();
  await prepare();
  const use = screen.getByRole("button", { name: "Use this image" });
  expect(use).toBeDisabled();
  expect(screen.getByAltText("Current draft artwork")).toHaveAttribute(
    "src",
    bundled,
  );
  loadPreviews();
  await waitFor(() => expect(use).toHaveFocus());
  fireEvent.click(use);
  expect(screen.getByAltText("Current draft artwork")).toHaveAttribute(
    "src",
    asset.replace("/artwork/", "/admin/artwork/").replace(/wide$/, "card"),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Restore default game artwork" }),
  );
  expect(screen.getByAltText("Current draft artwork")).toHaveAttribute(
    "src",
    bundled,
  );
  expect(screen.getByLabelText("Choose a replacement image")).toHaveFocus();
});
it("recovers failed previews without another upload and focuses crop adjustment", async () => {
  render(<Editor />);
  await choose();
  await prepare();
  fireEvent.error(screen.getByAltText("Phone preview"));
  loadPreviews();
  expect(screen.getByRole("button", { name: "Use this image" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Retry image previews" }));
  loadPreviews();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Use this image" }),
    ).toBeEnabled(),
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Adjust crop" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Horizontal focal point")).toHaveFocus(),
  );
  expect(screen.getByAltText("Current draft artwork")).toHaveAttribute(
    "src",
    bundled,
  );
});
it("retries the exact upload ID after an unavailable response and rejects bad types before upload", async () => {
  render(<Editor />);
  fireEvent.change(screen.getByLabelText("Choose a replacement image"), {
    target: {
      files: [new File(["<svg/>"], "x.svg", { type: "image/svg+xml" })],
    },
  });
  expect(screen.getByRole("alert")).toHaveTextContent("JPEG");
  expect(fetchMock).not.toHaveBeenCalled();
  await choose();
  fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
  fireEvent.click(
    screen.getByRole("button", { name: "Prepare image versions" }),
  );
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry image upload" }));
  await screen.findByRole("button", { name: "Use this image" });
  expect(fetchMock.mock.calls[0]?.[0]).toBe(fetchMock.mock.calls[1]?.[0]);
});
it("opens the path error target and does not register an inline image as the cover field", () => {
  const register = vi.fn(() => () => {});
  render(
    <FieldValidation
      value={{
        issues: [{ path: "asset", message: "Choose checked artwork" }],
        register,
        correct: vi.fn(),
      }}
    >
      <ArtworkUpload
        value="bad"
        change={() => {}}
        purpose="cover"
        pathLabel="Cover path"
      />
      <ArtworkUpload
        value=""
        change={() => {}}
        purpose="inline"
        pathLabel="Inline path"
      />
    </FieldValidation>,
  );
  expect(screen.getByLabelText("Cover path")).toBeVisible();
  expect(screen.getByLabelText("Cover path")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(
    register.mock.calls
      .flat()
      .filter(
        (field: unknown) =>
          !!field &&
          typeof field === "object" &&
          "name" in field &&
          field.name === "asset",
      ),
  ).toHaveLength(1);
});
it("moves the pending image with its article block instead of attaching it to another block", async () => {
  function Article() {
    const [blocks, setBlocks] = useState<Block[]>([
      { ...emptyBlock("image"), alt: "First image" },
      { ...emptyBlock("image"), alt: "Second image" },
    ]);
    return <BlocksEditor value={blocks} change={setBlocks} />;
  }
  render(<Article />);
  const first = screen.getByRole("group", { name: "Block 1 · image" });
  await choose(first);
  fireEvent.click(screen.getByRole("button", { name: "Move block 1 down" }));
  const moved = screen.getByRole("group", { name: "Block 2 · image" });
  expect(within(moved).getByLabelText("Image description")).toHaveValue(
    "First image",
  );
  expect(within(moved).getByAltText("Large image preview")).toBeInTheDocument();
  expect(
    within(
      screen.getByRole("group", { name: "Block 1 · image" }),
    ).queryByAltText("Large image preview"),
  ).toBeNull();
});
