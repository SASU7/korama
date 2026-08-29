insert into public.operating_companies (id, reference, legal_name, country_code) values
  ('10000000-0000-0000-0000-000000000001', 'KOR-GH-OPCO', 'Korama Ghana Trading Ltd', 'GH'),
  ('10000000-0000-0000-0000-000000000002', 'KOR-NG-OPCO', 'Korama Nigeria Trading Ltd', 'NG')
on conflict (id) do nothing;

insert into public.markets (id, code, name, currency, language, status, launch_phase, localization_required) values
  ('20000000-0000-0000-0000-000000000001', 'GH', 'Ghana', 'GHS', 'en', 'active', 1, null),
  ('20000000-0000-0000-0000-000000000002', 'NG', 'Nigeria', 'NGN', 'en', 'active', 1, null),
  ('20000000-0000-0000-0000-000000000003', 'CI', 'Côte d’Ivoire', 'XOF', 'fr', 'roadmap', 2, 'French'),
  ('20000000-0000-0000-0000-000000000004', 'SN', 'Senegal', 'XOF', 'fr', 'roadmap', 2, 'French'),
  ('20000000-0000-0000-0000-000000000005', 'TG', 'Togo', 'XOF', 'fr', 'roadmap', 3, 'French'),
  ('20000000-0000-0000-0000-000000000006', 'BJ', 'Benin', 'XOF', 'fr', 'roadmap', 3, 'French'),
  ('20000000-0000-0000-0000-000000000007', 'GN', 'Guinea', 'GNF', 'fr', 'roadmap', 4, 'French')
on conflict (id) do nothing;

insert into public.products (id, reference, name, category, producer, inventory_class, description, weight_grams) values
  ('30000000-0000-0000-0000-000000000001', 'NK-SHEA-BALM', 'Nokware shea repair balm', 'Beauty', 'Nokware Skincare · Ghana', 'ghana_origin_export', 'Ghana-origin shea balm for the deep demo order.', 180),
  ('30000000-0000-0000-0000-000000000002', 'DI-NG-BLENDER', 'Compact kitchen blender', 'Home & craft', 'Global supplier · cleared in Nigeria', 'direct_import', 'Direct-import comparison product.', 1900),
  ('30000000-0000-0000-0000-000000000003', 'FM-ROADMAP-LISTING', 'Future maker marketplace listing', 'Home & craft', 'Third-party seller · roadmap', 'marketplace_future', 'Roadmap-only marketplace listing.', 100)
on conflict (id) do nothing;

insert into public.products (id, reference, name, category, producer, inventory_class, description, weight_grams) values
  ('30000000-0000-0000-0000-000000000004', 'NK-SHEA-OIL', 'Nokware daily body oil', 'Beauty', 'Nokware Skincare · Ghana', 'ghana_origin_export', 'Ghana-origin body oil.', 220),
  ('30000000-0000-0000-0000-000000000005', 'AW-KENTE-TOTE', 'Handwoven Kente market tote', 'Fashion', 'Ahenema Weavers · Kumasi', 'ghana_origin_export', 'Woven and finished in Ghana.', 420),
  ('30000000-0000-0000-0000-000000000006', 'AF-COCOA-GRANOLA', 'Cocoa nib breakfast granola', 'Pantry', 'Atinka Foods · Tema', 'ghana_origin_export', 'Mixed, baked, and packed in Ghana.', 350),
  ('30000000-0000-0000-0000-000000000007', 'DI-NG-SCARF', 'Linen travel scarf', 'Fashion', 'Global supplier · cleared in Nigeria', 'direct_import', 'Direct-import comparison product.', 180),
  ('30000000-0000-0000-0000-000000000008', 'TB-BOLGA-BASKET', 'Bolga storage basket', 'Home & craft', 'Tamale Basket Collective · Ghana', 'ghana_origin_export', 'Woven and finished in Ghana.', 650),
  ('30000000-0000-0000-0000-000000000009', 'VCW-COCOA-POWDER', 'Single-origin cocoa powder', 'Pantry', 'Volta Cocoa Works · Ghana', 'ghana_origin_export', 'Fermented, roasted, milled, and packed in Ghana.', 500),
  ('30000000-0000-0000-0000-000000000010', 'DI-GH-LAMP', 'Rattan reading lamp', 'Home & craft', 'Global supplier · cleared in Ghana', 'direct_import', 'Direct-import comparison product.', 1100)
on conflict (id) do nothing;

insert into public.market_listings (product_id, market_id, operating_company_id, price_minor, currency, purchasable) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 485000, 'NGN', true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 2150000, 'NGN', true),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 0, 'NGN', false)
on conflict (product_id, market_id) do nothing;

