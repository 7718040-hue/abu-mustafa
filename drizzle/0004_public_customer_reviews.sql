ALTER TABLE `reviews` ADD `verification_phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `consent_at` text;--> statement-breakpoint
ALTER TABLE `reviews` ADD `submitted_at` text;--> statement-breakpoint
ALTER TABLE `reviews` ADD `submission_kind` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
CREATE TABLE `review_submission_limits` (
	`fingerprint` text PRIMARY KEY NOT NULL,
	`window_started` text NOT NULL,
	`submission_count` integer DEFAULT 1 NOT NULL
);--> statement-breakpoint
UPDATE `faqs` SET `answer` = 'اليمن - إب - شارع تعز - جوار البرج - أمام القوسي للجنابي تمامًا.', `updated_at` = CURRENT_TIMESTAMP WHERE `question` = 'أين يقع مركز أبو مصطفى؟';
