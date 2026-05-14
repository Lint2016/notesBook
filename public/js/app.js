/**
 * app.js — NoteBook UI Controller
 *
 * Responsibilities:
 * - Bootstraps auth state changes and transitions between Auth and Dashboard views
 * - Manages the note editor modal (create / edit)
 * - Delegates all Firestore operations to db.js
 * - Renders note cards dynamically
 * - Handles search/filter, toast notifications, and confirm dialog
 */

import { signUp, signIn, logOut, onAuthChange, resetPassword, signInWithGoogle, deleteAccount, linkEmailPassword } from './auth.js';
import { 
  addNote, updateNote, deleteNote, subscribeToNotes, togglePin,
  addFolder, deleteFolder, subscribeToFolders, subscribeToVersions 
} from './db.js';
import { storage, logAnalyticsEvent } from './firebase-config.js';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";


// ─────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────

// Views
const authSection  = document.getElementById('auth-section');
const appSection   = document.getElementById('app-section');

// Auth
const tabLogin     = document.getElementById('tab-login');
const tabSignup    = document.getElementById('tab-signup');
const loginForm    = document.getElementById('login-form');
const signupForm   = document.getElementById('signup-form');
const loginError   = document.getElementById('login-error');
const signupError  = document.getElementById('signup-error');
const forgotForm   = document.getElementById('forgot-form');
const forgotError  = document.getElementById('forgot-error');
const forgotSuccess = document.getElementById('forgot-success');

const linkForgotPassword = document.getElementById('link-forgot-password');
const linkBackToLogin    = document.getElementById('link-back-to-login');

