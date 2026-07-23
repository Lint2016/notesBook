/**
 * ============================================================================
 * FILE OVERVIEW: db.js
 * ============================================================================
 * Purpose:
 * Handles all Firestore database operations for Notes and Folders.
 * This includes CRUD operations and real-time listeners.
 * 
 * Where it fits in the application:
 * Acts as the Data Access Object (DAO) layer for the application data.
 * Called by UI components to mutate data, and by app.js to set up listeners.
 * 
 * Dependencies:
 * - firebase-config.js (Firestore instance and Analytics)
 * - Firebase Firestore SDK (For all queries and writes)
 * 
 * Architecture Note:
 * Notes and Folders are stored per-user under:
 * /users/{uid}/notes/{noteId}
 * /users/{uid}/folders/{folderId}
 * This hierarchical structure guarantees data isolation. Users can never 
 * read each other's data, which aligns perfectly with Firestore Security Rules.
 * ============================================================================
 */

import { db, logAnalyticsEvent } from './firebase-config.js';
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

// ----------------------------------------------------
// Purpose:
// Generates the Firestore collection reference for a specific user's notes.
//
// Why:
// Reusability. Prevents typing out the path ('users', uid, 'notes') 
// repeatedly and risking typos.
// ----------------------------------------------------
function notesRef(uid) {
  return collection(db, 'users', uid, 'notes');
}

// ----------------------------------------------------
// Purpose:
// Generates the Firestore collection reference for a specific user's folders.
// ----------------------------------------------------
function foldersRef(uid) {
  return collection(db, 'users', uid, 'folders');
}


// ----------------------------------------------------
// Purpose:
// Creates a new note document in Firestore.
//
// Expected Inputs:
// - uid: The logged-in user's ID.
// - noteData: Object containing title, content, folderId, etc.
//
// Async Operations:
// - addDoc (Firestore write)
// ----------------------------------------------------
export async function addNote(uid, noteData) {
  const docRef = await addDoc(notesRef(uid), {
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
  logAnalyticsEvent('create_note', { category: noteData.category || 'General' });
  return docRef;
}


// ----------------------------------------------------
// Purpose:
// Updates an existing note. Optionally saves the previous state to a 
// history subcollection before applying the update.
//
// Why:
// The version history feature allows users to recover accidental deletions
// or track changes over time.
//
// Expected Inputs:
// - skipVersion: A flag to disable version history saving for minor edits (like pinning).
//
// Async Operations:
// - saveVersion (Custom Firestore write to subcollection)
// - updateDoc (Firestore write to main document)
// ----------------------------------------------------
export async function updateNote(uid, noteId, noteData, skipVersion = false) {
  const ref = doc(db, 'users', uid, 'notes', noteId);
  
  // If we are not skipping versioning, save a snapshot of the current state before updating
  if (!skipVersion && noteData.content) {
    await saveVersion(uid, noteId, {
      content: noteData.content,
      updatedAt: new Date()
    });
  }

  const updateResult = await updateDoc(ref, {
    title: noteData.title.trim() || 'Untitled',
    content: noteData.content.trim(),
    category: noteData.category || 'General',
    folderId: noteData.folderId || null,
    reminder: noteData.reminder || null,
    attachments: noteData.attachments || [],
    updatedAt: serverTimestamp()
  });
  logAnalyticsEvent('update_note');
  return updateResult;
}

// ----------------------------------------------------
// Purpose:
// Saves a snapshot of a note's content into a 'versions' subcollection.
//
// Why:
// Implements the note history feature. Stored in a subcollection so it 
// doesn't bloat the main note document read operations.
// ----------------------------------------------------
export async function saveVersion(uid, noteId, versionData) {
  const versionsColl = collection(db, 'users', uid, 'notes', noteId, 'versions');
  return addDoc(versionsColl, {
    content: versionData.content,
    updatedAt: serverTimestamp()
  });
}

// ----------------------------------------------------
// Purpose:
// Listens to the version history for a specific note in real-time.
// ----------------------------------------------------
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


// ----------------------------------------------------
// Purpose:
// Permanently deletes a single note from Firestore.
// ----------------------------------------------------
export async function deleteNote(uid, noteId) {
  const ref = doc(db, 'users', uid, 'notes', noteId);
  const deleteResult = await deleteDoc(ref);
  logAnalyticsEvent('delete_note');
  return deleteResult;
}

// ----------------------------------------------------
// Purpose:
// Flips the boolean 'pinned' flag on a note.
//
// Why:
// Separated from updateNote so we can easily toggle this status without 
// triggering a version history save.
// ----------------------------------------------------
export async function togglePin(uid, noteId, currentPinnedStatus) {
  const ref = doc(db, 'users', uid, 'notes', noteId);
  return updateDoc(ref, {
    pinned: !currentPinnedStatus,
    updatedAt: serverTimestamp() // We update this to respect sorting if needed, or keep it the same
  });
}

// ----------------------------------------------------
// Purpose:
// Establishes a real-time WebSocket connection to a user's notes collection.
// Whenever a note is added, modified, or deleted by the user (even on 
// another device), this listener fires.
//
// Why:
// Real-time updates eliminate the need for manual refresh buttons and 
// ensure the UI is always perfectly synced with the backend.
//
// Execution Flow:
// 1. App sets up this listener on login.
// 2. Firebase returns an initial snapshot of all notes.
// 3. Callback fires, state updates, UI renders.
// 4. On any subsequent change, Firebase sends a delta, callback fires again.
//
// Returns:
// A function that, when called, terminates the listener.
// ----------------------------------------------------
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

// ----------------------------------------------------
// Purpose:
// Creates a new folder document.
// ----------------------------------------------------
export async function addFolder(uid, name, parentId = null) {
  const docRef = await addDoc(foldersRef(uid), {
    name: name.trim(),
    parentId,
    createdAt: serverTimestamp()
  });
  logAnalyticsEvent('create_folder');
  return docRef;
}

// ----------------------------------------------------
// Purpose:
// Deletes a folder document. Note: This does not cascade to notes inside it 
// (which must be handled by the UI or Cloud Functions).
// ----------------------------------------------------
export async function deleteFolder(uid, folderId) {
  const ref = doc(db, 'users', uid, 'folders', folderId);
  const deleteResult = await deleteDoc(ref);
  logAnalyticsEvent('delete_folder');
  return deleteResult;
}

// ----------------------------------------------------
// Purpose:
// Real-time listener for the user's folders.
// ----------------------------------------------------
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

