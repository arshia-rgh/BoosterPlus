import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import { PolicyError } from "./policy-error";
it("keeps requested policy identity and version during failed-load retry", async () => {
  const load = vi
    .fn()
    .mockRejectedValue(new Response("Unavailable", { status: 503 }));
  const router = createMemoryRouter(
    [
      {
        path: "/policies/:kind",
        loader: load,
        element: <p>Policy</p>,
        errorElement: <PolicyError />,
      },
    ],
    { initialEntries: ["/policies/privacy?version=old-policy"] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: "This policy is unavailable." });
  expect(screen.getByText("Requested version: old-policy")).toBeVisible();
  expect(screen.getByRole("link", { name: "Current policy" })).toHaveAttribute(
    "href",
    "/policies/privacy",
  );
  fireEvent.click(screen.getByRole("button", { name: "Retry this policy" }));
  expect(router.state.location.search).toBe("?version=old-policy");
});
