import { getTier } from './celebrate.js';

const LEDGER_KEY = 'mathdrills-star-ledger';
const MULTIPLIER_BY_TIER_MIN = { 100: 2, 85: 1.5, 30: 1, 0: 1 };

export function getLedger() {
  try {
    const raw = JSON.parse(localStorage.getItem(LEDGER_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveLedger(ledger) {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
}

export function addStars(amount, source) {
  const rounded = Math.round(amount);
  if (rounded <= 0) return;
  const ledger = getLedger();
  ledger.push({ date: new Date().toISOString(), amount: rounded, source });
  saveLedger(ledger);
  renderStarBadge();
}

export function getLifetimeTotal() {
  return getLedger().reduce((sum, e) => sum + e.amount, 0);
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekTotal(referenceDate = new Date()) {
  const start = startOfWeek(referenceDate);
  return getLedger()
    .filter(e => new Date(e.date) >= start)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getRecentEntries(n = 5) {
  return getLedger().slice(-n).reverse();
}

export function starMultiplierForAccuracy(accuracy) {
  const tier = getTier(accuracy);
  return MULTIPLIER_BY_TIER_MIN[tier.min] ?? 1;
}

export function renderStarBadge() {
  const el = document.getElementById('star-total-badge');
  if (el) el.textContent = `⭐ ${getLifetimeTotal()}`;
}
