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
import { 
  addNote, updateNote, deleteNote, subscribeToNotes, togglePin,
  addFolder, deleteFolder, subscribeToFolders 
} from './db.js';


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
const searchClearBtn  = document.getElementById('search-clear-btn');
const sidebar         = document.getElementById('sidebar');
const sidebarToggle   = document.getElementById('sidebar-toggle');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const folderList      = document.getElementById('folder-list');
const addFolderBtn    = document.getElementById('add-folder-btn');
const navItems        = document.querySelectorAll('.nav-item');



// Modal
const modalBackdrop  = document.getElementById('modal-backdrop');
const noteCategory   = document.getElementById('note-category');
const noteFolder     = document.getElementById('note-folder');
const reminderBtn    = document.getElementById('reminder-btn');
const exportPdfBtn   = document.getElementById('export-pdf-btn');
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
let unsubscribeFolders = null;
let editingNoteId     = null;   // null = new note, string = edit mode
let allNotes          = [];     // Full local copy for search
let allFolders        = [];
let currentCategory   = 'all';  // Active filter category
let currentFolderId   = 'all';  // 'all', 'pinned', or folderId
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
    checkReminders(notes);
  });

  // Subscribe to folders
  unsubscribeFolders = subscribeToFolders(user.uid, (folders) => {
    allFolders = folders;
    renderFolders(folders);
  });
}

function showAuth() {
  appSection.classList.add('hidden');
  authSection.classList.remove('hidden');

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
  saveNoteBtn.disabled = false;
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

  try {
    if (editingNoteId) {
      await updateNote(currentUser.uid, editingNoteId, { title, content, category, folderId, reminder });
      showToast('Note updated ✓', 'success');
    } else {
      await addNote(currentUser.uid, { title, content, category, folderId, reminder });
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
// Register Service Worker
// ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('[App] Service Worker registered'))
      .catch((err) => console.warn('[App] SW registration failed:', err));
  });
}

