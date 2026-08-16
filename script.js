const config = window.DEALER_CONFIG;
const dealer = config.dealer;
const cars = config.cars;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
const carWord = (count) => {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'автомобилей';
  if (last === 1) return 'автомобиль';
  if (last >= 2 && last <= 4) return 'автомобиля';
  return 'автомобилей';
};

function setText(selector, value) {
  $$(selector).forEach((element) => { element.textContent = value; });
}

function applyDealerData() {
  setText('[data-dealer-name]', dealer.name);
  setText('[data-dealer-short]', dealer.shortName);
  setText('[data-dealer-tagline]', dealer.tagline);
  setText('[data-dealer-city]', dealer.city);
  setText('[data-dealer-address]', dealer.address);
  setText('[data-dealer-hours]', dealer.hours);
  setText('[data-dealer-phone]', dealer.phone);
  setText('[data-dealer-experience]', dealer.experience);
  setText('[data-dealer-sold]', dealer.sold);
  $$('[data-dealer-phone-link]').forEach((element) => { element.href = `tel:${dealer.phoneLink}`; });
  $$('[data-dealer-messenger]').forEach((element) => { element.href = dealer.messenger; });
  const heroCount = $('#hero-count');
  if (heroCount) heroCount.textContent = `${cars.length} ${carWord(cars.length)}`;
  document.title = `${dealer.name} — автомобили с пробегом`;
}

