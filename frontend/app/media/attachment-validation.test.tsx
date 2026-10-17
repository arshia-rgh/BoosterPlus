import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { FieldValidation } from "../ui/form-validation";
import { UploadImage } from "./attachment";

it("keeps an image failure separate from surrounding account-submission errors", async () => {
  render(
    <MemoryRouter>
      <FieldValidation
        value={{
          issues: [
            {
              path: "authority",
              message: "Confirm your authority to sell this account.",
            },
          ],
          register: () => () => undefined,
          correct: vi.fn(),
        }}
      >
        <UploadImage
          conversation="synthetic"
          admin={false}
          visibility="customer"
          change={vi.fn()}
        />
      </FieldValidation>
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Choose image"), {
    target: {
      files: [new File(["<svg/>"], "wrong.svg", { type: "image/svg+xml" })],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/JPEG|PNG|WebP/);
  expect(
    screen.queryByText("Confirm your authority to sell this account."),
  ).toBeNull();
  expect(
    screen.queryByText("Check the highlighted details before continuing:"),
  ).toBeNull();
});
