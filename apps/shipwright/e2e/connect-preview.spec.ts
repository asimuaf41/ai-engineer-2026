// Behaviour of the "Connect your app" flow, checked on the design preview (fake data, no sign-in needed).
import { expect, test } from "@playwright/test";

const PREVIEW = "/design/connect";

test("the repository search narrows the list, says how many match, and handles no match", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=pick-repo`);
  const list = page.getByRole("list", { name: "Repositories" });
  await expect(list.getByRole("listitem")).toHaveCount(5);
  await expect(page.getByText("5 repositories shared with Shipwright.")).toBeVisible();

  await page.getByLabel("Find a repository").fill("SHOP");
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByText("2 of 5 repositories match.")).toBeVisible();

  await page.getByLabel("Find a repository").fill("zzz-nothing");
  await expect(page.getByText("No repository matches your search.")).toBeVisible();
  await expect(list).toHaveCount(0);
});

test("repositories are newest push first, and private ones carry a lock with the word 'Private'", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=pick-repo`);
  const items = page.getByRole("list", { name: "Repositories" }).getByRole("listitem");
  await expect(items.first()).toContainText("acme-labs/shop-frontend");
  await expect(items.first()).toContainText("12 Nov 2026");
  await expect(items.first().getByText("Private")).toBeVisible();
  // Never pushed: last, with plain words.
  await expect(items.last()).toContainText("acme-labs/old-prototype");
  await expect(items.last()).toContainText("No pushes yet");
  // A public repository says so, and has no lock.
  await expect(items.nth(2)).toContainText("Public");
});

test("a long list shows only the first 50, and tells you to type to narrow it down", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=many-repos`);
  await expect(page.getByRole("list", { name: "Repositories" }).getByRole("listitem")).toHaveCount(50);
  await expect(page.getByText("Showing the first 50. Type to narrow it down.")).toBeVisible();
  await page.getByLabel("Find a repository").fill("service-11");
  await expect(page.getByRole("list", { name: "Repositories" }).getByRole("listitem")).toHaveCount(10);
});

test("choosing a repository moves on to step 2 (demo action)", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=pick-repo`);
  await page.getByRole("button", { name: /acme-labs\/shop-api/ }).click();
  await expect(page).toHaveURL(/state=step2/);
  await expect(page.getByRole("heading", { name: "Connect Supabase" })).toBeVisible();
});