const menuToggle = $('.menu-toggle');
const mainNav = $('#main-nav');
menuToggle?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
$$('.main-nav a').forEach((link) => link.addEventListener('click', () => {
  mainNav.classList.remove('is-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

const carGrid = $('#car-grid');
const brandFilter = $('#brand-filter');
const bodyFilter = $('#body-filter');
const priceFilter = $('#price-filter');
const priceMinInput = $('#price-min');
const priceMaxInput = $('#price-max');
const searchInput = $('#car-search');
const emptyState = $('#empty-state');
const visibleCount = $('#visible-count');
const toolbarCount = $('#toolbar-count');
const sortFilter = $('#sort-filter');
const showAllButton = $('#show-all');

function cardTemplate(car) {
  const payment = Math.ceil((car.price * 0.021) / 100) * 100;
  return `
    <article class="car-card" data-car-id="${car.id}">
      <button class="card-photo js-open-car" type="button" data-car-id="${car.id}" aria-label="Открыть ${car.brand} ${car.model}">
        <img src="${car.cardImage || car.images[0]}" alt="${car.brand} ${car.model} ${car.year}" loading="lazy">
        <span class="card-status">${car.status}</span>
        <span class="card-favorite" aria-hidden="true">♡</span>
      </button>
      <div class="card-body">
        <span class="card-brand">${car.brand} · ${car.year}</span>
        <div class="card-title-row"><h3>${car.model}</h3><strong>${money(car.price)}</strong></div>
        <div class="card-specs"><span>${car.mileage.toLocaleString('ru-RU')} км</span><span>${car.engine}</span><span>${car.drive} привод</span></div>
        <button class="card-footer js-open-car" type="button" data-car-id="${car.id}"><span>от ${money(payment)}/мес.</span><b>Смотреть</b></button>
      </div>
    </article>`;
}

function populateFilters() {
  [...new Set(cars.map((car) => car.brand))].sort().forEach((brand) => brandFilter.insertAdjacentHTML('beforeend', `<option value="${brand}">${brand}</option>`));
  if (bodyFilter) [...new Set(cars.map((car) => car.body))].sort().forEach((body) => bodyFilter.insertAdjacentHTML('beforeend', `<option value="${body}">${body}</option>`));
}

function filteredCars() {
  const query = searchInput.value.trim().toLowerCase();
  const brand = brandFilter.value;
  const body = bodyFilter?.value || 'all';
  const minPrice = priceMinInput?.value ? Number(priceMinInput.value) : 0;
  const maxPrice = priceMaxInput?.value ? Number(priceMaxInput.value) : (priceFilter && priceFilter.value !== 'all' ? Number(priceFilter.value) : Infinity);
  const result = cars.filter((car) => {
    const matchesQuery = `${car.brand} ${car.model}`.toLowerCase().includes(query);
    return matchesQuery && (brand === 'all' || car.brand === brand) && (body === 'all' || car.body === body) && car.price >= minPrice && car.price <= maxPrice;
  });
  const sorted = [...result];
  if (sortFilter?.value === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  if (sortFilter?.value === 'price-desc') sorted.sort((a, b) => b.price - a.price);
  if (sortFilter?.value === 'year-desc') sorted.sort((a, b) => b.year - a.year);
  if (sortFilter?.value === 'mileage-asc') sorted.sort((a, b) => a.mileage - b.mileage);
  return sorted;
}

function renderCars() {
  const result = filteredCars();
  carGrid.innerHTML = result.map(cardTemplate).join('');
  if (visibleCount) visibleCount.textContent = result.length;
  if (toolbarCount) toolbarCount.textContent = `${result.length} ${carWord(result.length)}`;
  emptyState.hidden = result.length !== 0;
  carGrid.classList.remove('is-expanded');
  showAllButton.hidden = result.length <= 4;
  showAllButton.innerHTML = 'Все автомобили →';
}

showAllButton.addEventListener('click', () => {
  const isOpen = carGrid.classList.toggle('is-expanded');
  showAllButton.innerHTML = isOpen ? 'Свернуть список ↑' : 'Все автомобили →';
});

[searchInput, brandFilter, bodyFilter, priceFilter, priceMinInput, priceMaxInput, sortFilter].filter(Boolean).forEach((control) => control.addEventListener(['INPUT','SEARCH'].includes(control.tagName) ? 'input' : 'change', renderCars));
$('#catalog-filter')?.addEventListener('submit', (event) => { event.preventDefault(); renderCars(); document.querySelector('#inventory').scrollIntoView({ behavior: 'smooth' }); });
$('#filter-reset')?.addEventListener('click', () => {
  searchInput.value = '';
  brandFilter.value = 'all';
  if (bodyFilter) bodyFilter.value = 'all';
  if (priceFilter) priceFilter.value = 'all';
  if (priceMinInput) priceMinInput.value = '';
  if (priceMaxInput) priceMaxInput.value = '';
  if (sortFilter) sortFilter.value = 'default';
  renderCars();
});

const carDialog = $('#car-dialog');
const modalImage = $('#modal-main-image');
modalImage.src = cars[0].images[0];
const thumbs = $('#gallery-thumbs');
let activeCar = null;
let activeImage = 0;

function renderGallery() {
  if (!activeCar) return;
  modalImage.src = activeCar.images[activeImage];
  modalImage.alt = `${activeCar.brand} ${activeCar.model}, фото ${activeImage + 1}`;
  $('#gallery-counter').textContent = `${activeImage + 1} / ${activeCar.images.length}`;
  thumbs.innerHTML = activeCar.images.map((image, index) => `<button class="gallery-thumb ${index === activeImage ? 'is-active' : ''}" type="button" data-image-index="${index}" aria-label="Открыть фото ${index + 1}"><img src="${image}" alt=""></button>`).join('');
  $$('.gallery-arrow', carDialog).forEach((button) => { button.hidden = activeCar.images.length < 2; });
}

function openCar(carId) {
  activeCar = cars.find((car) => car.id === carId);
  if (!activeCar) return;
  activeImage = 0;
  $('#modal-status').textContent = activeCar.status;
  $('#modal-brand').textContent = `${activeCar.brand} · ${activeCar.year}`;
  $('#modal-name').textContent = activeCar.model;
  $('#modal-price').textContent = money(activeCar.price);
  $('#modal-side-price').textContent = money(activeCar.price);
  $('#modal-full-name').textContent = `${activeCar.brand} ${activeCar.model}`;
  $('#modal-payment').textContent = `от ${money(Math.ceil((activeCar.price * 0.021) / 100) * 100)}/мес.`;
  $('#modal-description').textContent = activeCar.description;
  $('#modal-specs').innerHTML = [
    ['Пробег', `${activeCar.mileage.toLocaleString('ru-RU')} км`],
    ['Двигатель', activeCar.engine],
    ['Коробка', activeCar.transmission],
    ['Привод', activeCar.drive],
    ['Кузов', activeCar.body],
    ['Цвет', activeCar.color],
    ['Владельцы', activeCar.owners],
    ['Год', activeCar.year]
  ].map(([name, value]) => `<div><dt>${name}</dt><dd>${value}</dd></div>`).join('');
  const message = `Здравствуйте! Интересует ${activeCar.brand} ${activeCar.model} ${activeCar.year} за ${money(activeCar.price)}.`;
  $('#modal-message').href = `${dealer.messenger}?text=${encodeURIComponent(message)}`;
  renderGallery();
  carDialog.showModal();
}

document.addEventListener('click', (event) => {
  const carButton = event.target.closest('.js-open-car');
  if (carButton) openCar(carButton.dataset.carId);
});

thumbs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-image-index]');
  if (!button) return;
  activeImage = Number(button.dataset.imageIndex);
  renderGallery();
});
$('.gallery-prev').addEventListener('click', () => { activeImage = (activeImage - 1 + activeCar.images.length) % activeCar.images.length; renderGallery(); });
$('.gallery-next').addEventListener('click', () => { activeImage = (activeImage + 1) % activeCar.images.length; renderGallery(); });
$('.dialog-close', carDialog).addEventListener('click', () => carDialog.close());
carDialog.addEventListener('click', (event) => { if (event.target === carDialog) carDialog.close(); });

const leadDialog = $('#lead-dialog');
const leadCarField = $('.lead-car-field', leadDialog);
function openLead(type, carName = '') {
  const messages = {
    selection: ['Найти автомобиль под заказ', 'Расскажите, что ищете. Подберем варианты в вашем бюджете.'],
    buyout: ['Оценить автомобиль', 'Укажите контакты — Дмитрий уточнит данные машины и назовет ориентир по цене.'],
    credit: ['Рассчитать автокредит', 'Оставьте номер — рассчитаем платеж и расскажем о доступных программах.'],
    tradein: ['Обсудить Trade-in', 'Расскажите, какой автомобиль хотите отдать в зачет и что планируете купить.'],
    callback: ['Связаться с DK AUTO', 'Оставьте номер — Дмитрий перезвонит и ответит на вопросы.']
  };
  const [title, text] = messages[type] || messages.callback;
  const serviceNames = { buyout: 'Выкуп автомобиля', credit: 'Автокредит', tradein: 'Trade-in' };
  $('#lead-dialog-title').textContent = title;
  $('#lead-dialog-text').textContent = text;
  leadCarField.hidden = type === 'callback' && !carName;
  $('input[name="car"]', leadDialog).value = carName || serviceNames[type] || '';
  leadDialog.dataset.formType = type;
  leadDialog.showModal();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('.js-open-lead');
  if (!button) return;
  const carName = button.closest('#car-dialog') && activeCar ? `${activeCar.brand} ${activeCar.model}` : '';
  if (carDialog.open) carDialog.close();
  openLead(button.dataset.leadType || 'callback', carName);
});
$('.dialog-close', leadDialog).addEventListener('click', () => leadDialog.close());
leadDialog.addEventListener('click', (event) => { if (event.target === leadDialog) leadDialog.close(); });

let toastTimer;
function showToast() {
  const toast = $('#toast');
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

$$('.lead-form').forEach((form) => form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  form.reset();
  if (form.closest('dialog')) form.closest('dialog').close();
  showToast();
}));

applyDealerData();
populateFilters();
renderCars();
