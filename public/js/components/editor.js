/**
 * components/editor.js
 * Centralizes the note editor modal, attachments, history, and voice input.
 */

import { state } from '../state.js';
import {
  fabBtn, closeModalBtn, cancelModalBtn, modalBackdrop,
  modalTitle, noteTitle, noteCategory, noteFolder, noteContent, notePreviewArea,
  saveNoteBtn, editTab, previewTab, reminderBtn, exportPdfBtn, micBtn,
  attachBtn, attachmentInput, mediaTray,
  lightboxOverlay, lightboxImg, lightboxCaption, closeLightboxBtn,
  smartSuggestions, historyToggleBtn, historyPanel, closeHistoryBtn, versionList
} from '../dom.js';
import { showToast, escapeHtml } from '../utils/ui.js';
import { updateNote, addNote, subscribeToVersions } from '../db.js';
import { parseMarkdown } from './notes-list.js';
import { storage } from '../firebase-config.js';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

let originalNoteContent = '';
let finalTranscriptAccumulator = '';

export function setupEditor() {
  fabBtn?.addEventListener('click', () => openModal('new'));
  closeModalBtn?.addEventListener('click', closeModal);
  cancelModalBtn?.addEventListener('click', closeModal);
  modalBackdrop?.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  saveNoteBtn?.addEventListener('click', async () => {
    const title    = noteTitle?.value.trim();
    const content  = noteContent?.value.trim();
    const category = noteCategory?.value;
    const folderId = noteFolder?.value === 'none' ? null : noteFolder?.value;
    const reminder = noteContent?.dataset.reminder || null;

    if (!content && !title) {
      showToast('Please add a title or content.', 'error');
      return;
    }

    if (saveNoteBtn) { saveNoteBtn.disabled = true; saveNoteBtn.textContent = 'Saving…'; }

    try {
      const noteData = { title, content, category, folderId, reminder, attachments: state.currentAttachments };

      if (state.editingNoteId) {
        await updateNote(state.currentUser.uid, state.editingNoteId, noteData);
        showToast('Note updated ✓', 'success');
      } else {
        await addNote(state.currentUser.uid, noteData);
        showToast('Note created ✓', 'success');
      }
      if (noteContent) delete noteContent.dataset.reminder;
      closeModal();
    } catch (err) {
      console.error(err);
      showToast('Failed to save note. Try again.', 'error');
      if (saveNoteBtn) { saveNoteBtn.disabled = false; saveNoteBtn.textContent = 'Save Note'; }
    }
  });

  editTab?.addEventListener('click', () => switchEditorTab('edit'));
  previewTab?.addEventListener('click', () => switchEditorTab('preview'));

  // Grammar Review button
  if (micBtn) {
    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'tool-btn';
    reviewBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
    reviewBtn.title = 'Review Grammar';
    reviewBtn.addEventListener('click', reviewGrammar);
    micBtn.parentNode.insertBefore(reviewBtn, micBtn);
  }

  attachBtn?.addEventListener('click', () => attachmentInput?.click());
  attachmentInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast('File too large. Max limit is 1MB.', 'error');
      attachmentInput.value = '';
      return;
    }
    handleAttachmentUpload(file);
  });

  closeLightboxBtn?.addEventListener('click', closeLightbox);
  lightboxOverlay?.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay) closeLightbox();
  });

  reminderBtn?.addEventListener('click', () => {
    const time = prompt('Enter reminder time (YYYY-MM-DD HH:MM) or leave blank to clear:', noteContent?.dataset.reminder || '');
    if (time === null) return;
    if (time === '') {
      if (noteContent) delete noteContent.dataset.reminder;
      showToast('Reminder cleared');
    } else {
      if (noteContent) noteContent.dataset.reminder = time;
      showToast('Reminder set ✓');
    }
  });

  exportPdfBtn?.addEventListener('click', () => window.print());
  noteTitle?.addEventListener('input', updateSmartSuggestions);

  historyToggleBtn?.addEventListener('click', () => {
    historyPanel?.classList.toggle('hidden');
    if (historyPanel && !historyPanel.classList.contains('hidden')) loadNoteHistory();
  });
  closeHistoryBtn?.addEventListener('click', () => historyPanel?.classList.add('hidden'));

  micBtn?.addEventListener('click', toggleListening);
}

export function openModal(mode, note = null) {
  state.editingNoteId = mode === 'edit' ? note.id : null;
  if (modalTitle) modalTitle.textContent = mode === 'edit' ? 'Edit Note' : 'New Note';
  if (noteTitle)    noteTitle.value    = note ? note.title    : '';
  if (noteCategory) noteCategory.value = note ? note.category : 'General';
  if (noteContent)  noteContent.value  = note ? note.content  : '';

  state.currentAttachments = note?.attachments ? [...note.attachments] : [];
  renderMediaTray();

  historyPanel?.classList.add('hidden');
  smartSuggestions?.classList.add('hidden');

  if (noteFolder) {
    if (note) {
      noteFolder.value = note.folderId || 'none';
    } else if (state.currentFolderId !== 'all' && state.currentFolderId !== 'pinned') {
      noteFolder.value = state.currentFolderId;
    } else {
      noteFolder.value = 'none';
    }
  }

  if (saveNoteBtn) saveNoteBtn.disabled = false;
  switchEditorTab('edit');
  modalBackdrop?.classList.remove('hidden');
  setTimeout(() => noteTitle?.focus(), 120);
}

