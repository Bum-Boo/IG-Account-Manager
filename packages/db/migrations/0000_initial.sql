PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  platform_id TEXT NOT NULL,
  platform_display_name TEXT NOT NULL,
  platform_official_api_base_url TEXT,
  platform_metadata TEXT NOT NULL DEFAULT '{}',
  external_account_id TEXT,
  handle TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL,
  automation_policy TEXT NOT NULL,
  schedule_policy TEXT NOT NULL,
  plugin_registration_ids TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  connected_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS accounts_platform_idx ON accounts (platform_id);
CREATE INDEX IF NOT EXISTS accounts_status_idx ON accounts (status);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_platform_handle_idx ON accounts (platform_id, handle);

CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  audience TEXT NOT NULL,
  pillars TEXT NOT NULL,
  voice TEXT NOT NULL,
  visual_guidelines TEXT,
  caption_guidelines TEXT,
  negative_guidelines TEXT NOT NULL DEFAULT '[]',
  reference_asset_ids TEXT NOT NULL DEFAULT '[]',
  recipe_ids TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS concepts_account_idx ON concepts (account_id);
CREATE INDEX IF NOT EXISTS concepts_name_idx ON concepts (name);

CREATE TABLE IF NOT EXISTS content_assets (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  uri TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  account_ids TEXT NOT NULL DEFAULT '[]',
  concept_ids TEXT NOT NULL DEFAULT '[]',
  primary_account_id TEXT,
  primary_concept_id TEXT,
  rights TEXT NOT NULL DEFAULT '{}',
  checksum TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  imported_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS content_assets_type_idx ON content_assets (type);
CREATE INDEX IF NOT EXISTS content_assets_primary_account_idx ON content_assets (primary_account_id);
CREATE INDEX IF NOT EXISTS content_assets_primary_concept_idx ON content_assets (primary_concept_id);

CREATE TABLE IF NOT EXISTS content_recipes (
  id TEXT PRIMARY KEY NOT NULL,
  concept_id TEXT NOT NULL REFERENCES concepts (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  content_pillars TEXT NOT NULL,
  required_asset_types TEXT NOT NULL DEFAULT '[]',
  format TEXT NOT NULL,
  instructions TEXT NOT NULL,
  review_checklist TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS content_recipes_concept_idx ON content_recipes (concept_id);
CREATE INDEX IF NOT EXISTS content_recipes_format_idx ON content_recipes (format);

CREATE TABLE IF NOT EXISTS post_candidates (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts (id) ON DELETE CASCADE,
  recipe_id TEXT REFERENCES content_recipes (id) ON DELETE SET NULL,
  asset_ids TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL,
  format TEXT NOT NULL,
  caption TEXT NOT NULL,
  first_comment TEXT,
  internal_notes TEXT,
  provenance TEXT NOT NULL DEFAULT '{}',
  scheduled_at TEXT,
  approved_at TEXT,
  approved_by TEXT,
  rejected_at TEXT,
  rejected_by TEXT,
  rejection_reason TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS post_candidates_account_idx ON post_candidates (account_id);
CREATE INDEX IF NOT EXISTS post_candidates_concept_idx ON post_candidates (concept_id);
CREATE INDEX IF NOT EXISTS post_candidates_status_idx ON post_candidates (status);
CREATE INDEX IF NOT EXISTS post_candidates_scheduled_at_idx ON post_candidates (scheduled_at);

CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY NOT NULL,
  plugin_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  type TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  official_api_only INTEGER NOT NULL DEFAULT 0,
  capabilities TEXT NOT NULL DEFAULT '[]',
  settings_ref TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS plugins_type_idx ON plugins (type);
CREATE INDEX IF NOT EXISTS plugins_enabled_type_idx ON plugins (enabled, type);
CREATE UNIQUE INDEX IF NOT EXISTS plugins_plugin_id_idx ON plugins (plugin_id);

CREATE TABLE IF NOT EXISTS plugin_permissions (
  plugin_registration_id TEXT NOT NULL REFERENCES plugins (id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (plugin_registration_id, permission)
);

CREATE INDEX IF NOT EXISTS plugin_permissions_permission_idx ON plugin_permissions (permission);

CREATE TABLE IF NOT EXISTS publish_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  candidate_id TEXT NOT NULL REFERENCES post_candidates (id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  plugin_registration_id TEXT NOT NULL REFERENCES plugins (id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  max_attempts INTEGER NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  retry_after TEXT,
  last_error TEXT,
  result TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS publish_jobs_status_idx ON publish_jobs (status);
CREATE INDEX IF NOT EXISTS publish_jobs_due_idx ON publish_jobs (status, scheduled_at, retry_after);
CREATE INDEX IF NOT EXISTS publish_jobs_candidate_idx ON publish_jobs (candidate_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before TEXT,
  after TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at);

CREATE TABLE IF NOT EXISTS workflow_events (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  actor_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS workflow_events_type_idx ON workflow_events (type);
CREATE INDEX IF NOT EXISTS workflow_events_entity_idx ON workflow_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS workflow_events_occurred_at_idx ON workflow_events (occurred_at);

