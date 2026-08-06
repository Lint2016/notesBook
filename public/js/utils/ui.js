/**
 * ============================================================================
 * FILE OVERVIEW: ui.js
 * ============================================================================
 * Purpose:
 * Provides pure utility functions for UI manipulation that don't depend on 
 * app state. Includes toast notifications, string sanitization, and text highlighting.
 * 
 * Where it fits in the application:
 * A shared library imported by almost every other component in the `js/` folder.
 * ============================================================================
 */

import { toastContainer } from '../dom.js';
import { t } from './i18n.js';

export function setLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.textContent = label;
}

export function showFormError(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
}

// ----------------------------------------------------
// Purpose:
// Safely escapes user input before rendering it to the DOM to prevent XSS attacks.
// ----------------------------------------------------
export function escapeHtml(str = '') {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ----------------------------------------------------
// Purpose:
// Wraps search query matches in `<mark>` tags for visual highlighting in the UI.
// ----------------------------------------------------
export function highlightText(text = '', query = '', isMarkdown = false) {
  if (!query) return isMarkdown ? text : escapeHtml(text);
  
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark class="highlight">$1</mark>');
}

// ----------------------------------------------------
// Purpose:
// Injects a temporary pop-up notification (Toast) into the DOM and 
// automatically removes it after 3 seconds. Accepts string key or raw string.
// ----------------------------------------------------
export function showToast(messageOrKey, type = 'success', params = {}, actionText = null, onAction = null) {
  const message = t(messageOrKey, params);
  const icon = type === 'success' 
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let inner = `${icon}<span>${message}</span>`;
  
  if (actionText) {
    inner += `<button class="toast-action-btn" style="margin-left:auto;background:transparent;border:1px solid currentColor;color:inherit;border-radius:4px;padding:2px 8px;cursor:pointer;font-weight:bold;font-size:0.8rem;">${actionText}</button>`;
  }
  toast.innerHTML = inner;
  toastContainer.appendChild(toast);
  
  let timerId;

  if (actionText && onAction) {
    toast.querySelector('.toast-action-btn').addEventListener('click', () => {
      onAction();
      clearTimeout(timerId);
      toast.remove();
    });
  }

  // Stagger removal if multiple toasts exist
  timerId = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-10px) scale(0.9)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

export function getDynamicGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return t('greeting.morning');
  if (hour < 18) return t('greeting.afternoon');
  return t('greeting.evening');
}

/**
 * ============================================================================
 * END OF FILE SUMMARY
 * ============================================================================
 * Summary:
 * ui.js centralizes cross-cutting UI concerns (like XSS prevention and toasts) 
 * to keep component files clean.
 * 
 * Common mistakes developers may make:
 * - Forgetting to use `escapeHtml` when injecting user-generated strings 
 *   into `innerHTML`, leading to Cross-Site Scripting vulnerabilities.
 * 
 * Possible improvements:
 * - The Toast system doesn't manage vertical stacking well if many toasts 
 *   are triggered simultaneously (they just overlap or push each other abruptly). 
 *   A dedicated toast queue would fix this.
 * ============================================================================
 */
