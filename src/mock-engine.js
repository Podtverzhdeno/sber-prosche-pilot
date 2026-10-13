export const PARTNERS = [
  { id: 'pobeda', name: 'Победа', category: 'Авиабилеты', mark: 'ПО', color: '#7c5cff' },
  { id: 'aeroflot', name: 'Аэрофлот', category: 'Авиабилеты', mark: 'АФ', color: '#2474ff' },
  { id: 's7', name: 'S7 Airlines', category: 'Авиабилеты', mark: 'S7', color: '#9acb3b' },
  { id: 'samokat', name: 'Самокат', category: 'Продукты', mark: 'СМ', color: '#ff335f' },
  { id: 'lenta', name: 'Лента', category: 'Продукты', mark: 'Л', color: '#1868d5' },
  { id: 'gazprom', name: 'Газпромнефть', category: 'Заправки', mark: 'ГП', color: '#116fc1' }
];

export const CITIES = [
  { code: 'LED', name: 'Санкт-Петербург', airport: 'Пулково' },
  { code: 'MOW', name: 'Москва', airport: 'Все аэропорты' },
  { code: 'KZN', name: 'Казань', airport: 'Казань' },
  { code: 'AER', name: 'Сочи', airport: 'Адлер' }
];

const ROUTE_PRICES = {
  'LED-MOW': 6890, 'MOW-LED': 6540,
  'LED-KZN': 7240, 'KZN-LED': 6980,
  'LED-AER': 11250, 'AER-LED': 10690,
  'MOW-KZN': 5480, 'KZN-MOW': 5190,
  'MOW-AER': 8350, 'AER-MOW': 7980,
  'KZN-AER': 9140, 'AER-KZN': 8890
};

const CARRIERS = [
  { partnerId: 'pobeda', time: '07:40', delta: 0, duration: '1 ч 35 мин', baggage: 'Ручная кладь 10 кг', seats: 7 },
  { partnerId: 'aeroflot', time: '10:15', delta: 1350, duration: '1 ч 30 мин', baggage: 'Багаж 23 кг', seats: 4 },
  { partnerId: 's7', time: '18:30', delta: 720, duration: '1 ч 40 мин', baggage: 'Ручная кладь 10 кг', seats: 9 }
];

const FLIGHTS = Object.entries(ROUTE_PRICES).flatMap(([route, basePrice], routeIndex) => {
  const [origin, destination] = route.split('-');
  return CARRIERS.map((carrier, carrierIndex) => {
    const partner = PARTNERS.find((item) => item.id === carrier.partnerId);
    return {
      id: `flight-${routeIndex + 1}-${carrierIndex + 1}`,
      ...carrier,
      origin,
      destination,
      title: `${partner.name} · ${carrier.time}`,
      subtitle: `${origin} → ${destination}`,
      price: basePrice + carrier.delta,
      badge: carrierIndex === 0 ? 'Лучшая цена' : carrierIndex === 1 ? 'С багажом' : 'Вечерний рейс',
      detail: `${carrier.baggage} · ${carrier.duration}`,
      flightNumber: `${carrier.partnerId === 'pobeda' ? 'DP' : carrier.partnerId === 'aeroflot' ? 'SU' : 'S7'} ${120 + routeIndex * 3 + carrierIndex}`
    };
  });
});

const CATALOG = {
  flights: [
    ...FLIGHTS.filter((item) => item.origin === 'LED' && item.destination === 'MOW')
  ],
  dinner: [
    { id: 'dinner-1', partnerId: 'samokat', title: 'Паста карбонара', subtitle: 'Ингредиенты на двоих', price: 890, badge: '25 минут', detail: '7 товаров · рецепт включён' },
    { id: 'dinner-2', partnerId: 'lenta', title: 'Том-ям с креветками', subtitle: 'Набор продуктов на двоих', price: 1240, badge: '40 минут', detail: '9 товаров · острота на выбор' },
    { id: 'dinner-3', partnerId: 'samokat', title: 'Боул с лососем', subtitle: 'Ингредиенты на двоих', price: 1050, badge: '20 минут', detail: '8 товаров · сбалансированный ужин' }
  ],
  fuel: [
    { id: 'fuel-1', partnerId: 'gazprom', title: 'Газпромнефть · Невский', subtitle: 'АИ-95 · 1,2 км', price: 2875, badge: 'Ближе всего', detail: '50 л · заезд через 4 минуты' },
    { id: 'fuel-2', partnerId: 'gazprom', title: 'Газпромнефть · Лиговский', subtitle: 'АИ-95 · 2,8 км', price: 2790, badge: 'Выгоднее', detail: '50 л · кешбэк 3%' },
    { id: 'fuel-3', partnerId: 'gazprom', title: 'Газпромнефть · Обводный', subtitle: 'АИ-95 · 3,4 км', price: 2820, badge: 'Без очереди', detail: '50 л · свободные колонки' }
  ]
};

