import path from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(srcDir, '..');

export const config = {
  port: Number(process.env.PORT || 4173),
  origin: process.env.APP_ORIGIN || 'http://127.0.0.1:4173',
  sessionSecret: process.env.SESSION_SECRET || 'local-development-secret-change-me',
  dataDir: path.resolve(rootDir, process.env.DATA_DIR || 'data'),
  uploadsDir: path.resolve(rootDir, process.env.UPLOADS_DIR || 'uploads'),
  pageSize: 10,
  sessionDays: 14,
  viewDedupMinutes: 30,
  maxPhotoSize: 12 * 1024 * 1024,
  maxPhotoEdge: 2400,
  thumbWidth: 720
};
