// Records a ~20 second demo of Shipwright and turns it into demo.mp4 and demo.gif.
// Usage: node scripts/record-demo.mjs [baseUrl] [--no-encode]
// Run it against a running production build (`pnpm build`, then `pnpm start`), never `next dev`.
// --no-encode keeps only the raw recording (no ffmpeg needed): handy for checking the story.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith("--")) ?? "http://localhost:3000").replace(/\/$/, "");
const encode = !args.includes("--no-encode");

const OUT = "reports/demo";
const TMP = `${OUT}/tmp`;
const RAW = `${OUT}/demo.webm`;
const SIZE = { width: 1440, height: 900 };
// Playwright sends "Meta" as the Command key on a Mac. Our palette accepts Cmd or Ctrl.
const MOD = process.platform === "darwin" ? "Meta" : "Control";

if (encode && (!ffmpegPath || !existsSync(ffmpegPath))) {
  throw new Error(
    "The ffmpeg binary is missing. pnpm blocks its download by default: run `pnpm approve-builds`, pick ffmpeg-static, then try again.",
  );
}

// Waits until the text has not changed for a while (numbers that count up, data that streams in).
async function waitForStableText(locator, { every = 400, times = 3 } = {}) {
  let last = "";
  let same = 0;
  while (same < times) {
    await locator.page().waitForTimeout(every);
    const now = await locator.innerText();
    same = now === last ? same + 1 : 0;
    last = now;
  }
}

async function record() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(TMP, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: SIZE,
    colorScheme: "dark",
    recordVideo: { dir: TMP, size: SIZE },
  });
  const page = await context.newPage();
  const video = page.video();

  try {
    // 1. The landing page, then the "How it works" story, scrolled slowly.
    await page.goto(`${base}/`);
    await page.waitForTimeout(1500);
    await page.mouse.move(SIZE.width / 2, SIZE.height / 2);
    for (let step = 0; step < 3; step++) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(1000);
    }

    // 2. The dashboard: wait for the chart to load, then for the KPI numbers to finish counting up.
    await page.goto(`${base}/dashboard`);
    // exact: the screen-reader caption under the chart also contains these words.
    await page.getByText("Launch-ready", { exact: true }).waitFor();
    await waitForStableText(page.getByRole("main"));

    // 3. The command palette: search "crit" and jump to the critical issues.
    await page.keyboard.press(`${MOD}+K`);
    const palette = page.getByRole("dialog");
    await palette.waitFor();
    await page.keyboard.type("crit", { delay: 120 });
    await palette.getByRole("option", { name: "Show critical issues" }).waitFor();
    await page.waitForTimeout(600);
    await page.keyboard.press("Enter");

    // 4. Pick two issues and mark them as fixed.
    await page.waitForURL(/\/dashboard\/issues/);
    const rows = page.getByRole("checkbox", { name: /^Select "/ });
    await rows.first().waitFor();
    const count = await rows.count();
    if (count < 2) throw new Error(`The story needs 2 critical issues to tick, but the page shows ${count}.`);
    await page.waitForTimeout(800);
    await rows.nth(0).check();
    await page.waitForTimeout(700);
    await rows.nth(1).check();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Mark as fixed" }).click();
    await page.waitForTimeout(2000);
  } finally {
    // The video file is only complete once the page has closed.
    await context.close();
  }

  await video.saveAs(RAW);
  await video.delete();
  await browser.close();
  await rm(TMP, { recursive: true, force: true });
}

// ffmpeg prints the clip length on stderr (and exits non-zero because we give it no output file).
async function durationOf(file) {
  const result = await run(ffmpegPath, ["-i", file]).catch((error) => error);
  const match = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(result.stderr ?? "");
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : null;
}

const megabytes = async (file) => `${((await stat(file)).size / 1024 / 1024).toFixed(2)} MB`;

await record();
console.log(`Recorded ${RAW} (${await megabytes(RAW)})`);

if (encode) {
  const mp4 = `${OUT}/demo.mp4`;
  const gif = `${OUT}/demo.gif`;
  // H.264 with yuv420p plays everywhere (QuickTime, phones, LinkedIn); faststart lets it play before it finishes loading.
  await run(ffmpegPath, ["-y", "-i", RAW, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", mp4]);
  // A GIF only has 256 colors, so a palette made from this very video keeps it from looking muddy.
  await run(ffmpegPath, [
    "-y",
    "-i",
    RAW,
    "-vf",
    "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
    "-loop",
    "0",
    gif,
  ]);

  const seconds = await durationOf(mp4);
  console.log(`\nClip length: ${seconds === null ? "unknown" : `${seconds.toFixed(1)} s`}`);
  console.log(`demo.mp4  ${await megabytes(mp4)}`);
  console.log(`demo.gif  ${await megabytes(gif)}`);
}
