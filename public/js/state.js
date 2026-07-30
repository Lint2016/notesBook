/**
 * ============================================================================
 * FILE OVERVIEW: state.js
 * ============================================================================
 * Purpose:
 * Defines a single, mutable global state object for the application.
 * 
 * Where it fits in the application:
 * Imported across UI components to share data (like the currently logged-in user, 
 * the list of loaded notes, or the ID of the note currently being edited) 
 * without having to pass data endlessly through function arguments.
 * ============================================================================
 */

// ----------------------------------------------------
// Section: Global State Object
// Purpose: Holds all runtime data for the application.
// 
// Important Variables:
// - currentUser: The Firebase Auth user object. If null, the user is logged out.
// - allNotes / allFolders: Local caches of the Firestore data. Used for searching/filtering.
// - unsubscribeNotes / unsubscribeFolders: Functions returned by Firestore onSnapshot 
//   listeners. We must call these on logout to stop listening and prevent memory leaks.
// - editingNoteId: The ID of the note currently open in the modal (null if creating a new note).
// - currentCategory / currentFolderId: The currently active filters in the sidebar.
// - isListening / recognition: State for the Web Speech API (voice to text).
// ----------------------------------------------------
export const state = {
  currentUser: null,
  unsubscribeNotes: null,
  unsubscribeFolders: null,
  editingNoteId: null,
  allNotes: [],
  allFolders: [],
  currentCategory: 'all',
  currentFolderId: 'all',
  isListening: false,
  recognition: null,
  currentAttachments: [],
  unsubscribeVersions: null,
  
  // Internationalization State
  preferredLanguage: localStorage.getItem('notebook_language') || 'en',

  // Command Palette State
  isPaletteOpen: false,
  paletteSelectedIndex: 0,
  paletteItems: []
};

/**
 * ============================================================================
 * END OF FILE SUMMARY
 * ============================================================================
 * Summary:
 * state.js provides a simple, singleton pattern for state management.
 * 
 * Common mistakes developers may make:
 * - Mutating the state object directly but forgetting to call the corresponding 
 *   UI rendering functions (e.g., `state.allNotes.push(note)` without calling `renderNotes()`).
 * 
 * Possible improvements:
 * - If the application grows significantly, this simple mutable object could lead to 
 *   hard-to-trace bugs. Consider implementing a predictable state container 
 *   (like Redux or a Proxy-based reactive state store like Vue's reactive/MobX) 
 *   where mutations automatically trigger UI updates.
 * ============================================================================
 */
