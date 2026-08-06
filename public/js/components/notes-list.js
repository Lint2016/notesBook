/**
 * ============================================================================
 * FILE OVERVIEW: notes-list.js
 * ============================================================================
 * Purpose:
 * Renders the main grid of notes. Handles search filtering, folder filtering, 
 * Markdown parsing, and inline interactions (like toggling checklist items directly 
 * on the note card).
 * 
 * Where it fits in the application:
 * This is the primary view for the user's data. It takes the raw `allNotes` 
 * array from `state.js`, filters it based on the sidebar and search bar, and 
 * outputs DOM elements to the center of the screen.
 * ============================================================================
 */

import { state } from '../state.js';
import { notesList, notesCountBadge, searchInput, searchClearBtn } from '../dom.js';
import { highlightText, escapeHtml, showToast } from '../utils/ui.js';
import { t } from '../utils/i18n.js';
import { togglePin, deleteNote, updateNote, restoreNote } from '../db.js';
import { openModal } from './editor.js';

// ----------------------------------------------------
// Purpose:
// Binds listeners for the search bar and sets up event delegation for 
// clicks on the notes grid (specifically handling inline checklist toggling).
// ----------------------------------------------------
export function setupNotesList() {
  searchInput?.addEventListener('input', () => {
    searchClearBtn?.classList.toggle('visible', searchInput.value.length > 0);
    applyFilters();
  });

  searchClearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.classList.remove('visible');
    applyFilters();
    searchInput.focus();
  });

  notesList?.addEventListener('click', async (e) => {
    if (e.target.classList.contains('checklist-checkbox')) {
      e.stopPropagation();
      const card = e.target.closest('.note-card');
      const noteId = card?.querySelector('.card-action-btn.edit')?.dataset.id;
      if (!noteId) return;
      const note = state.allNotes.find(n => n.id === noteId);
      if (!note) return;

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
        await updateNote(state.currentUser.uid, noteId, { ...note, content: newLines.join('\n') });
      } catch {
        showToast('toast.saveFailed', 'error');
        e.target.checked = !e.target.checked;
      }
    }
  });
}

// ----------------------------------------------------
// Purpose:
// Core sorting and filtering engine.
// ----------------------------------------------------
export function applyFilters() {
  const q = searchInput?.value.toLowerCase().trim() || '';

  const filtered = state.allNotes.filter(n => {
    const matchesSearch = !q ||
      n.title.toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q);

    const matchesCategory = state.currentCategory === 'all' || n.category === state.currentCategory;

    let matchesFolder = true;
    if (state.currentFolderId === 'pinned') {
      matchesFolder = n.pinned;
    } else if (state.currentFolderId !== 'all') {
      matchesFolder = n.folderId === state.currentFolderId;
    }

    return matchesSearch && matchesCategory && matchesFolder;
  });

  filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
    const dateA = a.updatedAt?.toDate() || new Date(0);
    const dateB = b.updatedAt?.toDate() || new Date(0);
    return dateB - dateA;
  });

  renderNotes(filtered);
}

