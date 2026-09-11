import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadsDir, { recursive: true });

const databasePath = path.join(config.dataDir, 'dk-auto.sqlite');
export const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    login TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('manager', 'admin')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT;

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT;
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY,
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
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT,
    archived_at TEXT
  ) STRICT;
  CREATE INDEX IF NOT EXISTS idx_cars_status_published ON cars(status, published_at DESC);

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY,
    car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    thumb_path TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_main INTEGER NOT NULL DEFAULT 0 CHECK(is_main IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT;
  CREATE INDEX IF NOT EXISTS idx_photos_car_sort ON photos(car_id, is_main DESC, sort_order, id);

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY,
    car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK(provider IN ('youtube', 'rutube')),
    url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  ) STRICT;

  CREATE TABLE IF NOT EXISTS characteristics (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    key TEXT NOT NULL UNIQUE,
    data_type TEXT NOT NULL CHECK(data_type IN ('text', 'number', 'boolean', 'select')),
    options_json TEXT,
    is_required INTEGER NOT NULL DEFAULT 0 CHECK(is_required IN (0, 1)),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT;

  CREATE TABLE IF NOT EXISTS car_characteristics (
    car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    characteristic_id INTEGER NOT NULL REFERENCES characteristics(id) ON DELETE CASCADE,
    value TEXT NOT NULL DEFAULT '',
    is_public INTEGER NOT NULL DEFAULT 1 CHECK(is_public IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(car_id, characteristic_id)
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS generated_pdfs (
    car_id INTEGER PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT;

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_path TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT;

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) STRICT;

  CREATE TABLE IF NOT EXISTS car_view_events (
    id INTEGER PRIMARY KEY,
    car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    visitor_hash TEXT NOT NULL,
    view_bucket INTEGER NOT NULL,
    viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(car_id, visitor_hash, view_bucket)
  ) STRICT;
  CREATE INDEX IF NOT EXISTS idx_car_views_car_date ON car_view_events(car_id, viewed_at DESC);
`);

const defaultCharacteristics = [
  ['Марка', 'brand', 'text', 1, 10],
  ['Модель', 'model', 'text', 1, 20],
  ['Год выпуска', 'year', 'number', 1, 30],
  ['Пробег, км', 'mileage', 'number', 1, 40],
  ['Двигатель', 'engine', 'text', 0, 50],
  ['Коробка передач', 'transmission', 'select', 0, 60],
  ['Привод', 'drive', 'select', 0, 70],
  ['Количество владельцев', 'owners', 'text', 0, 80],
  ['Состояние', 'condition', 'text', 0, 90],
  ['Цена закупки', 'purchase_price', 'number', 0, 100],
  ['Комментарий менеджера', 'manager_comment', 'text', 0, 110]
];
const insertCharacteristic = db.prepare(`
  INSERT OR IGNORE INTO characteristics(name, key, data_type, options_json, is_required, sort_order)
  VALUES (?, ?, ?, ?, ?, ?)
`);
for (const [name, key, type, required, order] of defaultCharacteristics) {
  const options = key === 'transmission'
    ? JSON.stringify(['Механика', 'Автомат', 'Робот', 'Вариатор'])
    : key === 'drive' ? JSON.stringify(['Передний', 'Задний', 'Полный']) : null;
  insertCharacteristic.run(name, key, type, options, required, order);
}

const defaultSettings = {
  dealer_name: 'DK AUTO',
  dealer_tagline: 'Автомобили с пробегом',
  phone: '+7 (961) 924-57-10',
  phone_link: '+79619245710',
  telegram: 'https://t.me/dk_auto_demo',
  whatsapp: 'https://wa.me/79619245710',
  address: 'Москва, ул. Автомобильная, 10',
  hours: 'Ежедневно, 9:00–20:00'
};
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) insertSetting.run(key, value);

const serviceCount = db.prepare('SELECT COUNT(*) AS count FROM services').get().count;
if (serviceCount === 0) {
  const addService = db.prepare('INSERT INTO services(title, description, image_path, sort_order) VALUES (?, ?, ?, ?)');
  addService.run('Выкуп автомобиля', 'Оценим автомобиль, проверим документы и выплатим деньги в день обращения.', 'assets/service-buyout-v1.png', 10);
  addService.run('Автокредитование', 'Подберем понятную программу и заранее покажем ежемесячный платеж.', 'assets/service-credit-v1.png', 20);
  addService.run('Trade-in', 'Зачтем стоимость вашей машины при покупке автомобиля из наличия.', 'assets/service-tradein-v1.png', 30);
}

function seedUser() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (count > 0) return;
  const login = process.env.ADMIN_LOGIN || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe-DK-AUTO-2026';
  const passwordHash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users(login, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
    .run(login, passwordHash, 'Администратор', 'admin');
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('Создан локальный администратор admin / ChangeMe-DK-AUTO-2026. Смените пароль перед публикацией.');
  }
}

function slugify(value) {
  const base = String(value || 'car').toLowerCase().trim()
    .replace(/[^a-zа-я0-9]+/giu, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'car'}-${crypto.randomBytes(3).toString('hex')}`;
}

function seedCars() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM cars').get().count;
  if (count > 0) return;
  const cars = [
    ['Geely', 'Monjaro', 2024, 3296000, 11400, 'Кроссовер', 'Богатая комплектация, полный привод, панорамная крыша и камеры 360°. Автомобиль проверен и готов к осмотру.', ['assets/geely-monjaro.png', 'assets/listings/geely-monjaro-1.jpg', 'assets/listings/geely-monjaro-2.jpg']],
    ['Kia', 'The New K3', 2024, 1897000, 33119, 'Седан', 'Экономичный городской седан. Чистый салон, подтвержденный пробег и камера заднего вида.', ['assets/listings/kia-k3-1.webp', 'assets/listings/kia-k3-2.webp', 'assets/listings/kia-k3-3.webp']],
    ['Hyundai', 'The New Avante', 2024, 1950000, 11063, 'Седан', 'Современный седан с небольшим пробегом. Полностью обслужен и готов к осмотру.', ['assets/listings/hyundai-avante-1.webp', 'assets/listings/hyundai-avante-2.webp', 'assets/listings/hyundai-avante-3.webp']],
    ['Changan', 'CS35 Plus', 2024, 2427000, 13400, 'Кроссовер', 'Компактный кроссовер с турбомотором, мультимедиа и зимним пакетом.', ['assets/listings/changan-cs35-1.jpg', 'assets/listings/changan-cs35-2.jpg', 'assets/listings/changan-cs35-3.jpg']]
  ];
  const addCar = db.prepare(`
    INSERT INTO cars(slug, title, brand, model, year, price, mileage, body_type, description, status, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', CURRENT_TIMESTAMP)
  `);
  const addPhoto = db.prepare(`
    INSERT INTO photos(car_id, storage_path, thumb_path, alt_text, sort_order, is_main)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const [brand, model, year, price, mileage, body, description, images] of cars) {
    const title = `${brand} ${model} ${year}`;
    const result = addCar.run(slugify(`${brand}-${model}-${year}`), title, brand, model, year, price, mileage, body, description);
    images.forEach((image, index) => addPhoto.run(result.lastInsertRowid, image, image, title, index, index === 0 ? 1 : 0));
  }
}

seedUser();
seedCars();

export function getSettings() {
  return Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map(row => [row.key, row.value]));
}

export function photoUrl(storagePath) {
  if (!storagePath) return '/assets/dk-auto-hero-v1.png';
  return storagePath.startsWith('assets/') ? `/${storagePath}` : `/media/${storagePath.replaceAll('\\', '/')}`;
}

export function getCarPhotos(carId) {
  return db.prepare('SELECT * FROM photos WHERE car_id = ? ORDER BY is_main DESC, sort_order, id').all(carId)
    .map(photo => ({ ...photo, url: photoUrl(photo.storage_path), thumbUrl: photoUrl(photo.thumb_path) }));
}

export function getCarCharacteristics(carId, includePrivate = false) {
  const visibility = includePrivate ? '' : 'AND cc.is_public = 1';
  return db.prepare(`
    SELECT ch.id, ch.name, ch.key, ch.data_type, ch.is_required, cc.value, cc.is_public
    FROM car_characteristics cc
    JOIN characteristics ch ON ch.id = cc.characteristic_id
    WHERE cc.car_id = ? AND ch.is_active = 1 ${visibility}
    ORDER BY ch.sort_order, ch.id
  `).all(carId);
}

export function getViewStats(carId) {
  return db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN viewed_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN viewed_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS week
    FROM car_view_events WHERE car_id = ?
  `).get(carId);
}
