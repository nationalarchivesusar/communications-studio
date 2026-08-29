"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(__dirname, "identity-logo-sources.json");
const outputDir = path.join(root, "assets", "identity-logos");
const sources = require(sourcePath);
const userAgent = "USAR-Communications-Studio/1.0 (publishing identity asset sync)";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sourceUrl(source) {
  if (/^https:\/\//i.test(String(source || ""))) return String(source);
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(source)}?width=768`;
}

async function fetchImage(id, source) {
  const url = sourceUrl(source);
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": userAgent, Accept: "image/*,*/*;q=0.8" }
    });
    if (response.ok) return response;
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 6) {
      throw new Error(`${id}: source returned HTTP ${response.status} (${source})`);
    }
    const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
    const delay = Number.isFinite(retryAfter)
      ? Math.max(1000, retryAfter * 1000)
      : Math.min(30_000, 1500 * (2 ** (attempt - 1)));
    console.warn(`${id}: HTTP ${response.status}; retrying in ${delay}ms (attempt ${attempt}/6)`);
    await sleep(delay);
  }
  throw new Error(`${id}: source download retries exhausted (${source})`);
}

async function download(id, source) {
  const response = await fetchImage(id, source);
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
  console.log(`${id}: ${source} -> ${path.relative(root, output)} (${metadata.width}x${metadata.height})`);
}

(async () => {
  await fs.mkdir(outputDir, { recursive: true });
  const entries = Object.entries(sources);
  if (entries.length !== 41) throw new Error(`Expected 41 publishing identity logos, found ${entries.length}`);
  for (const [id, source] of entries) {
    await download(id, source);
    await sleep(750);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
