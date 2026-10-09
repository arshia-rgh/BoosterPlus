import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MFASetup } from "./mfa-setup";
import { parseMFAEnrollment } from "./mfa-enrollment";

const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const url = `otpauth://totp/PLAYORA%20Customer:staff@example.test?algorithm=SHA1&digits=6&issuer=PLAYORA%20Customer&period=30&secret=${secret}`;
const enrollment = parseMFAEnrollment({ secret, url }, "staff@example.test");
afterEach(() => vi.restoreAllMocks());

it("shows a high contrast scan-first QR without a plaintext key or URI in DOM or storage", () => {
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const fetcher = vi.spyOn(window, "fetch");
  const { container } = render(<MFASetup enrollment={enrollment} />);
  expect(
    screen.getByRole("heading", { name: "Scan with your authenticator" }),
  ).toHaveFocus();
  expect(
    screen.getByRole("img", {
      name: "Authenticator setup QR code for your PLAYORA account",
    }),
  ).toBeVisible();
  expect(container.innerHTML).not.toContain(secret);
  expect(container.innerHTML).not.toContain("otpauth:");
  expect(container.querySelector("a, img, canvas")).toBeNull();
  expect(container.querySelector("svg rect")).toHaveAttribute(
    "fill",
    "#ffffff",
  );
  expect(container.querySelector("svg path")).toHaveAttribute(
    "fill",
    "#000000",
  );
  expect(storage).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("reveals the accessible same-device fallback only on request and removes it when hidden", () => {
  const { container, unmount } = render(<MFASetup enrollment={enrollment} />);
  const control = screen.getByRole("button", {
    name: "Can’t scan? Use a setup key",
  });
  expect(control).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(control);
  expect(screen.getByText(secret)).toBeVisible();
  expect(screen.getByText("staff@example.test")).toBeVisible();
  expect(control).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(control);
  expect(container.innerHTML).not.toContain(secret);
  unmount();
  expect(container.innerHTML).toBe("");
});
