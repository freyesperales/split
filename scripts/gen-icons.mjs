// Generate PNG icons from public/icon.svg into public/icon-192.png and icon-512.png.
// Optional — only runs if `sharp` is installed. Skips silently otherwise.
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const svgPath = path.join(root, "public", "icon.svg");

async function main() {
  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    console.log("[gen-icons] sharp not installed — skipping. SVG icon is enough for most PWAs.");
    return;
  }
  const svg = await fs.readFile(svgPath);
  for (const size of [192, 512]) {
    const out = path.join(root, "public", `icon-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`[gen-icons] wrote ${out}`);
  }
  // Apple touch icon (180 is standard).
  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile(path.join(root, "public", "apple-icon.png"));
}

main().catch((e) => {
  console.error("[gen-icons] failed", e);
  process.exit(0); // non-fatal
});
