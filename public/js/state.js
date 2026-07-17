/**
 * state.js
 * Centralized application state.
 */

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
  
  // Command Palette State
  isPaletteOpen: false,
  paletteSelectedIndex: 0,
  paletteItems: []
};
