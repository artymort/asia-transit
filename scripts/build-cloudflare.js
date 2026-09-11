import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'static'), { recursive: true });

function copyTree(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

copyTree(path.join(root, 'assets'), path.join(dist, 'assets'));
for (const file of ['app.css', 'app.js', 'staff-editor.js']) {
  fs.copyFileSync(path.join(root, 'public', file), path.join(dist, 'static', file));
}

console.log(`Cloudflare assets prepared in ${dist}`);
