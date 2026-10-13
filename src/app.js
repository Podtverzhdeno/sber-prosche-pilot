import { CITIES, PARTNERS, cityName, createReceipt, debitBalance, formatMoney, getOffers, scenarioLabel, searchFlights } from './mock-engine.js';

const state = {
  route: 'home',
  query: '',
  selection: null,
  result: null,
  sort: 'recommended',
  orders: readOrders(),
  balance: readBalance()
};

const pageTitles = {
  home: 'Покупка в один запрос',
  orders: 'Ваши покупки',
  partners: 'Партнёрская сеть',
  about: 'Как работает пилот'
};

const requestForm = document.querySelector('#request-form');
const requestInput = document.querySelector('#request-input');
const counter = document.querySelector('#char-counter');
const results = document.querySelector('#results-section');
const offerGrid = document.querySelector('#offer-grid');
const modal = document.querySelector('#payment-modal');
const paymentContent = document.querySelector('#payment-content');
const toast = document.querySelector('#toast');
const walletModal = document.querySelector('#wallet-modal');

function readOrders() {
  try { return JSON.parse(localStorage.getItem('sber-prosche-orders') || '[]'); }
  catch { return []; }
}

function readBalance() {
  const raw = localStorage.getItem('sber-prosche-balance');
  if (raw === null) return 50000;
  const saved = Number(raw);
  return Number.isFinite(saved) && saved >= 0 ? saved : 50000;
}

function saveOrders() {
  localStorage.setItem('sber-prosche-orders', JSON.stringify(state.orders));
  updateOrderCount();
}

function saveBalance() {
  localStorage.setItem('sber-prosche-balance', String(state.balance));
  updateBalance();
}

function navigate(route) {
  state.route = route;
  document.querySelectorAll('.page').forEach((page) => page.classList.toggle('active', page.dataset.page === route));
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.route === route));
  document.querySelector('#page-title').textContent = pageTitles[route];
  if (route === 'orders') renderOrders();
  window.location.hash = route;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setStep(step, label) {
  document.querySelectorAll('.journey-steps li').forEach((item) => {
    const n = Number(item.dataset.step);
    item.classList.toggle('active', n === step);
    item.classList.toggle('done', n < step);
  });
  document.querySelector('#journey-label').textContent = label;
}

function submitRequest(query) {
  state.query = query.trim();
  if (!state.query) {
    requestInput.focus();
    showToast('Сначала опишите покупку');
    return;
  }
  const button = requestForm.querySelector('[type="submit"]');
  button.disabled = true;
  button.innerHTML = 'Агент подбирает <span class="loader"></span>';
  setStep(1, 'Анализ запроса');

  window.setTimeout(() => {
    state.result = getOffers(state.query);
    renderOffers();
    results.hidden = false;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setStep(2, 'Выберите предложение');
    button.disabled = false;
    button.innerHTML = 'Найти варианты <span>→</span>';
  }, 650);
}

