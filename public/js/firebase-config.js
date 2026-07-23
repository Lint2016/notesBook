/**
 * ============================================================================
 * FILE OVERVIEW: firebase-config.js
 * ============================================================================
 * Purpose:
 * Initializes the Firebase application using the v10 modular SDK.
 * Configures all required Firebase services: Auth, Firestore, Storage, Analytics.
 * 
 * Where it fits in the application:
 * This is the foundational infrastructure file. Every other file that interacts 
 * with the database, authentication, or storage must import their respective 
 * instances from here.
 * 
 * Dependencies:
 * - Firebase SDK (app, auth, firestore, storage, analytics)
 * ============================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPooDJXx4Qzjl4yorspa4RNv-pNrIKNdI",
  authDomain: "notesbook-3d7fc.firebaseapp.com",
  projectId: "notesbook-3d7fc",
  storageBucket: "notesbook-3d7fc.firebasestorage.app",
  messagingSenderId: "451528609781",
  appId: "1:451528609781:web:7b17c5d981b4b2c7cf1abc",
  measurementId: "G-KLK5C3M0FQ"
};

// Initialize the core Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

/**
 * Initialize Firestore with persistent offline cache.
 * - persistentLocalCache: uses IndexedDB to cache data offline
 * - persistentMultipleTabManager: safely shares the cache across browser tabs
 *   (removes the old "failed-precondition" multi-tab limitation)
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize Firebase Analytics
export const analytics = getAnalytics(app);

// ----------------------------------------------------
// Purpose:
// Helper to log custom events to Firebase Analytics.
//
// Why:
// Centralizes the analytics logging so we can easily swap analytics providers 
// or disable tracking in development mode without hunting down every logEvent call.
// ----------------------------------------------------
export function logAnalyticsEvent(eventName, params = {}) {
  logEvent(analytics, eventName, params);
}

/**
 * ============================================================================
 * END OF FILE SUMMARY
 * ============================================================================
 * Summary:
 * firebase-config.js successfully initializes the Firebase backend services, 
 * specifically enabling multi-tab offline persistence for Firestore.
 * 
 * Common mistakes developers may make:
 * - Hardcoding new Firebase credentials here for different environments (e.g. dev/prod) 
 *   instead of using environment variables or a build process.
 * - Importing the entire 'firebase' compat library instead of the specific modular 
 *   functions, which severely inflates the JS bundle size.
 * 
 * Possible improvements:
 * - Implement logic to detect 'localhost' and connect to the Firebase Local Emulator 
 *   Suite for safe local development.
 * 
 * Security considerations:
 * - While the apiKey is exposed here (which is standard and required for Firebase Web), 
 *   it means security strictly relies on Firestore Security Rules, not obscuring this key. 
 *   Ensure the apiKey is restricted by domain in the Google Cloud Console.
 * ============================================================================
 */
