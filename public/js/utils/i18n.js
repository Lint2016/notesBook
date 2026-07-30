/**
 * ============================================================================
 * FILE OVERVIEW: i18n.js
 * ============================================================================
 * Purpose:
 * Provides internationalization (i18n) dictionary and translation utilities 
 * for English (en), French (fr), and Spanish (es).
 * 
 * Includes:
 * - Dynamic dictionary lookup with parameter interpolation.
 * - Language state synchronization with localStorage & Firestore.
 * - DOM scanner (applyLanguageUI) for translating data-i18n elements.
 * - Speech-to-Text BCP-47 locale mapping.
 * ============================================================================
 */

import { state } from '../state.js';

export const translations = {
  en: {
    // Brand & App
    'app.title': 'NoteBook — Your Private Notes',
    'app.tagline': 'Your private notes, anywhere.',
    'app.watchExplainer': 'Watch Explainer',
    
    // Auth Tabs & Form
    'auth.signIn': 'Sign In',
    'auth.createAccount': 'Create Account',
    'auth.emailLabel': 'Email',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.passwordLabel': 'Password',
    'auth.passwordPlaceholder': 'Your password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.continueGoogle': 'Continue with Google',
    'auth.orEmail': 'or continue with email',
    'auth.usernameLabel': 'Username',
    'auth.usernamePlaceholder': 'Your display name',
    'auth.resetPasswordTitle': 'Reset Password',
    'auth.resetPasswordDesc': 'Enter your email address and we will send you a password reset link.',
    'auth.sendResetLink': 'Send Reset Link',
    'auth.backToSignIn': 'Back to Sign In',
    
    // Auth Toasts & Errors
    'auth.errorEnterEmail': 'Please enter your email.',
    'auth.resetEmailSent': 'Password reset email sent! Check your inbox.',
    'auth.welcomeBack': 'Welcome back, {name}!',
    'auth.accountCreated': 'Account created successfully!',
    'auth.loggedOut': 'Logged out successfully.',

    // Navigation & Sidebar
    'nav.allNotes': 'All Notes',
    'nav.categories': 'Categories',
    'nav.general': 'General',
    'nav.work': 'Work',
    'nav.personal': 'Personal',
    'nav.ideas': 'Ideas',
    'nav.folders': 'Folders',
    'nav.newFolder': 'New Folder',
    'nav.support': 'Support & Feedback',
    'nav.signOut': 'Sign Out',
    'nav.searchPlaceholder': 'Search notes...',

    // Editor Modal
    'editor.newNote': 'New Note',
    'editor.editNote': 'Edit Note',
    'editor.titlePlaceholder': 'Note Title...',
    'editor.contentPlaceholder': 'Write your note here (Markdown supported)...',
    'editor.editTab': 'Edit',
    'editor.previewTab': 'Preview',
    'editor.saveBtn': 'Save Note',
    'editor.saving': 'Saving…',
    'editor.cancelBtn': 'Cancel',
    'editor.historyTitle': 'Version History',
    'editor.noHistory': 'No snapshots yet',
    'editor.noHistoryNew': 'No history for new notes',
    'editor.loadingHistory': 'Loading history...',
    'editor.restoreConfirm': 'Restore this version? Your current unsaved changes will be overwritten.',
    'editor.versionRestored': 'Version restored. Don\'t forget to save!',

    // Toasts & Sweet Alerts
    'toast.noteCreated': 'Note created ✓',
    'toast.noteUpdated': 'Note updated ✓',
    'toast.noteDeleted': 'Note deleted.',
    'toast.saveFailed': 'Failed to save note. Try again.',
    'toast.enterTitleOrContent': 'Please add a title or content.',
    'toast.fileTooLarge': 'File too large. Max limit is 1MB.',
    'toast.attachmentAdded': 'Attachment added!',
    'toast.attachmentRemoved': 'Attachment removed.',
    'toast.removeAttachmentConfirm': 'Remove this attachment?',
    'toast.listening': 'Listening...',
    'toast.micError': 'Microphone error: {error}',
    'toast.noGrammarErrors': 'No common errors found! ✓',
    'toast.grammarHint': 'Hint: Check "{suggestion}" usage',
    'toast.folderCreated': 'Folder "{name}" created ✓',
    'toast.folderDeleted': 'Folder deleted.',
    'toast.deleteFolderConfirm': 'Delete folder "{name}"? Notes inside will not be deleted.',
    'toast.deleteNoteConfirm': 'Are you sure you want to delete this note?',
    'toast.reminderSet': 'Reminder set ✓',
    'toast.reminderCleared': 'Reminder cleared',

    // Greetings
    'greeting.morning': 'Good morning',
    'greeting.afternoon': 'Good afternoon',
    'greeting.evening': 'Good evening',

    // Notes List
    'notes.emptyState': 'No notes found',
    'notes.emptyStateDesc': 'Create your first note to get started!',
    'notes.pinned': 'Pinned',
    'notes.unpinned': 'Unpinned',

    // Language Selector
    'lang.english': 'English',
    'lang.french': 'Français (French)',
    'lang.spanish': 'Español (Spanish)',
    'lang.selectLabel': 'Language'
  },

  fr: {
    // Brand & App
    'app.title': 'NoteBook — Vos Notes Privées',
    'app.tagline': 'Vos notes privées, n\'importe où.',
    'app.watchExplainer': 'Voir la démo',
    
    // Auth Tabs & Form
    'auth.signIn': 'Se Connecter',
    'auth.createAccount': 'Créer un Compte',
    'auth.emailLabel': 'E-mail',
    'auth.emailPlaceholder': 'vous@exemple.com',
    'auth.passwordLabel': 'Mot de passe',
    'auth.passwordPlaceholder': 'Votre mot de passe',
    'auth.forgotPassword': 'Mot de passe oublié ?',
    'auth.continueGoogle': 'Continuer avec Google',
    'auth.orEmail': 'ou continuer par e-mail',
    'auth.usernameLabel': 'Nom d\'utilisateur',
    'auth.usernamePlaceholder': 'Votre nom d\'affichage',
    'auth.resetPasswordTitle': 'Réinitialiser le mot de passe',
    'auth.resetPasswordDesc': 'Entrez votre adresse e-mail et nous vous enverrons un lien de réinitialisation.',
    'auth.sendResetLink': 'Envoyer le lien',
    'auth.backToSignIn': 'Retour à la connexion',
    
    // Auth Toasts & Errors
    'auth.errorEnterEmail': 'Veuillez saisir votre e-mail.',
    'auth.resetEmailSent': 'E-mail de réinitialisation envoyé ! Vérifiez votre boîte de réception.',
    'auth.welcomeBack': 'Bon retour, {name} !',
    'auth.accountCreated': 'Compte créé avec succès !',
    'auth.loggedOut': 'Déconnexion réussie.',

    // Navigation & Sidebar
    'nav.allNotes': 'Toutes les Notes',
    'nav.categories': 'Catégories',
    'nav.general': 'Général',
    'nav.work': 'Travail',
    'nav.personal': 'Personnel',
    'nav.ideas': 'Idées',
    'nav.folders': 'Dossiers',
    'nav.newFolder': 'Nouveau Dossier',
    'nav.support': 'Support & Avis',
    'nav.signOut': 'Se Déconnecter',
    'nav.searchPlaceholder': 'Rechercher des notes...',

    // Editor Modal
    'editor.newNote': 'Nouvelle Note',
    'editor.editNote': 'Modifier la Note',
    'editor.titlePlaceholder': 'Titre de la note...',
    'editor.contentPlaceholder': 'Écrivez votre note ici (Markdown pris en charge)...',
    'editor.editTab': 'Éditer',
    'editor.previewTab': 'Aperçu',
    'editor.saveBtn': 'Enregistrer la note',
    'editor.saving': 'Enregistrement…',
    'editor.cancelBtn': 'Annuler',
    'editor.historyTitle': 'Historique des versions',
    'editor.noHistory': 'Aucune version pour l\'instant',
    'editor.noHistoryNew': 'Pas d\'historique pour les nouvelles notes',
    'editor.loadingHistory': 'Chargement de l\'historique...',
    'editor.restoreConfirm': 'Restaurer cette version ? Vos modifications actuelles non enregistrées seront écrasées.',
    'editor.versionRestored': 'Version restaurée. N\'oubliez pas d\'enregistrer !',

    // Toasts & Sweet Alerts
    'toast.noteCreated': 'Note créée ✓',
    'toast.noteUpdated': 'Note mise à jour ✓',
    'toast.noteDeleted': 'Note supprimée.',
    'toast.saveFailed': 'Échec de l\'enregistrement. Réessayez.',
    'toast.enterTitleOrContent': 'Veuillez ajouter un titre ou du contenu.',
    'toast.fileTooLarge': 'Fichier trop volumineux. La limite est de 1 Mo.',
    'toast.attachmentAdded': 'Pièce jointe ajoutée !',
    'toast.attachmentRemoved': 'Pièce jointe supprimée.',
    'toast.removeAttachmentConfirm': 'Supprimer cette pièce jointe ?',
    'toast.listening': 'Écoute en cours...',
    'toast.micError': 'Erreur du micro : {error}',
    'toast.noGrammarErrors': 'Aucune erreur courante trouvée ! ✓',
    'toast.grammarHint': 'Conseil : Vérifiez l\'utilisation de "{suggestion}"',
    'toast.folderCreated': 'Dossier "{name}" créé ✓',
    'toast.folderDeleted': 'Dossier supprimé.',
    'toast.deleteFolderConfirm': 'Supprimer le dossier "{name}" ? Les notes contenues ne seront pas supprimées.',
    'toast.deleteNoteConfirm': 'Êtes-vous sûr de vouloir supprimer cette note ?',
    'toast.reminderSet': 'Rappel défini ✓',
    'toast.reminderCleared': 'Rappel effacé',

    // Greetings
    'greeting.morning': 'Bonjour',
    'greeting.afternoon': 'Bon après-midi',
    'greeting.evening': 'Bonsoir',

    // Notes List
    'notes.emptyState': 'Aucune note trouvée',
    'notes.emptyStateDesc': 'Créez votre première note pour commencer !',
    'notes.pinned': 'Épinglée',
    'notes.unpinned': 'Désepinglée',

    // Language Selector
    'lang.english': 'English',
    'lang.french': 'Français (French)',
    'lang.spanish': 'Español (Spanish)',
    'lang.selectLabel': 'Langue'
  },

  es: {
    // Brand & App
    'app.title': 'NoteBook — Tus Notas Privadas',
    'app.tagline': 'Tus notas privadas, en cualquier lugar.',
    'app.watchExplainer': 'Ver demostración',
    
    // Auth Tabs & Form
    'auth.signIn': 'Iniciar Sesión',
    'auth.createAccount': 'Crear Cuenta',
    'auth.emailLabel': 'Correo electrónico',
    'auth.emailPlaceholder': 'tu@ejemplo.com',
    'auth.passwordLabel': 'Contraseña',
    'auth.passwordPlaceholder': 'Tu contraseña',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.continueGoogle': 'Continuar con Google',
    'auth.orEmail': 'o continuar con correo',
    'auth.usernameLabel': 'Nombre de usuario',
    'auth.usernamePlaceholder': 'Tu nombre visible',
    'auth.resetPasswordTitle': 'Restablecer contraseña',
    'auth.resetPasswordDesc': 'Ingresa tu correo electrónico y te enviaremos un enlace de restablecimiento.',
    'auth.sendResetLink': 'Enviar enlace',
    'auth.backToSignIn': 'Volver al inicio de sesión',
    
    // Auth Toasts & Errors
    'auth.errorEnterEmail': 'Por favor ingresa tu correo electrónico.',
    'auth.resetEmailSent': '¡Correo de restablecimiento enviado! Revisa tu bandeja de entrada.',
    'auth.welcomeBack': '¡Bienvenido de nuevo, {name}!',
    'auth.accountCreated': '¡Cuenta creada con éxito!',
    'auth.loggedOut': 'Sesión cerrada correctamente.',

    // Navigation & Sidebar
    'nav.allNotes': 'Todas las Notas',
    'nav.categories': 'Categorías',
    'nav.general': 'General',
    'nav.work': 'Trabajo',
    'nav.personal': 'Personal',
    'nav.ideas': 'Ideas',
    'nav.folders': 'Carpetas',
    'nav.newFolder': 'Nueva Carpeta',
    'nav.support': 'Soporte y Opiniones',
    'nav.signOut': 'Cerrar Sesión',
    'nav.searchPlaceholder': 'Buscar notas...',

    // Editor Modal
    'editor.newNote': 'Nueva Nota',
    'editor.editNote': 'Editar Nota',
    'editor.titlePlaceholder': 'Título de la nota...',
    'editor.contentPlaceholder': 'Escribe tu nota aquí (soporta Markdown)...',
    'editor.editTab': 'Editar',
    'editor.previewTab': 'Vista Previa',
    'editor.saveBtn': 'Guardar Nota',
    'editor.saving': 'Guardando…',
    'editor.cancelBtn': 'Cancelar',
    'editor.historyTitle': 'Historial de versiones',
    'editor.noHistory': 'Aún no hay versiones',
    'editor.noHistoryNew': 'Sin historial para notas nuevas',
    'editor.loadingHistory': 'Cargando historial...',
    'editor.restoreConfirm': '¿Restaurar esta versión? Se sobrescribirán tus cambios no guardados.',
    'editor.versionRestored': '¡Versión restaurada! No olvides guardar.',

    // Toasts & Sweet Alerts
    'toast.noteCreated': 'Nota creada ✓',
    'toast.noteUpdated': 'Nota actualizada ✓',
    'toast.noteDeleted': 'Nota eliminada.',
    'toast.saveFailed': 'Error al guardar la nota. Inténtalo de nuevo.',
    'toast.enterTitleOrContent': 'Por favor agrega un título o contenido.',
    'toast.fileTooLarge': 'Archivo demasiado grande. El límite máximo es 1MB.',
    'toast.attachmentAdded': '¡Archivo adjunto agregado!',
    'toast.attachmentRemoved': 'Archivo adjunto eliminado.',
    'toast.removeAttachmentConfirm': '¿Eliminar este archivo adjunto?',
    'toast.listening': 'Escuchando...',
    'toast.micError': 'Error del micrófono: {error}',
    'toast.noGrammarErrors': '¡No se encontraron errores comunes! ✓',
    'toast.grammarHint': 'Pista: Revisa el uso de "{suggestion}"',
    'toast.folderCreated': 'Carpeta "{name}" creada ✓',
    'toast.folderDeleted': 'Carpeta eliminada.',
    'toast.deleteFolderConfirm': '¿Eliminar carpeta "{name}"? Las notas dentro no se eliminarán.',
    'toast.deleteNoteConfirm': '¿Estás seguro de que deseas eliminar esta nota?',
    'toast.reminderSet': 'Recordatorio configurado ✓',
    'toast.reminderCleared': 'Recordatorio borrado',

    // Greetings
    'greeting.morning': 'Buenos días',
    'greeting.afternoon': 'Buenas tardes',
    'greeting.evening': 'Buenas noches',

    // Notes List
    'notes.emptyState': 'No se encontraron notas',
    'notes.emptyStateDesc': '¡Crea tu primera nota para comenzar!',
    'notes.pinned': 'Fijada',
    'notes.unpinned': 'Desfijada',

    // Language Selector
    'lang.english': 'English',
    'lang.french': 'Français (French)',
    'lang.spanish': 'Español (Spanish)',
    'lang.selectLabel': 'Idioma'
  }
};

