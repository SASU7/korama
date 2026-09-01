import { readFile } from "node:fs/promises";

const localEnv = await readFile(".env", "utf8").catch(() => "");
for (const line of localEnv.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYSTACK_SECRET_KEY",
  "NEXT_PUBLIC_MAPBOX_TOKEN",
];
const errors = required.filter((name) => !process.env[name]?.trim()).map((name) => `${name} is required`);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
if (url && url !== "https://cmusntqsaatsxndltdxe.supabase.co") errors.push("NEXT_PUBLIC_SUPABASE_URL must point to WILSHUB-Engine (cmusntqsaatsxndltdxe)");
if (url?.includes("localhost") || url?.includes("127.0.0.1")) errors.push("Local Supabase URLs are not allowed");
if (process.env.PAYSTACK_SECRET_KEY && !process.env.PAYSTACK_SECRET_KEY.startsWith("sk_test_")) errors.push("PAYSTACK_SECRET_KEY must be a Paystack test key for this POC");
if (process.env.NEXT_PUBLIC_MAPBOX_TOKEN && !process.env.NEXT_PUBLIC_MAPBOX_TOKEN.startsWith("pk.")) errors.push("NEXT_PUBLIC_MAPBOX_TOKEN must be a public Mapbox token");
if (errors.length) {
  errors.forEach((error) => console.error(`env error: ${error}`));
  process.exit(1);
}
console.log("environment check passed: WILSHUB-Engine, Google/Supabase Auth, Paystack test mode, and Mapbox are configured");
