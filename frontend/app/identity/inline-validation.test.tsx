import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Form, Text } from "./identity";
import { Confirmation } from "../ui/form-validation";

it("keeps missing, malformed and confirmation errors inline without sending a request", async () => {
  const submit = vi.fn().mockResolvedValue(undefined);
  render(
    <Form title="Continue" submit={submit}>
      <Text name="email" label="Email" type="email" />
      <Confirmation>Confirm these details</Confirmation>
    </Form>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.getByLabelText("Email")).toHaveFocus());
  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
    "Complete this field.",
  );
  expect(screen.getByRole("checkbox")).toHaveAccessibleDescription(
    "Confirm this before continuing.",
  );
  expect(submit).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "bad-address" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Enter a valid email address.",
    ),
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "synthetic@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.getByRole("checkbox")).toHaveFocus());
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => {
    expect(submit).toHaveBeenCalledOnce();
  });
});
