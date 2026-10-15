import { APIError } from "../identity/api";

/** Keep provider/proxy response bodies private; show only actionable upload states. */
export function uploadError(status: number): APIError {
  const messages = new Map([
    [401, "Your sign-in has expired. Sign in again, then retry this image."],
    [403, "Upload access changed. Refresh this page and try again."],
    [
      404,
      "This upload is no longer available. Remove it and choose the image again.",
    ],
    [
      409,
      "This upload has expired or changed. Remove it and choose the image again.",
    ],
    [413, "This image is too large. Choose a JPEG, PNG or WebP up to 4 MB."],
    [
      422,
      "This image could not be accepted. Remove it and choose a JPEG, PNG or WebP up to 4 MB.",
    ],
    [
      429,
      "Too many upload attempts. Wait a few minutes, then retry this image.",
    ],
  ]);
  const error = new APIError(
    messages.get(status) ??
      "Image storage is temporarily unavailable. Your image is still selected; try again shortly.",
  );
  error.status = status;
  return error;
}
