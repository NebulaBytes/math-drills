import { EMAIL_CONFIG } from './emailConfig.js';
import { getLifetimeTotal, getWeekTotal, getRecentEntries } from './rewards.js';

function isPlaceholder(value) {
  return !value || value.startsWith('YOUR_');
}

export function isEmailConfigured() {
  return !isPlaceholder(EMAIL_CONFIG.SERVICE_ID)
    && !isPlaceholder(EMAIL_CONFIG.TEMPLATE_ID)
    && !isPlaceholder(EMAIL_CONFIG.PUBLIC_KEY);
}

function formatEntry(entry) {
  const dateStr = new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${dateStr} — +${entry.amount} ⭐ (${entry.source})`;
}

export function sendParentEmail() {
  if (!window.emailjs) {
    return Promise.reject(new Error('EmailJS failed to load. Check your internet connection.'));
  }
  if (!isEmailConfigured()) {
    return Promise.reject(new Error('EmailJS isn\'t set up yet - fill in emailConfig.js first.'));
  }

  const recent = getRecentEntries(5).map(formatEntry).join('\n');
  const params = {
    to_email: EMAIL_CONFIG.PARENT_EMAIL,
    lifetime_total: String(getLifetimeTotal()),
    week_total: String(getWeekTotal()),
    recent_entries: recent || 'No stars earned yet.'
  };

  return window.emailjs.send(EMAIL_CONFIG.SERVICE_ID, EMAIL_CONFIG.TEMPLATE_ID, params, EMAIL_CONFIG.PUBLIC_KEY);
}
