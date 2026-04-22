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
 * Add a new note for the authenticated user.
 * @param {string} uid
 * @param {object} noteData - { title, content }
 * @returns {Promise<DocumentReference>}
 */
export async function addNote(uid, noteData) {
  return addDoc(notesRef(uid), {
    title: noteData.title.trim() || 'Untitled',
    content: noteData.content.trim(),
    category: noteData.category || 'General',
    pinned: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/**
 * Update an existing note.
 * @param {string} uid
 * @param {string} noteId
 * @param {object} noteData - { title, content }
 * @returns {Promise<void>}
 */
export async function updateNote(uid, noteId, noteData) {
  const ref = doc(db, 'users', uid, 'notes', noteId);
  return updateDoc(ref, {
    title: noteData.title.trim() || 'Untitled',
    content: noteData.content.trim(),
    category: noteData.category || 'General',
    updatedAt: serverTimestamp()
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
