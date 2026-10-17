-- Run atomically BEFORE rolling back to a Worker released before cost optimization.
-- Retains all business content, uploaded image metadata, and audit records.
DROP TRIGGER IF EXISTS public_catalog_products_insert;
DROP TRIGGER IF EXISTS public_catalog_products_update;
DROP TRIGGER IF EXISTS public_catalog_products_delete;
DROP TRIGGER IF EXISTS public_catalog_categories_insert;
DROP TRIGGER IF EXISTS public_catalog_categories_update;
DROP TRIGGER IF EXISTS public_catalog_categories_delete;
DROP TRIGGER IF EXISTS public_catalog_reviews_insert;
DROP TRIGGER IF EXISTS public_catalog_reviews_update;
DROP TRIGGER IF EXISTS public_catalog_reviews_delete;
DROP TRIGGER IF EXISTS public_catalog_faqs_insert;
DROP TRIGGER IF EXISTS public_catalog_faqs_update;
DROP TRIGGER IF EXISTS public_catalog_faqs_delete;
DROP TRIGGER IF EXISTS public_catalog_posts_insert;
DROP TRIGGER IF EXISTS public_catalog_posts_update;
DROP TRIGGER IF EXISTS public_catalog_posts_delete;
DROP TRIGGER IF EXISTS public_catalog_settings_insert;
DROP TRIGGER IF EXISTS public_catalog_settings_update;
DROP TRIGGER IF EXISTS public_catalog_settings_delete;
DROP TABLE IF EXISTS public_catalog_revision;
