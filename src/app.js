import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { config, rootDir } from './config.js';
import { db, getSettings, getCarPhotos, getCarCharacteristics, getViewStats } from './db.js';
import { attachUser, login, logout, requireUser, requireRole, setSessionCookie, verifyCsrf } from './auth.js';
import { recordPublicView } from './views.js';

const carPatchSchema = z.object({
  title: z.string().max(160).optional(),
  brand: z.string().max(80).optional(),
  model: z.string().max(100).optional(),
  year: z.union([z.number().int().min(1900).max(2100), z.null()]).optional(),
  price: z.union([z.number().int().nonnegative(), z.null()]).optional(),
  pricePublic: z.boolean().optional(),
  mileage: z.union([z.number().int().nonnegative(), z.null()]).optional(),
  bodyType: z.string().max(80).optional(),
  description: z.string().max(20000).optional(),
  characteristics: z.array(z.object({
    id: z.number().int().positive(),
    value: z.string().max(5000),
    isPublic: z.boolean()
  })).optional()
});

function formatPrice(value) {
  return value == null ? 'Цена по запросу' : `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

function formatNumber(value) {
  return value == null ? '—' : new Intl.NumberFormat('ru-RU').format(value);
}

function carList(status = 'published', limit = config.pageSize, offset = 0) {
  return db.prepare(`
    SELECT c.*,
      (SELECT p.storage_path FROM photos p WHERE p.car_id = c.id ORDER BY p.is_main DESC, p.sort_order, p.id LIMIT 1) AS main_photo,
      (SELECT COUNT(*) FROM car_view_events v WHERE v.car_id = c.id) AS view_count
    FROM cars c
    WHERE c.status = ?
    ORDER BY COALESCE(c.published_at, c.created_at) DESC, c.id DESC
    LIMIT ? OFFSET ?
  `).all(status, limit, offset);
}

function mapCar(car) {
  const photos = getCarPhotos(car.id);
  return {
    ...car,
    mainPhotoUrl: photos[0]?.thumbUrl || '/assets/dk-auto-hero-v1.png',
    photos
  };
}

function getCarBySlug(slug) {
  return db.prepare('SELECT * FROM cars WHERE slug = ?').get(slug);
}

function uniqueSlug(base) {
  const clean = String(base || 'avtomobil').toLowerCase().trim()
    .replace(/[^a-zа-я0-9]+/giu, '-')
    .replace(/^-+|-+$/g, '') || 'avtomobil';
  return `${clean}-${crypto.randomBytes(3).toString('hex')}`;
}

function pageLocals(req) {
  return {
    settings: getSettings(),
    currentUser: req.user,
    csrfToken: req.session?.csrf_token || '',
    formatPrice,
    formatNumber
  };
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(rootDir, 'views'));
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", 'data:'],
        "script-src": ["'self'"],
        "style-src": ["'self'"],
        "frame-src": ["'self'", 'https://www.youtube.com', 'https://rutube.ru']
      }
    }
  }));
  app.use(express.urlencoded({ extended: false, limit: '200kb' }));
  app.use(express.json({ limit: '300kb' }));
  app.use('/assets', express.static(path.join(rootDir, 'assets'), { maxAge: '7d', immutable: false }));
  app.use('/static', express.static(path.join(rootDir, 'public'), { maxAge: '1h' }));
  app.use('/media', express.static(config.uploadsDir, { maxAge: '7d', fallthrough: false }));
  app.use(attachUser);

  app.get('/', (req, res) => {
    const cars = carList('published', config.pageSize, 0).map(mapCar);
    const totalCars = db.prepare("SELECT COUNT(*) AS count FROM cars WHERE status = 'published'").get().count;
    const services = db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order, id').all();
    res.render('home', { ...pageLocals(req), cars, totalCars, services, pageSize: config.pageSize, title: 'DK AUTO — автомобили с пробегом' });
  });

  app.get('/cars/:slug', (req, res) => {
    const car = getCarBySlug(req.params.slug);
    if (!car) return res.status(404).render('message', { ...pageLocals(req), title: 'Автомобиль не найден', heading: 'Автомобиль не найден', text: 'Возможно, объявление было удалено.', action: 'Посмотреть автомобили в наличии' });
    if (car.status === 'draft' && !req.user) {
      return res.status(404).render('message', { ...pageLocals(req), title: 'Автомобиль не найден', heading: 'Автомобиль не найден', text: 'Эта страница пока недоступна.', action: 'Посмотреть автомобили в наличии' });
    }
    if (car.status === 'archived' && !req.user) {
      return res.status(410).render('message', { ...pageLocals(req), title: 'Автомобиль больше не в продаже', heading: 'Этот автомобиль больше не находится в продаже', text: 'Посмотрите другие актуальные предложения DK AUTO.', action: 'Посмотреть автомобили в наличии' });
    }
    const photos = getCarPhotos(car.id);
    const characteristics = getCarCharacteristics(car.id, Boolean(req.user));
    const videos = db.prepare('SELECT * FROM videos WHERE car_id = ? ORDER BY sort_order, id').all(car.id);
    const viewStats = car.status === 'published' ? recordPublicView(req, res, car.id) : getViewStats(car.id);
    res.render('car', { ...pageLocals(req), title: `${car.title} — DK AUTO`, car, photos, characteristics, videos, viewStats });
  });

  app.get('/api/cars', (req, res) => {
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const cars = carList('published', config.pageSize, offset).map(mapCar).map(car => ({
      id: car.id, slug: car.slug, title: car.title, brand: car.brand, model: car.model,
      year: car.year, price: car.price_public ? car.price : null, mileage: car.mileage,
      bodyType: car.body_type, description: car.description, mainPhotoUrl: car.mainPhotoUrl
    }));
    res.json({ cars, nextOffset: offset + cars.length, hasMore: cars.length === config.pageSize });
  });

  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
  app.get('/login', (req, res) => {
    if (req.user) return res.redirect('/staff');
    res.render('login', { ...pageLocals(req), title: 'Вход для сотрудников', error: null });
  });
  app.post('/login', loginLimiter, (req, res) => {
    const result = login(String(req.body.login || ''), String(req.body.password || ''));
    if (!result) return res.status(401).render('login', { ...pageLocals(req), title: 'Вход для сотрудников', error: 'Неверный логин или пароль' });
    setSessionCookie(res, result.token);
    const next = String(req.query.next || '/staff');
    res.redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/staff');
  });
  app.post('/logout', requireUser, verifyCsrf, (req, res) => {
    logout(req, res);
    res.redirect('/');
  });

  app.get('/staff', requireUser, (req, res) => {
    const cars = db.prepare(`
      SELECT c.*,
        (SELECT p.storage_path FROM photos p WHERE p.car_id = c.id ORDER BY p.is_main DESC, p.sort_order, p.id LIMIT 1) AS main_photo,
        COUNT(v.id) AS views_total,
        SUM(CASE WHEN v.viewed_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) AS views_today,
        SUM(CASE WHEN v.viewed_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS views_week
      FROM cars c LEFT JOIN car_view_events v ON v.car_id = c.id
      GROUP BY c.id ORDER BY c.updated_at DESC, c.id DESC
    `).all().map(mapCar);
    const totals = db.prepare(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived
      FROM cars
    `).get();
    res.render('staff/dashboard', { ...pageLocals(req), title: 'Рабочее пространство — DK AUTO', cars, totals });
  });

  app.post('/staff/cars', requireUser, verifyCsrf, (req, res) => {
    const result = db.prepare(`
      INSERT INTO cars(slug, title, status, created_by, updated_by) VALUES (?, '', 'draft', ?, ?)
    `).run(uniqueSlug('novyi-avtomobil'), req.user.id, req.user.id);
    res.redirect(`/staff/cars/${result.lastInsertRowid}/edit`);
  });

  app.get('/staff/cars/:id/edit', requireUser, (req, res) => {
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
    if (!car) return res.status(404).render('message', { ...pageLocals(req), title: 'Автомобиль не найден', heading: 'Автомобиль не найден', text: 'Запись могла быть удалена.', action: 'Вернуться к списку' });
    const characteristics = db.prepare(`
      SELECT ch.*, COALESCE(cc.value, '') AS value, COALESCE(cc.is_public, 1) AS is_public
      FROM characteristics ch
      LEFT JOIN car_characteristics cc ON cc.characteristic_id = ch.id AND cc.car_id = ?
      WHERE ch.is_active = 1 ORDER BY ch.sort_order, ch.id
    `).all(car.id);
    res.render('staff/edit-car', { ...pageLocals(req), title: `Редактирование — ${car.title || 'Новый автомобиль'}`, car, characteristics, photos: getCarPhotos(car.id), viewStats: getViewStats(car.id) });
  });

  app.patch('/api/staff/cars/:id', requireRole('manager', 'admin'), verifyCsrf, (req, res) => {
    const parsed = carPatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Проверьте заполненные поля', details: parsed.error.issues });
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
    if (!car) return res.status(404).json({ error: 'Автомобиль не найден' });
    const data = parsed.data;
    const update = {
      title: data.title ?? car.title,
      brand: data.brand ?? car.brand,
      model: data.model ?? car.model,
      year: data.year === undefined ? car.year : data.year,
      price: data.price === undefined ? car.price : data.price,
      pricePublic: data.pricePublic === undefined ? car.price_public : Number(data.pricePublic),
      mileage: data.mileage === undefined ? car.mileage : data.mileage,
      bodyType: data.bodyType ?? car.body_type,
      description: data.description ?? car.description
    };
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`
        UPDATE cars SET title = ?, brand = ?, model = ?, year = ?, price = ?, price_public = ?, mileage = ?, body_type = ?, description = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(update.title, update.brand, update.model, update.year, update.price, update.pricePublic, update.mileage, update.bodyType, update.description, req.user.id, car.id);
      if (data.characteristics) {
        const saveValue = db.prepare(`
          INSERT INTO car_characteristics(car_id, characteristic_id, value, is_public, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(car_id, characteristic_id) DO UPDATE SET value = excluded.value, is_public = excluded.is_public, updated_at = CURRENT_TIMESTAMP
        `);
        for (const item of data.characteristics) saveValue.run(car.id, item.id, item.value, Number(item.isPublic));
      }
      db.exec('COMMIT');
      res.json({ ok: true, savedAt: new Date().toISOString() });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });

  app.post('/staff/cars/:id/status', requireUser, verifyCsrf, (req, res) => {
    const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
    if (!car) return res.status(404).render('message', { ...pageLocals(req), title: 'Автомобиль не найден', heading: 'Автомобиль не найден', text: '', action: 'Вернуться' });
    const action = String(req.body.action || '');
    if (action === 'publish') {
      const missing = [];
      if (!car.brand.trim()) missing.push('Марка');
      if (!car.model.trim()) missing.push('Модель');
      if (!car.year) missing.push('Год выпуска');
      if (car.mileage == null) missing.push('Пробег');
      const required = db.prepare(`
        SELECT ch.name FROM characteristics ch
        LEFT JOIN car_characteristics cc ON cc.characteristic_id = ch.id AND cc.car_id = ?
        WHERE ch.is_active = 1 AND ch.is_required = 1 AND ch.key NOT IN ('brand','model','year','mileage')
          AND (cc.value IS NULL OR TRIM(cc.value) = '')
      `).all(car.id).map(item => item.name);
      missing.push(...required);
      if (missing.length) return res.redirect(`/staff/cars/${car.id}/edit?error=${encodeURIComponent(`Не заполнены обязательные поля: ${missing.join(', ')}`)}`);
      db.prepare("UPDATE cars SET status = 'published', published_at = COALESCE(published_at, CURRENT_TIMESTAMP), archived_at = NULL, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, car.id);
    } else if (action === 'archive') {
      db.prepare("UPDATE cars SET status = 'archived', archived_at = CURRENT_TIMESTAMP, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, car.id);
    } else if (action === 'restore') {
      db.prepare("UPDATE cars SET status = 'published', archived_at = NULL, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, car.id);
    }
    res.redirect('/staff');
  });

  app.post('/staff/cars/:id/delete', requireRole('admin'), verifyCsrf, (req, res) => {
    const carId = Number(req.params.id);
    const carDir = path.join(config.uploadsDir, 'cars', String(carId));
    db.prepare('DELETE FROM cars WHERE id = ?').run(carId);
    fs.rmSync(carDir, { recursive: true, force: true });
    res.redirect('/staff');
  });

  app.get('/health', (req, res) => res.json({ ok: true, database: 'sqlite', time: new Date().toISOString() }));

  app.use((req, res) => res.status(404).render('message', { ...pageLocals(req), title: 'Страница не найдена', heading: 'Страница не найдена', text: 'Проверьте адрес или вернитесь к каталогу.', action: 'На главную' }));
  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    const payload = { error: 'Не удалось выполнить действие. Попробуйте еще раз.' };
    if (req.path.startsWith('/api/')) return res.status(500).json(payload);
    res.status(500).render('message', { ...pageLocals(req), title: 'Ошибка', heading: 'Что-то пошло не так', text: payload.error, action: 'На главную' });
  });

  return app;
}
