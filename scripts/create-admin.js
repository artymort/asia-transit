import bcrypt from 'bcryptjs';
import { db } from '../src/db.js';

const [login, password, displayName = 'Администратор'] = process.argv.slice(2);
if (!login || !password || password.length < 12) {
  console.error('Использование: npm run create-admin -- login "password-min-12" "Имя"');
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(password, 12);
db.prepare(`
  INSERT INTO users(login, password_hash, display_name, role, is_active)
  VALUES (?, ?, ?, 'admin', 1)
  ON CONFLICT(login) DO UPDATE SET password_hash = excluded.password_hash, display_name = excluded.display_name, role = 'admin', is_active = 1, updated_at = CURRENT_TIMESTAMP
`).run(login, passwordHash, displayName);
console.log(`Администратор ${login} создан или обновлен.`);
