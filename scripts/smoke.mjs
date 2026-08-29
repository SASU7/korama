import { readFile } from "node:fs/promises";

const files = ["app/layout.tsx", "app/page.tsx", "app/globals.css", "docs/product-spec.md", "docs/technical-architecture.md", "docs/agent-workstreams.md"];
for (const file of files) {
  const contents = await readFile(file, "utf8");
  if (!contents.trim()) throw new Error(`${file} is empty`);
}
const page = `${await readFile("app/page.tsx", "utf8")}\n${await readFile("components/PrototypeWorkspace.tsx", "utf8")}`;
for (const marker of ["KORAMA-DEMO", "Nigeria", "Ghana-origin", "Roadmap", "Simulated guided identity"]) {
  if (!page.includes(marker)) throw new Error(`missing smoke marker: ${marker}`);
}
console.log(`smoke ok: ${files.length} files and ${5} contract markers checked`);
