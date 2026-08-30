-- Tenant metadata is a server-side governance record. The original foundation
-- policy also allowed a profile to read its tenant, which contradicted the
-- server-only grant boundary.
drop policy if exists tenant_profile_is_readable on public.tenants;
