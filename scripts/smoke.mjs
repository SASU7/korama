/**
 * Structural smoke check.
 *
 * The previous version grepped a single 2000-line client component and
 * app/globals.css for implementation details (`aria-expanded`, specific media
 * queries, the string "KORAMA-DEMO" in the README). That coupled the check to
 * one file's internals — it went red the moment the demo access gate was
 * removed, and stayed red. This version asserts the properties we actually
 * care about, across the whole tree.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const fail = (message) => {
  throw new Error(message);
};

async function walk(dir, out = []) {
  for (const entry of await readdir(dir)) {
    const path = join(dir, entry);
    if ((await stat(path)).isDirectory()) await walk(path, out);
    else if (/\.tsx?$/.test(path)) out.push(path);
  }
  return out;
}

// 1. Required files exist and are non-empty.
const required = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "app/fonts.ts",
  "components.json",
  "docs/product-spec.md",
  "docs/technical-architecture.md",
  "docs/agent-workstreams.md",
];
for (const file of required) {
  if (!(await readFile(file, "utf8")).trim()) fail(`${file} is empty`);
}

// 2. Both route groups are wired.
for (const file of [
  "app/(shop)/layout.tsx",
  "app/(workspace)/layout.tsx",
  "app/(shop)/access-denied/page.tsx",
]) {
  await readFile(file, "utf8").catch(() => fail(`missing route file: ${file}`));
}

// 3. The token layer defines light and dark, and the density scopes.
const css = await readFile("app/globals.css", "utf8");
for (const marker of [
  ":root {",
  ".dark {",
  "@theme inline",
  '[data-density="comfortable"]',
  '[data-density="compact"]',
  "prefers-reduced-motion: reduce",
  "--gold:",
  "--ring:",
]) {
  if (!css.includes(marker)) fail(`missing token marker: ${marker}`);
}

// 4. Anti-slop rules that can be checked mechanically. `legacy.css` is exempt
//    until PrototypeWorkspace.tsx is deleted.
const sources = [
  ...(await walk("app")),
  ...(await walk("components")),
  ...(await walk("lib")),
];
for (const file of sources) {
  const body = await readFile(file, "utf8");
  if (/transition:\s*all|transition-all/.test(body))
    fail(`${file}: use explicit transition properties, not transition-all`);
  if (/#000000\b|#000\b(?!")/.test(body.replace(/\/\*[\s\S]*?\*\//g, "")))
    fail(`${file}: pure black is not a token in this palette`);
}

// 5. Accessibility affordances survive somewhere in the tree.
const allSource = (
  await Promise.all(sources.map((f) => readFile(f, "utf8")))
).join("\n");
for (const marker of ['aria-busy', 'aria-current', 'role="alert"', 'sr-only']) {
  if (!allSource.includes(marker)) fail(`missing accessibility marker: ${marker}`);
}

// 6. Product boundaries the spec requires stay visible in the UI.
for (const marker of ["Ghana origin", "Direct import", "test mode"]) {
  if (!allSource.toLowerCase().includes(marker.toLowerCase()))
    fail(`missing product marker: ${marker}`);
}

// 7. Server-only modules never leak into a client component.
for (const file of sources) {
  const body = await readFile(file, "utf8");
  if (!body.startsWith('"use client"')) continue;
  for (const forbidden of [
    "@/lib/supabase/normalized-adapter",
    "@/lib/supabase/admin-client",
    "@/lib/auth-guards",
  ]) {
    if (body.includes(forbidden))
      fail(`${file} is a client component and must not import ${forbidden}`);
  }
}

console.log(
  `smoke ok: ${required.length} required files, ${sources.length} sources scanned, token/a11y/boundary markers checked`,
);
