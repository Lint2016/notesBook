/**
 * ============================================================================
 * FILE OVERVIEW: app.js
 * ============================================================================
 * Purpose:
 * This is the main entry point of the notesBook application. It orchestrates 
 * the initialization of all UI components, handles global events (like PWA 
 * installation prompts), and manages the global authentication state observer.
 * 
 * Where it fits in the application:
 * Loaded first in index.html as a module. It acts as the "glue" that binds 
 * the authentication logic, database listeners, state management, and UI 
 * components together.
 * 
 * Dependencies:
 * - firebase-config.js (Auth instance)
 * - db.js (Data subscriptions)
 * - state.js (Global state management)
 * - dom.js (DOM element references)
 * - ui.js (Utility functions)
 * - Various UI components (auth-ui, sidebar, notes-list, editor, etc.)
 * 
 * Execution Flow:
 * 1. Imports dependencies.
 * 2. initApp() is called.
 * 3. Component setup functions run (setupAuthUI, setupSidebar, etc.).
 * 4. PWA and global event listeners are attached.
 * 5. onAuthStateChanged fires immediately based on current Firebase Auth session.
 * 6. If logged in -> load user data, render app.
 * 7. If logged out -> show auth UI.
 * ============================================================================
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

// ----------------------------------------------------
// Purpose:
// Initializes all major UI components and sets up global 
// event listeners (PWA install, global logout/delete account).
//
// Why:
// We need a centralized place to bootstrap the application 
// ensuring all DOM elements and event handlers are ready 
// before user interaction.
//
// Side effects:
// Attaches event listeners to the window and global buttons.
// Modifies the current view by calling switchTab('login').
// ----------------------------------------------------
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

// ----------------------------------------------------
// Purpose:
// Observes changes to the user's sign-in state (login/logout/session restore).
//
// Why:
// Firebase handles auth state asynchronously. This observer 
// acts as the single source of truth for transitioning the app
// between the logged-out state (auth UI) and logged-in state (app UI).
//
// Expected inputs:
// `user` object from Firebase (null if logged out).
//
// Side effects:
// Modifies `state.currentUser`, toggles CSS classes to show/hide 
// main application sections, triggers database subscriptions, 
// and triggers UI updates.
//
// Async Operations:
// - logOut() (if account was marked deleted)
// - subscribeToFolders() and subscribeToNotes() (Firestore listeners)
// ----------------------------------------------------
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

    const isGoogleOnly     = user.providerData.length === 1 && user.providerData[0].providerId === 'google.com';
    const isAnonymous      = user.isAnonymous;

    if (!isAnonymous && isGoogleOnly && !sessionStorage.getItem('password-prompt-shown')) {
      sessionStorage.setItem('password-prompt-shown', 'true');
      showSetPasswordPrompt(user);
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

/**
 * ============================================================================
 * END OF FILE SUMMARY
 * ============================================================================
 * Summary:
 * app.js successfully bootstraps the application and manages the core routing 
 * logic between the authenticated and unauthenticated states.
 * 
 * Common mistakes developers may make:
 * - Adding component-specific logic here instead of in the respective 
 *   component files (e.g., placing editor-specific event listeners here).
 * - Forgetting to unsubscribe from Firestore listeners when the user logs out, 
 *   causing memory leaks or permission errors on subsequent logins.
 * 
 * Possible improvements:
 * - Move PWA install logic into a separate `pwa.js` file for cleaner separation.
 * - Implement a router if the app grows beyond a simple login/dashboard toggle.
 * 
 * Performance considerations:
 * - We are importing all components upfront. If the app grows significantly, 
 *   we might consider lazy loading the main app modules only after authentication.
 * 
 * Security considerations:
 * - The auth state is client-side validated here for UI purposes. Ensure all 
 *   database reads/writes are properly secured by Firestore rules regardless of 
 *   what the UI allows.
 * ============================================================================
 */
