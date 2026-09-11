import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { config } from './config.js';

const cookieName = 'dk_session';

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(item => item.trim()).filter(Boolean).map(item => {
    const index = item.indexOf('=');
    return [decodeURIComponent(item.slice(0, index)), decodeURIComponent(item.slice(index + 1))];
  }));
}

function hashToken(token) {
  return crypto.createHmac('sha256', config.sessionSecret).update(token).digest('hex');
}

export function attachUser(req, res, next) {
  const token = parseCookies(req.headers.cookie)[cookieName];
  req.user = null;
  req.session = null;
  if (token) {
    const session = db.prepare(`
      SELECT s.token_hash, s.csrf_token, s.expires_at, u.id, u.login, u.display_name, u.role
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1
    `).get(hashToken(token));
    if (session) {
      req.session = session;
      req.user = { id: session.id, login: session.login, displayName: session.display_name, role: session.role };
    }
  }
  res.locals.currentUser = req.user;
  res.locals.csrfToken = req.session?.csrf_token || '';
  next();
}

export function login(login, password) {
  const user = db.prepare('SELECT * FROM users WHERE login = ? COLLATE NOCASE AND is_active = 1').get(login);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  const token = crypto.randomBytes(32).toString('base64url');
  const csrfToken = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + config.sessionDays * 86400000).toISOString();
  db.prepare('INSERT INTO sessions(token_hash, user_id, csrf_token, expires_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), user.id, csrfToken, expiresAt);
  return { token, user };
}

export function setSessionCookie(res, token) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: config.sessionDays * 86400000,
    path: '/'
  });
}

export function logout(req, res) {
  const token = parseCookies(req.headers.cookie)[cookieName];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  res.clearCookie(cookieName, { path: '/' });
}

export function requireUser(req, res, next) {
  if (!req.user) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Требуется вход в систему' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
    next();
  };
}

export function verifyCsrf(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Требуется вход в систему' });
  const token = req.get('x-csrf-token') || req.body?._csrf;
  if (!token || token !== req.session?.csrf_token) return res.status(403).json({ error: 'Проверка безопасности формы не пройдена' });
  next();
}
