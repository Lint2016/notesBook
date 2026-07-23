/**
 * ============================================================================
 * FILE OVERVIEW: support-modal.js
 * ============================================================================
 * Purpose:
 * Manages all non-core app modals: The static User Guide, the Video Explainer 
 * iframe, and the Contact Support form.
 * 
 * Where it fits in the application:
 * Provides user assistance. Triggered from the sidebar or the command palette.
 * ============================================================================
 */

import { state } from '../state.js';
import { 
  guideModal, showGuideBtn, closeGuideBtn, gotItBtn,
  supportModal, showSupportBtn, closeSupportBtn, cancelSupportBtn,
  supportForm, submitSupportBtn, supportError, sidebarToggle,
  frontExplainerBtn, sidebarExplainerBtn, videoModalBackdrop, closeVideoBtn, explainerIframe
} from '../dom.js';
import { logAnalyticsEvent } from '../firebase-config.js';
import { showToast } from '../utils/ui.js';

// ----------------------------------------------------
// Purpose:
// Initializes event listeners for the Guide, Support, and Video modals. 
// Also contains the logic to auto-show the guide once per browser for new users.
//
// Async Operations:
// - await fetch() (Sends form data to Formspree)
// ----------------------------------------------------
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

  // Video Explainer Modal
  const openVideoModal = () => {
    explainerIframe.src = 'https://www.youtube.com/embed/THgXgOnF6xo?autoplay=1';
    videoModalBackdrop.classList.remove('hidden');
  };

  const closeVideoModal = () => {
    explainerIframe.src = '';
    videoModalBackdrop.classList.add('hidden');
  };

  if (frontExplainerBtn) {
    frontExplainerBtn.addEventListener('click', openVideoModal);
  }
  
  if (sidebarExplainerBtn) {
    sidebarExplainerBtn.addEventListener('click', () => {
      if (window.innerWidth < 1024) sidebarToggle.click(); // Close sidebar on mobile
      openVideoModal();
    });
  }

  if (closeVideoBtn) {
    closeVideoBtn.addEventListener('click', closeVideoModal);
  }

  if (videoModalBackdrop) {
    videoModalBackdrop.addEventListener('click', (e) => {
      if (e.target === videoModalBackdrop) closeVideoModal();
    });
  }
}

// ----------------------------------------------------
// Purpose:
// Opens or closes the static text User Guide modal.
// ----------------------------------------------------
export function toggleGuide(isOpen) {
  guideModal.classList.toggle('hidden', !isOpen);
}

// ----------------------------------------------------
// Purpose:
// Opens or closes the Contact Support modal.
//
// Side effects:
// On open, resets the form and pre-fills the user's display name if available.
// ----------------------------------------------------
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

/**
 * ============================================================================
 * END OF FILE SUMMARY
 * ============================================================================
 * Summary:
 * support-modal.js isolates help-related UI components from the core note-taking 
 * logic.
 * 
 * Common mistakes developers may make:
 * - Changing the Formspree endpoint in the `fetch` call without updating the 
 *   corresponding backend settings on Formspree.io.
 * 
 * Possible improvements:
 * - The video modal currently hardcodes a YouTube URL. This could be made 
 *   dynamic if multiple tutorials are added.
 * - The `localStorage` check for `guideShown` is browser-specific. Moving this 
 *   flag to the user's Firestore profile would ensure they only see it once 
 *   across all their devices.
 * ============================================================================
 */