/**
 * Speech Recognition Locale Map (BCP-47)
 */
export const speechLocales = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES'
};

/**
 * Returns the current active language code ('en', 'fr', 'es').
 */
export function getCurrentLanguage() {
  return state.preferredLanguage || localStorage.getItem('notebook_language') || 'en';
}

/**
 * Gets a translated string for a given key, interpolating parameters.
 * Usage: t('auth.welcomeBack', { name: 'John' })
 */
export function t(key, params = {}) {
  const lang = getCurrentLanguage();
  const dict = translations[lang] || translations.en;
  let text = dict[key] || translations.en[key] || key;

  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
  });

  return text;
}

/**
 * Scans the DOM and updates all elements with data-i18n attributes.
 */
export function applyLanguageUI() {
  const lang = getCurrentLanguage();

  // Update html lang attribute
  document.documentElement.lang = lang;

  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  // Input placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = t(key);
    }
  });

  // Titles / Tooltips
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.title = t(key);
    }
  });

  // Aria labels
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) {
      el.setAttribute('aria-label', t(key));
    }
  });

  // Sync language select dropdown values if present
  document.querySelectorAll('.lang-select').forEach(select => {
    select.value = lang;
  });

  // Trigger speech recognition locale update if recognition is initialized
  if (state.recognition) {
    state.recognition.lang = speechLocales[lang] || 'en-US';
  }
}

/**
 * Sets the current language, saves it to localStorage, updates state,
 * and re-applies UI translations.
 */
export function setLanguage(lang) {
  if (!translations[lang]) lang = 'en';
  state.preferredLanguage = lang;
  localStorage.setItem('notebook_language', lang);
  applyLanguageUI();
}
