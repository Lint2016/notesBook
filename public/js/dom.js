/**
 * dom.js
 * Centralizes all DOM element queries.
 */

// Views
export const authSection  = document.getElementById('auth-section');
export const appSection   = document.getElementById('app-section');

// Auth
export const tabLogin     = document.getElementById('tab-login');
export const tabSignup    = document.getElementById('tab-signup');
export const loginForm    = document.getElementById('login-form');
export const signupForm   = document.getElementById('signup-form');
export const loginError   = document.getElementById('login-error');
export const signupError  = document.getElementById('signup-error');
export const forgotForm   = document.getElementById('forgot-form');
export const forgotError  = document.getElementById('forgot-error');
export const forgotSuccess = document.getElementById('forgot-success');

export const linkForgotPassword = document.getElementById('link-forgot-password');
export const linkBackToLogin    = document.getElementById('link-back-to-login');
export const frontExplainerBtn  = document.getElementById('front-explainer-btn');

// Dashboard
export const dynamicGreeting = document.getElementById('dynamic-greeting');
export const greetingName    = document.getElementById('greeting-name');
export const notesList       = document.getElementById('notes-list');
export const notesCountBadge = document.getElementById('notes-count');
export const searchInput     = document.getElementById('search-input');
export const fabBtn          = document.getElementById('fab-btn');
export const logoutBtn       = document.getElementById('logout-btn');
export const deleteAccountBtn = document.getElementById('delete-account-btn');
export const installBtn      = document.getElementById('install-btn');
export const paletteToggleBtn = document.getElementById('palette-toggle-btn');
export const headerHelpBtn   = document.getElementById('header-help-btn');
export const categoryFilters = document.getElementById('category-filters');
export const searchClearBtn  = document.getElementById('search-clear-btn');
export const sidebar         = document.getElementById('sidebar');
export const sidebarToggle   = document.getElementById('sidebar-toggle');
export const sidebarBackdrop = document.getElementById('sidebar-backdrop');
export const folderList      = document.getElementById('folder-list');
export const addFolderBtn    = document.getElementById('add-folder-btn');
export const sidebarExplainerBtn = document.getElementById('sidebar-explainer-btn');
export const navItems        = document.querySelectorAll('.nav-item');

// Modal
export const modalBackdrop  = document.getElementById('modal-backdrop');
export const modalTitle     = document.getElementById('modal-title');
export const noteTitle      = document.getElementById('note-title');
export const noteCategory   = document.getElementById('note-category');
export const noteFolder     = document.getElementById('note-folder');

export const reminderBtn    = document.getElementById('reminder-btn');
export const exportPdfBtn   = document.getElementById('export-pdf-btn');
export const micBtn         = document.getElementById('mic-btn');
export const attachBtn      = document.getElementById('attach-btn');
export const attachmentInput = document.getElementById('attachment-input');
export const mediaTray      = document.getElementById('media-tray');

export const noteContent    = document.getElementById('note-content');
export const saveNoteBtn    = document.getElementById('save-note-btn');
export const closeModalBtn  = document.getElementById('close-modal-btn');
export const cancelModalBtn = document.getElementById('cancel-modal-btn');

export const historyToggleBtn = document.getElementById('history-toggle-btn');
export const historyPanel     = document.getElementById('history-panel');
export const closeHistoryBtn  = document.getElementById('close-history-btn');
export const versionList      = document.getElementById('version-list');
export const smartSuggestions = document.getElementById('smart-suggestions');

// Command Palette
export const paletteOverlay = document.getElementById('command-palette-overlay');
export const paletteInput   = document.getElementById('palette-input');
export const paletteResults = document.getElementById('palette-results');

// Preview & Guide
export const editTab         = document.getElementById('edit-tab');
export const previewTab      = document.getElementById('preview-tab');
export const notePreviewArea = document.getElementById('note-preview');

export const guideModal      = document.getElementById('guide-modal-backdrop');
export const showGuideBtn    = document.getElementById('show-guide-btn');
export const closeGuideBtn   = document.getElementById('close-guide-btn');
export const gotItBtn        = document.getElementById('got-it-btn');

// Toast Container
export const toastContainer = document.getElementById('toast-container');

// Lightbox
export const lightboxOverlay  = document.getElementById('lightbox-overlay');
export const closeLightboxBtn = document.getElementById('close-lightbox-btn');
export const lightboxImg      = document.getElementById('lightbox-img');
export const lightboxCaption  = document.getElementById('lightbox-caption');

// Support Modal
export const supportModal      = document.getElementById('support-modal-backdrop');
export const showSupportBtn    = document.getElementById('show-support-btn');
export const closeSupportBtn   = document.getElementById('close-support-btn');
export const cancelSupportBtn  = document.getElementById('cancel-support-btn');
export const supportForm       = document.getElementById('support-form');
export const submitSupportBtn  = document.getElementById('submit-support-btn');
export const supportError      = document.getElementById('support-error');

// Video Modal
export const videoModalBackdrop = document.getElementById('video-modal-backdrop');
export const closeVideoBtn = document.getElementById('close-video-btn');
export const explainerIframe = document.getElementById('explainer-iframe');
