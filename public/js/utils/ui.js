/**
 * utils/ui.js
 * Common UI helper functions.
 */

import { toastContainer } from '../dom.js';

export function setLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.textContent = label;
}

export function showFormError(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
}

export function escapeHtml(str = '') {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export function highlightText(text = '', query = '', isMarkdown = false) {
  if (!query) return isMarkdown ? text : escapeHtml(text);
  
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark class="highlight">$1</mark>');
}

export function showToast(message, type = 'success') {
  const icon = type === 'success' 
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);
  
  // Stagger removal if multiple toasts exist
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-10px) scale(0.9)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function getDynamicGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
