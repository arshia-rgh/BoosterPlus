import { test } from "@playwright/test";
import { enroll, fixture, signIn } from "./identity-fixtures";
import { operationsJourney } from "./operations-journey";
import { reportsJourney } from "./reports-journey";

// Independent workspaces keep each journey inside the original 30-second
// budget, without sharing MFA enrollment or mutable job/report state.
test("administrator reviews and retries a failed background task", async ({
  page,
  request,
}, info) => {
  await signIn(
    page,
    request,
    fixture(info.project.name, "operationsadmin"),
    "/admin/login",
  );
  await enroll(page);
  await operationsJourney(
    page,
    fixture(info.project.name, "failed_job"),
    info.project.name,
  );
});

test("administrator previews and exports an audited operational report", async ({
  page,
  request,
}, info) => {
  await signIn(
    page,
    request,
    fixture(info.project.name, "reportsadmin"),
    "/admin/login",
  );
  await enroll(page);
  await reportsJourney(page, info.project.name);
});
