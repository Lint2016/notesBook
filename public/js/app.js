/**
 * app.js
 * Main entry point. Orchestrates modules and auth state.
 */

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { subscribeToNotes, subscribeToFolders } from './db.js';

// State and DOM
import { state } from './state.js';
import { 
  authSection, appSection, greetingName, dynamicGreeting, 
  logoutBtn, deleteAccountBtn, installBtn
} from './dom.js';

// UI Utils
import { showToast, getDynamicGreeting, escapeHtml } from './utils/ui.js';

// Components
import { setupAuthUI, switchTab, openDeleteAccountModal, showSetPasswordPrompt } from './components/auth-ui.js';
import { setupSidebar, renderFolders } from './components/sidebar.js';
import { setupNotesList, applyFilters, renderSkeletons, checkReminders } from './components/notes-list.js';
import { setupEditor } from './components/editor.js';
import { setupCommandPalette } from './components/command-palette.js';
import { setupSupportModals } from './components/support-modal.js';
import { logOut } from './auth.js';

// --- Initialization ---

function initApp() {
  setupAuthUI();
  setupSidebar();
  setupNotesList();
  setupEditor();
  setupCommandPalette();
  setupSupportModals();

  // PWA Install Prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn?.classList.remove('hidden');
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installBtn.classList.add('hidden');
    }
    deferredPrompt = null;
  });

  // Logout
  logoutBtn?.addEventListener('click', async () => {
    try {
      await logOut();
    } catch {
      showToast('Error logging out.', 'error');
    }
  });

  // Delete Account
  deleteAccountBtn?.addEventListener('click', openDeleteAccountModal);
  
  // Set initial state
  switchTab('login');
}

// --- Auth State Observer ---

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (sessionStorage.getItem('account-deleted') === '1') {
      logOut().then(() => sessionStorage.removeItem('account-deleted'));
      return;
    }

    state.currentUser = user;
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    appSection.classList.add('fade-in');

    greetingName.textContent = escapeHtml(user.displayName || user.email.split('@')[0] || 'User');
    dynamicGreeting.textContent = getDynamicGreeting() + ',';

    // Reload user to get fresh emailVerified status (Firebase caches it)
    await user.reload();
    const freshUser = auth.currentUser;

    const isGoogleOnly     = freshUser.providerData.length === 1 && freshUser.providerData[0].providerId === 'google.com';
    const isAnonymous      = freshUser.isAnonymous;
    const isEmailVerified  = freshUser.emailVerified;

    if (!isAnonymous && isGoogleOnly && !sessionStorage.getItem('password-prompt-shown')) {
      sessionStorage.setItem('password-prompt-shown', 'true');
      showSetPasswordPrompt(freshUser);
    }

    // Only show the banner if email is genuinely unverified AND it isn't already in the DOM
    if (!isAnonymous && !isEmailVerified && !isGoogleOnly && !document.querySelector('.verification-banner')) {
      const banner = document.createElement('div');
      banner.className = 'verification-banner fade-in';
      banner.innerHTML = `
        <span>Please verify your email address. Check your inbox.</span>
        <button class="icon-btn" onclick="this.parentElement.remove()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      document.body.prepend(banner);
    }

    renderSkeletons(4);

    state.unsubscribeFolders = subscribeToFolders(user.uid, (folders) => {
      state.allFolders = folders;
      renderFolders(folders);
      applyFilters();
    });

    state.unsubscribeNotes = subscribeToNotes(user.uid, (notes) => {
      state.allNotes = notes;
      applyFilters();
      checkReminders(notes);
    });

  } else {
    state.currentUser = null;
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    appSection.classList.remove('fade-in');

    if (state.unsubscribeNotes) { state.unsubscribeNotes(); state.unsubscribeNotes = null; }
    if (state.unsubscribeFolders) { state.unsubscribeFolders(); state.unsubscribeFolders = null; }

    state.allNotes = [];
    state.allFolders = [];
  }
});

// Boot
initApp();
