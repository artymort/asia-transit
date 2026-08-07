const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const menuToggle = $('.menu-toggle');
const mainNav = $('#main-nav');
menuToggle?.addEventListener('click', () => {
  const open = mainNav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
$$('.main-nav a').forEach((link) => link.addEventListener('click', () => {
  mainNav.classList.remove('is-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

const markets = {
  korea: {
    image: 'assets/genesis-gv70-2027.webp',
    alt: 'Genesis GV70 из Южной Кореи',
    brand: 'Genesis',
    name: 'GV70',
    price: 'ориентир от 4,9 млн ₽',
    text: 'Большой выбор автомобилей с пробегом, понятная история обслуживания и богатые комплектации.',
    models: 'Kia, Hyundai, Genesis',
    fit: 'Кроссоверов 2–5 лет',
    side: [
      { image: 'assets/listings/kia-k3-1.webp', alt: 'Kia The New K3 из Южной Кореи', origin: 'Южная Корея', name: 'Kia The New K3' },
      { image: 'assets/listings/hyundai-avante-1.webp', alt: 'Hyundai The New Avante из Южной Кореи', origin: 'Южная Корея', name: 'Hyundai The New Avante' }
    ]
  },
  china: {
    image: 'assets/geely-monjaro.png',
    alt: 'Geely Monjaro из Китая',
    brand: 'Geely',
    name: 'Monjaro',
    price: 'ориентир от 3,45 млн ₽',
    text: 'Новые автомобили, широкий выбор оснащения и модели, которых еще нет у российских дилеров.',
    models: 'Geely, Chery, Exeed, Changan',
    fit: 'Новых автомобилей',
    side: [
      { image: 'assets/listings/changan-cs35-1.jpg', alt: 'Changan CS35 Plus из Китая', origin: 'Китай', name: 'Changan CS35 Plus' },
      { image: 'assets/chery-tiggo7-pro-max.png', alt: 'Chery Tiggo 7 Pro Max из Китая', origin: 'Китай', name: 'Chery Tiggo 7 Pro Max' }
    ]
  }
};

$$('[data-market]').forEach((button) => button.addEventListener('click', () => {
  const key = button.dataset.market;
  const market = markets[key];
  const visual = $('.direction-visual');
  $$('[data-market]').forEach((item) => {
    const active = item === button;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-selected', String(active));
  });
  visual.classList.add('is-switching');
  window.setTimeout(() => {
    $('#market-image').src = market.image;
    $('#market-image').alt = market.alt;
    $('#market-brand').textContent = market.brand;
    $('#market-name').textContent = market.name;
    $('#market-price').textContent = market.price;
    $('#market-content > p').textContent = market.text;
    $('#market-models').textContent = market.models;
    $('#market-fit').textContent = market.fit;
    market.side.forEach((car, index) => {
      const number = index + 1;
      $(`#side-image-${number}`).src = car.image;
      $(`#side-image-${number}`).alt = car.alt;
      $(`#side-origin-${number}`).textContent = car.origin;
      $(`#side-name-${number}`).textContent = car.name;
    });
    visual.classList.remove('is-switching');
  }, 160);
}));

const formatMoney = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
const cityData = {
  ekb: { name: 'Екатеринбург', cost: 155000 },
  msk: { name: 'Москва', cost: 180000 },
  nsk: { name: 'Новосибирск', cost: 120000 },
  kzn: { name: 'Казань', cost: 195000 },
  vvo: { name: 'Владивосток', cost: 0 }
};
let selectedCountry = 'korea';

const customsValueRates = [
  { max: 8500, percent: .54, minPerCc: 2.5 },
  { max: 16700, percent: .48, minPerCc: 3.5 },
  { max: 42300, percent: .48, minPerCc: 5.5 },
  { max: 84500, percent: .48, minPerCc: 7.5 },
  { max: 169000, percent: .48, minPerCc: 15 },
  { max: Infinity, percent: .48, minPerCc: 20 }
];

const customsCcRates = {
  '3to5': [
    { max: 1000, rate: 1.5 }, { max: 1500, rate: 1.7 }, { max: 1800, rate: 2.5 },
    { max: 2300, rate: 2.7 }, { max: 3000, rate: 3 }, { max: Infinity, rate: 3.6 }
  ],
  over5: [
    { max: 1000, rate: 3 }, { max: 1500, rate: 3.2 }, { max: 1800, rate: 3.5 },
    { max: 2300, rate: 4.8 }, { max: 3000, rate: 5 }, { max: Infinity, rate: 5.7 }
  ]
};

const powerBandsKw = [51.48, 73.55, 95.61, 117.68, 139.75, 161.81, 183.88, 205.94, 228, 250.07, 272.13, 294.20, 316.26, 338.33, 367.75, Infinity];
const utilFees2026 = [
  { maxCc: 1000, fresh: [3400,3400,3400,3400,307200,316800,324000,345600,345600,345600,345600,345600,345600,345600,345600,345600], old: [5200,5200,5200,5200,568800,585600,602400,602400,602400,602400,602400,602400,602400,602400,602400,602400] },
  { maxCc: 2000, fresh: [3400,3400,3400,3400,900000,952800,1010400,1142400,1291200,1459200,1663200,1896000,2160000,2464800,2808000,3201600], old: [5200,5200,5200,5200,1492800,1584000,1677600,1838400,2011200,2203200,2412000,2640000,2892000,3168000,3468000,3796800] },
  { maxCc: 3000, fresh: [3400,3400,3400,3400,2306800,2364000,2402400,2520000,2620800,2726400,2834400,2949600,3067200,3189600,3316800,3448800], old: [5200,5200,5200,5200,3456000,3501600,3552000,3660000,3770400,3873600,3981600,4094400,4209600,4327200,4447200,4572000] },
  { maxCc: 3500, fresh: [2584000,2584000,2584000,2584000,2635200,2688000,2743200,2810400,2880000,3038400,3206400,3384000,3568800,3765600,3972000,4190400], old: [3956200,3956200,3956200,3956200,4000800,4044000,4087200,4144800,4248000,4356000,4485600,4620000,4759200,4900800,5049600,5200800] },
  { maxCc: Infinity, fresh: [3290600,3290600,3290600,3290600,3345600,3403200,3460800,3530400,3600000,3727200,3857600,3993600,4132800,4276800,4425600,4581600], old: [4325800,4325800,4325800,4325800,4389600,4456800,4524000,4627200,4732800,4992000,5268000,5558400,5863200,6187200,6528000,6885600] }
];

function calculateCustomsDuty(priceRub, age, engineCc, eurRate) {
  if (age === 'under3') {
    const valueEur = priceRub / eurRate;
    const band = customsValueRates.find((item) => valueEur <= item.max);
    return Math.max(valueEur * band.percent, engineCc * band.minPerCc) * eurRate;
  }
  const band = customsCcRates[age].find((item) => engineCc <= item.max);
  return engineCc * band.rate * eurRate;
}

function calculateUtilFee(engineCc, horsepower, age) {
  const powerKw = horsepower * 0.735499;
  const volumeBand = utilFees2026.find((item) => engineCc <= item.maxCc);
  const powerIndex = powerBandsKw.findIndex((max) => powerKw <= max);
  return volumeBand[age === 'under3' ? 'fresh' : 'old'][powerIndex];
}

function calculateImport() {
  const price = Math.max(0, Number($('#car-price')?.value || 0));
  const power = Number($('#car-power')?.value || 0);
  const age = $('#car-age')?.value || 'under3';
  const engineCc = Number($('#engine-volume')?.value || 0);
  const eurRate = Number($('#eur-rate')?.value || 95);
  const personalUse = Boolean($('#personal-use')?.checked);
  const destination = $('#destination')?.value || 'ekb';
  const logistics = selectedCountry === 'korea' ? 320000 : 260000;
  const paperwork = 40000;
  const customs = calculateCustomsDuty(price, age, engineCc, eurRate);
  const cityCost = cityData[destination].cost;
  const preferential = personalUse && power <= 160 && engineCc <= 3000;
  const utilFee = personalUse ? calculateUtilFee(engineCc, power, age) : 0;
  const total = price + logistics + customs + paperwork + cityCost + utilFee;

  $('#result-car').textContent = formatMoney(price);
  $('#result-logistics').textContent = formatMoney(logistics);
  $('#result-customs').textContent = formatMoney(customs);
  $('#result-paperwork').textContent = formatMoney(paperwork);
  $('#result-city').textContent = formatMoney(cityCost);
  $('#result-total').textContent = personalUse ? `≈ ${formatMoney(total)}` : 'Нужен индивидуальный расчет';

  const eligibility = $('#eligibility');
  if (preferential) {
    $('#result-util').textContent = formatMoney(utilFee);
    $('#eligibility-title').textContent = `Льготный утильсбор: ${formatMoney(utilFee)}`;
    $('#eligibility-text').textContent = 'Не выше 160 л.с. и 3 000 см³; условия личного ввоза отмечены.';
    $('#result-caption').textContent = 'включает пошлину и утильсбор по введенным параметрам';
    eligibility.classList.remove('is-warning');
  } else if (personalUse) {
    $('#result-util').textContent = formatMoney(utilFee);
    $('#eligibility-title').textContent = `Льготная ставка неприменима: ${formatMoney(utilFee)}`;
    $('#eligibility-text').textContent = power > 160 ? 'Мощность выше 160 л.с.; применена шкала 2026 года.' : 'Объем двигателя выше 3 000 см³; применена полная ставка.';
    $('#result-caption').textContent = 'включает повышенный утильсбор по шкале 2026 года';
    eligibility.classList.add('is-warning');
  } else {
    $('#result-util').textContent = 'не рассчитан';
    $('#eligibility-title').textContent = 'Льготный сценарий неприменим';
    $('#eligibility-text').textContent = 'Коммерческий ввоз и повторный автомобиль требуют отдельного расчета.';
    $('#result-caption').textContent = 'утильсбор не включен: выбран не личный ввоз';
    eligibility.classList.add('is-warning');
  }

  const ageStatus = $('#age-status');
  if (age === '3to5') {
    $('#age-status-title').textContent = 'Таможенно выгодный возраст: 3–5 лет';
    $('#age-status-text').textContent = 'Пошлина считается по фиксированной ставке за см³.';
    ageStatus.classList.remove('is-warning');
  } else {
    $('#age-status-title').textContent = age === 'under3' ? 'Возраст до 3 лет' : 'Возраст старше 5 лет';
    $('#age-status-text').textContent = age === 'under3' ? 'Пошлина зависит от стоимости и объема двигателя.' : 'Ставка за см³ выше, чем для автомобилей 3–5 лет.';
    ageStatus.classList.add('is-warning');
  }
}

$$('[data-country]').forEach((button) => button.addEventListener('click', () => {
  selectedCountry = button.dataset.country;
  $$('[data-country]').forEach((item) => item.classList.toggle('is-active', item === button));
  calculateImport();
}));
$$('#import-calculator input, #import-calculator select').forEach((field) => field.addEventListener('input', calculateImport));

const listingCars = {
  'kia-k3': {
    origin: 'Южная Корея', title: 'Kia The New K3', version: '2024 · 1.6 Prestige', price: '1 897 773 ₽',
    fee: 'Льготный утильсбор: 3 400 ₽', feeNote: '123 л.с.; при личном ввозе и соблюдении установленных условий', warning: false,
    source: 'https://carskorea.shop/kia/the-new-k3-2nd-generation/uid-3734306/',
    images: ['assets/listings/kia-k3-1.webp','assets/listings/kia-k3-2.webp','assets/listings/kia-k3-3.webp'],
    specs: [['Год','2024'],['Пробег','33 119 км'],['Двигатель','1 598 см³, бензин'],['Мощность','123 л.с.'],['Коробка','автомат'],['Привод','передний'],['Комплектация','Prestige'],['Цена','с ПТС во Владивостоке']]
  },
  'hyundai-avante': {
    origin: 'Южная Корея', title: 'Hyundai The New Avante', version: '2024 · 1.6 Modern', price: '1 950 939 ₽',
    fee: 'Льготный утильсбор: 3 400 ₽', feeNote: '123 л.с.; при личном ввозе и соблюдении установленных условий', warning: false,
    source: 'https://carskorea.shop/hyundai/the-new-avante-cn7/uid-4565981/',
    images: ['assets/listings/hyundai-avante-1.webp','assets/listings/hyundai-avante-2.webp','assets/listings/hyundai-avante-3.webp'],
    specs: [['Год','2024'],['Пробег','11 063 км'],['Двигатель','1 598 см³, бензин'],['Мощность','123 л.с.'],['Коробка','автомат'],['Привод','передний'],['Комплектация','Modern'],['Цена','с ПТС во Владивостоке']]
  },
  'changan-cs35': {
    origin: 'Китай', title: 'Changan CS35 Plus', version: '2024 · 1.4T', price: '≈ 2 427 000 ₽',
    fee: 'Льготный утильсбор: 3 400 ₽', feeNote: 'Ровно 160 л.с. — порог включительный; действуют условия личного ввоза', warning: false,
    source: 'https://www.drom.ru/world/china/changan/cs35_plus/981926/',
    images: ['assets/listings/changan-cs35-1.jpg','assets/listings/changan-cs35-2.jpg','assets/listings/changan-cs35-3.jpg'],
    specs: [['Год','2024'],['Пробег','13 400 км'],['Двигатель','1 392 см³, бензин'],['Мощность','160 л.с.'],['Коробка','робот'],['Привод','передний'],['Цена в Китае','67 400 ¥'],['Цвет','белый']]
  },
  'geely-monjaro': {
    origin: 'Китай', title: 'Geely Monjaro', version: '2024 · 2.0T', price: '≈ 3 296 000 ₽',
    fee: 'Утильсбор 2026: 1 010 400 ₽', feeNote: '238 л.с. и 1 969 см³ — льготная ставка не применяется', warning: true,
    source: 'https://www.drom.ru/world/china/geely/monjaro/2127415/',
    images: ['assets/listings/geely-monjaro-1.jpg','assets/listings/geely-monjaro-2.jpg','assets/listings/geely-monjaro-3.jpg'],
    specs: [['Год','2024'],['Пробег','11 400 км'],['Двигатель','1 969 см³, бензин'],['Мощность','238 л.с.'],['Коробка','автомат'],['Привод','передний (в объявлении)'],['Цена в Китае','101 100 ¥'],['Цвет','серый']]
  }
};

let activeListing = null;
let activeImageIndex = 0;

function renderQuickViewImage() {
  if (!activeListing) return;
  const image = $('#quick-view-image');
  image.src = activeListing.images[activeImageIndex];
  image.alt = `${activeListing.title}, фотография ${activeImageIndex + 1}`;
  $('#gallery-count').textContent = `${activeImageIndex + 1} / ${activeListing.images.length}`;
  $$('.quick-view-thumb').forEach((thumb, index) => thumb.classList.toggle('is-active', index === activeImageIndex));
}

function openQuickView(carId) {
  activeListing = listingCars[carId];
  if (!activeListing) return;
  activeImageIndex = 0;
  $('#quick-view-origin').textContent = activeListing.origin;
  $('#quick-view-title').textContent = activeListing.title;
  $('#quick-view-version').textContent = activeListing.version;
  $('#quick-view-price').textContent = activeListing.price;
  $('#quick-view-fee').textContent = activeListing.fee;
  $('#quick-view-fee-note').textContent = activeListing.feeNote;
  $('.quick-view-alert').classList.toggle('is-warning', activeListing.warning);
  $('#quick-view-source').href = activeListing.source;
  $('#quick-view-specs').innerHTML = activeListing.specs.map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`).join('');
  $('#quick-view-thumbs').innerHTML = activeListing.images.map((src, index) => `<button class="quick-view-thumb${index === 0 ? ' is-active' : ''}" type="button" data-image-index="${index}"><img src="${src}" alt="${activeListing.title}, миниатюра ${index + 1}"></button>`).join('');
  $$('.quick-view-thumb').forEach((thumb) => thumb.addEventListener('click', () => { activeImageIndex = Number(thumb.dataset.imageIndex); renderQuickViewImage(); }));
  renderQuickViewImage();
  $('#car-quick-view').showModal();
}

$$('.quick-view-trigger').forEach((button) => button.addEventListener('click', () => openQuickView(button.dataset.carId)));
$('.quick-view-close')?.addEventListener('click', () => $('#car-quick-view').close());
$('.gallery-prev')?.addEventListener('click', () => { activeImageIndex = (activeImageIndex - 1 + activeListing.images.length) % activeListing.images.length; renderQuickViewImage(); });
$('.gallery-next')?.addEventListener('click', () => { activeImageIndex = (activeImageIndex + 1) % activeListing.images.length; renderQuickViewImage(); });
$('#car-quick-view')?.addEventListener('click', (event) => { if (event.target === $('#car-quick-view')) $('#car-quick-view').close(); });

$$('[data-catalog-filter]').forEach((button) => button.addEventListener('click', () => {
  const filter = button.dataset.catalogFilter;
  $$('[data-catalog-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
  $$('.car-card').forEach((card) => card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.origin !== filter));
}));

const showToast = (message) => {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
};

$$('[data-dialog-open]').forEach((button) => button.addEventListener('click', () => {
  const dialog = document.getElementById(button.dataset.dialogOpen);
  if (!dialog) return;
  if (button.dataset.car) $('#request-car').value = button.dataset.car;
  dialog.showModal();
}));
$$('.app-dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
}));

$('#request-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  $('#request-dialog').close();
  showToast('Готово. Это демонстрация — заявка никуда не отправлена.');
});

calculateImport();
