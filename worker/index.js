const SETTINGS = {
  dealerName: 'DK AUTO',
  tagline: 'Автомобили с пробегом',
  phone: '+7 (961) 924-57-10',
  phoneLink: '+79619245710',
  telegram: 'https://t.me/dk_auto_demo',
  whatsapp: 'https://wa.me/79619245710',
  address: 'Москва, ул. Автомобильная, 10',
  hours: 'Ежедневно, 9:00–20:00'
};

const SERVICES = [
  { title: 'Выкуп автомобиля', description: 'Оценим автомобиль, проверим документы и выплатим деньги в день обращения.', image: '/assets/service-buyout-v1.png' },
  { title: 'Автокредитование', description: 'Подберем понятную программу и заранее покажем ежемесячный платеж.', image: '/assets/service-credit-v1.png' },
  { title: 'Trade-in', description: 'Зачтем стоимость вашей машины при покупке автомобиля из наличия.', image: '/assets/service-tradein-v1.png' }
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

function money(value) {
  return value == null ? 'Цена по запросу' : `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

function number(value) {
  return value == null ? '—' : new Intl.NumberFormat('ru-RU').format(value);
}

function imageUrl(path) {
  return `/${String(path || 'assets/dk-auto-hero-v1.png').replace(/^\/+/, '')}`;
}

function html(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-frame-options': 'SAMEORIGIN',
      ...headers
    }
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function redirect(location, headers = {}) {
  return new Response(null, { status: 303, headers: { location, ...headers } });
}

function cookieValue(request, name) {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sameSecret(left, right) {
  const [a, b] = await Promise.all([sha256(left), sha256(right)]);
  let diff = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  return diff === 0;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function getSession(request, env) {
  const token = cookieValue(request, 'dk_session');
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare('SELECT token_hash, csrf_token, expires_at FROM sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP').bind(tokenHash).first();
  return row ? { tokenHash, csrf: row.csrf_token, displayName: 'Администратор', role: 'admin' } : null;
}

function layout(title, body, session = null, scripts = '') {
  const auth = session
    ? `<span class="user-chip">${escapeHtml(session.displayName)} · Администратор</span><form action="/logout" method="post"><input type="hidden" name="_csrf" value="${escapeHtml(session.csrf)}"><button class="button button-quiet" type="submit">Выйти</button></form>`
    : `<a class="button button-primary header-phone" href="tel:${SETTINGS.phoneLink}"><span>Позвонить</span><b>${SETTINGS.phone}</b></a>`;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="DK AUTO — автомобили с пробегом, честные характеристики и прямой контакт с продавцом."><title>${escapeHtml(title)}</title><link rel="stylesheet" href="/static/app.css?v=20260911"></head><body><header class="site-header"><div class="shell header-row"><a class="brand" href="/" aria-label="DK AUTO, главная"><strong>DK AUTO</strong><small>${SETTINGS.tagline}</small></a><nav class="main-nav" aria-label="Главное меню"><a href="/#services">Услуги</a><a href="/#catalog">Автомобили</a><a href="/#contacts">Контакты</a>${session ? '<a class="staff-link" href="/staff">Рабочее пространство</a>' : ''}</nav><div class="header-actions">${auth}</div></div></header><main>${body}</main><footer class="site-footer" id="contacts"><div class="shell footer-grid"><div><a class="brand brand-footer" href="/"><strong>DK AUTO</strong><small>${SETTINGS.tagline}</small></a><p>Публичная витрина автомобилей и прямой контакт с продавцом.</p></div><div><h2>Связаться</h2><a href="tel:${SETTINGS.phoneLink}">${SETTINGS.phone}</a><a href="${SETTINGS.telegram}" target="_blank" rel="noopener">Telegram</a><a href="${SETTINGS.whatsapp}" target="_blank" rel="noopener">WhatsApp</a></div><div><h2>Адрес</h2><p>${SETTINGS.address}<br>${SETTINGS.hours}</p></div><div><h2>Сотрудникам</h2><a href="${session ? '/staff' : '/login'}">${session ? 'Рабочее пространство' : 'Войти'}</a></div></div></footer><script src="/static/app.js" defer></script>${scripts}</body></html>`;
}

function carCard(car, session = null) {
  return `<article class="catalog-card"><a class="catalog-photo" href="/cars/${encodeURIComponent(car.slug)}"><img src="${escapeHtml(imageUrl(car.image_path))}" alt="${escapeHtml(car.title)}" loading="lazy"><span class="availability">В наличии</span></a><div class="catalog-content"><div class="catalog-heading"><div><span class="car-kicker">${escapeHtml(car.brand)} · ${escapeHtml(car.year || 'Год уточняется')}</span><h3><a href="/cars/${encodeURIComponent(car.slug)}">${escapeHtml(car.model || car.title)}</a></h3></div><strong class="car-price">${car.price_public ? money(car.price) : 'Цена по запросу'}</strong></div><div class="catalog-specs"><span>${number(car.mileage)} км</span><span>${escapeHtml(car.body_type || 'Кузов уточняется')}</span></div><p>${escapeHtml(car.description || 'Подробности уточняйте у менеджера.')}</p><div class="catalog-footer"><a class="button button-outline" href="/cars/${encodeURIComponent(car.slug)}">Фотографии и характеристики</a>${session ? `<span class="views-badge"><b>${car.view_count || 0}</b> просмотров</span><a class="button button-quiet" href="/staff/cars/${car.id}/edit">Редактировать</a>` : ''}</div></div></article>`;
}

async function homePage(env, session) {
  const { results: cars } = await env.DB.prepare(`SELECT c.*, (SELECT COUNT(*) FROM car_view_events v WHERE v.car_id = c.id) AS view_count FROM cars c WHERE c.status = 'published' ORDER BY COALESCE(c.published_at,c.created_at) DESC, c.id DESC LIMIT 10`).all();
  const services = SERVICES.map((service, index) => `<article class="service-card ${index === 0 ? 'service-card-large' : ''}"><img src="${service.image}" alt=""><div><h3>${service.title}</h3><p>${service.description}</p><a href="tel:${SETTINGS.phoneLink}">Узнать подробности →</a></div></article>`).join('');
  const body = `<section class="hero home-hero"><div class="shell hero-layout"><div class="hero-copy"><h1>Надежные автомобили<br>с пробегом</h1><h2>для жизни и движения вперед</h2><p>Подбираем лучшие варианты, честно оцениваем состояние и помогаем с выгодной покупкой.</p><div class="hero-actions"><a class="button button-primary" href="#catalog">Смотреть автомобили</a><a class="button button-outline" href="#services">Рассчитать кредит</a></div></div><div class="hero-media"><img src="/assets/dk-auto-hero-v1.png" alt="Зеленый автомобиль DK AUTO"></div></div></section><section class="services shell" id="services"><div class="section-intro"><span class="eyebrow">Все в одном месте</span><h2>Помогаем решить вопрос с автомобилем</h2><p>От выбора машины до выкупа, кредита и обмена.</p></div><div class="services-grid">${services}</div></section><section class="catalog-section" id="catalog"><div class="shell"><div class="section-intro section-intro-row"><div><h2>Популярные автомобили</h2><p>Реальные фотографии, понятные цены и подробные характеристики.</p></div><strong class="catalog-count">${cars.length}<small>машин в продаже</small></strong></div><div class="catalog-list" id="catalog-list">${cars.map(car => carCard(car, session)).join('')}</div></div></section><section class="contact-strip"><div class="shell contact-strip-inner"><div><span class="eyebrow">Прямой контакт</span><h2>Приезжайте на осмотр</h2><p>${SETTINGS.address} · ${SETTINGS.hours}</p></div><div class="contact-actions"><a class="button button-primary" href="tel:${SETTINGS.phoneLink}">Позвонить</a><a class="button button-outline" href="${SETTINGS.telegram}" target="_blank" rel="noopener">Написать в Telegram</a></div></div></section>`;
  return html(layout('DK AUTO — автомобили с пробегом', body, session));
}

async function carPage(request, env, session, slug) {
  const car = await env.DB.prepare('SELECT * FROM cars WHERE slug = ?').bind(slug).first();
  if (!car || (car.status !== 'published' && !session)) return messagePage('Автомобиль не найден', 'Возможно, объявление было удалено.', session, 404);
  if (car.status === 'published') {
    const source = `${request.headers.get('cf-connecting-ip') || 'unknown'}|${request.headers.get('user-agent') || ''}`;
    const visitorHash = await sha256(source);
    const bucket = Math.floor(Date.now() / 1800000);
    await env.DB.prepare('INSERT OR IGNORE INTO car_view_events(car_id,visitor_hash,view_bucket) VALUES(?,?,?)').bind(car.id, visitorHash, bucket).run();
  }
  const { results: characteristics } = await env.DB.prepare(`SELECT ch.name, ch.key, cc.value, cc.is_public FROM car_characteristics cc JOIN characteristics ch ON ch.id = cc.characteristic_id WHERE cc.car_id = ? AND (? = 1 OR cc.is_public = 1) ORDER BY ch.sort_order`).bind(car.id, session ? 1 : 0).all();
  const stats = await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN viewed_at >= datetime('now','-1 day') THEN 1 ELSE 0 END) AS today, SUM(CASE WHEN viewed_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS week FROM car_view_events WHERE car_id = ?`).bind(car.id).first();
  const staffBar = session ? `<div class="staff-toolbar"><div><b>${car.status === 'published' ? 'В продаже' : car.status === 'draft' ? 'Черновик' : 'В архиве'}</b><span>Сегодня: ${stats.today || 0} · 7 дней: ${stats.week || 0} · Всего: ${stats.total || 0}</span></div><a class="button button-primary" href="/staff/cars/${car.id}/edit">Редактировать</a></div>` : '';
  const specs = characteristics.filter(item => !['brand', 'model', 'year', 'mileage'].includes(item.key)).map(item => `<dt>${escapeHtml(item.name)}${session && !item.is_public ? '<span class="private-label">внутреннее</span>' : ''}</dt><dd>${escapeHtml(item.value)}</dd>`).join('');
  const body = `<section class="car-page shell"><nav class="breadcrumbs"><a href="/">Главная</a><span>→</span><a href="/#catalog">Автомобили</a><span>→</span><b>${escapeHtml(car.title)}</b></nav>${staffBar}<header class="car-title-row"><div><span class="eyebrow">${escapeHtml(car.brand)} · ${escapeHtml(car.year || 'Год уточняется')}</span><h1>${escapeHtml(car.model || car.title)}</h1><p>${number(car.mileage)} км · ${escapeHtml(car.body_type || 'Тип кузова уточняется')}</p></div>${car.price_public ? `<strong>${money(car.price)}</strong>` : ''}</header><div class="car-gallery"><div class="gallery-main"><img id="gallery-main" src="${escapeHtml(imageUrl(car.image_path))}" alt="${escapeHtml(car.title)}"></div></div><div class="car-detail-grid"><article class="car-description"><h2>Об автомобиле</h2><p>${escapeHtml(car.description || 'Описание автомобиля уточняйте у менеджера.')}</p></article><aside class="spec-panel"><h2>Характеристики</h2><dl><dt>Год выпуска</dt><dd>${car.year || '—'}</dd><dt>Пробег</dt><dd>${number(car.mileage)} км</dd><dt>Кузов</dt><dd>${escapeHtml(car.body_type || '—')}</dd>${specs}</dl></aside></div></section><div class="sticky-contact"><span><b>${escapeHtml(car.model || car.title)}</b>${car.price_public ? `<small>${money(car.price)}</small>` : ''}</span><a class="button button-primary" href="tel:${SETTINGS.phoneLink}">Позвонить</a><a class="button button-outline" href="${SETTINGS.telegram}" target="_blank" rel="noopener">Telegram</a><a class="button button-outline" href="${SETTINGS.whatsapp}" target="_blank" rel="noopener">WhatsApp</a></div>`;
  return html(layout(`${car.title} — DK AUTO`, body, session));
}

function messagePage(heading, text, session, status = 200) {
  return html(layout(heading, `<section class="message-page shell"><span class="eyebrow">DK AUTO</span><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(text)}</p><a class="button button-primary" href="/">На главную</a></section>`, session), status);
}

function loginPage(error = '') {
  const body = `<section class="auth-page shell"><form class="auth-card" action="/login" method="post"><span class="eyebrow">Только для сотрудников</span><h1>Вход в рабочее пространство</h1><p>Покупателям регистрация не требуется.</p><label>Логин<input name="login" autocomplete="username" required autofocus></label><label>Пароль<input type="password" name="password" autocomplete="current-password" required></label>${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}<button class="button button-primary" type="submit">Войти</button></form></section>`;
  return html(layout('Вход для сотрудников — DK AUTO', body));
}

async function dashboardPage(env, session) {
  const { results: cars } = await env.DB.prepare(`SELECT c.*, COUNT(v.id) AS views_total, SUM(CASE WHEN v.viewed_at >= datetime('now','-1 day') THEN 1 ELSE 0 END) AS views_today, SUM(CASE WHEN v.viewed_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS views_week FROM cars c LEFT JOIN car_view_events v ON v.car_id = c.id GROUP BY c.id ORDER BY c.updated_at DESC, c.id DESC`).all();
  const totals = { published: 0, draft: 0, archived: 0, views: 0 };
  for (const car of cars) { totals[car.status] += 1; totals.views += Number(car.views_total || 0); }
  const rows = cars.map(car => `<article class="staff-car"><img src="${escapeHtml(imageUrl(car.image_path))}" alt=""><div class="staff-car-main"><span class="status status-${car.status}">${car.status === 'published' ? 'В продаже' : car.status === 'draft' ? 'Черновик' : 'В архиве'}</span><h2>${escapeHtml(car.title || 'Новый автомобиль')}</h2><p>Изменен: ${escapeHtml(car.updated_at)}</p></div><dl class="staff-views"><div><dt>Сегодня</dt><dd>${car.views_today || 0}</dd></div><div><dt>7 дней</dt><dd>${car.views_week || 0}</dd></div><div><dt>Всего</dt><dd>${car.views_total || 0}</dd></div></dl><div class="staff-car-actions"><a class="button button-outline" href="/staff/cars/${car.id}/edit">Редактировать</a><a class="button button-quiet" href="/cars/${encodeURIComponent(car.slug)}">Открыть страницу</a></div></article>`).join('');
  const body = `<section class="staff-page shell"><div class="staff-page-heading"><div><span class="eyebrow">Рабочее пространство</span><h1>Автомобили и просмотры</h1><p>Статистика учитывает уникальное открытие страницы одним посетителем не чаще раза в 30 минут.</p></div><form action="/staff/cars" method="post"><input type="hidden" name="_csrf" value="${session.csrf}"><button class="button button-primary" type="submit">Добавить автомобиль</button></form></div><div class="dashboard-stats"><div><strong>${totals.published}</strong><span>в продаже</span></div><div><strong>${totals.draft}</strong><span>черновиков</span></div><div><strong>${totals.archived}</strong><span>в архиве</span></div><div><strong>${totals.views}</strong><span>просмотров всего</span></div></div><div class="staff-car-list">${rows}</div></section>`;
  return html(layout('Рабочее пространство — DK AUTO', body, session));
}

async function editorPage(env, session, id, error = '') {
  const car = await env.DB.prepare('SELECT * FROM cars WHERE id = ?').bind(id).first();
  if (!car) return messagePage('Автомобиль не найден', 'Запись могла быть удалена.', session, 404);
  const { results: characteristics } = await env.DB.prepare(`SELECT ch.*, COALESCE(cc.value,'') AS value, COALESCE(cc.is_public,1) AS is_public FROM characteristics ch LEFT JOIN car_characteristics cc ON cc.characteristic_id = ch.id AND cc.car_id = ? ORDER BY ch.sort_order, ch.id`).bind(id).all();
  const stats = await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN viewed_at >= datetime('now','-1 day') THEN 1 ELSE 0 END) AS today, SUM(CASE WHEN viewed_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS week FROM car_view_events WHERE car_id = ?`).bind(id).first();
  const charRows = characteristics.map(item => `<div class="characteristic-row" data-characteristic data-id="${item.id}"><label>${escapeHtml(item.name)}${item.is_required ? '<b>обязательно</b>' : ''}<input data-characteristic-value value="${escapeHtml(item.value)}"></label><label class="checkbox-label"><input data-characteristic-public type="checkbox" ${item.is_public ? 'checked' : ''}>Показывать покупателю</label></div>`).join('');
  const action = car.status === 'draft' ? '<button class="button button-primary" name="action" value="publish">Опубликовать</button>' : car.status === 'published' ? '<button class="button button-outline" name="action" value="archive">В архив</button>' : '<button class="button button-primary" name="action" value="restore">Вернуть в продажу</button>';
  const body = `<section class="staff-page shell" data-car-editor data-car-id="${car.id}" data-csrf="${session.csrf}"><div class="editor-header"><div><a href="/staff">← Все автомобили</a><h1>${escapeHtml(car.title || 'Новый автомобиль')}</h1><p class="save-state" id="save-state">Сохранено</p></div><div class="editor-header-actions"><form action="/staff/cars/${car.id}/status" method="post"><input type="hidden" name="_csrf" value="${session.csrf}">${action}</form></div></div>${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}<div class="editor-layout"><form class="editor-form" id="car-editor-form"><section class="editor-section"><h2>Основная информация</h2><div class="form-grid"><label class="wide">Название объявления<input name="title" value="${escapeHtml(car.title)}" placeholder="Например, Toyota Camry 2021"></label><label>Марка<input name="brand" value="${escapeHtml(car.brand)}"></label><label>Модель<input name="model" value="${escapeHtml(car.model)}"></label><label>Год<input name="year" type="number" min="1900" max="2100" value="${car.year || ''}"></label><label>Пробег, км<input name="mileage" type="number" min="0" value="${car.mileage ?? ''}"></label><label>Цена, ₽<input name="price" type="number" min="0" value="${car.price ?? ''}"></label><label>Кузов<input name="bodyType" value="${escapeHtml(car.body_type)}"></label><label class="checkbox-label"><input name="pricePublic" type="checkbox" ${car.price_public ? 'checked' : ''}>Показывать цену покупателю</label><label class="wide">Описание<textarea name="description" rows="8">${escapeHtml(car.description)}</textarea></label></div></section><section class="editor-section"><h2>Характеристики</h2><p>Внутренние значения никогда не передаются гостю.</p><div class="characteristics-list">${charRows}</div></section></form><aside class="editor-aside"><div class="analytics-card"><span>Просмотры</span><strong>${stats.total || 0}</strong><dl><div><dt>Сегодня</dt><dd>${stats.today || 0}</dd></div><div><dt>За 7 дней</dt><dd>${stats.week || 0}</dd></div></dl></div><div class="editor-tip"><h2>Фотографии</h2><p>Для бесплатной демонстрации используются подготовленные фотографии из каталога проекта.</p></div><form class="danger-zone" action="/staff/cars/${car.id}/delete" method="post" data-confirm-delete><input type="hidden" name="_csrf" value="${session.csrf}"><h2>Удаление</h2><p>Удаляет запись без восстановления.</p><button class="button button-danger" type="submit">Удалить навсегда</button></form></aside></div></section>`;
  return html(layout(`Редактирование — ${car.title || 'Новый автомобиль'}`, body, session, '<script src="/static/staff-editor.js" defer></script>'));
}

