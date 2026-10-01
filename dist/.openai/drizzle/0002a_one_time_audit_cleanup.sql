DELETE FROM `audit_log`
WHERE `id` IN (1, 2, 3, 4, 5, 6);--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `audit_log_immutable_update`
BEFORE UPDATE ON `audit_log`
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS `audit_log_immutable_delete`
BEFORE DELETE ON `audit_log`
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
