import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const rootDir = path.resolve(import.meta.dirname, "..");
const sourceSvgPath = path.resolve(rootDir, "..", "assets", "glance_logo.svg");
const outputDir = path.resolve(rootDir, "public", "icons");
const sizes = [16, 48, 128];

const svgSource = await readFile(sourceSvgPath, "utf8");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();

try {
  const page = await browser.newPage();

  for (const size of sizes) {
    const scaledSvg = svgSource.replace('width="100%"', `width="${size}" height="${size}"`);

    await page.setViewportSize({
      width: size,
      height: size
    });

    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:#0d0d1f;display:grid;place-items:center;width:${size}px;height:${size}px;overflow:hidden;">${scaledSvg}</body></html>`
    );

    await page.locator("body").screenshot({
      path: path.join(outputDir, `glance-${size}.png`),
      omitBackground: false
    });
  }
} finally {
  await browser.close();
}
