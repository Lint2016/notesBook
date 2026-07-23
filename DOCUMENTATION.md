# NoteBook Architecture & Developer Documentation

Welcome to the NoteBook project! This document provides a high-level overview of the application architecture, design patterns, and deployment strategy to help new developers onboard quickly.

## Tech Stack Overview

NoteBook is built as a pure Vanilla JavaScript Single Page Application (SPA) with a serverless backend.

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6 Modules)
- **Backend & Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth (Email/Password & Google OAuth)
- **Storage**: Firebase Storage (For file/image attachments)
- **Hosting**: Firebase Hosting

We intentionally avoid complex frontend frameworks (like React or Vue) or bundlers (like Webpack or Vite) to keep the project lightweight and simple to understand for beginners.

## Core Design Patterns

### 1. The Singleton State Pattern (`state.js`)
Instead of prop-drilling or complex state management libraries, we use a single, mutable `state` object.
- **How it works:** `state.js` exports a single object. Other components import it to read/write properties like `state.currentUser` or `state.allNotes`.
- **Caveat:** Because it's not reactive, modifying `state` does not automatically update the DOM. If you add a note to `state.allNotes`, you must explicitly call `renderNotes()` to see the change.

### 2. The DOM Registry (`dom.js`)
To avoid scattering `document.getElementById` and `document.querySelector` throughout the codebase, all DOM element queries are centralized in `dom.js`.
- **Benefit:** If an ID or class changes in `index.html`, you only have to update it in one place.
- **Usage:** Import the needed element (e.g., `import { saveNoteBtn } from './dom.js';`).

### 3. Separation of Concerns
The JavaScript logic is split into three main layers:
- **UI/Components (`components/*.js`)**: Handles DOM events, input validation, and rendering (e.g., `editor.js`, `sidebar.js`).
- **Data Access (`db.js`, `auth.js`)**: The *only* files that communicate directly with Firebase. The UI components call these functions.
- **Utility (`utils/*.js`)**: Pure functions that have no side effects (e.g., escaping HTML, formatting dates).

## Data Flow & Lifecycle

1. **Initialization (`app.js`)**: The application boots. It sets up Firebase Auth listeners.
2. **Authentication**: If a user is found, `app.js` initializes the UI components (Command Palette, Sidebar, Editor).
3. **Data Fetching**: `db.js` opens real-time WebSockets (listeners) to Firestore. When data changes on the server, the listener fires, updates `state.allNotes`, and triggers `renderNotes()`.
4. **Offline Support**: Firestore's `persistentLocalCache` is enabled. If the device goes offline, queries run against the local IndexedDB cache, and writes are queued until connection is restored.

## Database Structure (Firestore)

The database is structured to ensure users can only access their own data, grouped by their Firebase Auth UID.

```text
/users/{uid} (Document)
  │
  ├── /notes (Collection)
  │     ├── {noteId} (Document: title, content, category, folderId, pinned, updatedAt)
  │     │     └── /versions (Subcollection: historical snapshots of the note)
  │     │
  │     └── {noteId2} ...
  │
  ├── /folders (Collection)
  │     ├── {folderId} (Document: name, createdAt)
  │     └── {folderId2} ...
```

## Security Rules

Because the backend is serverless, security is enforced directly at the database layer using Firebase Security Rules.
Client-side checks (like hiding the delete button) are for UX only, not security.

**Core Rule Principle:**
Users can only read and write documents where the path matches their authentication UID.

```javascript
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## Developer Guidelines

1. **Do not use `innerHTML` blindly**: To prevent Cross-Site Scripting (XSS), never pass user-generated content (like note titles or content) directly into `innerHTML` without passing it through `escapeHtml()` in `ui.js` first.
2. **Cleanup Listeners**: When a user logs out, you *must* call the unsubscribe functions returned by Firestore's `onSnapshot()` to prevent memory leaks and permission errors. (See `auth.js` -> `logout()`).
3. **Keep it Vanilla**: Resist the urge to add heavy NPM packages. The goal of this repo is zero build steps.
