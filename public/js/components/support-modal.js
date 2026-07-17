/**
 * components/support-modal.js
 * Handles User Guide and Support form modals.
 */

import { state } from '../state.js';
import { 
  guideModal, showGuideBtn, closeGuideBtn, gotItBtn,
  supportModal, showSupportBtn, closeSupportBtn, cancelSupportBtn,
  supportForm, submitSupportBtn, supportError, sidebarToggle
} from '../dom.js';
import { logAnalyticsEvent } from '../firebase-config.js';
import { showToast } from '../utils/ui.js';

export function setupSupportModals() {
  // Guide Modal
  showGuideBtn.addEventListener('click', () => toggleGuide(true));
  closeGuideBtn.addEventListener('click', () => toggleGuide(false));
  gotItBtn.addEventListener('click', () => toggleGuide(false));
  guideModal.addEventListener('click', (e) => {
    if (e.target === guideModal) toggleGuide(false);
  });

  // Auto-show guide for new users
  if (!localStorage.getItem('guideShown')) {
    setTimeout(() => {
      if (state.currentUser) toggleGuide(true);
      localStorage.setItem('guideShown', 'true');
    }, 2000);
  }

  // Support Modal
  showSupportBtn.addEventListener('click', () => {
    if (window.innerWidth < 1024) sidebarToggle.click(); // Close sidebar on mobile
    toggleSupportModal(true);
  });

  closeSupportBtn.addEventListener('click', () => toggleSupportModal(false));
  cancelSupportBtn.addEventListener('click', () => toggleSupportModal(false));

  supportModal.addEventListener('click', (e) => {
    if (e.target === supportModal) toggleSupportModal(false);
  });

  supportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    supportError.classList.add('hidden');

    const formData = new FormData(supportForm);
    const data = Object.fromEntries(formData.entries());

    if (!data.name || !data.subject || !data.message) {
      supportError.textContent = 'Please fill in all fields.';
      supportError.classList.remove('hidden');
      return;
    }

    submitSupportBtn.classList.add('loading');
    submitSupportBtn.disabled = true;

    try {
      const response = await fetch('https://formspree.io/f/mgodaenb', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        logAnalyticsEvent('support_form_submit', { subject: data.subject });
        showToast('Message sent successfully! We will get back to you soon.', 'success');
        toggleSupportModal(false);
      } else {
        const result = await response.json();
        throw new Error(result.errors?.[0]?.message || 'Failed to send message.');
      }
    } catch (err) {
      console.error('[Support] Submission error:', err);
      supportError.textContent = err.message || 'Something went wrong. Please try again later.';
      supportError.classList.remove('hidden');
    } finally {
      submitSupportBtn.classList.remove('loading');
      submitSupportBtn.disabled = false;
    }
  });
}

export function toggleGuide(isOpen) {
  guideModal.classList.toggle('hidden', !isOpen);
}

function toggleSupportModal(show = true) {
  supportModal.classList.toggle('hidden', !show);
  if (show) {
    supportForm.reset();
    supportError.classList.add('hidden');
    if (state.currentUser) {
      const nameInput = document.getElementById('support-name');
      if (nameInput) nameInput.value = state.currentUser.displayName || '';
    }
    setTimeout(() => document.getElementById('support-name').focus(), 100);
  }
}