function closeModal() {
  modalBackdrop?.classList.add('hidden');
  state.editingNoteId = null;
  if (noteTitle)    noteTitle.value    = '';
  if (noteCategory) noteCategory.value = 'General';
  if (noteFolder)   noteFolder.value   = 'none';
  if (noteContent)  noteContent.value  = '';
  if (notePreviewArea) notePreviewArea.innerHTML = '';

  state.currentAttachments = [];
  renderMediaTray();
  historyPanel?.classList.add('hidden');
  smartSuggestions?.classList.add('hidden');

  if (state.unsubscribeVersions) {
    state.unsubscribeVersions();
    state.unsubscribeVersions = null;
  }

  if (state.isListening) stopListening();
  state.recognition = null;
  originalNoteContent = '';
  finalTranscriptAccumulator = '';

  if (saveNoteBtn) { saveNoteBtn.disabled = false; saveNoteBtn.textContent = 'Save Note'; }
}

function switchEditorTab(tab) {
  const isEdit = tab === 'edit';
  editTab?.classList.toggle('active', isEdit);
  previewTab?.classList.toggle('active', !isEdit);
  noteContent?.classList.toggle('hidden', !isEdit);
  notePreviewArea?.classList.toggle('hidden', isEdit);
  if (!isEdit && notePreviewArea) {
    notePreviewArea.innerHTML = parseMarkdown(noteContent?.value || '');
  }
}

function reviewGrammar() {
  const text = noteContent?.value || '';
  const patterns = [
    { regex: /\bits\b(?=\s+\w+ing)/gi,                          suggestion: "it's" },
    { regex: /\bit's\b(?=\s+\w+\b\s+(?:own|color|name))/gi,   suggestion: "its"  },
    { regex: /\byour\b(?=\s+\w+ing)/gi,                        suggestion: "you're" },
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

async function handleAttachmentUpload(file) {
  if (!state.currentUser) return;

  const fileId = Date.now();
  const storageRef = ref(storage, `users/${state.currentUser.uid}/attachments/${state.editingNoteId || 'temp'}/${fileId}_${file.name}`);

  const mediaItem = createMediaPlaceholder(file.name, true);
  if (mediaTray) {
    if (mediaTray.querySelector('.media-tray-empty-msg')) {
      mediaTray.innerHTML = '';
      mediaTray.classList.remove('media-tray--empty');
    }
    mediaTray.appendChild(mediaItem);
  }

  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on('state_changed',
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      const bar = mediaItem.querySelector('.media-progress-bar');
      if (bar) bar.style.width = `${progress}%`;
    },
    (error) => {
      console.error('[Upload] Error:', error);
      showToast('Failed to upload attachment.', 'error');
      mediaItem.remove();
      if (state.currentAttachments.length === 0) renderMediaTray();
    },
    async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      const attachment = {
        id: fileId,
        name: file.name,
        url,
        size: file.size,
        type: file.type,
        storagePath: uploadTask.snapshot.ref.fullPath
      };
      state.currentAttachments.push(attachment);
      renderMediaTray();
      showToast('Attachment added!', 'success');
    }
  );
}

function createMediaPlaceholder(name, isUploading) {
  const el = document.createElement('div');
  el.className = `media-item ${isUploading ? 'uploading' : ''}`;
  el.innerHTML = `
    <div class="file-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
      </svg>
    </div>
    ${isUploading ? '<div class="media-progress"><div class="media-progress-bar"></div></div>' : ''}
  `;
  return el;
}

function renderMediaTray() {
  if (!mediaTray) return;
  mediaTray.innerHTML = '';
  if (state.currentAttachments.length === 0) {
    mediaTray.classList.add('media-tray--empty');
    mediaTray.innerHTML = '<p class="media-tray-empty-msg">No attachments yet. Tap the paperclip to add an image or PDF (max 1MB).</p>';
    return;
  }

  mediaTray.classList.remove('media-tray--empty');
  state.currentAttachments.forEach(att => {
    const el = document.createElement('div');
    el.className = 'media-item';

    const isImage = att.type.startsWith('image/');
    if (isImage) {
      el.innerHTML = `<img src="${att.url}" alt="${att.name}" loading="lazy" />`;
    } else {
      el.innerHTML = `
        <div class="file-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
      `;
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-badge';
    delBtn.innerHTML = '&times;';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteAttachment(att); });
    el.appendChild(delBtn);
    el.addEventListener('click', () => openLightbox(att));
    mediaTray.appendChild(el);
  });
}

