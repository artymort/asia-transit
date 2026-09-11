PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  csrf_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  year INTEGER,
  price INTEGER,
  price_public INTEGER NOT NULL DEFAULT 1 CHECK(price_public IN (0, 1)),
  mileage INTEGER,
  body_type TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_path TEXT NOT NULL DEFAULT 'assets/dk-auto-hero-v1.png',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  archived_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_cars_status_published ON cars(status, published_at DESC);

CREATE TABLE IF NOT EXISTS characteristics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  key TEXT NOT NULL UNIQUE,
  is_required INTEGER NOT NULL DEFAULT 0 CHECK(is_required IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS car_characteristics (
  car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  characteristic_id INTEGER NOT NULL REFERENCES characteristics(id) ON DELETE CASCADE,
  value TEXT NOT NULL DEFAULT '',
  is_public INTEGER NOT NULL DEFAULT 1 CHECK(is_public IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(car_id, characteristic_id)
);

CREATE TABLE IF NOT EXISTS car_view_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  view_bucket INTEGER NOT NULL,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(car_id, visitor_hash, view_bucket)
);
CREATE INDEX IF NOT EXISTS idx_car_views_car_date ON car_view_events(car_id, viewed_at DESC);

PRAGMA optimize;
