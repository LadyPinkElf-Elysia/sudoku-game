CREATE TABLE IF NOT EXISTS user (
  uid TEXT PRIMARY KEY,
  uname TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS session (
  token TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempt (
  uid TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  last_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS puzzle (
  pid TEXT PRIMARY KEY,
  row_id TEXT NOT NULL UNIQUE,
  uid TEXT NOT NULL,
  title TEXT NOT NULL,
  puzzle TEXT NOT NULL,
  solution TEXT NOT NULL,
  side_s INTEGER NOT NULL,
  blank_count INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  show_solution INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_puzzle_public ON puzzle(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_puzzle_hot ON puzzle(visibility, play_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_puzzle_uid ON puzzle(uid, created_at DESC);
CREATE TABLE IF NOT EXISTS puzzle_play (
  pid TEXT NOT NULL,
  uid TEXT NOT NULL,
  played_at INTEGER NOT NULL,
  PRIMARY KEY (pid, uid)
);