// Dashboard
const dynamicGreeting = document.getElementById('dynamic-greeting');
const greetingName    = document.getElementById('greeting-name');
const notesList       = document.getElementById('notes-list');
const notesCountBadge = document.getElementById('notes-count');
const searchInput     = document.getElementById('search-input');
const fabBtn          = document.getElementById('fab-btn');
const logoutBtn       = document.getElementById('logout-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const installBtn      = document.getElementById('install-btn');
const paletteToggleBtn = document.getElementById('palette-toggle-btn');
const headerHelpBtn   = document.getElementById('header-help-btn');
const categoryFilters = document.getElementById('category-filters');
const searchClearBtn  = document.getElementById('search-clear-btn');
const sidebar         = document.getElementById('sidebar');
const sidebarToggle   = document.getElementById('sidebar-toggle');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const folderList      = document.getElementById('folder-list');
const addFolderBtn    = document.getElementById('add-folder-btn');
const navItems        = document.querySelectorAll('.nav-item');



// Modal
const modalBackdrop  = document.getElementById('modal-backdrop');
const modalTitle     = document.getElementById('modal-title');
const noteTitle      = document.getElementById('note-title');
const noteCategory   = document.getElementById('note-category');
const noteFolder     = document.getElementById('note-folder');

const reminderBtn    = document.getElementById('reminder-btn');
const exportPdfBtn   = document.getElementById('export-pdf-btn');
const micBtn         = document.getElementById('mic-btn');
const attachBtn      = document.getElementById('attach-btn');
const attachmentInput = document.getElementById('attachment-input');
const mediaTray      = document.getElementById('media-tray');

const noteContent    = document.getElementById('note-content');
const saveNoteBtn    = document.getElementById('save-note-btn');
const closeModalBtn  = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');

const historyToggleBtn = document.getElementById('history-toggle-btn');
const historyPanel     = document.getElementById('history-panel');
const closeHistoryBtn  = document.getElementById('close-history-btn');
const versionList      = document.getElementById('version-list');
const smartSuggestions = document.getElementById('smart-suggestions');


// Command Palette
const paletteOverlay = document.getElementById('command-palette-overlay');
const paletteInput   = document.getElementById('palette-input');
const paletteResults = document.getElementById('palette-results');


// Preview & Guide
const editTab         = document.getElementById('edit-tab');
const previewTab      = document.getElementById('preview-tab');
const notePreviewArea = document.getElementById('note-preview');

const guideModal      = document.getElementById('guide-modal-backdrop');
const showGuideBtn    = document.getElementById('show-guide-btn');
const closeGuideBtn   = document.getElementById('close-guide-btn');
const gotItBtn        = document.getElementById('got-it-btn');


// Toast Container
const toastContainer = document.getElementById('toast-container');

// Lightbox
const lightboxOverlay  = document.getElementById('lightbox-overlay');
const closeLightboxBtn = document.getElementById('close-lightbox-btn');
const lightboxImg      = document.getElementById('lightbox-img');
const lightboxCaption  = document.getElementById('lightbox-caption');

// Support Modal
const supportModal      = document.getElementById('support-modal-backdrop');
const showSupportBtn    = document.getElementById('show-support-btn');
const closeSupportBtn   = document.getElementById('close-support-btn');
const cancelSupportBtn  = document.getElementById('cancel-support-btn');
const supportForm       = document.getElementById('support-form');
const submitSupportBtn  = document.getElementById('submit-support-btn');
const supportError      = document.getElementById('support-error');

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let currentUser       = null;
let unsubscribeNotes  = null;   // Firestore listener cleanup
let unsubscribeFolders = null;
let editingNoteId     = null;   // null = new note, string = edit mode
let allNotes          = [];     // Full local copy for search
let allFolders        = [];
let currentCategory   = 'all';  // Active filter category
let currentFolderId   = 'all';  // 'all', 'pinned', or folderId
let isListening       = false;  // Voice capture state
let recognition       = null;   // SpeechRecognition instance
let currentAttachments = [];    // Local temp storage for uploads
let unsubscribeVersions = null; // Cleanup for history

// Command Palette State
let isPaletteOpen     = false;
let paletteSelectedIndex = 0;
let paletteItems      = [];     // Current filtered list


// ─────────────────────────────────────────────
// PWA Installation Storage
// ─────────────────────────────────────────────
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show the install button
  if (installBtn) installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  // Show the install prompt
  deferredPrompt.prompt();
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] User response to install prompt: ${outcome}`);
  logAnalyticsEvent('pwa_install_click', { outcome });
  // We've used the prompt, and can't use it again, throw it away
  deferredPrompt = null;
  // Hide UI
  installBtn.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
  // Hide the app-provided install promotion
  installBtn.classList.add('hidden');
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  console.log('[PWA] App successfully installed');
  logAnalyticsEvent('pwa_installed');
});

// ─────────────────────────────────────────────
// Auth State Observer — App Entry Point
// ─────────────────────────────────────────────
onAuthChange((user) => {
  currentUser = user;
  if (user) {
    showApp(user);
  } else {
    showAuth();
  }
});

// ─────────────────────────────────────────────
// Command Palette Logic
// ─────────────────────────────────────────────
const APP_ACTIONS = [
  { id: 'new-note', title: 'New Note', desc: 'Create a blank note', icon: 'plus' },
  { id: 'show-guide', title: 'User Guide', desc: 'Learn how to use NoteBook', icon: 'help' },
  { id: 'go-all', title: 'All Notes', desc: 'View all your notes', icon: 'home' },
  { id: 'go-pinned', title: 'Pinned Notes', desc: 'View your pinned notes', icon: 'pin' },
  { id: 'toggle-sidebar', title: 'Toggle Sidebar', desc: 'Show/hide folder navigation', icon: 'menu' },
  { id: 'logout', title: 'Logout', desc: 'Sign out of NoteBook', icon: 'log-out' }
];

function togglePalette(forceClose = false) {
  isPaletteOpen = forceClose ? false : !isPaletteOpen;
  paletteOverlay.classList.toggle('hidden', !isPaletteOpen);
  paletteOverlay.setAttribute('aria-hidden', !isPaletteOpen);

  if (isPaletteOpen) {
    paletteInput.value = '';
    paletteSelectedIndex = 0;
    renderPaletteResults();
    setTimeout(() => paletteInput.focus(), 100);
  }
}

function renderPaletteResults() {
  const query = paletteInput.value.toLowerCase().trim();
  paletteItems = [];

  // 1. Filter Actions
  const filteredActions = APP_ACTIONS.filter(a => 
    a.title.toLowerCase().includes(query) || a.desc.toLowerCase().includes(query)
  );
  
  // 2. Filter Notes (Limited to top 10 for speed)
  const filteredNotes = allNotes.filter(n => 
    n.title.toLowerCase().includes(query) || (n.content || '').toLowerCase().includes(query)
  ).slice(0, 10);

  paletteResults.innerHTML = '';

  if (filteredActions.length > 0) {
    const group = document.createElement('div');
    group.className = 'palette-group-title';
    group.textContent = 'Actions';
    paletteResults.appendChild(group);

    filteredActions.forEach(action => {
      paletteItems.push({ type: 'action', ...action });
      paletteResults.appendChild(createPaletteItem(action, 'action'));
    });
  }

  if (filteredNotes.length > 0) {
    const group = document.createElement('div');
    group.className = 'palette-group-title';
    group.textContent = 'Notes';
    paletteResults.appendChild(group);

    filteredNotes.forEach(note => {
      paletteItems.push({ type: 'note', ...note });
      paletteResults.appendChild(createPaletteItem(note, 'note'));
    });
  }

  if (paletteItems.length === 0) {
    paletteResults.innerHTML = '<div class="palette-group-title">No results found</div>';
  }

  updatePaletteSelection();
}

function createPaletteItem(item, type) {
  const el = document.createElement('div');
  el.className = 'palette-item';
  el.dataset.id = item.id;
  
  const iconHtml = type === 'action' 
    ? getActionIcon(item.icon)
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

  el.innerHTML = `
    <div class="palette-item-icon">${iconHtml}</div>
    <div class="palette-item-info">
      <span class="palette-item-title">${escapeHtml(item.title)}</span>
      <span class="palette-item-desc">${escapeHtml(item.desc || (item.content ? item.content.substring(0, 40) + '...' : 'No content'))}</span>
    </div>
  `;

  el.addEventListener('click', () => executePaletteItem(item));
  return el;
}

function updatePaletteSelection() {
  const elements = paletteResults.querySelectorAll('.palette-item');
  elements.forEach((el, i) => {
    el.classList.toggle('selected', i === paletteSelectedIndex);
    if (i === paletteSelectedIndex) el.scrollIntoView({ block: 'nearest' });
  });
}

function executePaletteItem(item) {
  togglePalette(true); // Close first

  if (item.type === 'action') {
    switch (item.id) {
      case 'new-note': openModal('new'); break;
      case 'show-guide': toggleGuide(true); break;
      case 'go-all': 
        currentFolderId = 'all';
        document.querySelector('[data-nav="all"]').click();
        break;
      case 'go-pinned':
        currentFolderId = 'pinned';
        document.querySelector('[data-nav="pinned"]').click();
        break;
      case 'toggle-sidebar': sidebarToggle.click(); break;
      case 'logout': logoutBtn.click(); break;
    }
  } else if (item.type === 'note') {
    openModal('edit', item);
  }
}

function getActionIcon(iconName) {
  const icons = {
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v7l5 3 5-3v-7h2a2 2 0 0 0 2-2z"/></svg>',
    menu: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    'log-out': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    help: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };
  return icons[iconName] || '';
}

// Event Listeners for Palette
window.addEventListener('keydown', (e) => {
  // Toggle with Ctrl+K or Cmd+K
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    togglePalette();
  }

  if (!isPaletteOpen) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    togglePalette(true);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    paletteSelectedIndex = (paletteSelectedIndex + 1) % paletteItems.length;
    updatePaletteSelection();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    paletteSelectedIndex = (paletteSelectedIndex - 1 + paletteItems.length) % paletteItems.length;
    updatePaletteSelection();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (paletteItems[paletteSelectedIndex]) {
      executePaletteItem(paletteItems[paletteSelectedIndex]);
    }
  }
});

paletteInput.addEventListener('input', renderPaletteResults);

paletteOverlay.addEventListener('click', (e) => {
  if (e.target === paletteOverlay) togglePalette(true);
});

paletteToggleBtn.addEventListener('click', () => togglePalette());
headerHelpBtn.addEventListener('click', () => toggleGuide(true));

// ─────────────────────────────────────────────
// Support & Feedback Logic
// ─────────────────────────────────────────────
function toggleSupportModal(show = true) {
  supportModal.classList.toggle('hidden', !show);
  if (show) {
    supportForm.reset();
    supportError.classList.add('hidden');
    // Pre-fill name if user is logged in
    if (currentUser) {
      const nameInput = document.getElementById('support-name');
      if (nameInput) nameInput.value = currentUser.displayName || '';
    }
    setTimeout(() => document.getElementById('support-name').focus(), 100);
  }
}

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

  // Validation
  if (!data.name || !data.subject || !data.message) {
    supportError.textContent = 'Please fill in all fields.';
    supportError.classList.remove('hidden');
    return;
  }

  // Loading state
  const btnSpan = submitSupportBtn.querySelector('span');
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

// ─────────────────────────────────────────────
// View Switching
// ─────────────────────────────────────────────
function showApp(user) {
  authSection.classList.add('hidden');
  appSection.classList.remove('hidden');

  logAnalyticsEvent('screen_view', { screen_name: 'Dashboard' });

  // Dynamic Greeting
  const name = user.displayName || user.email.split('@')[0];
  dynamicGreeting.textContent = getDynamicGreeting() + ',';
  greetingName.textContent    = name + ' 👋';

  // Show skeleton while first load fires
  renderSkeletons(3);

  // Subscribe to real-time notes
  unsubscribeNotes = subscribeToNotes(user.uid, (notes) => {
    allNotes = notes;
    applyFilters();
    checkReminders(notes);
  });

  // Subscribe to folders
  unsubscribeFolders = subscribeToFolders(user.uid, (folders) => {
    allFolders = folders;
    renderFolders(folders);
  });

  // Prompt new Google-only users to set a password.
  // We detect them by: Google is the ONLY provider AND account was
  // created within the last 60 seconds (creation time ≈ last sign-in).
  // This runs inside onAuthChange so there is no sessionStorage race condition.
  const isGoogleOnly = user.providerData?.every(p => p.providerId === 'google.com');
  if (isGoogleOnly) {
    const created   = new Date(user.metadata.creationTime).getTime();
    const signedIn  = new Date(user.metadata.lastSignInTime).getTime();
    if (Math.abs(signedIn - created) < 60000) {
      setTimeout(() => showSetPasswordPrompt(user), 1400);
    }
  }
}

function showAuth() {
  appSection.classList.add('hidden');
  authSection.classList.remove('hidden');

  logAnalyticsEvent('screen_view', { screen_name: 'Auth' });

  // Reset auth buttons state
  const loginSubmitBtn  = document.getElementById('login-submit-btn');
  const signupSubmitBtn = document.getElementById('signup-submit-btn');
  const forgotSubmitBtn = document.getElementById('forgot-submit-btn');
  if (loginSubmitBtn) {
    setLoading(loginSubmitBtn, false, 'Sign In');
  }
  if (signupSubmitBtn) {
    setLoading(signupSubmitBtn, false, 'Create Account');
  }
  if (forgotSubmitBtn) {
    setLoading(forgotSubmitBtn, false, 'Send Reset Link');
  }

  // Clear errors/success
  loginError.classList.add('hidden');
  signupError.classList.add('hidden');
  forgotError.classList.add('hidden');
  forgotSuccess.classList.add('hidden');

  // Ensure login form is shown by default
  switchTab('login');

  // Stop Firestore listeners
  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }
  if (unsubscribeFolders) {
    unsubscribeFolders();
    unsubscribeFolders = null;
  }

  allNotes = [];
  allFolders = [];

  // Show deletion success banner if account was just deleted
  if (sessionStorage.getItem('account-deleted')) {
    sessionStorage.removeItem('account-deleted');
    const container = authSection.querySelector('.auth-container');
    const card      = authSection.querySelector('.auth-card');
    const existing  = container.querySelector('.account-deleted-banner');
    if (existing) existing.remove();
    const banner = document.createElement('div');
    banner.className = 'account-deleted-banner';
    banner.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span>Your account has been permanently deleted. You can create a new one below.</span>
    `;
    container.insertBefore(banner, card);
    setTimeout(() => banner.classList.add('visible'), 50);
    setTimeout(() => { banner.style.opacity='0'; setTimeout(()=>banner.remove(),400); }, 7000);
  }
}


