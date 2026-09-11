import crypto from 'node:crypto';
import { db, getViewStats } from './db.js';
import { config } from './config.js';

const visitorCookie = 'dk_visitor';

function readCookie(header = '', name) {
  const part = header.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}

export function recordPublicView(req, res, carId) {
  if (req.user) return getViewStats(carId);
  let visitor = readCookie(req.headers.cookie, visitorCookie);
  if (!visitor || visitor.length > 100) {
    visitor = crypto.randomBytes(18).toString('base64url');
    res.cookie(visitorCookie, visitor, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 31536000000, path: '/' });
  }
  const visitorHash = crypto.createHmac('sha256', config.sessionSecret).update(visitor).digest('hex');
  const bucket = Math.floor(Date.now() / (config.viewDedupMinutes * 60000));
  db.prepare(`
    INSERT OR IGNORE INTO car_view_events(car_id, visitor_hash, view_bucket)
    VALUES (?, ?, ?)
  `).run(carId, visitorHash, bucket);
  return getViewStats(carId);
}
