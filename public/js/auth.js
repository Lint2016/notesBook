/**
 * auth.js
 * Handles Firebase Authentication:
 * - Email/Password Sign-Up (with username stored to Firestore)
 * - Email/Password Sign-In
 * - Google OAuth Sign-In / Sign-Up
 * - Sign-Out
 * - onAuthStateChanged listener
 */

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Sign up a new user.
 * - Creates an auth account
 * - Updates the Firebase Auth displayName
 * - Stores user profile (username, email) in Firestore under /users/{uid}
 *
 * @param {string} username - Display name chosen by the user
 * @param {string} email
 * @param {string} password
 * @returns {Promise<UserCredential>}
 */
export async function signUp(username, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Set the display name on the Auth profile
  await updateProfile(user, { displayName: username });

  // Persist user profile to Firestore for dashboard use
  await setDoc(doc(db, 'users', user.uid), {
    username,
    email,
    createdAt: serverTimestamp()
  });

  return credential;
}

/**
 * Sign in an existing user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<UserCredential>}
 */
export async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Send a password reset email.
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Sign out the current user.
 * @returns {Promise<void>}
 */
export async function logOut() {
  return signOut(auth);
}

/**
 * Sign in (or sign up) using Google OAuth via a popup.
 * - On first login: creates a Firestore user profile automatically.
 * - On subsequent logins: leaves the existing profile untouched.
 * @returns {Promise<UserCredential>}
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  // Hint the account picker to always show (even if 1 account is cached)
  provider.setCustomParameters({ prompt: 'select_account' });

  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  // Only write a Firestore profile on the very first Google sign-in
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      username: user.displayName || user.email.split('@')[0],
      email: user.email,
      createdAt: serverTimestamp(),
      provider: 'google'
    });
  }

  return credential;
}

/**
 * Delete the user's account — full GDPR-compliant wipe.
 *
 * Order of operations (critical):
 *   1. Re-authenticate (Firebase requirement for sensitive operations)
 *   2. Batch-delete all notes + folders subcollections
 *   3. Delete the /users/{uid} profile document
 *   4. Delete the Firebase Auth account
 *
 * Deleting data BEFORE the auth account is essential — once the auth
 * account is gone, Firestore Security Rules deny all further writes.
 *
 * @param {User}   user     - The currently signed-in Firebase user object
 * @param {string} password - Required only for email/password users; null for Google users
 * @returns {Promise<void>}
 */
export async function deleteAccount(user, password = null) {
  // ── Step 1: Re-authenticate ──────────────────────────────────────
  const isGoogle = user.providerData.some(p => p.providerId === 'google.com');

  if (isGoogle) {
    const provider = new GoogleAuthProvider();
    await reauthenticateWithPopup(user, provider);
  } else {
    if (!password) throw new Error('Password is required for email accounts.');
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }

  // ── Step 2: Batch-delete all user data ──────────────────────────
  const uid = user.uid;
  const [notesSnap, foldersSnap] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'notes')),
    getDocs(collection(db, 'users', uid, 'folders'))
  ]);

  const batch = writeBatch(db);
  notesSnap.forEach(d   => batch.delete(d.ref));
  foldersSnap.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db, 'users', uid));   // Profile document
  await batch.commit();

  // ── Step 3: Delete the Firebase Auth account ─────────────────────
  await deleteUser(user);
}

/**
 * Listen to authentication state changes.
 * Calls the provided callback with the user object (or null).
 * @param {function} callback - Receives (user | null)
 */
export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}