// ----------------------------------------------------
// Purpose:
// Clears the notes grid and populates it with new note cards. Shows an 
// empty state graphic if no notes match the filters.
// ----------------------------------------------------
export function renderNotes(notes) {
  notesList.innerHTML = '';
  notesCountBadge.textContent = `${notes.length} note${notes.length !== 1 ? 's' : ''}`;

  if (notes.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <h3>${escapeHtml(t('notes.emptyState'))}</h3>
        <p>${escapeHtml(t('notes.emptyStateDesc'))}</p>
      </div>`;
    return;
  }

  notes.forEach((note, index) => {
    notesList.appendChild(createNoteCard(note, index));
  });
}

// ----------------------------------------------------
// Purpose:
// Generates the DOM element for a single note card.
// ----------------------------------------------------
function createNoteCard(note, index = 0) {
  const card = document.createElement('article');
  card.className = `note-card ${note.pinned ? 'pinned' : ''}`;
  card.style.setProperty('--delay', `${index * 0.05}s`);
  card.setAttribute('role', 'button');
  card.setAttribute('draggable', 'true');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Note: ${note.title}`);

  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('noteId', note.id);
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));

  const timeLabel = formatTimestamp(note.updatedAt);
  const category  = note.category || 'General';
  const query     = searchInput?.value.toLowerCase().trim() || '';

  card.innerHTML = `
    <div class="note-card-header">
      <div class="note-card-title-wrap">
        <span class="note-category-pill ${category.toLowerCase()}">${category}</span>
        <h3 class="note-card-title">${highlightText(note.title, query)}</h3>
      </div>
      <div class="note-card-actions">
        <button class="card-action-btn pin ${note.pinned ? 'active' : ''}" aria-label="Toggle pin" data-id="${note.id}" title="${note.pinned ? t('notes.unpinned') : t('notes.pinned')}">
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
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="note-card-preview">${parseMarkdown(highlightText(note.content || '', query), true)}</div>
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

  card.addEventListener('click', (e) => {
    if (!e.target.closest('.card-action-btn')) openModal('edit', note);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.target.closest('.card-action-btn')) openModal('edit', note);
  });

  card.querySelector('.edit')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal('edit', note);
  });
  card.querySelector('.pin')?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePin(state.currentUser.uid, note.id, note.pinned)
      .catch(() => showToast('toast.saveFailed', 'error'));
  });
  card.querySelector('.delete')?.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDelete(note.id, note.title);
  });

  return card;
}

// ----------------------------------------------------
// Purpose:
// Shows a custom confirmation dialog before actually deleting a note 
// from Firestore.
// ----------------------------------------------------
function confirmDelete(noteId, noteTitle) {
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = `
    <div class="confirm-box">
      <h4>${escapeHtml(t('toast.deleteNoteConfirm'))}</h4>
      <p>"<strong>${escapeHtml(noteTitle)}</strong>"</p>
      <div class="confirm-actions">
        <button class="btn-confirm-cancel" id="confirm-cancel-btn">${escapeHtml(t('editor.cancelBtn'))}</button>
        <button class="btn-confirm-delete" id="confirm-delete-btn">${escapeHtml(t('toast.noteDeleted'))}</button>
      </div>
    </div>`;

  document.body.appendChild(dialog);
  dialog.querySelector('#confirm-cancel-btn')?.addEventListener('click', () => dialog.remove());
  dialog.querySelector('#confirm-delete-btn')?.addEventListener('click', async () => {
    dialog.remove();
    
    // Capture the note data before deletion so we can restore it if needed
    const noteData = state.allNotes.find(n => n.id === noteId);
    
    try {
      await deleteNote(state.currentUser.uid, noteId);
      
      if (noteData) {
        showToast('toast.noteDeleted', 'success', {}, 'UNDO', async () => {
          try {
            // Strip the 'id' field which was injected by the snapshot listener
            const { id, ...dataToRestore } = noteData;
            await restoreNote(state.currentUser.uid, noteId, dataToRestore);
          } catch (err) {
            console.error('Failed to restore note:', err);
            alert(`Restore failed: ${err.message || err}`);
            showToast('toast.saveFailed', 'error');
          }
        });
      } else {
        showToast('toast.noteDeleted', 'success');
      }
    } catch {
      showToast('toast.saveFailed', 'error');
    }
  });
}

// ----------------------------------------------------
// Purpose:
// Renders pulsing placeholder cards while data is being fetched from Firestore.
// ----------------------------------------------------
export function renderSkeletons(count) {
  notesList.innerHTML = Array.from({ length: count })
    .map(() => `<div class="skeleton-card skeleton"></div>`)
    .join('');
}

// ----------------------------------------------------
// Purpose:
// A lightweight, custom markdown parser using regex.
// ----------------------------------------------------
export function parseMarkdown(text = '', alreadyEscaped = false) {
  if (!text) return '';
  let html = alreadyEscaped ? text : escapeHtml(text);
  html = html.replace(/\[ \]\s(.*$)/gm, '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$1</span></div>');
  html = html.replace(/\[x\]\s(.*$)/gm, '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$1</span></div>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/^# (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>');
  html = html.replace(/<\/ul><ul>/g, '');
  html = html.replace(/\n/g, '<br>');
  return html;
}

// ----------------------------------------------------
// Purpose:
// Formats Firestore Timestamps into a human-readable string.
// ----------------------------------------------------
export function formatTimestamp(ts) {
  if (!ts) return 'Just now';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const locale = state.preferredLanguage === 'fr' ? 'fr-FR' : (state.preferredLanguage === 'es' ? 'es-ES' : 'en-US');
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

// ----------------------------------------------------
// Purpose:
// Formats raw reminder date strings for the UI.
// ----------------------------------------------------
export function formatReminder(dateStr) {
  try {
    const d = new Date(dateStr);
    const locale = state.preferredLanguage === 'fr' ? 'fr-FR' : (state.preferredLanguage === 'es' ? 'es-ES' : 'en-US');
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

// ----------------------------------------------------
// Purpose:
// Checks all loaded notes to see if any have a reminder set for the next minute.
// Triggers the Browser's native Notification API if permitted.
// ----------------------------------------------------
export function checkReminders(notes) {
  const now = new Date();
  notes.forEach(note => {
    if (note.reminder) {
      const remDate = new Date(note.reminder);
      if (remDate > now && remDate - now < 60000) {
        setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('NoteBook Reminder', { body: note.title });
          } else {
            showToast(`Reminder: ${note.title}`, 'success');
          }
        }, remDate - now);
      }
    }
  });
}

/**
 * ============================================================================
 * END OF FILE SUMMARY
 * ============================================================================
 * Summary:
 * notes-list.js acts as the presentation layer for the notes collection, combining 
 * filtering, sorting, and markdown rendering into a responsive grid.
 * 
 * Common mistakes developers may make:
 * - Modifying the `state.allNotes` array directly instead of letting Firestore 
 *   snapshot listeners update it.
 * - Changing the HTML structure of the note card without updating the event 
 *   delegation logic (e.g., `e.target.closest('.card-action-btn')`).
 * 
 * Possible improvements:
 * - The custom `parseMarkdown` function is fast but limited. If complex tables 
 *   or nested blocks are needed, replacing it with a robust library (like marked) 
 *   is recommended.
 * - For thousands of notes, rendering all DOM nodes at once causes lag. 
 *   Virtualization (rendering only the cards visible on screen) would vastly 
 *   improve performance.
 * ============================================================================
 */