function renderOffers() {
  const { scenario, budget, offers } = state.result;
  const isFlights = scenario === 'flights';
  const visibleOffers = [...offers];
  if (isFlights && state.sort === 'price') visibleOffers.sort((a, b) => a.price - b.price);
  if (isFlights && state.sort === 'time') visibleOffers.sort((a, b) => a.time.localeCompare(b.time));
  const sortPills = document.querySelector('#sort-pills');
  sortPills.hidden = !isFlights;
  sortPills.querySelectorAll('[data-sort]').forEach((button) => button.classList.toggle('active', button.dataset.sort === state.sort));
  document.querySelector('#results-title').textContent = isFlights
    ? `${cityName(state.result.origin)} → ${cityName(state.result.destination)}`
    : `${scenarioLabel(scenario)} — три варианта`;
  document.querySelector('#result-meta').textContent = isFlights
    ? `${state.result.date ? formatDate(state.result.date) : 'Ближайшая дата'} · ${state.result.passengers || 1} пас.`
    : budget ? `Бюджет до ${formatMoney(budget)}` : 'Без ограничения бюджета';
  offerGrid.innerHTML = visibleOffers.map((offer, index) => {
    const recommended = offer.id === offers[0].id;
    return `
    <article class="offer-card ${isFlights ? 'flight-offer' : ''} ${recommended ? 'recommended' : ''} ${offer.withinBudget ? '' : 'over-budget'}" style="--offer-index:${index}">
      <div class="offer-top">
        <span class="partner-logo" style="--partner-color:${offer.partner.color}">${offer.partner.mark}</span>
        <span class="offer-badge">${recommended ? 'Выбор агента' : offer.badge}</span>
      </div>
      ${isFlights ? `
        <div class="flight-number">${offer.partner.name} · ${offer.flightNumber}</div>
        <div class="flight-route">
          <div><strong>${offer.time}</strong><span>${offer.origin}</span></div>
          <div class="flight-line"><small>${offer.duration}</small><i></i><span>прямой</span></div>
          <div><strong>${arrivalTime(offer.time, offer.duration)}</strong><span>${offer.destination}</span></div>
        </div>
        <div class="offer-detail">${offer.baggage} · осталось ${offer.seats} мест</div>
      ` : `<h3>${offer.title}</h3><p>${offer.subtitle}</p><div class="offer-detail">${offer.detail}</div>`}
      ${offer.withinBudget ? '' : '<small class="budget-warning">Выше указанного бюджета</small>'}
      <div class="offer-footer"><div><strong>${formatMoney(offer.price)}</strong>${isFlights && offer.passengers > 1 ? `<small>${formatMoney(offer.unitPrice)} за пассажира</small>` : ''}</div><button data-offer-id="${offer.id}">${isFlights ? 'Купить' : 'Выбрать'}</button></div>
    </article>
  `;
  }).join('');
}

