"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(__dirname, "identity-logo-sources.json");
const outputDir = path.join(root, "assets", "identity-logos");
const sources = require(sourcePath);
const userAgent = "USAR-Communications-Studio/1.0 (publishing identity asset sync)";

function commonsUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(filename)}?width=768`;
}

async function download(id, filename) {
  const url = commonsUrl(filename);
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": userAgent, Accept: "image/*,*/*;q=0.8" }
  });
  if (!response.ok) throw new Error(`${id}: source returned HTTP ${response.status} (${filename})`);
  const raw = Buffer.from(await response.arrayBuffer());
  if (!raw.length || raw.length > 12 * 1024 * 1024) throw new Error(`${id}: invalid source size ${raw.length}`);

  const output = path.join(outputDir, `${id}.png`);
  await sharp(raw, { density: 192, limitInputPixels: 100_000_000 })
    .resize(512, 512, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
  const metadata = await sharp(output).metadata();
  if (metadata.format !== "png" || !metadata.width || !metadata.height) throw new Error(`${id}: generated logo is not a valid PNG`);
  console.log(`${id}: ${filename} -> ${path.relative(root, output)} (${metadata.width}x${metadata.height})`);
}

(async () => {
  await fs.mkdir(outputDir, { recursive: true });
  const entries = Object.entries(sources);
  if (entries.length !== 40) throw new Error(`Expected 40 publishing identity logos, found ${entries.length}`);
  for (const [id, filename] of entries) await download(id, filename);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
