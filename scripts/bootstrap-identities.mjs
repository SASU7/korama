import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.KORAMA_SEED_PASSWORD;
if (!url || !serviceRoleKey || !password) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and KORAMA_SEED_PASSWORD before bootstrapping identities");

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const identities = [
  { email: process.env.KORAMA_CONSUMER_EMAIL ?? "korama-consumer@example.test", displayName: "Nigerian consumer", role: "consumer", opco: "10000000-0000-0000-0000-000000000002", market: "20000000-0000-0000-0000-000000000002" },
  { email: process.env.KORAMA_WAREHOUSE_EMAIL ?? "korama-warehouse@example.test", displayName: "Warehouse + compliance", role: "warehouse_operator", opco: "10000000-0000-0000-0000-000000000002", market: "20000000-0000-0000-0000-000000000002" },
  { email: process.env.KORAMA_SAFETY_EMAIL ?? "korama-safety@example.test", displayName: "Drone safety officer", role: "safety_officer", opco: "10000000-0000-0000-0000-000000000002", market: "20000000-0000-0000-0000-000000000002" },
];

const { data: existing, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;
for (const identity of identities) {
  let user = existing.users.find((candidate) => candidate.email?.toLowerCase() === identity.email.toLowerCase());
  if (!user) {
    const result = await supabase.auth.admin.createUser({ email: identity.email, password, email_confirm: true, app_metadata: { korama_roles: [identity.role] } });
    if (result.error || !result.data.user) throw result.error ?? new Error(`Could not create ${identity.email}`);
    user = result.data.user;
  } else {
    const result = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true, app_metadata: { korama_roles: [identity.role] } });
    if (result.error) throw result.error;
  }
  const profile = await supabase.from("profiles").upsert({ id: user.id, display_name: identity.displayName, operating_company_id: identity.opco, market_id: identity.market }, { onConflict: "id" }).select("id").single();
  if (profile.error) throw profile.error;
  const assignment = await supabase.from("role_assignments").upsert({ profile_id: user.id, role: identity.role }, { onConflict: "profile_id,role" });
  if (assignment.error) throw assignment.error;
  console.log(`bootstrapped ${identity.role}: ${identity.email}`);
}