function renderFlightSkeleton() {
  results.hidden = false;
  document.querySelector('#results-title').textContent = 'Сверяем варианты…';
  document.querySelector('#result-meta').textContent = 'Локальный поиск';
  document.querySelector('#sort-pills').hidden = true;
  offerGrid.innerHTML = Array.from({ length: 3 }, (_, index) => `
    <article class="offer-card offer-skeleton" style="--offer-index:${index}" aria-hidden="true">
      <i></i><b></b><span></span><span></span><strong></strong>
    </article>
  `).join('');
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function arrivalTime(time, duration) {
  const [hours, minutes] = time.split(':').map(Number);
  const match = duration.match(/(?:(\d+) ч)?\s*(?:(\d+) мин)?/);
  const total = hours * 60 + minutes + Number(match?.[1] || 0) * 60 + Number(match?.[2] || 0);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function openPayment(offerId) {
  const offer = state.result.offers.find((item) => item.id === offerId);
  state.selection = offer;
  setStep(3, 'Подтвердите оплату');
  paymentContent.innerHTML = `
    <div class="modal-icon">₽</div>
    <p class="eyebrow">ДЕМО-ОПЛАТА</p>
    <h2 id="payment-title">Подтвердите покупку</h2>
    <div class="payment-summary"><div><b>${offer.title}</b><span>${offer.subtitle}</span></div><strong>${formatMoney(offer.price)}</strong></div>
    <div class="balance-before"><span>Баланс после покупки</span><b>${state.balance >= offer.price ? formatMoney(state.balance - offer.price) : 'Недостаточно средств'}</b></div>
    <div class="mock-warning">Это мок: списывается только тестовый баланс в браузере. Реальные деньги и данные не используются.</div>
    <button class="pay-button" id="pay-button" ${state.balance < offer.price ? 'disabled' : ''}><span class="fingerprint">◎</span><span>${state.balance < offer.price ? 'Пополните тестовый кошелёк' : `Подтвердить · ${formatMoney(offer.price)}`}</span></button>
    <small class="payment-caption">SberPay Demo · без карты и телефона</small>
  `;
  modal.hidden = false;
  document.body.classList.add('modal-open');
}

function completePayment() {
  const debit = state.selection ? debitBalance(state.balance, state.selection.price) : { ok: false };
  if (!debit.ok) {
    showToast('Недостаточно средств в тестовом кошельке');
    return;
  }
  const payButton = document.querySelector('#pay-button');
  payButton.disabled = true;
  payButton.innerHTML = '<span class="loader light"></span><span>Создаём чек…</span>';
  window.setTimeout(() => {
    const receipt = createReceipt(state.selection, state.query, state.result.scenario);
    state.balance = debit.balance;
    saveBalance();
    state.orders.unshift(receipt);
    saveOrders();
    paymentContent.innerHTML = `
      <div class="success-ring">✓</div>
      <p class="eyebrow">ГОТОВО</p>
      <h2 id="payment-title">Покупка оформлена</h2>
      <p class="success-copy">Демонстрационный чек сохранён на этом устройстве.</p>
      <div class="receipt-mini"><span>${receipt.id}</span><b>− ${formatMoney(receipt.price)}</b></div>
      <div class="balance-after">Остаток: <strong>${formatMoney(state.balance)}</strong></div>
      <button class="primary-button wide" id="show-receipt">Открыть чек <span>→</span></button>
    `;
    setStep(3, 'Покупка завершена');
  }, 750);
}

function closeModal() {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
}

function openWallet() {
  updateBalance();
  walletModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeWallet() {
  walletModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function renderOrders() {
  const container = document.querySelector('#orders-list');
  if (!state.orders.length) {
    container.innerHTML = `<div class="empty-state"><span>▤</span><h3>Чеков пока нет</h3><p>Пройдите любой сценарий покупки — чек появится здесь.</p><button class="primary-button" data-route="home">Сделать покупку <span>→</span></button></div>`;
    return;
  }
  container.innerHTML = state.orders.map((order) => {
    const partner = PARTNERS.find((item) => item.id === order.partnerId);
    return `<article class="order-card">
      <span class="partner-logo" style="--partner-color:${partner?.color || '#21a038'}">${partner?.mark || 'SP'}</span>
      <div class="order-main"><small>${new Date(order.createdAt).toLocaleString('ru-RU')}</small><h3>${order.title}</h3><p>${order.subtitle}</p><span>${order.id} · ${order.status}</span></div>
      <strong>${formatMoney(order.price)}</strong>
    </article>`;
  }).join('');
}

function renderPartners() {
  document.querySelector('#partner-grid').innerHTML = PARTNERS.map((partner) => `
    <article class="partner-card"><span class="partner-logo large" style="--partner-color:${partner.color}">${partner.mark}</span><div><h3>${partner.name}</h3><p>${partner.category}</p></div><span class="connected"><i></i> Мок подключён</span></article>
  `).join('');
}

function updateOrderCount() {
  document.querySelector('#orders-count').textContent = state.orders.length;
}

function updateBalance() {
  document.querySelector('#header-balance').textContent = formatMoney(state.balance);
  document.querySelector('#wallet-balance').textContent = formatMoney(state.balance);
}

function initializeFlightSearch() {
  const origin = document.querySelector('#flight-origin');
  const destination = document.querySelector('#flight-destination');
  const options = CITIES.map((city) => `<option value="${city.code}">${city.name} · ${city.code}</option>`).join('');
  origin.innerHTML = options;
  destination.innerHTML = options;
  origin.value = 'LED';
  destination.value = 'MOW';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateValue = tomorrow.toISOString().slice(0, 10);
  const dateInput = document.querySelector('#flight-date');
  dateInput.min = new Date().toISOString().slice(0, 10);
  dateInput.value = dateValue;
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
}

document.addEventListener('click', (event) => {
  const routeButton = event.target.closest('[data-route]');
  if (routeButton) { event.preventDefault(); navigate(routeButton.dataset.route); return; }
  const prompt = event.target.closest('[data-prompt]');
  if (prompt) { requestInput.value = prompt.dataset.prompt; counter.textContent = `${requestInput.value.length} / 220`; submitRequest(requestInput.value); return; }
  const offerButton = event.target.closest('[data-offer-id]');
  if (offerButton) { openPayment(offerButton.dataset.offerId); return; }
  const sortButton = event.target.closest('[data-sort]');
  if (sortButton && state.result?.scenario === 'flights') {
    state.sort = sortButton.dataset.sort;
    renderOffers();
    return;
  }
  if (event.target.closest('#pay-button')) completePayment();
  if (event.target.closest('#show-receipt')) { closeModal(); navigate('orders'); }
});

requestForm.addEventListener('submit', (event) => { event.preventDefault(); submitRequest(requestInput.value); });
requestInput.addEventListener('input', () => { counter.textContent = `${requestInput.value.length} / 220`; });

document.querySelector('#voice-button').addEventListener('click', (event) => {
  const button = event.currentTarget;
  button.classList.add('listening');
  showToast('Демо: агент слушает…');
  window.setTimeout(() => {
    requestInput.value = 'Собери ужин на двоих до 1 500 ₽';
    counter.textContent = `${requestInput.value.length} / 220`;
    button.classList.remove('listening');
    submitRequest(requestInput.value);
  }, 900);
});

document.querySelector('#flight-search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const searchButton = event.currentTarget.querySelector('.search-button');
  const origin = document.querySelector('#flight-origin').value;
  const destination = document.querySelector('#flight-destination').value;
  if (origin === destination) {
    showToast('Выберите разные города');
    return;
  }
  const date = document.querySelector('#flight-date').value;
  const passengers = Number(document.querySelector('#flight-passengers').value);
  state.query = `${cityName(origin)} → ${cityName(destination)}, ${formatDate(date)}, ${passengers} пас.`;
  state.sort = 'recommended';
  searchButton.disabled = true;
  searchButton.innerHTML = 'Ищем <span class="loader light"></span>';
  renderFlightSkeleton();
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => {
    state.result = searchFlights({ origin, destination, date, passengers });
    renderOffers();
    setStep(2, 'Выберите рейс');
    searchButton.disabled = false;
    searchButton.innerHTML = 'Найти билеты <span>→</span>';
  }, 520);
});

document.querySelector('#swap-cities').addEventListener('click', () => {
  const origin = document.querySelector('#flight-origin');
  const destination = document.querySelector('#flight-destination');
  [origin.value, destination.value] = [destination.value, origin.value];
});

document.querySelector('#modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!modal.hidden) closeModal();
  if (!walletModal.hidden) closeWallet();
});
document.querySelector('#wallet-button').addEventListener('click', openWallet);
document.querySelector('#wallet-close').addEventListener('click', closeWallet);
walletModal.addEventListener('click', (event) => { if (event.target === walletModal) closeWallet(); });
document.querySelector('#wallet-topup').addEventListener('click', () => {
  state.balance += 10000;
  saveBalance();
  showToast('Тестовый баланс пополнен на 10 000 ₽');
});
document.querySelector('#wallet-reset').addEventListener('click', () => {
  state.balance = 50000;
  saveBalance();
  showToast('Начальный баланс восстановлен');
});
document.querySelector('#theme-toggle').addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem('sber-prosche-theme', nextTheme);
  document.querySelector('#theme-toggle').setAttribute('aria-label', nextTheme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
});
document.querySelector('#clear-orders').addEventListener('click', () => {
  state.orders = [];
  saveOrders();
  renderOrders();
  showToast('Локальная история очищена');
});

renderPartners();
updateOrderCount();
updateBalance();
initializeFlightSearch();
const initialRoute = window.location.hash.slice(1);
navigate(pageTitles[initialRoute] ? initialRoute : 'home');
