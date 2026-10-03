import {
  EmailAuthProvider,
  GoogleAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPhoneNumber,
  linkWithPopup,
  reload,
  sendSignInLinkToEmail,
  signInWithCredential,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebaseConfig'

// The sign-in link is usually opened in a different tab (or even a different
// browser), so the address has to outlive the page that requested it.
const PENDING_EMAIL_KEY = 'emernok:pending-email'

export function createRecaptcha(container) {
  return new RecaptchaVerifier(auth, container, { size: 'invisible' })
}

/**
 * Upgrades the current anonymous session so the user keeps their uid (and
 * therefore their existing reports). Falls back to a plain sign-in when the
 * credential already belongs to a real account, which abandons the anonymous
 * uid because Firebase cannot merge two accounts.
 */
async function upgradeOrSignIn(credential) {
  const current = auth.currentUser
  if (current?.isAnonymous) {
    try {
      return await linkWithCredential(current, credential)
    } catch (error) {
      const taken =
        error.code === 'auth/credential-already-in-use' ||
        error.code === 'auth/email-already-in-use'
      if (!taken) throw error
    }
  }
  return signInWithCredential(auth, credential)
}

// ---- google ----------------------------------------------------------------

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  const current = auth.currentUser
  if (current?.isAnonymous) {
    try {
      return await linkWithPopup(current, provider)
    } catch (error) {
      if (
        error.code === 'auth/credential-already-in-use' ||
        error.code === 'auth/email-already-in-use'
      ) {
        const credential = GoogleAuthProvider.credentialFromError(error)
        if (credential) return signInWithCredential(auth, credential)
        return signInWithPopup(auth, provider)
      }
      throw error
    }
  }
  return signInWithPopup(auth, provider)
}

// ---- phone -----------------------------------------------------------------

export function startPhoneSignIn(phoneNumber, verifier) {
  const current = auth.currentUser
  if (current?.isAnonymous) {
    return linkWithPhoneNumber(current, phoneNumber, verifier)
  }
  return signInWithPhoneNumber(auth, phoneNumber, verifier)
}

export async function confirmPhoneCode(confirmationResult, code) {
  try {
    return await confirmationResult.confirm(code)
  } catch (error) {
    if (error.code === 'auth/credential-already-in-use') {
      const credential = PhoneAuthProvider.credentialFromError(error)
      if (credential) return signInWithCredential(auth, credential)
    }
    throw error
  }
}

// ---- email link (passwordless) ---------------------------------------------

export async function sendMagicLink(email) {
  const address = email.trim()
  await sendSignInLinkToEmail(auth, address, {
    // Must be an authorised domain in Firebase Auth settings. Dropping the
    // query string keeps the returned link free of our own parameters.
    url: `${window.location.origin}${window.location.pathname}`,
    handleCodeInApp: true,
  })
  window.localStorage.setItem(PENDING_EMAIL_KEY, address)
}

export function isEmailLinkUrl(url = window.location.href) {
  return isSignInWithEmailLink(auth, url)
}

export function pendingEmail() {
  return window.localStorage.getItem(PENDING_EMAIL_KEY)
}

export function clearPendingEmail() {
  window.localStorage.removeItem(PENDING_EMAIL_KEY)
}

/**
 * Finishes a passwordless sign-in. Firebase treats clicking the link as proof
 * of mailbox ownership, so these accounts come back already email-verified.
 */
export async function completeEmailLink(email, url = window.location.href) {
  const credential = EmailAuthProvider.credentialWithLink(email.trim(), url)
  try {
    return await upgradeOrSignIn(credential)
  } catch (error) {
    // The one-time code in the link is spent once an attempt consumes it, so a
    // retry cannot reuse it. Nothing to do but ask for a fresh link.
    if (error.code === 'auth/invalid-action-code') {
      throw new Error('That sign-in link has expired. Request a new one.')
    }
    throw error
  } finally {
    clearPendingEmail()
  }
}

/**
 * The verification link is clicked elsewhere, so this tab's cached user and ID
 * token stay stale until we force a refresh. Forcing the token also re-fires
 * onIdTokenChanged, which is what updates the UI.
 */
export async function refreshIdentity() {
  const current = auth.currentUser
  if (!current) return
  await reload(current)
  await current.getIdToken(true)
}

// AuthProvider immediately signs back in anonymously, so this is really
// "forget my identity" rather than a full logout.
export function signOut() {
  clearPendingEmail()
  return firebaseSignOut(auth)
}
