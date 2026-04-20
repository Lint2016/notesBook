/**
 * auth.js
 * Handles Firebase Authentication:
 * - Email/Password Sign-Up (with username stored to Firestore)
 * - Email/Password Sign-In
 * - Sign-Out
 * - onAuthStateChanged listener
 */

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  setDoc,
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
 * Sign out the current user.
 * @returns {Promise<void>}
 */
export async function logOut() {
  return signOut(auth);
}

/**
 * Listen to authentication state changes.
 * Calls the provided callback with the user object (or null).
 * @param {function} callback - Receives (user | null)
 */
export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}
