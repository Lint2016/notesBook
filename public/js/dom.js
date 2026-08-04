/**
 * ============================================================================
 * FILE OVERVIEW: dom.js
 * ============================================================================
 * Purpose:
 * Centralizes all DOM element queries (document.getElementById) into a single 
 * file.
 * 
 * Where it fits in the application:
 * Imported by almost every other UI component and utility script. By keeping 
 * all DOM queries here, we avoid "magic strings" scattered throughout the 
 * codebase and ensure that if an HTML ID changes, we only need to update it here.
 * 
 * Dependencies:
 * - index.html (Expects these IDs to exist in the markup)
 * ============================================================================
 */

// ----------------------------------------------------
// Section: Views
// Purpose: Main container elements used to toggle between the logged-out 
// authentication screen and the logged-in application dashboard.
// ----------------------------------------------------
// Views
export const authSection  = document.getElementById('auth-section');
export const appSection   = document.getElementById('app-section');

// ----------------------------------------------------
// Section: Auth
// Purpose: DOM elements related to the login, signup, and password reset forms.
// ----------------------------------------------------
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
export const langSelectAuth     = document.getElementById('lang-select-auth');
export const langSelectHeader   = document.getElementById('lang-select-header');

// ----------------------------------------------------
// Section: Dashboard
// Purpose: Core UI elements for the main application interface (header, sidebar, 
// search, and floating action buttons).
// ----------------------------------------------------
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

// ----------------------------------------------------
// Section: Modal & Editor
// Purpose: Elements inside the note creation/editing modal, including inputs, 
// formatting buttons, and the version history panel.
// ----------------------------------------------------
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

// ----------------------------------------------------
// Section: Command Palette
// Purpose: Elements for the keyboard-accessible quick command menu (Cmd/Ctrl + K).
// ----------------------------------------------------
// Command Palette
export const paletteOverlay = document.getElementById('command-palette-overlay');
export const paletteInput   = document.getElementById('palette-input');
export const paletteResults = document.getElementById('palette-results');

// ----------------------------------------------------
// Section: Preview & Guide
// Purpose: Elements for toggling Markdown preview mode and showing the app guide.
// ----------------------------------------------------
// Preview & Guide
export const editTab         = document.getElementById('edit-tab');
export const previewTab      = document.getElementById('preview-tab');
export const notePreviewArea = document.getElementById('note-preview');

export const guideModal      = document.getElementById('guide-modal-backdrop');
export const showGuideBtn    = document.getElementById('show-guide-btn');
export const closeGuideBtn   = document.getElementById('close-guide-btn');
export const gotItBtn        = document.getElementById('got-it-btn');

// ----------------------------------------------------
// Section: Globals & Modals
// Purpose: Miscellaneous overlay elements like toast notifications, lightboxes 
// for images, and support/video modals.
// ----------------------------------------------------
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

// ----------------------------------------------------
// Section: Developer Contact Modal
// Purpose: Elements for the "Built by LintEdge" contact form on the auth page.
// ----------------------------------------------------
export const builtByBtn            = document.getElementById('built-by-btn');
export const contactDevModal       = document.getElementById('contact-dev-modal-backdrop');
export const closeContactDevBtn    = document.getElementById('close-contact-dev-btn');
export const cancelContactDevBtn   = document.getElementById('cancel-contact-dev-btn');
export const contactDevForm        = document.getElementById('contact-dev-form');
export const submitContactDevBtn   = document.getElementById('submit-contact-dev-btn');
export const contactDevError       = document.getElementById('contact-dev-error');


/**
 * ============================================================================
 * END OF FILE SUMMARY
 * ============================================================================
 * Summary:
 * dom.js acts as a static registry of all interactive HTML elements.
 * 
 * Common mistakes developers may make:
 * - Querying the DOM directly inside a component (e.g., using `document.querySelector` 
 *   inside editor.js) instead of adding the element export here.
 * - Changing an ID in index.html and forgetting to update it here, causing `null` errors.
 * 
 * Possible improvements:
 * - If the app grows to have multiple pages or dynamically injected HTML, relying 
 *   solely on static `getElementById` on boot might fail if elements don't exist yet. 
 *   Consider a getter pattern or Shadow DOM references for dynamic components.
 * 
 * Performance considerations:
 * - Caching all these elements upfront on page load is extremely fast and saves 
 *   subsequent DOM traversal time during user interactions.
 * ============================================================================
 */
