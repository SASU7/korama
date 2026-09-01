/**
 * Grant (or revoke) the administrator role.
 *
 *   pnpm admin:grant you@example.com
 *   pnpm admin:grant you@example.com --revoke
 *
 * Uses the service-role key, so it must only ever run locally or in a trusted
 * shell. It resolves the auth user by email, makes sure a profile row exists,
 * then inserts the role assignment.
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const email = process.argv[2];
const revoke = process.argv.includes("--revoke");
if (!email || !email.includes("@")) {
  console.error("usage: pnpm admin:grant <email> [--revoke]");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "content-type": "application/json",
};

async function api(path, init = {}) {
  const response = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} -> ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

// 1. Find the auth user. They must have signed in at least once.
const { users } = await api(`/auth/v1/admin/users?page=1&per_page=200`);
const user = users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(
    `No Supabase auth user for ${email}.\n` +
      `Sign in with Google at /auth/sign-in once, then run this again.`,
  );
  process.exit(1);
}

// 2. A profile row must exist for the foreign key on role_assignments.
const profiles = await api(`/rest/v1/profiles?select=id&id=eq.${user.id}`);
if (!profiles.length) {
  console.error(
    `${email} has an auth user but no profile row. Sign in once so\n` +
      `ensureConsumerProfile can create it, then run this again.`,
  );
  process.exit(1);
}

if (revoke) {
  await api(`/rest/v1/role_assignments?profile_id=eq.${user.id}&role=eq.administrator`, {
    method: "DELETE",
  });
  console.log(`revoked administrator from ${email}`);
} else {
  const existing = await api(
    `/rest/v1/role_assignments?select=id&profile_id=eq.${user.id}&role=eq.administrator`,
  );
  if (existing.length) {
    console.log(`${email} already holds administrator`);
  } else {
    await api(`/rest/v1/role_assignments`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ profile_id: user.id, role: "administrator" }),
    });
    console.log(`granted administrator to ${email}`);
  }
}

const roles = await api(`/rest/v1/role_assignments?select=role&profile_id=eq.${user.id}`);
console.log(`roles now: ${roles.map((r) => r.role).join(", ") || "(none)"}`);
