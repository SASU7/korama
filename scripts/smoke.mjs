import { readFile } from "node:fs/promises";

const files = ["app/layout.tsx", "app/page.tsx", "app/globals.css", "docs/product-spec.md", "docs/technical-architecture.md", "docs/agent-workstreams.md"];
for (const file of files) {
  const contents = await readFile(file, "utf8");
  if (!contents.trim()) throw new Error(`${file} is empty`);
}
const page = `${await readFile("app/page.tsx", "utf8")}\n${await readFile("components/PrototypeWorkspace.tsx", "utf8")}`;
const styles = await readFile("app/globals.css", "utf8");
const README = await readFile("README.md", "utf8");
if (!README.includes("KORAMA-DEMO")) throw new Error("missing smoke marker: KORAMA-DEMO");
for (const marker of ["Nigeria", "Ghana-origin", "Roadmap", "Server-guided identity"]) {
  if (!page.includes(marker)) throw new Error(`missing smoke marker: ${marker}`);
}
for (const marker of ["@media (max-width: 900px)", "@media (max-width: 640px)", "prefers-reduced-motion: reduce"]) {
  if (!styles.includes(marker)) throw new Error(`missing responsive smoke marker: ${marker}`);
}
for (const marker of ["aria-busy", "aria-expanded", "aria-pressed", "role=\"alert\""]) {
  if (!page.includes(marker)) throw new Error(`missing accessibility smoke marker: ${marker}`);
}
console.log(`smoke ok: ${files.length} files, ${5} contract markers, responsive and accessibility markers checked`);
