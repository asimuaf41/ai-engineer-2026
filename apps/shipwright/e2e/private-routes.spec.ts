// Signed-out visitors can never see the private pages or complete a connect flow. These run without any Supabase settings
// (like CI): a private page then sends the visitor to /login instead of failing.
import { expect, test } from "@playwright/test";

test("a private workspace page sends a signed-out visitor to /login", async ({ page }) => {
  await page.goto("/o/acme-labs-x7k2/connect");
  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.getByText("Sign in to Shipwright")).toBeVisible();
});

test("/onboarding sends a signed-out visitor to /login", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test("the GitHub callback with a made-up installation and no cookie is refused (never connects anything)", async ({ request }) => {
  const response = await request.get("/api/github/callback?code=abcdefghij1234&installation_id=999999&setup_action=install&state=made-up-state-value-123456789", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  // Refused before anything else: no cookie, so no workspace is known and the person is sent to /onboarding with a calm error code.
  expect(response.headers().location).toBe("/onboarding?error=github_state");
});

test("the Supabase callback with a made-up code and no cookie is refused too", async ({ request }) => {
  const response = await request.get("/api/supabase/callback?code=abc&state=made-up-state-value-123456789", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/onboarding?error=supabase_state");
});

test("the install routes do not leak anything to a signed-out visitor", async ({ request }) => {
  for (const path of ["/api/github/install?org=acme-labs-x7k2", "/api/supabase/connect?org=acme-labs-x7k2"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    // Either "not set up here" or "go sign in": a redirect to OUR pages, never straight to GitHub or Supabase.
    expect([307, 308, 404]).toContain(response.status());
    expect(response.headers().location ?? "").not.toMatch(/github\.com|supabase\.com/);
  }
});

test("an invalid workspace address in the install route goes to /onboarding, not to a provider", async ({ request }) => {
  const response = await request.get("/api/github/install?org=../../etc", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/onboarding");
});
