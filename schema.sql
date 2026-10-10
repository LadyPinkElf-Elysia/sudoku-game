-- 数独 · D1 表结构（5 张）
CREATE TABLE user (
  uid TEXT PRIMARY KEY,             -- 20 位 base62，登录凭据（敏感）
  uname TEXT NOT NULL,              -- 显示名，可重名；2~16 位
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE session (
  token TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE login_attempt (        -- 登录限流：只按 uid
  uid TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  last_at INTEGER NOT NULL
);

CREATE TABLE puzzle (
  pid TEXT PRIMARY KEY,             -- 20 位 base62（分享用）
  row_id TEXT NOT NULL UNIQUE,      -- 8 位 base62（我的题目列表行标识）
  uid TEXT NOT NULL,
  title TEXT NOT NULL,
  puzzle TEXT NOT NULL,
  solution TEXT NOT NULL,
  side_s INTEGER NOT NULL,
  blank_count INTEGER NOT NULL,     -- 入库时算好
  visibility TEXT NOT NULL DEFAULT 'public',
  show_solution INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_puzzle_public ON puzzle(visibility, created_at DESC);
CREATE INDEX idx_puzzle_hot    ON puzzle(visibility, play_count DESC, created_at DESC);
CREATE INDEX idx_puzzle_uid    ON puzzle(uid, created_at DESC);

CREATE TABLE puzzle_play (          -- 热度去重：同一人 1 小时 1 次
  pid TEXT NOT NULL,
  uid TEXT NOT NULL,
  played_at INTEGER NOT NULL,
  PRIMARY KEY (pid, uid)
);
