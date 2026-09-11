const galleryMain = document.querySelector('#gallery-main');
document.querySelectorAll('[data-gallery-src]').forEach(button => {
  button.addEventListener('click', () => {
    galleryMain.src = button.dataset.gallerySrc;
    document.querySelectorAll('[data-gallery-src]').forEach(item => item.classList.toggle('is-active', item === button));
  });
});

const loadMoreButton = document.querySelector('#load-more');
const catalogList = document.querySelector('#catalog-list');

function money(value) {
  return value == null ? 'Цена по запросу' : `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

function number(value) {
  return value == null ? '—' : new Intl.NumberFormat('ru-RU').format(value);
}

function createCarCard(car) {
  const card = document.createElement('article');
  card.className = 'catalog-card';
  const safeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  card.innerHTML = `
    <a class="catalog-photo" href="/cars/${encodeURIComponent(car.slug)}"><img src="${safeText(car.mainPhotoUrl)}" alt="${safeText(car.title)}" loading="lazy"><span class="availability">В наличии</span></a>
    <div class="catalog-content"><div class="catalog-heading"><div><span class="car-kicker">${safeText(car.brand)} · ${safeText(car.year || 'Год уточняется')}</span><h3><a href="/cars/${encodeURIComponent(car.slug)}">${safeText(car.model || car.title)}</a></h3></div><strong class="car-price">${money(car.price)}</strong></div><div class="catalog-specs"><span>${number(car.mileage)} км</span><span>${safeText(car.bodyType || 'Кузов уточняется')}</span></div><p>${safeText(car.description || 'Подробности уточняйте у менеджера.')}</p><div class="catalog-footer"><a class="button button-outline" href="/cars/${encodeURIComponent(car.slug)}">Фотографии и характеристики</a></div></div>`;
  return card;
}

loadMoreButton?.addEventListener('click', async () => {
  loadMoreButton.disabled = true;
  loadMoreButton.textContent = 'Загрузка…';
  try {
    const response = await fetch(`/api/cars?offset=${loadMoreButton.dataset.offset}`);
    if (!response.ok) throw new Error('load failed');
    const data = await response.json();
    data.cars.forEach(car => catalogList.append(createCarCard(car)));
    loadMoreButton.dataset.offset = data.nextOffset;
    if (!data.hasMore) loadMoreButton.remove();
    else loadMoreButton.textContent = 'Загрузить еще';
  } catch {
    loadMoreButton.textContent = 'Не удалось загрузить. Повторить';
  } finally {
    loadMoreButton.disabled = false;
  }
});
