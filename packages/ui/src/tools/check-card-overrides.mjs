#!/usr/bin/env node
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const TAG = /<(Card|CardHeader|CardFooter|CardTitle)\b[^>]*?\bclass="([^"]*)"/g;
const OVERRIDE = /(^|\s)(gap-0|py-0|text-(xs|sm|base|lg|xl|2xl|3xl))(?=\s|$)/;
const BACKGROUND = /(^|\s)bg-[^\s]+/;

export function findCardOverrides(source) {
  const found = [];
  for (const match of source.matchAll(TAG)) {
    const className = match[2].trim();
    const tintable = match[1] === "CardHeader" || match[1] === "CardFooter";
    if (OVERRIDE.test(className) || (tintable && BACKGROUND.test(className))) {
      found.push({ tag: match[1], className });
    }
  }
  return found;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules") return [];
    return statSync(path).isDirectory()
      ? walk(path)
      : path.endsWith(".vue")
        ? [path]
        : [];
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  const root = process.argv[2] ?? "src";
  let count = 0;
  for (const file of walk(root)) {
    for (const hit of findCardOverrides(readFileSync(file, "utf8"))) {
      console.log(`${file}: ${hit.tag} class="${hit.className}"`);
      count += 1;
    }
  }
  process.exit(count > 0 ? 1 : 0);
}