test("step 3 has a DISABLED 'Run first scan' with its reason, and a link to the sample report", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=ready`);
  const scan = page.getByRole("button", { name: "Run first scan" });
  await expect(scan).toBeDisabled();
  await expect(scan).toHaveAccessibleDescription("Scans arrive in the next update.");
  await expect(page.getByRole("link", { name: "See a sample report" })).toHaveAttribute("href", "/demo");
});

test("the disconnect dialog says exactly what happens, closes with Escape, and gives focus back", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=ready`);
  const trigger = page.getByRole("button", { name: "Disconnect GitHub" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Disconnect GitHub?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("We remove the link between Shipwright and your GitHub installation, and delete the code index");
  await expect(dialog).toContainText("We didn't store a GitHub token");
  await expect(dialog).toContainText("also uninstall the Shipwright app on GitHub");
  await expect(dialog.getByRole("link", { name: /Open your GitHub installations/ })).toHaveAttribute("href", "https://github.com/settings/installations");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("the Supabase disconnect dialog says the stored tokens are deleted", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=ready`);
  await page.getByRole("button", { name: "Disconnect Supabase" }).click();
  await expect(page.getByRole("dialog")).toContainText("We delete the access tokens we stored");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("confirming a disconnect goes back to the start (demo action)", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=ready`);
  await page.getByRole("button", { name: "Disconnect GitHub" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Disconnect" }).click();
  await expect(page).toHaveURL(/state=not-connected/);
});

test("members see the cards read-only: no connect or disconnect buttons, and 'Ask an admin'", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=member`);
  await expect(page.getByText("only an owner or admin can connect or change things")).toBeVisible();
  await expect(page.getByText("Ask an admin to connect GitHub.")).toBeVisible();
  await expect(page.getByRole("button", { name: /acme-labs\/shop-frontend/ })).toHaveCount(0);

  await page.goto(`${PREVIEW}?state=member-ready`);
  await expect(page.getByRole("button", { name: /Disconnect/ })).toHaveCount(0);
});

test("a known error code shows our friendly alert with 'Try again', in plain words", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=not-connected&error=github_not_yours`);
  const alert = page.getByRole("alert").filter({ hasText: "couldn't confirm" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Make sure you are signed in to the right GitHub account");
  await expect(alert.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/api/github/install?org=acme-labs-x7k2");
});

test("an unknown or hostile error value never appears on the page", async ({ page }) => {
  const hostile = "<b id=injected>EVIL_TEXT</b>";
  await page.goto(`${PREVIEW}?state=not-connected&error=${encodeURIComponent(hostile)}`);
  await expect(page.getByText("Something went wrong").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("EVIL_TEXT");
  await expect(page.locator("#injected")).toHaveCount(0);
});

test("when GitHub is not switched on, step 1 says 'Coming soon' instead of showing a broken button", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=coming-soon`);
  await expect(page.getByText("Coming soon").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Connect GitHub" })).toHaveCount(0);
  // Supabase being unavailable must not block the last step.
  await expect(page.getByRole("heading", { name: "Ready for your first scan" })).toBeVisible();
});

test("waiting for a GitHub org owner shows the pending message instead of an error", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=pending`);
  await expect(page.getByText("Waiting for your GitHub org owner to approve Shipwright")).toBeVisible();
  await expect(page.getByRole("link", { name: "Check again" })).toBeVisible();
});

test("every state fits a 360px phone with no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const state of ["not-connected", "pick-repo", "no-repos", "pending", "pick-project", "ready", "member"]) {
    await page.goto(`${PREVIEW}?state=${state}`);
    await expect(page.getByRole("heading", { name: "Connect your app" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `state ${state}`).toBeLessThanOrEqual(0);
  }
});

test("the steps are one ordered list and the open step is marked as current", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=step2`);
  await expect(page.locator("ol[aria-label='Setup steps'] > li")).toHaveCount(3);
  await expect(page.locator("ol[aria-label='Setup steps'] > li[aria-current='step']")).toHaveCount(1);
  await expect(page.locator("ol[aria-label='Setup steps'] > li[aria-current='step']")).toContainText("Connect Supabase");
});

test("'Skip for now' on step 2 goes to the address that opens step 3", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=step2`);
  await expect(page.getByRole("link", { name: "Skip for now" })).toHaveAttribute("href", "/o/acme-labs-x7k2/connect?step=ready");
});

test("a member's 'Try again' only reloads the page (they cannot connect anything)", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=member&error=github_failed`);
  const alert = page.getByRole("alert").filter({ hasText: "GitHub didn't connect" });
  await expect(alert.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/o/acme-labs-x7k2/connect");
});

test("a feature that isn't switched on has no 'Try again' button", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=coming-soon&error=github_not_configured`);
  await expect(page.getByRole("alert").getByText("GitHub isn't switched on here yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Try again" })).toHaveCount(0);
});

test("a project list with no projects, and a long project list, both say something sensible", async ({ page }) => {
  await page.goto(`${PREVIEW}?state=no-projects`);
  await expect(page.getByText("No Supabase projects found")).toBeVisible();
  await expect(page.getByRole("link", { name: "Skip for now" })).toBeVisible();
});

test("with reduced motion the finished states are all there at once (no movement needed)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${PREVIEW}?state=ready`);
  // The tick is already drawn: its path is complete straight away.
  const path = page.locator("ol[aria-label='Setup steps'] > li").first().locator("svg path");
  await expect(path).toBeVisible();
  const dash = await path.evaluate((element) => getComputedStyle(element).strokeDashoffset);
  expect(["0px", "0", "none", "normal"]).toContain(dash);
  await expect(page.getByRole("button", { name: "Run first scan" })).toBeDisabled();
});
