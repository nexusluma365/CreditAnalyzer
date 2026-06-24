#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ASSETS = join(ROOT, "assets");

buildIcns();
buildIco();

function buildIcns() {
  const chunks = [
    ["icp4", "icon.iconset/icon_16x16.png"],
    ["icp5", "icon.iconset/icon_32x32.png"],
    ["icp6", "icon.iconset/icon_32x32@2x.png"],
    ["ic07", "icon.iconset/icon_128x128.png"],
    ["ic08", "icon.iconset/icon_256x256.png"],
    ["ic09", "icon.iconset/icon_512x512.png"],
    ["ic10", "icon.iconset/icon_512x512@2x.png"],
  ].map(([type, file]) => {
    const data = readFileSync(join(ASSETS, file));
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, "ascii");
    header.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([header, data]);
  });

  const totalLength = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(totalLength, 4);
  writeFileSync(join(ASSETS, "icon.icns"), Buffer.concat([header, ...chunks]));
}

function buildIco() {
  const images = [
    [16, "icon.iconset/icon_16x16.png"],
    [32, "icon.iconset/icon_32x32.png"],
    [48, "icon-48.png"],
    [64, "icon-64.png"],
    [128, "icon-128.png"],
    [256, "icon-256.png"],
  ].map(([size, file]) => ({ size: Number(size), data: readFileSync(join(ASSETS, String(file))) }));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  writeFileSync(join(ASSETS, "icon.ico"), Buffer.concat([header, ...entries, ...images.map((image) => image.data)]));
}
