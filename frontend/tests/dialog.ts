import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// JSDOM has no native dialog top layer. Browser tests cover inertness and focus.
const methods = ["showModal", "close"] as const;
const originals = methods.map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (!this.open) return;
      this.removeAttribute("open");
      queueMicrotask(() => this.dispatchEvent(new Event("close")));
    },
  });
});
afterEach(() => {
  cleanup();
  methods.forEach((name, index) => {
    const descriptor = originals[index];
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  });
});
