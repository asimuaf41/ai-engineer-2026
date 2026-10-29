import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/demo", "/ask", "/dashboard", "/dashboard/issues"];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

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
        .every((animation) => animation.effect?.getComputedTiming().iterations === Infinity || animation.playState !== "running"),
    );

    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();

    // Comparing the readable text to "" makes the failure message the list of problems.
    expect(describeViolations(violations)).toBe("");
  });
}

test("the skip link is the first Tab stop and moves focus to <main>", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "phone", "A phone has no Tab key.");

  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});
