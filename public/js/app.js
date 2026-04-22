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

import { signUp, signIn, logOut, onAuthChange } from './auth.js';
import { addNote, updateNote, deleteNote, subscribeToNotes, togglePin } from './db.js';

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

// Dashboard
const greetingName    = document.getElementById('greeting-name');
const notesList       = document.getElementById('notes-list');
const notesCountBadge = document.getElementById('notes-count');
const searchInput     = document.getElementById('search-input');
const fabBtn          = document.getElementById('fab-btn');
const logoutBtn       = document.getElementById('logout-btn');
const installBtn      = document.getElementById('install-btn');
const categoryFilters = document.getElementById('category-filters');

// Modal
const modalBackdrop  = document.getElementById('modal-backdrop');
const modalTitle     = document.getElementById('modal-title');
const noteTitle      = document.getElementById('note-title');
const noteCategory   = document.getElementById('note-category');
const micBtn         = document.getElementById('mic-btn');
const noteContent    = document.getElementById('note-content');
const saveNoteBtn    = document.getElementById('save-note-btn');
const closeModalBtn  = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let currentUser       = null;
let unsubscribeNotes  = null;   // Firestore listener cleanup
let editingNoteId     = null;   // null = new note, string = edit mode
let allNotes          = [];     // Full local copy for search
let currentCategory   = 'all';  // Active filter category
let isListening       = false;  // Voice capture state
let recognition       = null;   // SpeechRecognition instance

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
// View Switching
// ─────────────────────────────────────────────
function showApp(user) {
  authSection.classList.add('hidden');
  appSection.classList.remove('hidden');

  // Display username from Firestore displayName
  const name = user.displayName || user.email.split('@')[0];
  greetingName.textContent = name;

  // Show skeleton while first load fires
  renderSkeletons(3);

  // Subscribe to real-time notes
  unsubscribeNotes = subscribeToNotes(user.uid, (notes) => {
    allNotes = notes;
    applyFilters();
  });
}

function showAuth() {
  appSection.classList.add('hidden');
  authSection.classList.remove('hidden');

  // Stop Firestore listener
  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }

  allNotes = [];
}

// ─────────────────────────────────────────────
// Auth Tab Switching
// ─────────────────────────────────────────────
tabLogin.addEventListener('click', () => switchTab('login'));
tabSignup.addEventListener('click', () => switchTab('signup'));

function switchTab(tab) {
  const isLogin = tab === 'login';
  tabLogin.classList.toggle('active', isLogin);
  tabSignup.classList.toggle('active', !isLogin);
  loginForm.classList.toggle('hidden', !isLogin);
  signupForm.classList.toggle('hidden', isLogin);
  loginError.classList.add('hidden');
  signupError.classList.add('hidden');
}

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
  const submitBtn = loginForm.querySelector('.btn-primary');

  setLoading(submitBtn, true, 'Signing in…');
  try {
    await signIn(email, password);
  } catch (err) {
    showFormError(loginError, friendlyAuthError(err.code));
    setLoading(submitBtn, false, 'Sign In');
  }
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

  notes.forEach((note) => {
    const card = createNoteCard(note);
    notesList.appendChild(card);
  });
}

function createNoteCard(note) {
  const card = document.createElement('article');
  card.className = `note-card ${note.pinned ? 'pinned' : ''}`;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Note: ${note.title}`);

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
  applyFilters();
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
    
    return matchesSearch && matchesCategory;
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
  saveNoteBtn.disabled = false;
  modalBackdrop.classList.remove('hidden');
  setTimeout(() => noteTitle.focus(), 120);
}


function closeModal() {
  modalBackdrop.classList.add('hidden');
  editingNoteId = null;
  noteTitle.value    = '';
  noteCategory.value = 'General';
  noteContent.value  = '';
}

saveNoteBtn.addEventListener('click', async () => {
  const title    = noteTitle.value.trim();
  const content  = noteContent.value.trim();
  const category = noteCategory.value;

  if (!content && !title) {
    showToast('Please add a title or content.', 'error');
    return;
  }

  saveNoteBtn.disabled = true;
  saveNoteBtn.textContent = 'Saving…';

  try {
    if (editingNoteId) {
      await updateNote(currentUser.uid, editingNoteId, { title, content, category });
      showToast('Note updated ✓', 'success');
    } else {
      await addNote(currentUser.uid, { title, content, category });
      showToast('Note created ✓', 'success');
    }
    closeModal();
  } catch {
    showToast('Failed to save note. Try again.', 'error');
    saveNoteBtn.disabled = false;
    saveNoteBtn.textContent = 'Save Note';
  }
});

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
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        noteContent.value += (noteContent.value ? ' ' : '') + event.results[i][0].transcript;
      }
    }
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
 */
function parseMarkdown(text = '', alreadyEscaped = false) {
  if (!text) return '';
  
  let html = alreadyEscaped ? text : escapeHtml(text);

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
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

/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * @param {string} code - Firebase Auth error code
 */
function friendlyAuthError(code) {
  const map = {
    'auth/email-already-in-use'      : 'This email is already registered.',
    'auth/invalid-email'             : 'Please enter a valid email address.',
    'auth/weak-password'             : 'Password must be at least 6 characters.',
    'auth/user-not-found'            : 'No account found with this email.',
    'auth/wrong-password'            : 'Incorrect password. Please try again.',
    'auth/too-many-requests'         : 'Too many attempts. Please try again later.',
    'auth/invalid-credential'        : 'Invalid email or password.',
    'auth/network-request-failed'    : 'Network error. Check your connection.',
  };
  return map[code] || 'An unexpected error occurred. Please try again.';
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
// Register Service Worker
// ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('[App] Service Worker registered'))
      .catch((err) => console.warn('[App] SW registration failed:', err));
  });
}
