DROP INDEX `idx_posts_public`;--> statement-breakpoint
ALTER TABLE `posts` ADD `pinned` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_posts_public` ON `posts` (`deleted_at`,`status`,`pinned`,`position`);--> statement-breakpoint
ALTER TABLE `products` ADD `best_seller` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_products_best_seller` ON `products` (`deleted_at`,`visible`,`best_seller`,`position`);--> statement-breakpoint
CREATE INDEX `idx_audit_entity_created` ON `audit_log` (`entity_type`,`created_at`);--> statement-breakpoint
CREATE TRIGGER `audit_log_no_update`
BEFORE UPDATE ON `audit_log`
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;--> statement-breakpoint
CREATE TRIGGER `audit_log_no_delete`
BEFORE DELETE ON `audit_log`
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
