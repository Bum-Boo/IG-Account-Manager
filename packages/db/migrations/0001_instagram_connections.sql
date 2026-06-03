CREATE TABLE IF NOT EXISTS account_connections (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_account_id TEXT,
  handle TEXT,
  status TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT '[]',
  token_ref TEXT,
  expires_at TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  connected_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS account_connections_account_idx ON account_connections (account_id);
CREATE INDEX IF NOT EXISTS account_connections_provider_status_idx ON account_connections (provider, status);
CREATE UNIQUE INDEX IF NOT EXISTS account_connections_account_provider_idx ON account_connections (account_id, provider);

CREATE TABLE IF NOT EXISTS secret_vault_entries (
  id TEXT PRIMARY KEY NOT NULL,
  namespace TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS secret_vault_entries_namespace_idx ON secret_vault_entries (namespace);
CREATE INDEX IF NOT EXISTS secret_vault_entries_updated_at_idx ON secret_vault_entries (updated_at);
