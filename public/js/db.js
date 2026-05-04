/**
 * db.js
 * Handles all Firestore operations for Notes:
 * - Add Note
 * - Update Note
 * - Delete Note
 * - Real-time listener (onSnapshot) scoped to the authenticated user
 *
 * Architecture Note:
 *   Notes are stored per-user under:
 *   /users/{uid}/notes/{noteId}
 *   This guarantees data isolation — users can never read each other's notes.
 *   This Firestore path structure also maps cleanly to Security Rules.
 */

import { db } from './firebase-config.js';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Returns the Firestore collection reference for a user's notes.
 * @param {string} uid - Firebase Auth user ID
 * @returns {CollectionReference}
 */
function notesRef(uid) {
  return collection(db, 'users', uid, 'notes');
}

/**
 * Returns the Firestore collection reference for a user's folders.
 * @param {string} uid - Firebase Auth user ID
 * @returns {CollectionReference}
 */
function foldersRef(uid) {
  return collection(db, 'users', uid, 'folders');
}


/**
 * Add a new note for the authenticated user.
 * @param {string} uid
 * @param {object} noteData - { title, content, attachments }
 * @returns {Promise<DocumentReference>}
 */
export async function addNote(uid, noteData) {
  return addDoc(notesRef(uid), {
    title: noteData.title.trim() || 'Untitled',
    content: noteData.content.trim(),
    category: noteData.category || 'General',
    folderId: noteData.folderId || null,
    reminder: noteData.reminder || null,
    attachments: noteData.attachments || [], // Array of { url, name, size, type }
    pinned: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}


/**
 * Update an existing note.
 * @param {string} uid
 * @param {string} noteId
 * @param {object} noteData - { title, content, attachments }
 * @param {boolean} skipVersion - If true, don't save a version snapshot
 * @returns {Promise<void>}
 */
export async function updateNote(uid, noteId, noteData, skipVersion = false) {
  const ref = doc(db, 'users', uid, 'notes', noteId);
  
  // If we are not skipping versioning, save a snapshot of the current state before updating
  if (!skipVersion && noteData.content) {
    await saveVersion(uid, noteId, {
      content: noteData.content,
      updatedAt: new Date()
    });
  }

  return updateDoc(ref, {
    title: noteData.title.trim() || 'Untitled',
    content: noteData.content.trim(),
    category: noteData.category || 'General',
    folderId: noteData.folderId || null,
    reminder: noteData.reminder || null,
    attachments: noteData.attachments || [],
    updatedAt: serverTimestamp()
  });
}

/**
 * Save a version snapshot of a note.
 */
export async function saveVersion(uid, noteId, versionData) {
  const versionsColl = collection(db, 'users', uid, 'notes', noteId, 'versions');
  return addDoc(versionsColl, {
    content: versionData.content,
    updatedAt: serverTimestamp()
  });
}

/**
 * Get all versions of a note.
 */
export function subscribeToVersions(uid, noteId, callback) {
  const versionsColl = collection(db, 'users', uid, 'notes', noteId, 'versions');
  const q = query(versionsColl, orderBy('updatedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const versions = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(versions);
  });
}


/**
 * Delete a note.
 * @param {string} uid
 * @param {string} noteId
 * @returns {Promise<void>}
 */
export async function deleteNote(uid, noteId) {
  const ref = doc(db, 'users', uid, 'notes', noteId);
  return deleteDoc(ref);
}

/**
 * Toggle the pinned status of a note.
 * @param {string} uid
 * @param {string} noteId
 * @param {boolean} currentPinnedStatus
 * @returns {Promise<void>}
 */
export async function togglePin(uid, noteId, currentPinnedStatus) {
  const ref = doc(db, 'users', uid, 'notes', noteId);
  return updateDoc(ref, {
    pinned: !currentPinnedStatus,
    updatedAt: serverTimestamp() // We update this to respect sorting if needed, or keep it the same
  });
}

/**
 * Subscribe to real-time updates on the user's notes.
 * Notes are ordered by updatedAt descending (newest first).
 * Returns the unsubscribe function — call it on logout to stop listening.
 *
 * @param {string} uid
 * @param {function} callback - Receives an array of note objects
 * @returns {function} unsubscribe
 */
export function subscribeToNotes(uid, callback) {
  const q = query(notesRef(uid), orderBy('updatedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(notes);
  });
}

// ─────────────────────────────────────────────
// Folder Operations
// ─────────────────────────────────────────────

/**
 * Add a new folder.
 */
export async function addFolder(uid, name, parentId = null) {
  return addDoc(foldersRef(uid), {
    name: name.trim(),
    parentId,
    createdAt: serverTimestamp()
  });
}

/**
 * Delete a folder.
 */
export async function deleteFolder(uid, folderId) {
  const ref = doc(db, 'users', uid, 'folders', folderId);
  return deleteDoc(ref);
}

/**
 * Subscribe to folders.
 */
export function subscribeToFolders(uid, callback) {
  const q = query(foldersRef(uid), orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const folders = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(folders);
  });
}

