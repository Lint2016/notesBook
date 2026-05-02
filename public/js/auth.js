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
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
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
 * Listen to authentication state changes.
 * Calls the provided callback with the user object (or null).
 * @param {function} callback - Receives (user | null)
 */
export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}
