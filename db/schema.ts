import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(), value: text('value').notNull(),
});
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(), name: text('name').notNull(),
  parentId: text('parent_id').references((): AnySQLiteColumn => categories.id),
  description: text('description').notNull().default(''),
  position: integer('position').notNull().default(0),
  version: integer('version').notNull().default(1),
  deletedAt: text('deleted_at'), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('idx_categories_active_name').on(t.name).where(sql`deleted_at IS NULL`)]);
export const products = sqliteTable('products', {
  id: text('id').primaryKey(), name: text('name').notNull(),
  categoryId: text('category_id').notNull().references(()=>categories.id),
  intro: text('intro').notNull(), description: text('description').notNull(),
  brand: text('brand').notNull().default(''), size: text('size').notNull().default(''),
  reference: text('reference').notNull(), images: text('images').notNull(),
  priceMinor: integer('price_minor'), currency: text('currency').notNull().default('YER'),
  availability: text('availability').notNull().default('unknown'),
  visible: integer('visible').notNull().default(1),
  featured: integer('featured').notNull().default(0),
  bestSeller: integer('best_seller').notNull().default(0),
  badge: text('badge').notNull().default(''),
  cardTheme: text('card_theme').notNull().default('obsidian'),
  accentColor: text('accent_color').notNull().default(''),
  position: integer('position').notNull().default(0),
  version: integer('version').notNull().default(1),
  deletedAt: text('deleted_at'), updatedAt: text('updated_at').notNull(),
  updatedBy: text('updated_by').notNull().default('initial-import'),
}, t=>[index('idx_products_catalog').on(t.deletedAt,t.visible,t.categoryId), index('idx_products_best_seller').on(t.deletedAt,t.visible,t.bestSeller,t.position)]);
export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  customerName: text('customer_name').notNull(),
  rating: integer('rating').notNull(),
  quote: text('quote').notNull(),
  sourceLabel: text('source_label').notNull().default(''),
  visible: integer('visible').notNull().default(1),
  position: integer('position').notNull().default(0),
  moderationReason: text('moderation_reason').notNull().default(''),
  moderatedAt: text('moderated_at'),
  moderatedBy: text('moderated_by').notNull().default(''),
  verificationPhone: text('verification_phone').notNull().default(''),
  consentAt: text('consent_at'),
  submittedAt: text('submitted_at'),
  submissionKind: text('submission_kind').notNull().default('admin'),
  version: integer('version').notNull().default(1),
  deletedAt: text('deleted_at'),
  updatedAt: text('updated_at').notNull(),
  updatedBy: text('updated_by').notNull(),
}, t=>[index('idx_reviews_public').on(t.deletedAt,t.visible,t.position)]);
export const reviewSubmissionLimits = sqliteTable('review_submission_limits', {
  fingerprint: text('fingerprint').primaryKey(),
  windowStarted: text('window_started').notNull(),
  submissionCount: integer('submission_count').notNull().default(1),
});
export const adminMembers = sqliteTable('admin_members', {
  email: text('email').primaryKey(),
  userId: text('user_id'),
  role: text('role').notNull(),
  createdAt: text('created_at').notNull(),
  createdBy: text('created_by').notNull(),
  updatedAt: text('updated_at').notNull(),
}, t=>[uniqueIndex('idx_admin_members_user_id').on(t.userId)]);
export const media = sqliteTable('media', {
  id: text('id').primaryKey(), objectKey: text('object_key').notNull(),
  filename: text('filename').notNull(), contentType: text('content_type').notNull(),
  size: integer('size').notNull(), width: integer('width').notNull(), height: integer('height').notNull(),
  createdAt: text('created_at').notNull(), createdBy: text('created_by').notNull(),
});
export const faqs = sqliteTable('faqs', {
  id: text('id').primaryKey(), question: text('question').notNull(), answer: text('answer').notNull(),
  visible: integer('visible').notNull().default(1), position: integer('position').notNull().default(0),
  version: integer('version').notNull().default(1), deletedAt: text('deleted_at'),
  updatedAt: text('updated_at').notNull(), updatedBy: text('updated_by').notNull().default('initial-import'),
}, t=>[index('idx_faqs_public').on(t.deletedAt,t.visible,t.position)]);
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(), slug: text('slug').notNull(), title: text('title').notNull(),
  summary: text('summary').notNull(), body: text('body').notNull(), image: text('image').notNull().default(''),
  status: text('status').notNull().default('draft'), pinned: integer('pinned').notNull().default(0), position: integer('position').notNull().default(0),
  publishedAt: text('published_at'), version: integer('version').notNull().default(1), deletedAt: text('deleted_at'),
  updatedAt: text('updated_at').notNull(), updatedBy: text('updated_by').notNull().default('initial-import'),
}, t=>[uniqueIndex('idx_posts_active_slug').on(t.slug).where(sql`deleted_at IS NULL`), index('idx_posts_public').on(t.deletedAt,t.status,t.pinned,t.position)]);
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({autoIncrement:true}), actorId: text('actor_id').notNull(),
  actorEmail: text('actor_email').notNull(), actorRole: text('actor_role').notNull(), action: text('action').notNull(),
  entityType: text('entity_type').notNull(), entityId: text('entity_id').notNull(), detail: text('detail').notNull().default(''),
  createdAt: text('created_at').notNull(),
}, t=>[index('idx_audit_recent').on(t.createdAt)]);
