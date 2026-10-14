-- Apply only after deploying the RETURNING-based bulk operation fix.
-- For pre-optimization Worker rollback, remove these triggers first.
CREATE TABLE IF NOT EXISTS public_catalog_revision (id INTEGER PRIMARY KEY CHECK(id=1), revision TEXT NOT NULL);
--> statement-breakpoint
INSERT OR IGNORE INTO public_catalog_revision(id,revision) VALUES (1,lower(hex(randomblob(16))));
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_products_insert AFTER INSERT ON products BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_products_update AFTER UPDATE ON products BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_products_delete AFTER DELETE ON products BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_categories_insert AFTER INSERT ON categories BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_categories_update AFTER UPDATE ON categories BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_categories_delete AFTER DELETE ON categories BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_reviews_insert AFTER INSERT ON reviews WHEN (NEW.visible=1 AND NEW.deleted_at IS NULL) BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_reviews_update AFTER UPDATE ON reviews WHEN (OLD.visible=1 AND OLD.deleted_at IS NULL) OR (NEW.visible=1 AND NEW.deleted_at IS NULL) BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_reviews_delete AFTER DELETE ON reviews WHEN (OLD.visible=1 AND OLD.deleted_at IS NULL) BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_faqs_insert AFTER INSERT ON faqs BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_faqs_update AFTER UPDATE ON faqs BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_faqs_delete AFTER DELETE ON faqs BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_posts_insert AFTER INSERT ON posts BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_posts_update AFTER UPDATE ON posts BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_posts_delete AFTER DELETE ON posts BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_settings_insert AFTER INSERT ON settings WHEN NEW.key='presentation_v1' BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_settings_update AFTER UPDATE ON settings WHEN OLD.key='presentation_v1' OR NEW.key='presentation_v1' BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS public_catalog_settings_delete AFTER DELETE ON settings WHEN OLD.key='presentation_v1' BEGIN UPDATE public_catalog_revision SET revision=lower(hex(randomblob(16))) WHERE id=1; END;
