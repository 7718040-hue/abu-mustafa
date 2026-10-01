CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_categories_active_name` ON `categories` (`name`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category_id` text NOT NULL,
	`intro` text NOT NULL,
	`description` text NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`size` text DEFAULT '' NOT NULL,
	`reference` text NOT NULL,
	`images` text NOT NULL,
	`price_minor` integer,
	`currency` text DEFAULT 'YER' NOT NULL,
	`availability` text DEFAULT 'unknown' NOT NULL,
	`visible` integer DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	`updated_at` text NOT NULL,
	`updated_by` text DEFAULT 'initial-import' NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_products_catalog` ON `products` (`deleted_at`,`visible`,`category_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
