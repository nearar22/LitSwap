// One-off SVG -> PNG converter for X assets.
// Run: npx --yes -p sharp@0.33 node branding/convert.mjs
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function render(svgFile, pngFile, width, height) {
  const svg = await readFile(join(__dirname, svgFile));
  const png = await sharp(svg, { density: 300 })
    .resize(width, height, { fit: "cover", background: "#0d1426" })
    .flatten({ background: "#0d1426" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(__dirname, pngFile), png);
  console.log(`✓ ${pngFile}  (${width}x${height})`);
}

await render("x-avatar.svg", "x-avatar.png", 1024, 1024);
await render("x-banner.svg", "x-banner.png", 1500, 500);
await render("litswap_banner_v2.svg", "litswap_banner_v2.png", 1500, 500);