async function requireSession(request, env) {
  return getSession(request, env);
}

async function validCsrf(request, session, formData = null) {
  if (!session) return false;
  const value = request.headers.get('x-csrf-token') || (formData ? String(formData.get('_csrf') || '') : '');
  return sameSecret(value, session.csrf);
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path.startsWith('/assets/') || path.startsWith('/static/')) return env.ASSETS.fetch(request);
  const session = await getSession(request, env);

  if (request.method === 'GET' && path === '/') return homePage(env, session);
  if (request.method === 'GET' && path === '/login') return session ? redirect('/staff') : loginPage();
  if (request.method === 'POST' && path === '/login') {
    const data = await request.formData();
    const loginOk = await sameSecret(data.get('login') || '', env.ADMIN_LOGIN || 'admin');
    const passwordOk = Boolean(env.ADMIN_PASSWORD) && await sameSecret(data.get('password') || '', env.ADMIN_PASSWORD);
    if (!loginOk || !passwordOk) return loginPage('Неверный логин или пароль');
    const token = randomToken();
    const csrf = randomToken();
    const tokenHash = await sha256(token);
    await env.DB.prepare("INSERT INTO sessions(token_hash,csrf_token,expires_at) VALUES(?,?,datetime('now','+14 days'))").bind(tokenHash, csrf).run();
    return redirect('/staff', { 'set-cookie': `dk_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600` });
  }
  if (request.method === 'POST' && path === '/logout') {
    const data = await request.formData();
    if (!await validCsrf(request, session, data)) return messagePage('Сессия устарела', 'Войдите еще раз.', null, 403);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.tokenHash).run();
    return redirect('/', { 'set-cookie': 'dk_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' });
  }
  if (request.method === 'GET' && path.startsWith('/cars/')) return carPage(request, env, session, decodeURIComponent(path.slice(6)));
  if (request.method === 'GET' && path === '/api/cars') {
    const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0);
    const { results } = await env.DB.prepare("SELECT * FROM cars WHERE status = 'published' ORDER BY COALESCE(published_at,created_at) DESC,id DESC LIMIT 10 OFFSET ?").bind(offset).all();
    return json({ cars: results.map(car => ({ ...car, price: car.price_public ? car.price : null, bodyType: car.body_type, mainPhotoUrl: imageUrl(car.image_path) })), nextOffset: offset + results.length, hasMore: results.length === 10 });
  }
  if (request.method === 'GET' && path === '/staff') return session ? dashboardPage(env, session) : redirect('/login');
  if (request.method === 'POST' && path === '/staff/cars') {
    if (!session) return redirect('/login');
    const data = await request.formData();
    if (!await validCsrf(request, session, data)) return messagePage('Сессия устарела', 'Обновите страницу и повторите действие.', session, 403);
    const slug = `novyi-avtomobil-${Date.now().toString(36)}-${randomToken().slice(0, 5).toLowerCase()}`;
    const result = await env.DB.prepare("INSERT INTO cars(slug,title,status) VALUES(?,'','draft')").bind(slug).run();
    return redirect(`/staff/cars/${result.meta.last_row_id}/edit`);
  }
  const editorMatch = path.match(/^\/staff\/cars\/(\d+)\/edit$/);
  if (request.method === 'GET' && editorMatch) return session ? editorPage(env, session, Number(editorMatch[1]), url.searchParams.get('error') || '') : redirect('/login');
  const apiMatch = path.match(/^\/api\/staff\/cars\/(\d+)$/);
  if (request.method === 'PATCH' && apiMatch) {
    if (!session) return json({ error: 'Войдите в рабочее пространство' }, 401);
    if (!await validCsrf(request, session)) return json({ error: 'Сессия устарела. Обновите страницу.' }, 403);
    const id = Number(apiMatch[1]);
    const current = await env.DB.prepare('SELECT * FROM cars WHERE id = ?').bind(id).first();
    if (!current) return json({ error: 'Автомобиль не найден' }, 404);
    const data = await request.json();
    const title = String(data.title ?? current.title).slice(0, 160);
    const brand = String(data.brand ?? current.brand).slice(0, 80);
    const model = String(data.model ?? current.model).slice(0, 100);
    const bodyType = String(data.bodyType ?? current.body_type).slice(0, 80);
    const description = String(data.description ?? current.description).slice(0, 20000);
    const year = data.year == null ? null : Math.min(2100, Math.max(1900, Number(data.year)));
    const mileage = data.mileage == null ? null : Math.max(0, Math.round(Number(data.mileage)));
    const price = data.price == null ? null : Math.max(0, Math.round(Number(data.price)));
    const statements = [env.DB.prepare('UPDATE cars SET title=?,brand=?,model=?,year=?,price=?,price_public=?,mileage=?,body_type=?,description=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(title, brand, model, year, price, data.pricePublic ? 1 : 0, mileage, bodyType, description, id)];
    for (const item of Array.isArray(data.characteristics) ? data.characteristics : []) {
      statements.push(env.DB.prepare(`INSERT INTO car_characteristics(car_id,characteristic_id,value,is_public,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(car_id,characteristic_id) DO UPDATE SET value=excluded.value,is_public=excluded.is_public,updated_at=CURRENT_TIMESTAMP`).bind(id, Number(item.id), String(item.value || '').slice(0, 5000), item.isPublic ? 1 : 0));
    }
    await env.DB.batch(statements);
    return json({ ok: true, savedAt: new Date().toISOString() });
  }
  const statusMatch = path.match(/^\/staff\/cars\/(\d+)\/status$/);
  if (request.method === 'POST' && statusMatch) {
    if (!session) return redirect('/login');
    const data = await request.formData();
    if (!await validCsrf(request, session, data)) return messagePage('Сессия устарела', 'Обновите страницу и повторите действие.', session, 403);
    const id = Number(statusMatch[1]);
    const car = await env.DB.prepare('SELECT * FROM cars WHERE id=?').bind(id).first();
    if (!car) return messagePage('Автомобиль не найден', 'Запись могла быть удалена.', session, 404);
    const action = String(data.get('action') || '');
    if (action === 'publish') {
      const missing = [];
      if (!car.brand.trim()) missing.push('Марка');
      if (!car.model.trim()) missing.push('Модель');
      if (!car.year) missing.push('Год выпуска');
      if (car.mileage == null) missing.push('Пробег');
      if (missing.length) return redirect(`/staff/cars/${id}/edit?error=${encodeURIComponent(`Не заполнены обязательные поля: ${missing.join(', ')}`)}`);
      await env.DB.prepare("UPDATE cars SET status='published',published_at=COALESCE(published_at,CURRENT_TIMESTAMP),archived_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    } else if (action === 'archive') {
      await env.DB.prepare("UPDATE cars SET status='archived',archived_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    } else if (action === 'restore') {
      await env.DB.prepare("UPDATE cars SET status='published',archived_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    }
    return redirect('/staff');
  }
  const deleteMatch = path.match(/^\/staff\/cars\/(\d+)\/delete$/);
  if (request.method === 'POST' && deleteMatch) {
    if (!session) return redirect('/login');
    const data = await request.formData();
    if (!await validCsrf(request, session, data)) return messagePage('Сессия устарела', 'Обновите страницу и повторите действие.', session, 403);
    const id = Number(deleteMatch[1]);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM car_view_events WHERE car_id=?').bind(id),
      env.DB.prepare('DELETE FROM car_characteristics WHERE car_id=?').bind(id),
      env.DB.prepare('DELETE FROM cars WHERE id=?').bind(id)
    ]);
    return redirect('/staff');
  }
  if (request.method === 'GET' && path === '/health') return json({ ok: true, database: 'd1', time: new Date().toISOString() });
  return messagePage('Страница не найдена', 'Проверьте адрес или вернитесь на главную.', session, 404);
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error(error);
      return request.url.includes('/api/') ? json({ error: 'Не удалось выполнить действие. Попробуйте еще раз.' }, 500) : messagePage('Что-то пошло не так', 'Попробуйте обновить страницу.', null, 500);
    }
  }
};
