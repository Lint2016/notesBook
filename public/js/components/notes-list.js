/**
 * components/notes-list.js
 * Handles rendering notes, the search filter logic, and note interactions (pin, delete, checklist).
 */

import { state } from '../state.js';
import { notesList, notesCountBadge, searchInput, searchClearBtn } from '../dom.js';
import { highlightText, escapeHtml, showToast } from '../utils/ui.js';
import { togglePin, deleteNote, updateNote } from '../db.js';
import { openModal } from './editor.js';

export function setupNotesList() {
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

  // Checklist interactivity
  notesList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('checklist-checkbox')) {
      e.stopPropagation();
      const card = e.target.closest('.note-card');
      const noteId = card.querySelector('.card-action-btn.edit').dataset.id;
      const note = state.allNotes.find(n => n.id === noteId);
      
      const index = Array.from(card.querySelectorAll('.checklist-checkbox')).indexOf(e.target);
      const lines = note.content.split('\\n');
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
        await updateNote(state.currentUser.uid, noteId, { ...note, content: newLines.join('\\n') });
      } catch {
        showToast('Failed to update checklist', 'error');
        e.target.checked = !e.target.checked; // Revert
      }
    }
  });
}

export function applyFilters() {
  const q = searchInput.value.toLowerCase().trim();
  
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

export function renderNotes(notes) {
  notesList.innerHTML = '';
  notesCountBadge.textContent = \`\${notes.length} note\${notes.length !== 1 ? 's' : ''}\`;

  if (notes.length === 0) {
    notesList.innerHTML = \`
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <h3>No notes yet</h3>
        <p>Tap the + button below to create your first note.</p>
      </div>\`;
    return;
  }

  notes.forEach((note, index) => {
    const card = createNoteCard(note, index);
    notesList.appendChild(card);
  });
}

function createNoteCard(note, index = 0) {
  const card = document.createElement('article');
  card.className = \`note-card \${note.pinned ? 'pinned' : ''}\`;
  card.style.setProperty('--delay', \`\${index * 0.05}s\`);
  card.setAttribute('role', 'button');
  card.setAttribute('draggable', 'true');

  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', \`Note: \${note.title}\`);

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

  card.innerHTML = \`
    <div class="note-card-header">
      <div class="note-card-title-wrap">
        <span class="note-category-pill \${category.toLowerCase()}">\${category}</span>
        <h3 class="note-card-title">\${highlightText(note.title, query)}</h3>
      </div>
      <div class="note-card-actions">
        <button class="card-action-btn pin \${note.pinned ? 'active' : ''}" aria-label="Toggle pin" data-id="\${note.id}" title="\${note.pinned ? 'Unpin' : 'Pin'}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v7l5 3 5-3v-7h2a2 2 0 0 0 2-2z"/>
          </svg>
        </button>
        <button class="card-action-btn edit" aria-label="Edit note" data-id="\${note.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="card-action-btn delete" aria-label="Delete note" data-id="\${note.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="note-card-preview">\${parseMarkdown(highlightText(note.content || 'No content', query), true)}</div>
    \${note.reminder ? \`<div class="reminder-badge" title="Reminder set">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span>\${formatReminder(note.reminder)}</span>
    </div>\` : ''}
    <footer class="note-card-footer">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      \${timeLabel}
    </footer>\`;

  card.addEventListener('click', (e) => {
    if (!e.target.closest('.card-action-btn')) openModal('edit', note);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.target.closest('.card-action-btn')) openModal('edit', note);
  });

  card.querySelector('.edit').addEventListener('click', (e) => {
    e.stopPropagation();
    openModal('edit', note);
  });

  card.querySelector('.pin').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePin(state.currentUser.uid, note.id, note.pinned)
      .catch(() => showToast('Failed to toggle pin', 'error'));
  });

  card.querySelector('.delete').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDelete(note.id, note.title);
  });

  return card;
}

function confirmDelete(noteId, noteTitle) {
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = \`
    <div class="confirm-box">
      <h4>Delete Note</h4>
      <p>Are you sure you want to delete "<strong>\${escapeHtml(noteTitle)}</strong>"? This cannot be undone.</p>
      <div class="confirm-actions">
        <button class="btn-confirm-cancel" id="confirm-cancel-btn">Cancel</button>
        <button class="btn-confirm-delete" id="confirm-delete-btn">Delete</button>
      </div>
    </div>\`;

  document.body.appendChild(dialog);

  dialog.querySelector('#confirm-cancel-btn').addEventListener('click', () => dialog.remove());
  dialog.querySelector('#confirm-delete-btn').addEventListener('click', async () => {
    dialog.remove();
    try {
      await deleteNote(state.currentUser.uid, noteId);
      showToast('Note deleted.', 'success');
    } catch {
      showToast('Failed to delete note.', 'error');
    }
  });
}

export function renderSkeletons(count) {
  notesList.innerHTML = Array.from({ length: count })
    .map(() => \`<div class="skeleton-card skeleton"></div>\`)
    .join('');
}

export function parseMarkdown(text = '', alreadyEscaped = false) {
  if (!text) return '';
  let html = alreadyEscaped ? text : escapeHtml(text);
  html = html.replace(/\\[ \\]\\s(.*$)/gm, '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox"><span class="checklist-text">$1</span></div>');
  html = html.replace(/\\[x\\]\\s(.*$)/gm, '<div class="checklist-item"><input type="checkbox" class="checklist-checkbox" checked><span class="checklist-text">$1</span></div>');
  html = html.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
  html = html.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  html = html.replace(/\`(.*?)\`/g, '<code>$1</code>');
  html = html.replace(/^# (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>');
  html = html.replace(/<\\/ul><ul>/g, '');
  html = html.replace(/\\n/g, '<br>');
  return html;
}

export function formatTimestamp(ts) {
  if (!ts) return 'Just now';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export function formatReminder(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

export function checkReminders(notes) {
  const now = new Date();
  notes.forEach(note => {
    if (note.reminder) {
      const remDate = new Date(note.reminder);
      if (remDate > now && remDate - now < 60000) {
        setTimeout(() => {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("NoteBook Reminder", { body: note.title });
          } else {
            showToast(\`Reminder: \${note.title}\`, 'success');
          }
        }, remDate - now);
      }
    }
  });
}
