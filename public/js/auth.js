/**
 * ============================================================================
 * FILE OVERVIEW: auth.js
 * ============================================================================
 * Purpose:
 * Centralizes all Firebase Authentication logic and encapsulates the SDK calls.
 * 
 * Where it fits in the application:
 * Acts as the data layer for authentication. Called by UI components (like 
 * auth-ui.js) when users interact with login/signup forms, and by app.js for 
 * global session management.
 * 
 * Dependencies:
 * - firebase-config.js (Provides initialized auth and db instances)
 * - Firebase Auth SDK (Handles actual authentication)
 * - Firebase Firestore SDK (Handles storing user profiles)
 * 
 * Data Flow:
 * User Action (UI) -> auth.js (Function) -> Firebase SDK -> Firestore (Profile) -> Return Result to UI
 * ============================================================================
 */

import { auth, db, logAnalyticsEvent } from './firebase-config.js';
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
  linkWithCredential,
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

// ----------------------------------------------------
// Purpose:
// Registers a new user with an email and password, sets their display name, 
// and creates a profile document in Firestore.
//
// Why:
// Firebase Auth only stores basic credentials. We need a Firestore document 
// to store app-specific user settings, stats, and a guaranteed username.
//
// Expected Inputs:
// - username: User's chosen display name.
// - email: Valid email address.
// - password: Password (validated by Firebase).
//
// Async Operations:
// - createUserWithEmailAndPassword (Firebase Auth)
// - updateProfile (Firebase Auth)
// - setDoc (Firestore writes to /users/{uid})
// ----------------------------------------------------
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

  logAnalyticsEvent('sign_up', { method: 'email', uid: user.uid });

  return credential;
}

// ----------------------------------------------------
// Purpose:
// Authenticates an existing user via email and password.
//
// Why:
// Standard email login flow.
//
// Async Operations:
// - signInWithEmailAndPassword (Firebase Auth)
// ----------------------------------------------------
export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  logAnalyticsEvent('login', { method: 'email', uid: credential.user.uid });
  return credential;
}

// ----------------------------------------------------
// Purpose:
// Sends a password reset link to the user's email.
//
// Why:
// Essential recovery mechanism if a user forgets their password.
// ----------------------------------------------------
export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

// ----------------------------------------------------
// Purpose:
// Terminates the current user's session.
//
// Async Operations:
// - signOut (Firebase Auth)
// ----------------------------------------------------
export async function logOut() {
  logAnalyticsEvent('logout');
  return signOut(auth);
}

// ----------------------------------------------------
// Purpose:
// Handles Google OAuth sign-in via a popup window. Creates a Firestore 
// profile if this is the user's first time logging in.
//
// Why:
// Lowers the barrier to entry by allowing users to skip manual registration.
//
// Expected outputs:
// Returns an object containing the UserCredential and a boolean (isNewUser)
// so the UI knows if it needs to prompt for a backup password.
//
// Async Operations:
// - signInWithPopup (Firebase Auth)
// - getDoc (Checks if Firestore profile exists)
// - setDoc (Creates Firestore profile if missing)
// ----------------------------------------------------
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const isNewUser = !snap.exists();

  if (isNewUser) {
    await setDoc(userRef, {
      username: user.displayName || user.email.split('@')[0],
      email: user.email,
      createdAt: serverTimestamp(),
      provider: 'google'
    });
  }

  logAnalyticsEvent('login', { method: 'google', uid: user.uid, is_new_user: isNewUser });
  if (isNewUser) {
    logAnalyticsEvent('sign_up', { method: 'google', uid: user.uid });
  }

  return { credential, isNewUser };
}

// ----------------------------------------------------
// Purpose:
// Links an email and password to an existing Google-authenticated account.
//
// Why:
// If a user signs up with Google, they might later want to login with a 
// standard password on devices without Google accounts.
// ----------------------------------------------------
export async function linkEmailPassword(user, password) {
  const cred = EmailAuthProvider.credential(user.email, password);
  return linkWithCredential(user, cred);
}

// ----------------------------------------------------
// Purpose:
// Permanently deletes the user's account and all associated data.
//
// Why:
// Required for GDPR compliance and user privacy.
//
// Execution Flow:
// 1. Prompt user to re-authenticate (Firebase requires recent login for deletion).
// 2. Fetch all user notes and folders from Firestore.
// 3. Batch delete all documents to prevent orphaned data.
// 4. Delete the Firestore user profile.
// 5. Delete the Firebase Auth account.
//
// Important Variables:
// - batch: A Firestore writeBatch used to delete everything in a single atomic transaction.
//
// Async Operations:
// - reauthenticateWithPopup/Credential (Auth)
// - getDocs (Firestore read collections)
// - batch.commit() (Firestore atomic write)
// - deleteUser (Auth)
// ----------------------------------------------------
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

// ----------------------------------------------------
// Purpose:
// Wrapper around Firebase's onAuthStateChanged.
// ----------------------------------------------------
export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}

/**
 * ============================================================================
 * END OF FILE SUMMARY
 * ============================================================================
 * Summary:
 * auth.js abstracts the complexities of Firebase Authentication and couples it 
 * with our Firestore user profile management.
 * 
 * Common mistakes developers may make:
 * - Calling Firebase Auth functions directly in UI components instead of routing 
 *   them through this file.
 * - Changing the deleteAccount order of operations. Deleting the Auth account 
 *   before Firestore data will result in "Permission Denied" errors and orphaned data.
 * 
 * Possible improvements:
 * - Add support for Apple/GitHub OAuth providers.
 * - Centralize error mapping (e.g., converting 'auth/wrong-password' to user-friendly text) 
 *   within this file rather than in the UI components.
 * 
 * Security considerations:
 * - The deleteAccount function relies on the client correctly fetching and deleting 
 *   their subcollections. A more secure, enterprise-grade approach would be to trigger a 
 *   Firebase Cloud Function on account deletion to securely wipe data on the backend.
 * ============================================================================
 */
