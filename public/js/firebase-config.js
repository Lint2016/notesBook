/**
 * firebase-config.js
 *
 * Initializes Firebase using the modern SDK v10 modular API.
 * Offline persistence uses initializeFirestore with persistentLocalCache —
 * the recommended v10+ approach (replaces the deprecated enableIndexedDbPersistence).
 *
 * persistentMultipleTabManager() allows persistence across multiple open tabs,
 * whereas the old API threw a 'failed-precondition' error in that case.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