// ─────────────────────────────────────────────
// Auth Tab Switching
// ─────────────────────────────────────────────
tabLogin.addEventListener('click', () => switchTab('login'));
tabSignup.addEventListener('click', () => switchTab('signup'));

function switchTab(tab) {
  const isLogin  = tab === 'login';
  const isSignup = tab === 'signup';
  const isForgot = tab === 'forgot';

  tabLogin.classList.toggle('active', isLogin);
  tabSignup.classList.toggle('active', isSignup);
  
  loginForm.classList.toggle('hidden', !isLogin);
  signupForm.classList.toggle('hidden', !isSignup);
  forgotForm.classList.toggle('hidden', !isForgot);

  loginError.classList.add('hidden');
  signupError.classList.add('hidden');
  forgotError.classList.add('hidden');
  forgotSuccess.classList.add('hidden');

  // If going to forgot, hide tabs
  document.querySelector('.auth-tabs').classList.toggle('hidden', isForgot);
}

// ─────────────────────────────────────────────
// Forgot Password Flow
// ─────────────────────────────────────────────
linkForgotPassword.addEventListener('click', () => switchTab('forgot'));
linkBackToLogin.addEventListener('click', () => switchTab('login'));

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  forgotError.classList.add('hidden');
  forgotSuccess.classList.add('hidden');

  const email = document.getElementById('forgot-email').value.trim();
  const submitBtn = document.getElementById('forgot-submit-btn');

  if (!email) {
    showFormError(forgotError, 'Please enter your email.');
    return;
  }

  setLoading(submitBtn, true, 'Sending…');
  try {
    await resetPassword(email);
    forgotSuccess.textContent = 'Reset link sent! Check your email.';
    forgotSuccess.classList.remove('hidden');
    setLoading(submitBtn, false, 'Send Reset Link');
    
    // Optionally clear email
    document.getElementById('forgot-email').value = '';
    
    // Auto-switch back after a delay
    setTimeout(() => {
      if (!forgotForm.classList.contains('hidden')) {
        switchTab('login');
      }
    }, 4000);
  } catch (err) {
    showFormError(forgotError, friendlyAuthError(err.code));
    setLoading(submitBtn, false, 'Send Reset Link');
  }
});

// ─────────────────────────────────────────────
// Sign Up
// ─────────────────────────────────────────────
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  signupError.classList.add('hidden');

  const username  = document.getElementById('signup-username').value.trim();
  const email     = document.getElementById('signup-email').value.trim();
  const password  = document.getElementById('signup-password').value;
  const submitBtn = signupForm.querySelector('.btn-primary');

  if (!username) {
    showFormError(signupError, 'Please enter a username.');
    return;
  }

  setLoading(submitBtn, true, 'Creating account…');
  try {
    await signUp(username, email, password);
    // onAuthChange will handle the redirect
  } catch (err) {
    showFormError(signupError, friendlyAuthError(err.code));
    setLoading(submitBtn, false, 'Create Account');
  }
});

// ─────────────────────────────────────────────
// Sign In
// ─────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');

  const email     = document.getElementById('login-email').value.trim();
  const password  = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('login-submit-btn');

  setLoading(submitBtn, true, 'Signing in…');
  try {
    await signIn(email, password);
  } catch (err) {
    // Log the raw code so we can diagnose in DevTools
    console.warn('[Auth] Sign-in failed. Firebase error code:', err.code, err.message);
    showFormError(loginError, friendlyAuthError(err.code));
    setLoading(submitBtn, false, 'Sign In');
  }
});

// ─────────────────────────────────────────────
// Google Sign-In (both Login + Signup forms)
// ─────────────────────────────────────────────
[document.getElementById('google-login-btn'), document.getElementById('google-signup-btn')]
  .forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.classList.add('btn-google--loading');
      try {
        await signInWithGoogle();
        // onAuthChange handles navigation — nothing else needed
      } catch (err) {
        // Silently ignore popup cancelled by the user
        if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          const errorEl = btn.closest('form')?.querySelector('.auth-error');
          if (errorEl) {
            errorEl.textContent = friendlyAuthError(err.code);
            errorEl.classList.remove('hidden');
          }
        }
      } finally {
        btn.disabled = false;
        btn.classList.remove('btn-google--loading');
      }
    });
  });

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────
logoutBtn.addEventListener('click', async () => {
  try {
    await logOut();
  } catch {
    showToast('Failed to log out. Try again.', 'error');
  }
});