insert into public.market_listings (product_id, market_id, operating_company_id, price_minor, currency, purchasable) values
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 620000, 'NGN', true),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 950000, 'NGN', true),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 380000, 'NGN', true),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 730000, 'NGN', true),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 760000, 'NGN', true),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 440000, 'GHS', true),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1120000, 'GHS', true)
on conflict (product_id, market_id) do nothing;

insert into public.market_configs (market_id, operating_company_id, checkout_enabled, language, tax_duty_status) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', true, 'en', 'Illustrative pilot validation required'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', true, 'en', 'Illustrative pilot validation required'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', false, 'fr', 'Roadmap; French localization required'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', false, 'fr', 'Roadmap; French localization required')
on conflict (market_id, operating_company_id) do nothing;

insert into public.ports_nodes (id, reference, name, market_id, operating_company_id, node_type) values
  ('40000000-0000-0000-0000-000000000001', 'KOR-TEMA-STAGING', 'Tema export staging', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'staging'),
  ('40000000-0000-0000-0000-000000000002', 'KOR-LEKKI-WH', 'Lekki destination warehouse', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'warehouse'),
  ('40000000-0000-0000-0000-000000000003', 'KOR-LEKKI-HUB', 'Fictional Lekki micro-hub', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'micro_hub')
on conflict (id) do nothing;

insert into public.trade_lanes (id, reference, origin_market_id, destination_market_id, operating_company_id, origin_node_id, destination_node_id, status) values
  ('41000000-0000-0000-0000-000000000001', 'KOR-GH-NG-EXPORT', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'active')
on conflict (id) do nothing;

insert into public.sites (id, reference, name, market_id, operating_company_id, site_type) values
  ('42000000-0000-0000-0000-000000000001', 'KOR-TEMA-STAGING-SITE', 'Tema staging site', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'staging'),
  ('42000000-0000-0000-0000-000000000002', 'KOR-LEKKI-WAREHOUSE-SITE', 'Lekki warehouse', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'warehouse'),
  ('42000000-0000-0000-0000-000000000003', 'KOR-LEKKI-MICRO-HUB-SITE', 'Fictional Lekki micro-hub', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'micro_hub')
on conflict (id) do nothing;

insert into public.inventory_batches (id, reference, product_id, site_id, operating_company_id, inventory_class, expiry_date, quantity, allocated, quarantined, customs_cleared, origin_supported) values
  ('43000000-0000-0000-0000-000000000001', 'NK-SB-2407', '30000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'ghana_origin_export', '2027-01-07', 42, 0, false, true, true),
  ('43000000-0000-0000-0000-000000000002', 'NK-SB-2401', '30000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'ghana_origin_export', '2026-08-02', 8, 0, false, true, true),
  ('43000000-0000-0000-0000-000000000003', 'NK-SB-QA', '30000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'ghana_origin_export', '2027-03-01', 4, 0, true, true, true)
on conflict (id) do nothing;

insert into public.origin_records (id, batch_id, operating_company_id, status) values
  ('44000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'provisionally_eligible')
on conflict (id) do nothing;

insert into public.transformation_records (id, origin_record_id, operating_company_id, summary, facility) values
  ('45000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Blended, filled, labelled, and batch-tested in Ghana', 'Nokware Skincare · Accra')
on conflict (id) do nothing;

insert into public.origin_evidence (id, origin_record_id, operating_company_id, evidence_type, description) values
  ('46000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'producer_invoice', 'Producer invoice · Nokware Skincare'),
  ('46000000-0000-0000-0000-000000000002', '44000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'transformation_log', 'Transformation log · batch NK-SB-2407'),
  ('46000000-0000-0000-0000-000000000003', '44000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'input_ledger', 'Input ledger · Ghana shea butter')
on conflict (id) do nothing;

insert into public.origin_assessments (id, batch_id, operating_company_id, status, transformation_summary, evidence, duty_quote) values
  ('47000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'provisionally_eligible', 'Blended, filled, labelled, and batch-tested in Ghana', '["Producer invoice", "Transformation log", "Input ledger"]'::jsonb, 'Illustrative: awaiting pilot validation')
on conflict (id) do nothing;

insert into public.duty_quotes (id, origin_assessment_id, operating_company_id, quote, status) values
  ('48000000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Illustrative: Ghana-origin qualification → duty treatment awaiting pilot validation', 'illustrative')
on conflict (id) do nothing;

insert into public.certificate_previews (id, origin_assessment_id, operating_company_id, watermark) values
  ('49000000-0000-0000-0000-000000000001', '47000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'DEMO — NOT A VALID CERTIFICATE')
on conflict (id) do nothing;
