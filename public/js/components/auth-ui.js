/**
 * components/auth-ui.js
 * Handles all authentication form UI logic.
 */

import { signUp, signIn, resetPassword, signInWithGoogle, deleteAccount, linkEmailPassword } from '../auth.js';
import {
  tabLogin, tabSignup, loginForm, signupForm, forgotForm,
  loginError, signupError, forgotError, forgotSuccess,
  linkForgotPassword, linkBackToLogin
} from '../dom.js';
import { showFormError, setLoading, escapeHtml, showToast } from '../utils/ui.js';
import { state } from '../state.js';

export function setupAuthUI() {
  tabLogin?.addEventListener('click', () => switchTab('login'));
  tabSignup?.addEventListener('click', () => switchTab('signup'));
  linkForgotPassword?.addEventListener('click', () => switchTab('forgot'));
  linkBackToLogin?.addEventListener('click', () => switchTab('login'));

  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    forgotError?.classList.add('hidden');
    forgotSuccess?.classList.add('hidden');

    const email     = document.getElementById('forgot-email')?.value.trim();
    const submitBtn = document.getElementById('forgot-submit-btn');

    if (!email) { showFormError(forgotError, 'Please enter your email.'); return; }

    setLoading(submitBtn, true, 'Sending…');
    try {
      await resetPassword(email);
      if (forgotSuccess) {
        forgotSuccess.textContent = 'Reset link sent! Check your email.';
        forgotSuccess.classList.remove('hidden');
      }
      setLoading(submitBtn, false, 'Send Reset Link');
      document.getElementById('forgot-email').value = '';
      setTimeout(() => {
        if (forgotForm && !forgotForm.classList.contains('hidden')) switchTab('login');
      }, 4000);
    } catch (err) {
      showFormError(forgotError, friendlyAuthError(err.code));
      setLoading(submitBtn, false, 'Send Reset Link');
    }
  });

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError?.classList.add('hidden');

    const username  = document.getElementById('signup-username')?.value.trim();
    const email     = document.getElementById('signup-email')?.value.trim();
    const password  = document.getElementById('signup-password')?.value;
    const submitBtn = signupForm.querySelector('.btn-primary');

    if (!username) { showFormError(signupError, 'Please enter a username.'); return; }

    setLoading(submitBtn, true, 'Creating account…');
    try {
      await signUp(username, email, password);
    } catch (err) {
      showFormError(signupError, friendlyAuthError(err.code));
      setLoading(submitBtn, false, 'Create Account');
    }
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError?.classList.add('hidden');

    const email     = document.getElementById('login-email')?.value.trim();
    const password  = document.getElementById('login-password')?.value;
    const submitBtn = document.getElementById('login-submit-btn');

    setLoading(submitBtn, true, 'Signing in…');
    try {
      await signIn(email, password);
    } catch (err) {
      console.warn('[Auth] Sign-in failed:', err.code, err.message);
      showFormError(loginError, friendlyAuthError(err.code));
      setLoading(submitBtn, false, 'Sign In');
    }
  });

  [document.getElementById('google-login-btn'), document.getElementById('google-signup-btn')]
    .forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.classList.add('btn-google--loading');
        try {
          await signInWithGoogle();
        } catch (err) {
          if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
            const errorEl = btn.closest('form')?.querySelector('.auth-error');
            if (errorEl) {
              errorEl.textContent = friendlyAuthError(err.code);
              errorEl.classList.remove('hidden');
            }
          }
        } finally {
          btn.disabled = false;
          btn.classList.remove('btn-google--loading');
        }
      });
    });
}

