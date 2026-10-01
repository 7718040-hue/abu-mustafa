CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_recent` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`visible` integer DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	`updated_at` text NOT NULL,
	`updated_by` text DEFAULT 'initial-import' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_faqs_public` ON `faqs` (`deleted_at`,`visible`,`position`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`body` text NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`published_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	`updated_at` text NOT NULL,
	`updated_by` text DEFAULT 'initial-import' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_posts_active_slug` ON `posts` (`slug`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX `idx_posts_public` ON `posts` (`deleted_at`,`status`,`position`);--> statement-breakpoint
ALTER TABLE `products` ADD `featured` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `badge` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `card_theme` text DEFAULT 'obsidian' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `accent_color` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `moderation_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `moderated_at` text;--> statement-breakpoint
ALTER TABLE `reviews` ADD `moderated_by` text DEFAULT '' NOT NULL;