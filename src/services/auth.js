import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithPhoneNumber,
  signInWithCredential,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebaseConfig'

export function createRecaptcha(container) {
  return new RecaptchaVerifier(auth, container, { size: 'invisible' })
}

/**
 * Upgrades the current anonymous session to a phone account so the user keeps
 * their uid (and therefore their existing reports). Falls back to a plain
 * phone sign-in if there is no anonymous user to upgrade.
 */
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
    // The phone already belongs to another account: sign into that account
    // instead. The anonymous uid (and its reports) is left behind.
    if (error.code === 'auth/credential-already-in-use') {
      const credential = PhoneAuthProvider.credentialFromError(error)
      if (credential) return signInWithCredential(auth, credential)
    }
    throw error
  }
}

// AuthProvider immediately signs back in anonymously, so this is really
// "forget my phone identity" rather than a full logout.
export function signOut() {
  return firebaseSignOut(auth)
}
