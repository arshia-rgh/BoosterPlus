import { expect, it } from "vitest";
import { uploadError } from "./upload-error";

it.each([400, 403, 404, 409, 413, 422, 429, 500, 502, 503, 504])(
  "does not blame a valid session for upload status %s",
  (status) => {
    const error = uploadError(status);
    expect(error.status).toBe(status);
    expect(error.message).not.toMatch(/sign.in|session.*expired/i);
  },
);
it("asks to sign in only after an authentication rejection", () => {
  expect(uploadError(401).message).toContain("Sign in again");
});
