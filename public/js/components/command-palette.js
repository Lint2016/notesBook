/**
 * components/command-palette.js
 * Handles the Command Palette (Ctrl+K) search and actions.
 */

import { state } from '../state.js';
import { paletteOverlay, paletteInput, paletteResults, sidebarToggle, logoutBtn } from '../dom.js';
import { escapeHtml } from '../utils/ui.js';
import { openModal } from './editor.js';
import { toggleGuide } from './support-modal.js';

const APP_ACTIONS = [
  { id: 'new-note', title: 'New Note', desc: 'Create a blank note', icon: 'plus' },
  { id: 'show-guide', title: 'User Guide', desc: 'Learn how to use NoteBook', icon: 'help' },
  { id: 'go-all', title: 'All Notes', desc: 'View all your notes', icon: 'home' },
  { id: 'go-pinned', title: 'Pinned Notes', desc: 'View your pinned notes', icon: 'pin' },
  { id: 'toggle-sidebar', title: 'Toggle Sidebar', desc: 'Show/hide folder navigation', icon: 'menu' },
  { id: 'logout', title: 'Logout', desc: 'Sign out of NoteBook', icon: 'log-out' }
];

export function setupCommandPalette() {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      togglePalette();
    }

    if (!state.isPaletteOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      togglePalette(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.paletteSelectedIndex = (state.paletteSelectedIndex + 1) % state.paletteItems.length;
      updatePaletteSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.paletteSelectedIndex = (state.paletteSelectedIndex - 1 + state.paletteItems.length) % state.paletteItems.length;
      updatePaletteSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (state.paletteItems[state.paletteSelectedIndex]) {
        executePaletteItem(state.paletteItems[state.paletteSelectedIndex]);
      }
    }
  });

  paletteInput.addEventListener('input', renderPaletteResults);

  paletteOverlay.addEventListener('click', (e) => {
    if (e.target === paletteOverlay) togglePalette(true);
  });
}

export function togglePalette(forceClose = false) {
  state.isPaletteOpen = forceClose ? false : !state.isPaletteOpen;
  paletteOverlay.classList.toggle('hidden', !state.isPaletteOpen);
  paletteOverlay.setAttribute('aria-hidden', !state.isPaletteOpen);

  if (state.isPaletteOpen) {
    paletteInput.value = '';
    state.paletteSelectedIndex = 0;
    renderPaletteResults();
    setTimeout(() => paletteInput.focus(), 100);
  }
}

function renderPaletteResults() {
  const query = paletteInput.value.toLowerCase().trim();
  state.paletteItems = [];

  const filteredActions = APP_ACTIONS.filter(a => 
    a.title.toLowerCase().includes(query) || a.desc.toLowerCase().includes(query)
  );
  
  const filteredNotes = state.allNotes.filter(n => 
    n.title.toLowerCase().includes(query) || (n.content || '').toLowerCase().includes(query)
  ).slice(0, 10);

  paletteResults.innerHTML = '';

  if (filteredActions.length > 0) {
    const group = document.createElement('div');
    group.className = 'palette-group-title';
    group.textContent = 'Actions';
    paletteResults.appendChild(group);

    filteredActions.forEach(action => {
      state.paletteItems.push({ type: 'action', ...action });
      paletteResults.appendChild(createPaletteItem(action, 'action'));
    });
  }

  if (filteredNotes.length > 0) {
    const group = document.createElement('div');
    group.className = 'palette-group-title';
    group.textContent = 'Notes';
    paletteResults.appendChild(group);

    filteredNotes.forEach(note => {
      state.paletteItems.push({ type: 'note', ...note });
      paletteResults.appendChild(createPaletteItem(note, 'note'));
    });
  }

  if (state.paletteItems.length === 0) {
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

  el.innerHTML = \`
    <div class="palette-item-icon">\${iconHtml}</div>
    <div class="palette-item-info">
      <span class="palette-item-title">\${escapeHtml(item.title)}</span>
      <span class="palette-item-desc">\${escapeHtml(item.desc || (item.content ? item.content.substring(0, 40) + '...' : 'No content'))}</span>
    </div>
  \`;

  el.addEventListener('click', () => executePaletteItem(item));
  return el;
}

function updatePaletteSelection() {
  const elements = paletteResults.querySelectorAll('.palette-item');
  elements.forEach((el, i) => {
    el.classList.toggle('selected', i === state.paletteSelectedIndex);
    if (i === state.paletteSelectedIndex) el.scrollIntoView({ block: 'nearest' });
  });
}

function executePaletteItem(item) {
  togglePalette(true); // Close first

  if (item.type === 'action') {
    switch (item.id) {
      case 'new-note': openModal('new'); break;
      case 'show-guide': toggleGuide(true); break;
      case 'go-all': 
        state.currentFolderId = 'all';
        document.querySelector('[data-nav="all"]')?.click();
        break;
      case 'go-pinned':
        state.currentFolderId = 'pinned';
        document.querySelector('[data-nav="pinned"]')?.click();
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
