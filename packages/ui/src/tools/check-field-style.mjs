#!/usr/bin/env node
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const BLOCK = /<FormField\b[\s\S]*?<\/FormField>/g;
const PLAIN_LABEL = /<FormLabel\b/;
const TEXT_CONTROL =
  /<(Input|Textarea|Select|DatePicker|Combobox|NumberField)\b/;
const TOGGLE_CONTROL = /<(Checkbox|Switch|RadioGroup)\b/;

export function findPlainLabelFields(source) {
  const found = [];
  for (const match of source.matchAll(BLOCK)) {
    const block = match[0];
    if (
      PLAIN_LABEL.test(block) &&
      TEXT_CONTROL.test(block) &&
      !TOGGLE_CONTROL.test(block)
    ) {
      const line = source.slice(0, match.index).split("\n").length;
      const name = block.match(/\bname="([^"]+)"/)?.[1] ?? "?";
      found.push({ line, name });
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
  let count = 0;
  for (const root of process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["src"]) {
    for (const file of walk(root)) {
      for (const hit of findPlainLabelFields(readFileSync(file, "utf8"))) {
        console.log(
          `${file}:${hit.line}: field "${hit.name}" uses FormLabel; use FloatingField`,
        );
        count += 1;
      }
    }
  }
  process.exit(count > 0 ? 1 : 0);
}