export function detectScenario(query = '') {
  const normalized = query.toLowerCase();
  if (/ужин|еда|продукт|паста|рецепт|поесть/.test(normalized)) return 'dinner';
  if (/заправ|бензин|бак|аи-|машин/.test(normalized)) return 'fuel';
  return 'flights';
}

export function extractBudget(query = '') {
  const normalized = query.replace(/\s/g, '').replace(',', '.');
  const match = normalized.match(/(?:до|≤)?(\d{3,6})(?:₽|руб)/i);
  return match ? Number(match[1]) : null;
}

export function getOffers(query) {
  const scenario = detectScenario(query);
  const budget = extractBudget(query);
  const flightRoute = scenario === 'flights' ? detectFlightRoute(query) : null;
  const catalog = scenario === 'flights'
    ? searchFlights({ ...flightRoute, passengers: 1 }).offers
    : CATALOG[scenario];
  const source = catalog.map((item) => ({
    ...item,
    partner: PARTNERS.find((partner) => partner.id === item.partnerId),
    withinBudget: budget ? item.price <= budget : true
  }));
  return { scenario, budget, offers: source, ...(flightRoute || {}) };
}

export function searchFlights({ origin = 'LED', destination = 'MOW', date = '', passengers = 1 } = {}) {
  const count = Math.max(1, Math.min(4, Number(passengers) || 1));
  const day = date ? new Date(`${date}T12:00:00`).getDate() : 1;
  const dateDelta = ((day % 5) - 2) * 170;
  const offers = FLIGHTS
    .filter((item) => item.origin === origin && item.destination === destination)
    .map((item) => ({
      ...item,
      unitPrice: Math.max(2990, item.price + dateDelta),
      price: Math.max(2990, item.price + dateDelta) * count,
      passengers: count,
      date,
      partner: PARTNERS.find((partner) => partner.id === item.partnerId),
      withinBudget: true
    }));
  return { scenario: 'flights', origin, destination, date, passengers: count, offers };
}

export function detectFlightRoute(query = '') {
  const normalized = query.toLowerCase();
  const aliases = [
    { code: 'LED', values: ['санкт-петербург', 'петербург', 'питер'] },
    { code: 'MOW', values: ['москва', 'москву', 'москвы'] },
    { code: 'KZN', values: ['казань', 'казани'] },
    { code: 'AER', values: ['сочи'] }
  ];
  const mentioned = aliases.filter((city) => city.values.some((value) => normalized.includes(value))).map((city) => city.code);
  if (mentioned.length >= 2) return { origin: mentioned[0], destination: mentioned[1] };
  if (mentioned.length === 1 && mentioned[0] !== 'LED') return { origin: 'LED', destination: mentioned[0] };
  return { origin: 'LED', destination: 'MOW' };
}

export function cityName(code) {
  return CITIES.find((city) => city.code === code)?.name || code;
}

export function scenarioLabel(scenario) {
  return ({ flights: 'Авиабилеты', dinner: 'Ужин на двоих', fuel: 'Заправка автомобиля' })[scenario];
}

export function formatMoney(amount) {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}

export function debitBalance(balance, amount) {
  const current = Number(balance);
  const charge = Number(amount);
  if (!Number.isFinite(current) || !Number.isFinite(charge) || current < 0 || charge <= 0) {
    return { ok: false, balance: Math.max(0, current || 0), reason: 'invalid' };
  }
  if (charge > current) return { ok: false, balance: current, reason: 'insufficient' };
  return { ok: true, balance: current - charge, reason: null };
}

export function createReceipt(offer, query, scenario) {
  const now = new Date();
  return {
    id: `SP-${now.getTime().toString().slice(-8)}`,
    createdAt: now.toISOString(),
    title: offer.title,
    subtitle: offer.subtitle,
    price: offer.price,
    partnerId: offer.partnerId,
    scenario,
    query,
    status: 'Оплачено (демо)'
  };
}
