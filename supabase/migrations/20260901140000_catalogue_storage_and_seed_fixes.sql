-- Catalogue image storage, plus two seed corrections that have to reach any
-- already-provisioned project (seed.sql only runs on a local `db reset`).

-- ---------------------------------------------------------------------------
-- 1. The `catalogue` bucket
--
-- Public read: product photographs are public content, and serving them from
-- the public object endpoint avoids a signed-URL round trip on every card in
-- the grid. Writes are service-role only — uploads go through a server action
-- using the admin client, never from the browser.
--
-- media.storage_path already stores values like "catalogue/nk-shea-balm.webp",
-- so the first segment is the bucket and the rest is the object key. That maps
-- straight onto /storage/v1/object/public/<storage_path>.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogue',
  'catalogue',
  true,
  5242880, -- 5 MB; a 1200x1500 WebP product shot is well under 200 KB
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may read a catalogue image; nobody but service_role may write one.
drop policy if exists "catalogue images are publicly readable" on storage.objects;
create policy "catalogue images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'catalogue');

-- No insert/update/delete policy is created for anon or authenticated on
-- purpose. service_role bypasses RLS, so the server action can write while a
-- browser session cannot, even with a leaked anon key.
drop policy if exists "catalogue images are not client-writable" on storage.objects;

-- ---------------------------------------------------------------------------
-- 2. Ghana is catalogue-only
--
-- market_configs said checkout_enabled = true for Ghana, but
-- validateDeliveryAddress, korama_create_order and the product spec all reject
-- any non-Nigerian delivery address. The data contradicted every code path.
-- ---------------------------------------------------------------------------
update public.market_configs mc
   set checkout_enabled = false,
       tax_duty_status = 'Catalogue only; Nigerian delivery addresses only'
  from public.markets m
 where m.id = mc.market_id
   and m.code = 'GH'
   and mc.checkout_enabled;

-- ---------------------------------------------------------------------------
-- 3. Inventory for the listings that had none
--
-- Only the shea balm and the blender carried stock, because the demo only ever
-- bought shea balm. Any multi-line order containing anything else could never
-- be allocated. AF-COCOA-GRANOLA is deliberately left without a batch: it is
-- the fixture that proves allocation is all-or-nothing.
-- ---------------------------------------------------------------------------
insert into public.inventory_batches
  (id, reference, product_id, site_id, operating_company_id, inventory_class,
   expiry_date, quantity, allocated, quarantined, customs_cleared, origin_supported)
values
  ('43000000-0000-0000-0000-000000000006', 'NK-DO-2408', '30000000-0000-0000-0000-000000000004', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'ghana_origin_export', '2027-04-12', 18, 0, false, true, true),
  ('43000000-0000-0000-0000-000000000007', 'AW-KT-18',   '30000000-0000-0000-0000-000000000005', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'ghana_origin_export', null,         9,  0, false, true, true),
  ('43000000-0000-0000-0000-000000000008', 'DI-NG-074',  '30000000-0000-0000-0000-000000000007', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'direct_import',       null,        14,  0, false, true, false),
  ('43000000-0000-0000-0000-000000000009', 'TB-24-11',   '30000000-0000-0000-0000-000000000008', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'ghana_origin_export', null,         5,  0, false, true, true)
on conflict (id) do nothing;

insert into public.inventory_balances
  (id, batch_id, site_id, operating_company_id, available_quantity, reserved_quantity)
values
  ('65000000-0000-0000-0000-000000000006', '43000000-0000-0000-0000-000000000006', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 18, 0),
  ('65000000-0000-0000-0000-000000000007', '43000000-0000-0000-0000-000000000007', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',  9, 0),
  ('65000000-0000-0000-0000-000000000008', '43000000-0000-0000-0000-000000000008', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 14, 0),
  ('65000000-0000-0000-0000-000000000009', '43000000-0000-0000-0000-000000000009', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',  5, 0)
on conflict (id) do nothing;
