-- 账号同步系统表结构（PostgreSQL / PGlite 通用，同方言）
-- 采用通用 key-value 同步模型：sync_items 一张表承载全部业务实体，
-- 服务端不感知业务结构，客户端按 (entity, item_key) 增量推送/拉取。

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 设备表（记录每台设备的同步游标）
CREATE TABLE IF NOT EXISTS devices (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  last_sync_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

-- 同步条目表：主键 (user_id, entity, item_key)
-- payload 为客户端原样存的业务对象（JSONB）
-- updated_at 为客户端业务时间戳，用于 LWW 冲突裁决
-- deleted = true 为墓碑（删除同步标记，物理保留）
CREATE TABLE IF NOT EXISTS sync_items (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity      TEXT NOT NULL,
  item_key    TEXT NOT NULL,
  payload     JSONB,
  updated_at  TIMESTAMPTZ NOT NULL,
  deleted     BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, entity, item_key)
);

-- 增量拉取走该索引
CREATE INDEX IF NOT EXISTS idx_sync_items_since
  ON sync_items (user_id, updated_at);