export function switchTab(tab) {
  const isLogin  = tab === 'login';
  const isSignup = tab === 'signup';
  const isForgot = tab === 'forgot';

  tabLogin?.classList.toggle('active', isLogin);
  tabSignup?.classList.toggle('active', isSignup);
  loginForm?.classList.toggle('hidden', !isLogin);
  signupForm?.classList.toggle('hidden', !isSignup);
  forgotForm?.toggleAttribute?.('hidden', !isForgot); // forgotForm can be toggled
  if (forgotForm) forgotForm.classList.toggle('hidden', !isForgot);

  loginError?.classList.add('hidden');
  signupError?.classList.add('hidden');
  forgotError?.classList.add('hidden');
  forgotSuccess?.classList.add('hidden');

  // Reset forms and loading states
  if (loginForm) {
    loginForm.reset();
    const loginBtn = document.getElementById('login-submit-btn');
    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Sign In'; }
  }
  if (signupForm) {
    signupForm.reset();
    const signupBtn = signupForm.querySelector('.btn-primary');
    if (signupBtn) { signupBtn.disabled = false; signupBtn.textContent = 'Create Account'; }
  }
  if (forgotForm) {
    forgotForm.reset();
    const forgotBtn = document.getElementById('forgot-submit-btn');
    if (forgotBtn) { forgotBtn.disabled = false; forgotBtn.textContent = 'Send Reset Link'; }
  }

  document.querySelector('.auth-tabs')?.classList.toggle('hidden', isForgot);
}

export function openDeleteAccountModal() {
  const currentUser = state.currentUser;
  const isGoogle = currentUser?.providerData?.some(p => p.providerId === 'google.com');

  const overlay = document.createElement('div');
  overlay.className = 'delete-account-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'da-title');

  overlay.innerHTML = `
    <div class="delete-account-box">
      <div class="da-header">
        <div class="da-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </div>
        <div>
          <h4 id="da-title">Delete My Account</h4>
          <p class="da-subtitle">This is permanent and cannot be undone.</p>
        </div>
      </div>
      <div class="da-warning">
        <p>The following will be <strong>permanently deleted</strong>:</p>
        <ul>
          <li>All your notes</li>
          <li>All your folders</li>
          <li>Your account profile</li>
          <li>Your login credentials</li>
        </ul>
      </div>
      ${!isGoogle ? `
      <div class="da-field-group">
        <label for="da-password">Confirm your password</label>
        <input id="da-password" type="password" placeholder="Enter your current password" autocomplete="current-password" />
      </div>` : `
      <p class="da-google-note">You will be asked to sign in with Google again to confirm your identity.</p>
      `}
      <div class="da-field-group">
        <label for="da-confirm-input">Type <strong>DELETE</strong> to confirm</label>
        <input id="da-confirm-input" type="text" placeholder="DELETE" autocomplete="off" autocorrect="off" spellcheck="false" />
      </div>
      <p id="da-error" class="da-error hidden"></p>
      <div class="da-actions">
        <button id="da-cancel-btn" class="btn-cancel">Cancel</button>
        <button id="da-confirm-btn" class="btn-danger-confirm" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          </svg>
          Delete My Account
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const confirmInput  = overlay.querySelector('#da-confirm-input');
  const confirmBtn    = overlay.querySelector('#da-confirm-btn');
  const cancelBtn     = overlay.querySelector('#da-cancel-btn');
  const errorEl       = overlay.querySelector('#da-error');
  const passwordInput = overlay.querySelector('#da-password');

  confirmInput?.addEventListener('input', () => {
    if (confirmBtn) confirmBtn.disabled = confirmInput.value !== 'DELETE';
  });

  cancelBtn?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  confirmBtn?.addEventListener('click', async () => {
    if (confirmInput.value !== 'DELETE') return;
    const password = passwordInput ? passwordInput.value : null;
    if (!isGoogle && !password) {
      if (errorEl) { errorEl.textContent = 'Please enter your password.'; errorEl.classList.remove('hidden'); }
      return;
    }

    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Deleting…'; }
    errorEl?.classList.add('hidden');

    try {
      sessionStorage.setItem('account-deleted', '1');
      await deleteAccount(currentUser, password);
      overlay.remove();
      showToast('Account deleted. Goodbye! 👋', 'success');
    } catch (err) {
      const messages = {
        'auth/wrong-password'        : 'Incorrect password. Please try again.',
        'auth/too-many-requests'     : 'Too many attempts. Please wait and try again.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/popup-closed-by-user'  : 'Google sign-in was cancelled. Please try again.',
        'auth/requires-recent-login' : 'Session expired. Please log out and log back in first.',
      };
      if (errorEl) { errorEl.textContent = messages[err.code] || 'Something went wrong. Please try again.'; errorEl.classList.remove('hidden'); }
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          </svg>
          Delete My Account`;
      }
    }
  });

  setTimeout(() => (passwordInput || confirmInput)?.focus(), 100);
}

