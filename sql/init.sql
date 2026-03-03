-- Initialize database schema
-- Run once on the VPS: psql -U monapp -d mabase -f sql/init.sql

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