async function deleteAttachment(attachment) {
  if (!confirm('Remove this attachment?')) return;
  try {
    const fileRef = ref(storage, attachment.storagePath);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('[Delete] Storage error (may already be deleted):', err.code);
  }
  state.currentAttachments = state.currentAttachments.filter(a => a.id !== attachment.id);
  renderMediaTray();
  showToast('Attachment removed.', 'success');
}

function openLightbox(att) {
  if (!att.type.startsWith('image/')) { window.open(att.url, '_blank'); return; }
  if (lightboxImg) lightboxImg.src = att.url;
  if (lightboxCaption) lightboxCaption.textContent = `${att.name} (${(att.size / 1024).toFixed(1)} KB)`;
  lightboxOverlay?.classList.remove('hidden');
  lightboxOverlay?.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  lightboxOverlay?.classList.add('hidden');
  lightboxOverlay?.setAttribute('aria-hidden', 'true');
  if (lightboxImg) lightboxImg.src = '';
}

function updateSmartSuggestions() {
  const title = noteTitle?.value.toLowerCase() || '';
  smartSuggestions?.classList.add('hidden');
  if (!title || state.editingNoteId) return;

  const rules = [
    { keywords: ['meeting', 'sync', 'standup', 'call'], folder: 'Work'     },
    { keywords: ['buy', 'shop', 'grocery', 'list'],     folder: 'Personal' },
    { keywords: ['idea', 'brainstorm', 'think'],         folder: 'Ideas'    }
  ];

  const match = rules.find(r => r.keywords.some(k => title.includes(k)));
  if (match) {
    const targetFolder = state.allFolders.find(f => f.name.toLowerCase() === match.folder.toLowerCase());
    if (targetFolder && smartSuggestions) {
      smartSuggestions.innerHTML = `
        <span>Suggest moving to <strong>${targetFolder.name}</strong>?</span>
        <button class="suggestion-btn" id="apply-suggestion-btn">Apply</button>
      `;
      smartSuggestions.classList.remove('hidden');
      document.getElementById('apply-suggestion-btn')?.addEventListener('click', () => {
        if (noteFolder) noteFolder.value = targetFolder.id;
        smartSuggestions.classList.add('hidden');
        showToast(`Moved to ${targetFolder.name}`, 'success');
      }, { once: true });
    }
  }
}

function loadNoteHistory() {
  if (!state.editingNoteId || !state.currentUser) {
    if (versionList) versionList.innerHTML = '<div class="palette-group-title">No history for new notes</div>';
    return;
  }
  if (versionList) versionList.innerHTML = '<div class="palette-group-title">Loading history...</div>';
  if (state.unsubscribeVersions) state.unsubscribeVersions();
  state.unsubscribeVersions = subscribeToVersions(state.currentUser.uid, state.editingNoteId, renderVersionList);
}

function renderVersionList(versions) {
  if (!versionList) return;
  versionList.innerHTML = '';
  if (versions.length === 0) {
    versionList.innerHTML = '<div class="palette-group-title">No snapshots yet</div>';
    return;
  }
  versions.forEach(v => {
    const el = document.createElement('div');
    el.className = 'version-item';
    const date = v.updatedAt?.toDate().toLocaleString() || 'Recent';
    el.innerHTML = `
      <div class="version-date">${date}</div>
      <div class="version-preview">${escapeHtml(v.content)}</div>
    `;
    el.onclick = () => {
      if (confirm("Restore this version? Your current unsaved changes will be overwritten.")) {
        if (noteContent) noteContent.value = v.content;
        historyPanel?.classList.add('hidden');
        showToast("Version restored. Don't forget to save!", 'success');
      }
    };
    versionList.appendChild(el);
  });
}

function initVoiceCapture() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { micBtn?.classList.add('hidden'); return; }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = true;
  state.recognition.interimResults = true;
  state.recognition.lang = 'en-US';

  state.recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscriptAccumulator += (finalTranscriptAccumulator ? ' ' : '') + transcript.trim();
      } else {
        interimTranscript += transcript;
      }
    }
    let newContent = originalNoteContent;
    const spokenSoFar = finalTranscriptAccumulator + (interimTranscript ? ' ' + interimTranscript : '');
    if (newContent && spokenSoFar && !newContent.endsWith(' ')) newContent += ' ';
    newContent += spokenSoFar;
    if (noteContent) noteContent.value = newContent;
  };

  state.recognition.onstart = () => {
    state.isListening = true;
    micBtn?.classList.add('listening');
    showToast('Listening...', 'success');
  };

  state.recognition.onend = () => {
    state.isListening = false;
    micBtn?.classList.remove('listening');
  };

  state.recognition.onerror = (event) => {
    if (event.error !== 'no-speech') showToast('Microphone error: ' + event.error, 'error');
    stopListening();
  };
}

function toggleListening() {
  if (!state.recognition) initVoiceCapture();
  if (!state.recognition) return;
  state.isListening ? stopListening() : startListening();
}

function startListening() {
  try {
    originalNoteContent = noteContent?.value || '';
    finalTranscriptAccumulator = '';
    state.recognition.start();
  } catch (err) {
    console.error('Speech recognition start failed', err);
  }
}

function stopListening() {
  state.recognition?.stop();
}
