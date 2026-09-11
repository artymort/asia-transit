const editor = document.querySelector('[data-car-editor]');
const form = document.querySelector('#car-editor-form');
const saveState = document.querySelector('#save-state');
let timer;
let controller;

function nullableNumber(value) {
  return value.trim() === '' ? null : Number(value);
}

function payload() {
  const data = new FormData(form);
  return {
    title: data.get('title'),
    brand: data.get('brand'),
    model: data.get('model'),
    year: nullableNumber(data.get('year')),
    price: nullableNumber(data.get('price')),
    pricePublic: data.get('pricePublic') === 'on',
    mileage: nullableNumber(data.get('mileage')),
    bodyType: data.get('bodyType'),
    description: data.get('description'),
    characteristics: [...document.querySelectorAll('[data-characteristic]')].map(row => ({
      id: Number(row.dataset.id),
      value: row.querySelector('[data-characteristic-value]').value,
      isPublic: row.querySelector('[data-characteristic-public]').checked
    }))
  };
}

async function save() {
  controller?.abort();
  controller = new AbortController();
  saveState.textContent = 'Сохранение…';
  saveState.className = 'save-state is-saving';
  try {
    const response = await fetch(`/api/staff/cars/${editor.dataset.carId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-csrf-token': editor.dataset.csrf },
      body: JSON.stringify(payload()),
      signal: controller.signal
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Ошибка сохранения');
    saveState.textContent = `Сохранено в ${new Date(result.savedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    saveState.className = 'save-state';
  } catch (error) {
    if (error.name === 'AbortError') return;
    saveState.textContent = error.message || 'Изменения не сохранены';
    saveState.className = 'save-state is-error';
  }
}

form?.addEventListener('input', () => {
  clearTimeout(timer);
  saveState.textContent = 'Есть несохраненные изменения';
  timer = setTimeout(save, 650);
});
form?.addEventListener('change', () => { clearTimeout(timer); timer = setTimeout(save, 150); });
document.querySelector('[data-confirm-delete]')?.addEventListener('submit', event => {
  if (!window.confirm('Автомобиль и все связанные файлы будут удалены без возможности восстановления. Продолжить?')) event.preventDefault();
});
