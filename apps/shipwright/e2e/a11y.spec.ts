import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/demo",
  "/ask",
  "/pricing",
  "/login",
  "/dashboard",
  "/dashboard/issues",
  // The "Connect your app" flow, in each of its states (the preview shows them with fake data, so no sign-in is needed).
  "/design/connect?state=not-connected",
  "/design/connect?state=pick-repo",
  "/design/connect?state=many-repos",
  "/design/connect?state=no-repos",
  "/design/connect?state=pending",
  "/design/connect?state=pick-project",
  "/design/connect?state=ready",
  "/design/connect?state=member",
  "/design/connect?state=coming-soon",
  "/design/connect?state=loading",
  "/design/connect?state=not-connected&error=github_not_yours",
  "/design/connect?state=step2&error=access_denied",
  // The Code page (status, code map, search), in each of its states (fake data, so no sign-in is needed).
  ...[
    "ready",
    "kind-open",
    "results",
    "keyword-only",
    "no-matches",
    "limited",
    "redactions",
    "running",
    "running-reindex",
    "failed",
    "stopped",
    "empty",
    "no-files",
    "no-env",
    "member",
    "member-empty",
    "loading",
  ].map((state) => `/design/code?state=${state}`),
];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

type Violation = Awaited<
  ReturnType<AxeBuilder["analyze"]>
>["violations"][number];

// One line per broken rule, so a failing test reads like a to-do list.
function describeViolations(violations: Violation[]): string {
  return violations
    .map((violation) => {
      const count = violation.nodes.length;
      const first = violation.nodes[0]?.target.join(" ") ?? "";
      return `[${violation.impact}] ${violation.id}: ${violation.help} (${count} node${count === 1 ? "" : "s"}, first: ${first})`;
    })
    .join("\n");
}

for (const path of PAGES) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    // Reduced motion removes movement, but opacity fades still play, and axe would measure the colors of a
    // half-faded element. People read the finished page, so we scan that.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Endless loops (like skeleton pulses) never finish, so they don't count.
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every(
          (animation) =>
            animation.effect?.getComputedTiming().iterations === Infinity ||
            animation.playState !== "running",
        ),
    );

    const { violations } = await new AxeBuilder({ page })
      .withTags(TAGS)
      .analyze();

    // Comparing the readable text to "" makes the failure message the list of problems.
    expect(describeViolations(violations)).toBe("");
  });
}

test("the skip link is the first Tab stop and moves focus to <main>", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "phone", "A phone has no Tab key.");

  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("desktop header marks the current page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "The phone uses the drawer.");

  await page.goto("/pricing");
  await expect(
    page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Pricing" }),
  ).toHaveAttribute("aria-current", "page");
});

test("phone drawer opens with every link, passes axe and closes with Escape", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "phone",
    "Only phones show the hamburger.",
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.click();

  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  for (const name of [
    "How it works",
    "Live demo",
    "Pricing",
    "Ask",
    "Dashboard",
    "Design system",
  ]) {
    await expect(drawer.getByRole("link", { name })).toBeVisible();
  }
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.effect?.getComputedTiming().iterations === Infinity ||
          animation.playState !== "running",
      ),
  );
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    .analyze();
  expect(describeViolations(violations)).toBe("");

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});