export function showSetPasswordPrompt(user) {
  const overlay = document.createElement('div');
  overlay.className = 'set-password-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="set-password-box">
      <div class="sp-header">
        <div class="sp-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <h4>Set a Password</h4>
          <p class="sp-subtitle">Optionally create a password so you can also sign in with your email.</p>
        </div>
      </div>
      <p class="sp-email-note">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Password will be linked to <strong>${escapeHtml(user.email)}</strong>
      </p>
      <div class="sp-field-group">
        <label for="sp-password">New Password</label>
        <div class="input-wrapper">
          <input id="sp-password" type="password" placeholder="At least 6 characters" autocomplete="new-password" />
          <button type="button" class="password-toggle" aria-label="Show password">
            <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>
      <div class="sp-field-group">
        <label for="sp-confirm">Confirm Password</label>
        <div class="input-wrapper">
          <input id="sp-confirm" type="password" placeholder="Repeat your password" autocomplete="new-password" />
          <button type="button" class="password-toggle" aria-label="Show password">
            <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>
      <p id="sp-error" class="sp-error hidden"></p>
      <div class="sp-actions">
        <button id="sp-skip-btn" class="btn-cancel">Skip for now</button>
        <button id="sp-save-btn" class="btn-primary sp-save-btn">Set Password</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const icon  = btn.querySelector('.eye-icon');
      if (!input || !icon) return;
      if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        input.type = 'password';
        icon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        `;
        btn.setAttribute('aria-label', 'Show password');
      }
    });
  });

  const pwInput   = overlay.querySelector('#sp-password');
  const confInput = overlay.querySelector('#sp-confirm');
  const saveBtn   = overlay.querySelector('#sp-save-btn');
  const skipBtn   = overlay.querySelector('#sp-skip-btn');
  const errorEl   = overlay.querySelector('#sp-error');

  skipBtn?.addEventListener('click', () => overlay.remove());

  saveBtn?.addEventListener('click', async () => {
    const pw   = pwInput?.value;
    const conf = confInput?.value;
    errorEl?.classList.add('hidden');

    if (!pw || pw.length < 6) {
      if (errorEl) { errorEl.textContent = 'Password must be at least 6 characters.'; errorEl.classList.remove('hidden'); }
      return;
    }
    if (pw !== conf) {
      if (errorEl) { errorEl.textContent = 'Passwords do not match.'; errorEl.classList.remove('hidden'); }
      return;
    }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    try {
      await linkEmailPassword(user, pw);
      overlay.remove();
      showToast('Password set! You can now sign in with email too ✓', 'success');
    } catch (err) {
      const msgs = {
        'auth/weak-password'           : 'Password must be at least 6 characters.',
        'auth/provider-already-linked' : 'A password is already linked to this account.',
        'auth/email-already-in-use'    : 'This email is already in use by another account.',
        'auth/requires-recent-login'   : 'Session expired. Please log out and sign in with Google again.',
      };
      if (errorEl) { errorEl.textContent = msgs[err.code] || 'Something went wrong. Please try again.'; errorEl.classList.remove('hidden'); }
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Set Password'; }
    }
  });

  setTimeout(() => pwInput?.focus(), 100);
}

export function friendlyAuthError(code) {
  const map = {
    'auth/email-already-in-use'     : 'This email is already registered.',
    'auth/invalid-email'            : 'Please enter a valid email address.',
    'auth/weak-password'            : 'Password must be at least 6 characters.',
    'auth/user-not-found'           : 'No account found with this email. Please sign up first.',
    'auth/wrong-password'           : 'Incorrect password. Use "Forgot Password" to reset it.',
    'auth/too-many-requests'        : 'Too many attempts. Please try again later.',
    'auth/invalid-credential'       : 'Incorrect email or password. If you signed up with Google, use the "Continue with Google" button instead.',
    'auth/network-request-failed'   : 'Network error. Check your connection.',
    'auth/user-disabled'            : 'This account has been disabled. Contact support.',
    'auth/operation-not-allowed'    : 'Email/password login is not enabled. Please use Google sign-in.',
    'auth/account-exists-with-different-credential': 'An account with this email already exists. Try signing in with Google instead.',
  };
  return map[code] || `An unexpected error occurred. (${code})`;
}
