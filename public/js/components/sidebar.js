/**
 * ============================================================================
 * FILE OVERVIEW: sidebar.js
 * ============================================================================
 * Purpose:
 * Manages the left-hand navigation sidebar. This includes the mobile toggle, 
 * rendering dynamic folders, handling Drag and Drop events (for moving notes 
 * into folders), and category filtering.
 * 
 * Where it fits in the application:
 * Acts as the primary state manipulator for what is currently visible in the 
 * notes grid.
 * ============================================================================
 */

import { state } from '../state.js';
import { 
  sidebar, sidebarToggle, sidebarBackdrop, 
  navItems, folderList, addFolderBtn, noteFolder, categoryFilters
} from '../dom.js';
import { escapeHtml, showToast } from '../utils/ui.js';
import { addFolder, deleteFolder, updateNote } from '../db.js';
import { applyFilters } from './notes-list.js';

// ----------------------------------------------------
// Purpose:
// Binds static UI elements in the sidebar (mobile toggle, static nav items, 
// add folder button, and category chips).
// ----------------------------------------------------
export function setupSidebar() {
  sidebarToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarBackdrop.classList.toggle('hidden');
  });

  sidebarBackdrop?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.add('hidden');
  });

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      state.currentFolderId = item.dataset.nav;
      applyFilters();
      if (window.innerWidth < 1024) {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.add('hidden');
      }
    });
  });

  addFolderBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const name = prompt('Enter folder name:');
    if (name && name.trim()) {
      try {
        await addFolder(state.currentUser.uid, name);
        showToast('Folder created ✓');
      } catch {
        showToast('Failed to create folder', 'error');
      }
    }
  });

  categoryFilters?.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
    chip.classList.add('active');
    state.currentCategory = chip.dataset.category;
    applyFilters();
  });
}

// ----------------------------------------------------
// Purpose:
// Renders the user's custom folders into the sidebar and updates the 
// `<select>` dropdown in the editor modal.
// 
// Side effects:
// Sets up Drag and Drop listeners on the new folder elements so users 
// can drag note cards from the grid and drop them onto a folder to move them.
// ----------------------------------------------------
export function renderFolders(folders) {
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

  folderList.querySelectorAll('.folder-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      state.currentFolderId = item.dataset.nav;
      applyFilters();
      if (window.innerWidth < 1024) {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.add('hidden');
      }
    });

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
          const note = state.allNotes.find(n => n.id === noteId);
          await updateNote(state.currentUser.uid, noteId, { ...note, folderId: folderId === 'all' ? null : folderId });
          showToast('Note moved ✓');
        } catch {
          showToast('Failed to move note', 'error');
        }
      }
    });

    item.querySelector('.delete-folder-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this folder? Notes will NOT be deleted.')) {
        await deleteFolder(state.currentUser.uid, item.dataset.id);
        if (state.currentFolderId === item.dataset.id) {
          state.currentFolderId = 'all';
          document.querySelector('[data-nav="all"]')?.classList.add('active');
          applyFilters();
        }
      }
    });
  });

  const currentVal = noteFolder.value;
  noteFolder.innerHTML = '<option value="none">No Folder</option>' +
    folders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
  noteFolder.value = currentVal;
}

/**
 * ============================================================================
 * END OF FILE SUMMARY
 * ============================================================================
 * Summary:
 * sidebar.js handles the taxonomy and organization of notes, updating the 
 * global state (`state.currentFolderId`, `state.currentCategory`) and re-triggering 
 * the note list renderer.
 * 
 * Common mistakes developers may make:
 * - Forgetting to close the sidebar on mobile after a user clicks a folder 
 *   (handled by the `window.innerWidth < 1024` checks).
 * - Not updating the `noteFolder` dropdown in the editor when `renderFolders` runs.
 * 
 * Possible improvements:
 * - Folders are currently flat. If nested folders are requested, this logic 
 *   will need to be rewritten into a recursive tree renderer.
 * - The `prompt` for adding folders is synchronous and native. Replacing it 
 *   with a custom HTML modal would improve UX.
 * ============================================================================
 */
