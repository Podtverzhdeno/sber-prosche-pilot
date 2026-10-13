import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceipt, debitBalance, detectScenario, extractBudget, getOffers, searchFlights } from '../src/mock-engine.js';

test('определяет три локальных сценария', () => {
  assert.equal(detectScenario('билеты в Москву'), 'flights');
  assert.equal(detectScenario('собери ужин на двоих'), 'dinner');
  assert.equal(detectScenario('заправь полный бак'), 'fuel');
});

test('извлекает бюджет из запроса', () => {
  assert.equal(extractBudget('до 10 000 ₽'), 10000);
  assert.equal(extractBudget('не дороже 1500 руб'), 1500);
  assert.equal(extractBudget('без бюджета'), null);
});

test('всегда возвращает три мок-предложения', () => {
  const result = getOffers('ужин до 1000 ₽');
  assert.equal(result.scenario, 'dinner');
  assert.equal(result.offers.length, 3);
  assert.equal(result.offers[0].withinBudget, true);
  assert.equal(result.offers[1].withinBudget, false);
});

test('создаёт локальный демонстрационный чек', () => {
  const result = getOffers('билет до 10000 ₽');
  const receipt = createReceipt(result.offers[0], 'билет до 10000 ₽', result.scenario);
  assert.match(receipt.id, /^SP-\d+$/);
  assert.equal(receipt.status, 'Оплачено (демо)');
  assert.equal(receipt.price, result.offers[0].price);
});

test('ищет рейсы по маршруту, дате и пассажирам', () => {
  const result = searchFlights({ origin: 'MOW', destination: 'AER', date: '2026-10-20', passengers: 2 });
  assert.equal(result.offers.length, 3);
  assert.equal(result.offers[0].origin, 'MOW');
  assert.equal(result.offers[0].destination, 'AER');
  assert.equal(result.offers[0].price, result.offers[0].unitPrice * 2);
});

test('списывает средства и запрещает перерасход', () => {
  assert.deepEqual(debitBalance(50000, 8900), { ok: true, balance: 41100, reason: null });
  assert.deepEqual(debitBalance(1000, 1500), { ok: false, balance: 1000, reason: 'insufficient' });
});
