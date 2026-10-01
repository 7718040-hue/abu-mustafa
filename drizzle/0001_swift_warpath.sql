CREATE TABLE `admin_members` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_admin_members_user_id` ON `admin_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`rating` integer NOT NULL,
	`quote` text NOT NULL,
	`source_label` text DEFAULT '' NOT NULL,
	`visible` integer DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_public` ON `reviews` (`deleted_at`,`visible`,`position`);--> statement-breakpoint
ALTER TABLE `categories` ADD `parent_id` text REFERENCES categories(id);