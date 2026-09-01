import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const staticDirectory = join(process.cwd(), ".next", "static");
const forbidden = [
  ["Supabase service-role key reference", /SUPABASE_SERVICE_ROLE_KEY/i],
  ["Paystack secret reference", /PAYSTACK_SECRET_KEY/i],
  ["secret Supabase key", /sb_secret_[A-Za-z0-9_-]+/],
  ["Paystack secret value", /(?:sk_test_|sk_live_|whsec_)[A-Za-z0-9_-]+/],
];

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else files.push(path);
  }
  return files;
}

const files = await filesIn(staticDirectory).catch(() => []);
if (!files.length) throw new Error("Build the app before running the client bundle check");
const findings = [];
for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const [label, pattern] of forbidden) if (pattern.test(content)) findings.push(`${label} in ${file.replace(`${process.cwd()}/`, "")}`);
}
if (findings.length) {
  for (const finding of findings) console.error(`client bundle error: ${finding}`);
  process.exit(1);
}
console.log(`client bundle check passed (${files.length} static files scanned)`);