// ─────────────────────────────────────────────
// Delete Account Modal
// ─────────────────────────────────────────────
function openDeleteAccountModal() {
  const isGoogle = currentUser?.providerData?.some(p => p.providerId === 'google.com');

  const overlay = document.createElement('div');
  overlay.className = 'delete-account-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'da-title');

  overlay.innerHTML = `
    <div class="delete-account-box">
      <div class="da-header">
        <div class="da-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </div>
        <div>
          <h4 id="da-title">Delete My Account</h4>
          <p class="da-subtitle">This is permanent and cannot be undone.</p>
        </div>
      </div>

      <div class="da-warning">
        <p>The following will be <strong>permanently deleted</strong>:</p>
        <ul>
          <li>All your notes</li>
          <li>All your folders</li>
          <li>Your account profile</li>
          <li>Your login credentials</li>
        </ul>
      </div>

      ${!isGoogle ? `
      <div class="da-field-group">
        <label for="da-password">Confirm your password</label>
        <input
          id="da-password"
          type="password"
          placeholder="Enter your current password"
          autocomplete="current-password" />
      </div>` : `
      <p class="da-google-note">You will be asked to sign in with Google again to confirm your identity.</p>
      `}

      <div class="da-field-group">
        <label for="da-confirm-input">Type <strong>DELETE</strong> to confirm</label>
        <input
          id="da-confirm-input"
          type="text"
          placeholder="DELETE"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false" />
      </div>

      <p id="da-error" class="da-error hidden"></p>

      <div class="da-actions">
        <button id="da-cancel-btn" class="btn-cancel">Cancel</button>
        <button id="da-confirm-btn" class="btn-danger-confirm" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          </svg>
          Delete My Account
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const confirmInput = overlay.querySelector('#da-confirm-input');
  const confirmBtn   = overlay.querySelector('#da-confirm-btn');
  const cancelBtn    = overlay.querySelector('#da-cancel-btn');
  const errorEl      = overlay.querySelector('#da-error');
  const passwordInput = overlay.querySelector('#da-password');

  // Enable confirm button only when DELETE is typed correctly
  confirmInput.addEventListener('input', () => {
    confirmBtn.disabled = confirmInput.value !== 'DELETE';
  });

  cancelBtn.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  confirmBtn.addEventListener('click', async () => {
    if (confirmInput.value !== 'DELETE') return;

    const password = passwordInput ? passwordInput.value : null;
    if (!isGoogle && !password) {
      errorEl.textContent = 'Please enter your password.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Loading state
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting…';
    errorEl.classList.add('hidden');

    try {
      sessionStorage.setItem('account-deleted', '1');
      await deleteAccount(currentUser, password);
      overlay.remove();
      showToast('Account deleted. Goodbye! 👋', 'success');
      // onAuthChange fires automatically — returns to auth screen
    } catch (err) {
      const messages = {
        'auth/wrong-password'         : 'Incorrect password. Please try again.',
        'auth/too-many-requests'      : 'Too many attempts. Please wait and try again.',
        'auth/network-request-failed' : 'Network error. Check your connection.',
        'auth/popup-closed-by-user'   : 'Google sign-in was cancelled. Please try again.',
        'auth/requires-recent-login'  : 'Session expired. Please log out and log back in first.',
      };
      errorEl.textContent = messages[err.code] || 'Something went wrong. Please try again.';
      errorEl.classList.remove('hidden');
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
        </svg>
        Delete My Account`;
    }
  });

  // Focus the first input for accessibility
  setTimeout(() => (passwordInput || confirmInput).focus(), 100);
}

deleteAccountBtn.addEventListener('click', openDeleteAccountModal);

// ─────────────────────────────────────────────
// Set Password Prompt (new Google users)
// ─────────────────────────────────────────────
function showSetPasswordPrompt(user) {
  const overlay = document.createElement('div');
  overlay.className = 'set-password-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="set-password-box">
      <div class="sp-header">
        <div class="sp-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <h4>Set a Password</h4>
          <p class="sp-subtitle">Optionally create a password so you can also sign in with your email.</p>
        </div>
      </div>

      <p class="sp-email-note">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Password will be linked to <strong>${escapeHtml(user.email)}</strong>
      </p>

      <div class="sp-field-group">
        <label for="sp-password">New Password</label>
        <div class="input-wrapper">
          <input id="sp-password" type="password" placeholder="At least 6 characters" autocomplete="new-password" />
          <button type="button" class="password-toggle" aria-label="Show password">
            <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>
      <div class="sp-field-group">
        <label for="sp-confirm">Confirm Password</label>
        <div class="input-wrapper">
          <input id="sp-confirm" type="password" placeholder="Repeat your password" autocomplete="new-password" />
          <button type="button" class="password-toggle" aria-label="Show password">
            <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>

      <p id="sp-error" class="sp-error hidden"></p>

      <div class="sp-actions">
        <button id="sp-skip-btn" class="btn-cancel">Skip for now</button>
        <button id="sp-save-btn" class="btn-primary sp-save-btn">Set Password</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Wire eye-toggle buttons inside this dynamically-created modal
  overlay.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const icon  = btn.querySelector('.eye-icon');
      if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        input.type = 'password';
        icon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        `;
        btn.setAttribute('aria-label', 'Show password');
      }
    });
  });

  const pwInput    = overlay.querySelector('#sp-password');
  const confInput  = overlay.querySelector('#sp-confirm');
  const saveBtn    = overlay.querySelector('#sp-save-btn');
  const skipBtn    = overlay.querySelector('#sp-skip-btn');
  const errorEl    = overlay.querySelector('#sp-error');

  skipBtn.addEventListener('click', () => overlay.remove());

  saveBtn.addEventListener('click', async () => {
    const pw   = pwInput.value;
    const conf = confInput.value;
    errorEl.classList.add('hidden');

    if (pw.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters.';
      errorEl.classList.remove('hidden');
      return;
    }
    if (pw !== conf) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.classList.remove('hidden');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving\u2026';

    try {
      await linkEmailPassword(currentUser, pw);
      overlay.remove();
      showToast('Password set! You can now sign in with email too \u2713', 'success');
    } catch (err) {
      const msgs = {
        'auth/weak-password'              : 'Password must be at least 6 characters.',
        'auth/provider-already-linked'    : 'A password is already linked to this account.',
        'auth/email-already-in-use'       : 'This email is already in use by another account.',
        'auth/requires-recent-login'      : 'Session expired. Please log out and sign in with Google again.',
      };
      errorEl.textContent = msgs[err.code] || 'Something went wrong. Please try again.';
      errorEl.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Set Password';
    }
  });

  setTimeout(() => pwInput.focus(), 100);
}

// ─────────────────────────────────────────────
// Note Rendering
// ─────────────────────────────────────────────
function renderNotes(notes) {
  notesList.innerHTML = '';
  notesCountBadge.textContent = `${notes.length} note${notes.length !== 1 ? 's' : ''}`;

  if (notes.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <h3>No notes yet</h3>
        <p>Tap the + button below to create your first note.</p>
      </div>`;
    return;
  }

  notes.forEach((note, index) => {
    const card = createNoteCard(note, index);
    notesList.appendChild(card);
  });
}

