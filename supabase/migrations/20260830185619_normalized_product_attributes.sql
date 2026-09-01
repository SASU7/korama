-- Product detail fields are data, not UI-only fixture constants. Keep optional
-- attributes JSON extensible while the core catalogue columns remain typed.
alter table public.products
  add column if not exists attributes jsonb not null default '{}'::jsonb;
