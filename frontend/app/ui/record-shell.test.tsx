import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { expect, it } from "vitest";
import { RecordShell } from "./record-shell";

function Example() {
  const [draft, setDraft] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <RecordShell
        id="PL-1042"
        title="Order"
        workspace="My account"
        status="Awaiting quote"
        back={{ to: "/orders?status=active", label: "Active orders" }}
        sections={[
          { id: "overview", label: "Overview" },
          { id: "messages", label: "Messages" },
        ]}
      >
        {(section) =>
          section === "messages" ? (
            <label>
              Private support draft
              <textarea
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                }}
              />
            </label>
          ) : (
            <p>Your quote is being reviewed.</p>
          )
        }
      </RecordShell>
      <output aria-label="Current address">
        {location.pathname + location.search}
      </output>
      <button
        type="button"
        onClick={() => {
          void navigate(-1);
        }}
      >
        Browser back
      </button>
    </>
  );
}

it("keeps record identity, URL context and caller-owned drafts through local navigation and Back", () => {
  render(
    <MemoryRouter initialEntries={["/orders/PL-1042?from=active"]}>
      <Example />
    </MemoryRouter>,
  );
  const heading = screen.getByRole("heading", { name: "Order PL-1042" });
  fireEvent.click(screen.getByRole("link", { name: "Messages" }));
  expect(screen.getByLabelText("Current address")).toHaveTextContent(
    "/orders/PL-1042?from=active&section=messages",
  );
  expect(screen.getByRole("heading", { name: "Order PL-1042" })).toBe(heading);
  fireEvent.change(screen.getByLabelText("Private support draft"), {
    target: { value: "Please check my request" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Overview" }));
  expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
  expect(screen.getByLabelText("Private support draft")).toHaveValue(
    "Please check my request",
  );
  expect(screen.getByRole("link", { name: "← Active orders" })).toHaveAttribute(
    "href",
    "/orders?status=active",
  );
});

it("uses a safe local section for an unknown deep link", () => {
  render(
    <MemoryRouter initialEntries={["/orders/PL-1042?section=unknown"]}>
      <Example />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByText("Your quote is being reviewed.")).toBeVisible();
});

function RetainedInput() {
  const [value, setValue] = useState("");
  return (
    <label>
      Local draft
      <input
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
    </label>
  );
}
it("retains visited ordinary drafts while unmounting payment instructions and keeping list history", () => {
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/orders/PL-1042",
          state: { orderListSearch: "state=quoted" },
        },
      ]}
    >
      <RecordShell
        id="PL-1042"
        title="Order"
        workspace="My account"
        status="Quote ready"
        back={{ to: "/orders", label: "Orders" }}
        sections={[
          { id: "overview", label: "Overview" },
          { id: "messages", label: "Messages" },
          { id: "payment", label: "Payment" },
        ]}
        keepMounted={["messages"]}
      >
        {(section) =>
          section === "messages" ? (
            <RetainedInput />
          ) : section === "payment" ? (
            <p>Fresh payment instructions</p>
          ) : (
            <p>Order overview</p>
          )
        }
      </RecordShell>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("link", { name: "Messages" }));
  fireEvent.change(screen.getByLabelText("Local draft"), {
    target: { value: "Unsent ordinary draft" },
  });
  fireEvent.click(screen.getByRole("link", { name: "Payment" }));
  expect(screen.getByLabelText("Local draft")).not.toBeVisible();
  expect(screen.getByText("Fresh payment instructions")).toBeVisible();
  fireEvent.click(screen.getByRole("link", { name: "Messages" }));
  expect(screen.getByLabelText("Local draft")).toHaveValue(
    "Unsent ordinary draft",
  );
  expect(
    screen.queryByText("Fresh payment instructions"),
  ).not.toBeInTheDocument();
});