function createNoteCard(note, index = 0) {
  const card = document.createElement('article');
  card.className = `note-card ${note.pinned ? 'pinned' : ''}`;
  card.style.setProperty('--delay', `${index * 0.05}s`);
  card.setAttribute('role', 'button');
  card.setAttribute('draggable', 'true');

  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Note: ${note.title}`);

  // Drag start
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('noteId', note.id);
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });

  const timeLabel = formatTimestamp(note.updatedAt);
  const category  = note.category || 'General';
  const query     = searchInput.value.toLowerCase().trim();

  card.innerHTML = `
    <div class="note-card-header">
      <div class="note-card-title-wrap">
        <span class="note-category-pill ${category.toLowerCase()}">${category}</span>
        <h3 class="note-card-title">${highlightText(note.title, query)}</h3>
      </div>
      <div class="note-card-actions">
        <button class="card-action-btn pin ${note.pinned ? 'active' : ''}" aria-label="Toggle pin" data-id="${note.id}" title="${note.pinned ? 'Unpin' : 'Pin'}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v7l5 3 5-3v-7h2a2 2 0 0 0 2-2z"/>
          </svg>
        </button>
        <button class="card-action-btn edit" aria-label="Edit note" data-id="${note.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="card-action-btn delete" aria-label="Delete note" data-id="${note.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="note-card-preview">${parseMarkdown(highlightText(note.content || 'No content', query), true)}</div>
    ${note.reminder ? `<div class="reminder-badge" title="Reminder set">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span>${formatReminder(note.reminder)}</span>
    </div>` : ''}
    <footer class="note-card-footer">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      ${timeLabel}
    </footer>`;


  // Edit on card click (but not on action buttons)
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.card-action-btn')) {
      openModal('edit', note);
    }
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.target.closest('.card-action-btn')) openModal('edit', note);
  });

  // Edit button
  card.querySelector('.edit').addEventListener('click', (e) => {
    e.stopPropagation();
    openModal('edit', note);
  });

  // Pin button
  card.querySelector('.pin').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePin(currentUser.uid, note.id, note.pinned)
      .catch(() => showToast('Failed to toggle pin', 'error'));
  });

  // Delete button
  card.querySelector('.delete').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDelete(note.id, note.title);
  });

  return card;
}

function renderSkeletons(count) {
  notesList.innerHTML = Array.from({ length: count })
    .map(() => `<div class="skeleton-card skeleton"></div>`)
    .join('');
}

// ─────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  searchClearBtn.classList.toggle('visible', searchInput.value.length > 0);
  applyFilters();
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchClearBtn.classList.remove('visible');
  applyFilters();
  searchInput.focus();
});


// Category Filter Clicks
categoryFilters.addEventListener('click', (e) => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;

  // Update UI
  document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
  chip.classList.add('active');

  currentCategory = chip.dataset.category;
  applyFilters();
});

function applyFilters() {
  const q = searchInput.value.toLowerCase().trim();
  
  const filtered = allNotes.filter(n => {
    const matchesSearch = !q || 
      n.title.toLowerCase().includes(q) || 
      (n.content || '').toLowerCase().includes(q);
    
    const matchesCategory = currentCategory === 'all' || n.category === currentCategory;
    
    let matchesFolder = true;
    if (currentFolderId === 'pinned') {
      matchesFolder = n.pinned;
    } else if (currentFolderId !== 'all') {
      matchesFolder = n.folderId === currentFolderId;
    }
    
    return matchesSearch && matchesCategory && matchesFolder;
  });


  // Sort by pinned FIRST, then by updatedAt
  filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
    const dateA = a.updatedAt?.toDate() || new Date(0);
    const dateB = b.updatedAt?.toDate() || new Date(0);
    return dateB - dateA;
  });

  renderNotes(filtered);
}

// ─────────────────────────────────────────────
// Note Modal
// ─────────────────────────────────────────────
fabBtn.addEventListener('click', () => openModal('new'));
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});

function openModal(mode, note = null) {
  editingNoteId = mode === 'edit' ? note.id : null;
  modalTitle.textContent = mode === 'edit' ? 'Edit Note' : 'New Note';
  noteTitle.value      = note ? note.title    : '';
  noteCategory.value   = note ? note.category : 'General';
  noteContent.value    = note ? note.content  : '';
  
  // Reset Premium State
  currentAttachments = note && note.attachments ? [...note.attachments] : [];
  renderMediaTray();
  historyPanel.classList.add('hidden');
  smartSuggestions.classList.add('hidden');

  // Smart Folder Pre-selection
  if (note) {
    noteFolder.value = note.folderId || 'none';
  } else if (currentFolderId !== 'all' && currentFolderId !== 'pinned') {
    // If we're inside a folder, default new notes to it
    noteFolder.value = currentFolderId;
  } else {
    noteFolder.value = 'none';
  }

  saveNoteBtn.disabled = false;

  // Reset tabs
  switchEditorTab('edit');

  modalBackdrop.classList.remove('hidden');
  setTimeout(() => noteTitle.focus(), 120);
}


function closeModal() {
  modalBackdrop.classList.add('hidden');
  editingNoteId = null;
  noteTitle.value    = '';
  noteCategory.value = 'General';
  noteFolder.value   = 'none';
  noteContent.value  = '';
  notePreviewArea.innerHTML = '';
  
  // Cleanup Premium State
  currentAttachments = [];
  renderMediaTray();
  historyPanel.classList.add('hidden');
  smartSuggestions.classList.add('hidden');
  if (unsubscribeVersions) {
    unsubscribeVersions();
    unsubscribeVersions = null;
  }

  // Reset buttons
  saveNoteBtn.disabled = false;
  saveNoteBtn.textContent = 'Save Note';
}

saveNoteBtn.addEventListener('click', async () => {
  const title    = noteTitle.value.trim();
  const content  = noteContent.value.trim();
  const category = noteCategory.value;
  const folderId = noteFolder.value === 'none' ? null : noteFolder.value;
  const reminder = noteContent.dataset.reminder || null;

  if (!content && !title) {
    showToast('Please add a title or content.', 'error');
    return;
  }

  saveNoteBtn.disabled = true;
  saveNoteBtn.textContent = 'Saving…';

  logAnalyticsEvent('save_button_click', { mode: editingNoteId ? 'edit' : 'new' });

  try {
    const noteData = { 
      title, 
      content, 
      category, 
      folderId, 
      reminder,
      attachments: currentAttachments 
    };

    if (editingNoteId) {
      await updateNote(currentUser.uid, editingNoteId, noteData);
      showToast('Note updated ✓', 'success');
    } else {
      await addNote(currentUser.uid, noteData);
      showToast('Note created ✓', 'success');
    }
    delete noteContent.dataset.reminder;
    closeModal();
  } catch (err) {
    console.error(err);
    showToast('Failed to save note. Try again.', 'error');
    saveNoteBtn.disabled = false;
    saveNoteBtn.textContent = 'Save Note';
  }
});


// ─────────────────────────────────────────────
// Editor Tabs & User Guide Logic
// ─────────────────────────────────────────────
editTab.addEventListener('click', () => switchEditorTab('edit'));
previewTab.addEventListener('click', () => switchEditorTab('preview'));

function switchEditorTab(tab) {
  const isEdit = tab === 'edit';
  editTab.classList.toggle('active', isEdit);
  previewTab.classList.toggle('active', !isEdit);
  
  noteContent.classList.toggle('hidden', !isEdit);
  notePreviewArea.classList.toggle('hidden', isEdit);

  if (!isEdit) {
    notePreviewArea.innerHTML = parseMarkdown(noteContent.value);
  }
}

function toggleGuide(isOpen) {
  guideModal.classList.toggle('hidden', !isOpen);
}

showGuideBtn.addEventListener('click', () => toggleGuide(true));
closeGuideBtn.addEventListener('click', () => toggleGuide(false));
gotItBtn.addEventListener('click', () => toggleGuide(false));
guideModal.addEventListener('click', (e) => {
  if (e.target === guideModal) toggleGuide(false);
});

// Auto-show guide for new users
if (!localStorage.getItem('guideShown')) {
  setTimeout(() => {
    if (currentUser) toggleGuide(true);
    localStorage.setItem('guideShown', 'true');
  }, 2000);
}


// ─────────────────────────────────────────────
// Delete with Confirmation Dialog
// ─────────────────────────────────────────────
function confirmDelete(noteId, noteTitle) {
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = `
    <div class="confirm-box">
      <h4>Delete Note</h4>
      <p>Are you sure you want to delete "<strong>${escapeHtml(noteTitle)}</strong>"? This cannot be undone.</p>
      <div class="confirm-actions">
        <button class="btn-confirm-cancel" id="confirm-cancel-btn">Cancel</button>
        <button class="btn-confirm-delete" id="confirm-delete-btn">Delete</button>
      </div>
    </div>`;

  document.body.appendChild(dialog);

  dialog.querySelector('#confirm-cancel-btn').addEventListener('click', () => dialog.remove());
  dialog.querySelector('#confirm-delete-btn').addEventListener('click', async () => {
    dialog.remove();
    try {
      await deleteNote(currentUser.uid, noteId);
      showToast('Note deleted.', 'success');
    } catch {
      showToast('Failed to delete note.', 'error');
    }
  });
}

// ─────────────────────────────────────────────
// Toast Notifications
// ─────────────────────────────────────────────
function showToast(message, type = 'success') {
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


// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function setLoading(btn, loading, label) {
  btn.disabled = loading;
  btn.textContent = label;
}

function showFormError(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
}

function escapeHtml(str = '') {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Highlights matches while preserving HTML safety.
 */
function highlightText(text = '', query = '', isMarkdown = false) {
  if (!query) return isMarkdown ? text : escapeHtml(text);
  
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark class="highlight">$1</mark>');
}

/**
 * Voice Capture Logic
 */
let originalNoteContent = '';

function initVoiceCapture() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.classList.add('hidden');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let sessionFinal = '';
    let sessionInterim = '';
    for (let i = 0; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        sessionFinal += event.results[i][0].transcript;
      } else {
        sessionInterim += event.results[i][0].transcript;
      }
    }
    
    let newContent = originalNoteContent;
    if (newContent && (sessionFinal || sessionInterim) && !newContent.endsWith(' ')) {
      newContent += ' ';
    }
    newContent += sessionFinal + sessionInterim;
    noteContent.value = newContent;
  };

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add('listening');
    showToast('Listening...', 'success');
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove('listening');
  };

  recognition.onerror = () => {
    showToast('Microphone error', 'error');
    stopListening();
  };
}

function toggleListening() {
  if (!recognition) initVoiceCapture();
  if (!recognition) return;

  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
}

function startListening() {
  try {
    originalNoteContent = noteContent.value;
    recognition.start();
  } catch (err) {
    console.error('Speech recognition start failed', err);
  }
}

function stopListening() {
  if (recognition) recognition.stop();
}

micBtn.addEventListener('click', toggleListening);

/**
 * Super lightweight Markdown-to-HTML parser.
 * Now supports Checklists [ ] and [x]
 */
function parseMarkdown(text = '', alreadyEscaped = false) {
  if (!text) return '';
  
  let html = alreadyEscaped ? text : escapeHtml(text);

  // Checklists: [ ] or [x]
  html = html.replace(/\[ \]\s(.*$)/gm, '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$1</span></div>');
  html = html.replace(/\[x\]\s(.*$)/gm, '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$1</span></div>');

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Strikethrough: ~~text~~
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

  // Inline Code: `text`
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Headings: # text (at start of line)
  html = html.replace(/^# (.*$)/gm, '<h4>$1</h4>');

  
  // Lists: - text (at start of line)
  html = html.replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>');
  // Cleanup adjacent <ul> tags
  html = html.replace(/<\/ul><ul>/g, '');

  // Handle newlines
  html = html.replace(/\n/g, '<br>');

  return html;
}


function formatTimestamp(ts) {
  if (!ts) return 'Just now';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function getDynamicGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * @param {string} code - Firebase Auth error code
 */
function friendlyAuthError(code) {
  const map = {
    'auth/email-already-in-use'      : 'This email is already registered.',
    'auth/invalid-email'             : 'Please enter a valid email address.',
    'auth/weak-password'             : 'Password must be at least 6 characters.',
    'auth/user-not-found'            : 'No account found with this email. Please sign up first.',
    'auth/wrong-password'            : 'Incorrect password. Use “Forgot Password” to reset it.',
    'auth/too-many-requests'         : 'Too many attempts. Please try again later.',
    'auth/invalid-credential'        : 'Incorrect email or password. If you signed up with Google, use the “Continue with Google” button instead.',
    'auth/network-request-failed'    : 'Network error. Check your connection.',
    'auth/user-disabled'             : 'This account has been disabled. Contact support.',
    'auth/operation-not-allowed'     : 'Email/password login is not enabled. Please use Google sign-in.',
    'auth/account-exists-with-different-credential' : 'An account with this email already exists. Try signing in with Google instead.',
  };
  return map[code] || `An unexpected error occurred. (${code})`;
}

// ─────────────────────────────────────────────
// Password visibility toggle
// ─────────────────────────────────────────────
document.querySelectorAll('.password-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const input = document.getElementById(targetId);
    const icon = btn.querySelector('.eye-icon');

    if (input.type === 'password') {
      input.type = 'text';
      // Switch to eye-off icon
      icon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
      btn.setAttribute('aria-label', 'Hide password');
    } else {
      input.type = 'password';
      // Switch back to eye icon
      icon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
      btn.setAttribute('aria-label', 'Show password');
    }
  });
});

// ─────────────────────────────────────────────
// Sidebar & Folder Logic
// ─────────────────────────────────────────────
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarBackdrop.classList.toggle('hidden');
});

sidebarBackdrop.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarBackdrop.classList.add('hidden');
});

// Navigation items
navItems.forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    currentFolderId = item.dataset.nav;
    applyFilters();
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      sidebar.classList.remove('open');
      sidebarBackdrop.classList.add('hidden');
    }
  });
});

addFolderBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  const name = prompt('Enter folder name:');
  if (name && name.trim()) {
    try {
      await addFolder(currentUser.uid, name);
      showToast('Folder created ✓');
    } catch {
      showToast('Failed to create folder', 'error');
    }
  }
});

function renderFolders(folders) {
  // To sidebar
  folderList.innerHTML = folders.map(f => `
    <li class="folder-item nav-item" data-nav="${f.id}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <span>${escapeHtml(f.name)}</span>
      <button class="delete-folder-btn icon-btn" data-id="${f.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </li>
  `).join('');

  // Add click listeners to folders
  folderList.querySelectorAll('.folder-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      currentFolderId = item.dataset.nav;
      applyFilters();
      if (window.innerWidth < 1024) {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.add('hidden');
      }
    });

    // Drag and Drop listeners
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const noteId = e.dataTransfer.getData('noteId');
      const folderId = item.dataset.nav;

      if (noteId && folderId) {
        try {
          const note = allNotes.find(n => n.id === noteId);
          await updateNote(currentUser.uid, noteId, { ...note, folderId: folderId === 'all' ? null : folderId });
          showToast('Note moved ✓');
        } catch {
          showToast('Failed to move note', 'error');
        }
      }
    });

    item.querySelector('.delete-folder-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this folder? Notes will NOT be deleted.')) {
        await deleteFolder(currentUser.uid, item.dataset.id);
        if (currentFolderId === item.dataset.id) {
          currentFolderId = 'all';
          document.querySelector('[data-nav="all"]').classList.add('active');
          applyFilters();
        }
      }
    });
  });

  // To modal select
  const currentVal = noteFolder.value;
  noteFolder.innerHTML = '<option value="none">No Folder</option>' + 
    folders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
  noteFolder.value = currentVal;
}

// ─────────────────────────────────────────────
// Checklist Interactivity
// ─────────────────────────────────────────────
notesList.addEventListener('click', async (e) => {
  if (e.target.classList.contains('checklist-checkbox')) {
    e.stopPropagation();
    const card = e.target.closest('.note-card');
    const noteId = card.querySelector('.card-action-btn.edit').dataset.id;
    const note = allNotes.find(n => n.id === noteId);
    
    // Find the text for this checkbox in the content
    const index = Array.from(card.querySelectorAll('.checklist-checkbox')).indexOf(e.target);
    const lines = note.content.split('\n');
    let checklistCount = 0;
    
    const newLines = lines.map(line => {
      if (line.trim().startsWith('[ ]') || line.trim().startsWith('[x]')) {
        if (checklistCount === index) {
          checklistCount++;
          return e.target.checked ? line.replace('[ ]', '[x]') : line.replace('[x]', '[ ]');
        }
        checklistCount++;
      }
      return line;
    });

    try {
      await updateNote(currentUser.uid, noteId, { ...note, content: newLines.join('\n') });
    } catch {
      showToast('Failed to update checklist', 'error');
      e.target.checked = !e.target.checked; // Revert
    }
  }
});

// ─────────────────────────────────────────────
// Reminders & Export
// ─────────────────────────────────────────────
reminderBtn.addEventListener('click', () => {
  const time = prompt('Enter reminder time (YYYY-MM-DD HH:MM) or leave blank to clear:', 
    noteContent.dataset.reminder || '');
  if (time === null) return;
  if (time === '') {
    delete noteContent.dataset.reminder;
    showToast('Reminder cleared');
  } else {
    noteContent.dataset.reminder = time;
    showToast('Reminder set ✓');
  }
});

exportPdfBtn.addEventListener('click', () => {
  window.print();
});

function formatReminder(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

function checkReminders(notes) {
  const now = new Date();
  notes.forEach(note => {
    if (note.reminder) {
      const remDate = new Date(note.reminder);
      // If reminder is within the next minute and hasn't been notified (we could store notified state)
      if (remDate > now && remDate - now < 60000) {
        setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification("NoteBook Reminder", { body: note.title });
          } else {
            showToast(`Reminder: ${note.title}`, 'success');
          }
        }, remDate - now);
      }
    }
  });
}

if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

// ─────────────────────────────────────────────
// Grammar Review Helper
// ─────────────────────────────────────────────
noteContent.setAttribute('spellcheck', 'true');

function reviewGrammar() {
  const text = noteContent.value;
  const patterns = [
    { regex: /\bits\b(?=\s+\w+ing)/gi, suggestion: "it's" },
    { regex: /\bit's\b(?=\s+\w+\b\s+(?:own|color|name))/gi, suggestion: "its" },
    { regex: /\byour\b(?=\s+\w+ing)/gi, suggestion: "you're" },
    { regex: /\byou're\b(?=\s+\w+\b\s+(?:book|house|idea))/gi, suggestion: "your" },
  ];

  let found = false;
  patterns.forEach(p => {
    if (p.regex.test(text)) {
      showToast(`Hint: Check "${p.suggestion}" usage`, 'error');
      found = true;
    }
  });
  if (!found) showToast('No common errors found! ✓');
}

// Add review button to modal header or body
const reviewBtn = document.createElement('button');
reviewBtn.className = 'tool-btn';
reviewBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
reviewBtn.title = "Review Grammar";
reviewBtn.addEventListener('click', reviewGrammar);
micBtn.parentNode.insertBefore(reviewBtn, micBtn);

// ─────────────────────────────────────────────
// PREMIUM FEATURES LOGIC
// ─────────────────────────────────────────────

/**
 * Initialize Dynamic Parallax Background.
 * Responds to mouse move on desktop and device orientation on mobile.
 */
function initParallax() {
  const isMobile = 'ontouchstart' in window;

  if (isMobile) {
    window.addEventListener('deviceorientation', (e) => {
      // Gamma: left/right tilt (-90 to 90), Beta: front/back tilt (-180 to 180)
      const x = e.gamma || 0;
      const y = e.beta || 0;

      // Map tilt to movement
      document.body.style.setProperty('--px-1', `${x * 0.5}px`);
      document.body.style.setProperty('--py-1', `${y * 0.5}px`);
      document.body.style.setProperty('--px-2', `${x * -0.3}px`);
      document.body.style.setProperty('--py-2', `${y * -0.3}px`);
      document.body.style.setProperty('--px-3', `${x * 0.15}px`);
      document.body.style.setProperty('--py-3', `${y * 0.15}px`);
    });
  } else {
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX - window.innerWidth / 2) / 25;
      const y = (e.clientY - window.innerHeight / 2) / 25;

      document.body.style.setProperty('--px-1', `${x}px`);
      document.body.style.setProperty('--py-1', `${y}px`);
      document.body.style.setProperty('--px-2', `${-x * 0.6}px`);
      document.body.style.setProperty('--py-2', `${-y * 0.6}px`);
      document.body.style.setProperty('--px-3', `${x * 0.3}px`);
      document.body.style.setProperty('--py-3', `${y * 0.3}px`);
    });
  }
}

// Call on startup
initParallax();

/**
 * ─────────────────────────────────────────────
 * ATTACHMENT & MEDIA TRAY LOGIC
 * ─────────────────────────────────────────────
 */

attachBtn.addEventListener('click', () => attachmentInput.click());

attachmentInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // 1. Enforce 1MB Limit
  const MAX_SIZE = 1 * 1024 * 1024; // 1MB
  if (file.size > MAX_SIZE) {
    showToast('File too large. Max limit is 1MB for premium mobile performance.', 'error');
    attachmentInput.value = '';
    return;
  }

  handleAttachmentUpload(file);
});

async function handleAttachmentUpload(file) {
  if (!currentUser) return;

  const fileId = Date.now();
  const storageRef = ref(storage, `users/${currentUser.uid}/attachments/${editingNoteId || 'temp'}/${fileId}_${file.name}`);

  // Create UI placeholder in tray
  if (mediaTray.querySelector('.media-tray-empty-msg')) {
    mediaTray.innerHTML = '';
    mediaTray.classList.remove('media-tray--empty');
  }
  const mediaItem = createMediaPlaceholder(file.name, true);
  mediaTray.appendChild(mediaItem);

  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on('state_changed',
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      const bar = mediaItem.querySelector('.media-progress-bar');
      if (bar) bar.style.width = `${progress}%`;
    },
    (error) => {
      console.error('[Upload] Error:', error);
      showToast('Failed to upload attachment.', 'error');
      mediaItem.remove();
      if (currentAttachments.length === 0) renderMediaTray();
    },
    async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      const attachment = {
        id: fileId,
        name: file.name,
        url: url,
        size: file.size,
        type: file.type,
        storagePath: uploadTask.snapshot.ref.fullPath
      };

      currentAttachments.push(attachment);
      renderMediaTray(); // Refresh to full state
      showToast('Attachment added!', 'success');
    }
  );
}

function createMediaPlaceholder(name, isUploading) {
  const el = document.createElement('div');
  el.className = `media-item ${isUploading ? 'uploading' : ''}`;
  el.innerHTML = `
    <div class="file-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
      </svg>
    </div>
    ${isUploading ? '<div class="media-progress"><div class="media-progress-bar"></div></div>' : ''}
  `;
  return el;
}

function renderMediaTray() {
  mediaTray.innerHTML = '';
  if (currentAttachments.length === 0) {
    mediaTray.classList.add('media-tray--empty');
    mediaTray.innerHTML =
      '<p class="media-tray-empty-msg">No attachments yet. Tap the paperclip in the toolbar to add an image or PDF (max 1MB). They appear here before you save.</p>';
    return;
  }

  mediaTray.classList.remove('media-tray--empty');
  currentAttachments.forEach(att => {
    const el = document.createElement('div');
    el.className = 'media-item';

    const isImage = att.type.startsWith('image/');
    if (isImage) {
      el.innerHTML = `<img src="${att.url}" alt="${att.name}" loading="lazy" />`;
    } else {
      el.innerHTML = `
        <div class="file-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
      `;
    }

    // Delete Badge
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-badge';
    delBtn.innerHTML = '&times;';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAttachment(att);
    });

    el.appendChild(delBtn);
    el.addEventListener('click', () => openLightbox(att));
    mediaTray.appendChild(el);
  });
}

async function deleteAttachment(attachment) {
  if (!confirm('Remove this attachment?')) return;

  try {
    const fileRef = ref(storage, attachment.storagePath);
    await deleteObject(fileRef);
    currentAttachments = currentAttachments.filter(a => a.id !== attachment.id);
    renderMediaTray();
    showToast('Attachment removed.', 'success');
  } catch (err) {
    console.error('[Delete] Storage error:', err);
    // Even if storage fails (maybe already gone), update local UI
    currentAttachments = currentAttachments.filter(a => a.id !== attachment.id);
    renderMediaTray();
  }
}

/**
 * ─────────────────────────────────────────────
 * LIGHTBOX LOGIC
 * ─────────────────────────────────────────────
 */

function openLightbox(att) {
  if (!att.type.startsWith('image/')) {
    window.open(att.url, '_blank');
    return;
  }

  lightboxImg.src = att.url;
  lightboxCaption.textContent = `${att.name} (${(att.size / 1024).toFixed(1)} KB)`;
  lightboxOverlay.classList.remove('hidden');
  lightboxOverlay.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  lightboxOverlay.classList.add('hidden');
  lightboxOverlay.setAttribute('aria-hidden', 'true');
  lightboxImg.src = '';
}

closeLightboxBtn.addEventListener('click', closeLightbox);
lightboxOverlay.addEventListener('click', (e) => {
  if (e.target === lightboxOverlay) closeLightbox();
});

/**
 * ─────────────────────────────────────────────
 * SMART FOLDER SUGGESTIONS
 * ─────────────────────────────────────────────
 */

noteTitle.addEventListener('input', updateSmartSuggestions);

function updateSmartSuggestions() {
  const title = noteTitle.value.toLowerCase();
  smartSuggestions.classList.add('hidden');

  if (!title || editingNoteId) return; // Only for new notes

  const rules = [
    { keywords: ['meeting', 'sync', 'standup', 'call'], folder: 'Work' },
    { keywords: ['buy', 'shop', 'grocery', 'list'], folder: 'Personal' },
    { keywords: ['idea', 'brainstorm', 'think'], folder: 'Ideas' }
  ];

  const match = rules.find(r => r.keywords.some(k => title.includes(k)));

  if (match) {
    const targetFolder = allFolders.find(f => f.name.toLowerCase() === match.folder.toLowerCase());
    if (targetFolder) {
      smartSuggestions.innerHTML = `
        <span>Suggest moving to <strong>${targetFolder.name}</strong>?</span>
        <button class="suggestion-btn" id="apply-suggestion-btn">Apply</button>
      `;
      smartSuggestions.classList.remove('hidden');

      const applyBtn = document.getElementById('apply-suggestion-btn');
      if (applyBtn) {
        applyBtn.onclick = () => {
          noteFolder.value = targetFolder.id;
          smartSuggestions.classList.add('hidden');
          showToast(`Moved to ${targetFolder.name}`, 'success');
        };
      }
    }
  }
}

/**
 * ─────────────────────────────────────────────
 * VERSION HISTORY LOGIC
 * ─────────────────────────────────────────────
 */

historyToggleBtn.addEventListener('click', () => {
  historyPanel.classList.toggle('hidden');
  if (!historyPanel.classList.contains('hidden')) {
    loadNoteHistory();
  }
});

closeHistoryBtn.addEventListener('click', () => historyPanel.classList.add('hidden'));

function loadNoteHistory() {
  if (!editingNoteId || !currentUser) {
    versionList.innerHTML = '<div class="palette-group-title">No history for new notes</div>';
    return;
  }

  versionList.innerHTML = '<div class="palette-group-title">Loading history...</div>';

  if (unsubscribeVersions) unsubscribeVersions();

  unsubscribeVersions = subscribeToVersions(currentUser.uid, editingNoteId, (versions) => {
    renderVersionList(versions);
  });
}

function renderVersionList(versions) {
  versionList.innerHTML = '';
  if (versions.length === 0) {
    versionList.innerHTML = '<div class="palette-group-title">No snapshots yet</div>';
    return;
  }

  versions.forEach(v => {
    const el = document.createElement('div');
    el.className = 'version-item';
    const date = v.updatedAt?.toDate().toLocaleString() || 'Recent';

    el.innerHTML = `
      <div class="version-date">${date}</div>
      <div class="version-preview">${escapeHtml(v.content)}</div>
    `;

    el.onclick = () => {
      if (confirm('Restore this version? Your current unsaved changes will be overwritten.')) {
        noteContent.value = v.content;
        historyPanel.classList.add('hidden');
        showToast('Version restored. Don\'t forget to save!', 'success');
      }
    };

    versionList.appendChild(el);
  });
}

// ─────────────────────────────────────────────
// Register Service Worker
// ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[App] Service Worker registered');

        // Controlled update UX:
        // - detect a waiting SW
        // - ask user to refresh
        // - only then trigger skipWaiting and reload on controllerchange
        let updateAccepted = false;

        function showUpdateBanner(sw) {
          if (!sw) return;
          if (document.getElementById('pwa-update-banner')) return;

          const banner = document.createElement('div');
          banner.id = 'pwa-update-banner';
          banner.className = 'pwa-update-banner';
          banner.setAttribute('role', 'status');
          banner.setAttribute('aria-live', 'polite');

          banner.innerHTML = `
            <div class="pwa-update-banner__content">
              <span class="pwa-update-banner__text">New version available.</span>
              <div class="pwa-update-banner__actions">
                <button type="button" class="pwa-update-banner__btn pwa-update-banner__btn--secondary" data-action="dismiss">Later</button>
                <button type="button" class="pwa-update-banner__btn pwa-update-banner__btn--primary" data-action="refresh">Refresh</button>
              </div>
            </div>
          `;

          banner.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');

            if (action === 'dismiss') {
              banner.remove();
              return;
            }

            if (action === 'refresh') {
              updateAccepted = true;
              // Ask the waiting worker to activate now.
              sw.postMessage({ type: 'SKIP_WAITING' });
              btn.disabled = true;
              btn.textContent = 'Refreshing…';
            }
          });

          document.body.appendChild(banner);
          setTimeout(() => banner.classList.add('visible'), 50);
        }

        // If there's already a waiting worker (e.g. user opened a tab after an update finished),
        // surface it immediately.
        if (reg.waiting && navigator.serviceWorker.controller) {
          showUpdateBanner(reg.waiting);
        }

        // Listen for updates (installing -> installed -> waiting)
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // A new SW is installed but waiting to activate (until we call skipWaiting).
              showUpdateBanner(installingWorker);
            }
          });
        });

        // Once the new SW activates and takes control, reload only if the user opted in.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!updateAccepted) return;
          window.location.reload();
        });
      })
      .catch((err) => console.warn('[App] SW registration failed:', err));
  });
}

// ─────────────────────────────────────────────
// Global Tracking: Copy & Paste
// ─────────────────────────────────────────────
document.addEventListener('copy', () => {
  logAnalyticsEvent('copy_action', { 
    page: currentUser ? 'Dashboard' : 'Auth',
    text_length: window.getSelection().toString().length 
  });
});

document.addEventListener('paste', () => {
  logAnalyticsEvent('paste_action', { 
    page: currentUser ? 'Dashboard' : 'Auth'
  });
});

