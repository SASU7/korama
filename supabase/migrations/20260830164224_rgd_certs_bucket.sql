-- Preserve the certificate-preview bucket as a private, bounded container. The
-- application only exposes watermarked previews; no public object access is
-- granted by this migration.
insert into storage.buckets (id, name, public, file_size_limit)
values ('rgd-certs', 'rgd-certs', false, 10485760)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760;
