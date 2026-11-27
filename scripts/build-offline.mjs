import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const files = (await readdir("dist/assets")).map((f) => "/assets/" + f);
const shell = [
  "/",
  "/director",
  "/display",
  "/editor",
  "/documents",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/sample-production.json",
  ...files,
];
const version = createHash("sha256")
  .update(files.join("|"))
  .digest("hex")
  .slice(0, 12);
let source = await readFile("public/sw.js", "utf8");
source = source.replace(/const CACHE = .*?;/, `const CACHE = ${JSON.stringify("hulog-" + version)};`);
source = source.replace(/cache\.addAll\(\[[\s\S]*?\]\)/, `cache.addAll(${JSON.stringify(shell)})`);
if(!source.includes(files[0])) throw new Error('Offline asset injection failed');
await writeFile("dist/sw.js", source);
console.log(`Offline cache prepared: ${shell.length} files (${version}).`);
