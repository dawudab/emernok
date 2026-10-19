import {
  EmailAuthProvider,
  GoogleAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPopup,
  reload,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebaseConfig'

// The sign-in link is usually opened in a different tab (or even a different
// browser), so the address has to outlive the page that requested it.
const PENDING_EMAIL_KEY = 'emernok:pending-email'

export function createRecaptcha(container, size = 'invisible') {
  if (!container) return null
  return new RecaptchaVerifier(auth, container, {
    size,
    callback: () => {
      // reCAPTCHA solved - will proceed with phone auth
    },
    'expired-callback': () => {
      // Response expired. Ask user to solve reCAPTCHA again.
    },
  })
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
        error.code === 'auth/email-already-in-use' ||
        error.code === 'auth/account-exists-with-different-credential'
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
        error.code === 'auth/email-already-in-use' ||
        error.code === 'auth/account-exists-with-different-credential'
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

// ---- phone / sms -----------------------------------------------------------

export async function startPhoneSignIn(phoneNumber, verifier) {
  // Always call signInWithPhoneNumber directly with the freshly initialized verifier.
  // Pre-attempting linkWithPhoneNumber burns the single-use reCAPTCHA token and causes
  // auth/error-code:-39 when falling back to signInWithPhoneNumber.
  return signInWithPhoneNumber(auth, phoneNumber, verifier)
}

export async function confirmPhoneCode(confirmationResult, code) {
  try {
    return await confirmationResult.confirm(code)
  } catch (error) {
    if (
      error.code === 'auth/credential-already-in-use' ||
      error.code === 'auth/account-exists-with-different-credential'
    ) {
      const credential = PhoneAuthProvider.credentialFromError(error)
      if (credential) return await signInWithCredential(auth, credential)
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
      throw new Error('That sign-in link has expired or has already been used. Please request a new one.')
    }
    throw error
  } finally {
    clearPendingEmail()
  }
}

// ---- email & password ------------------------------------------------------

export async function signInWithEmailPassword(email, password) {
  const address = email.trim()
  const current = auth.currentUser
  if (current?.isAnonymous) {
    const credential = EmailAuthProvider.credential(address, password)
    try {
      return await linkWithCredential(current, credential)
    } catch (error) {
      if (
        error.code === 'auth/credential-already-in-use' ||
        error.code === 'auth/email-already-in-use' ||
        error.code === 'auth/account-exists-with-different-credential'
      ) {
        return await signInWithEmailAndPassword(auth, address, password)
      }
      throw error
    }
  }
  return signInWithEmailAndPassword(auth, address, password)
}

export async function signUpWithEmailPassword(email, password) {
  const address = email.trim()
  const current = auth.currentUser
  if (current?.isAnonymous) {
    const credential = EmailAuthProvider.credential(address, password)
    try {
      return await linkWithCredential(current, credential)
    } catch (error) {
      if (
        error.code !== 'auth/credential-already-in-use' &&
        error.code !== 'auth/email-already-in-use' &&
        error.code !== 'auth/account-exists-with-different-credential'
      ) {
        throw error
      }
    }
  }
  return createUserWithEmailAndPassword(auth, address, password)
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim())
}

/**
 * Transforms Firebase Auth error codes into helpful, human-friendly guidance.
 */
export function formatAuthError(error, lang = 'en') {
  if (!error) return ''
  const code = error?.code || ''
  const rawMsg = error?.message || String(error)

  if (
    code === 'auth/error-code:-39' ||
    code.includes('-39') ||
    rawMsg.includes('error-code:-39') ||
    rawMsg.includes('auth/error-code:-39')
  ) {
    if (lang === 'ar') {
      return 'تعذر إرسال رسالة SMS إلى هذا الرقم (رمز الخطأ -39: قيود أمان المشغّل لدى Firebase). مشغّل الشبكة أو المنطقة مقيد حاليًا من إرسال SMS. يُرجى تسجيل الدخول بـ Google، أو إضافة رقم هاتف تجريبي (Test Phone Number) في لوحة Firebase لتسجيل الدخول فورًا دون انتظار SMS.'
    }
    if (lang === 'fr') {
      return 'Échec de l’envoi du SMS (Code d’erreur -39 : restriction opérateur Firebase). Cet opérateur ou cette région est temporairement restreint par le filtre anti-fraude de Firebase. Nous vous recommandons de vous connecter avec Google, ou d’ajouter un numéro de test dans la console Firebase.'
    }
    return 'SMS delivery failed (Firebase Error auth/error-code:-39). Your mobile carrier or region is restricted by Firebase’s automated SMS anti-abuse system. Please sign in with Google above, or add your number as a Test Phone Number in Firebase Console to sign in with an instant test code.'
  }

  switch (code) {
    case 'auth/operation-not-allowed':
      if (lang === 'ar') {
        return 'طريقة تسجيل الدخول برابط البريد غير مفعلة في لوحة تحكم Firebase. لتفعيلها: ادخل إلى Authentication > Sign-in method > Email/Password وفعّل خيار (Email link). يمكنك أيضًا تسجيل الدخول بـ Google أو الهاتف.'
      }
      if (lang === 'fr') {
        return 'La connexion par lien e-mail n’est pas activée dans votre console Firebase. Activez « Email link » sous Authentication > Sign-in method. Vous pouvez également vous connecter avec Google ou Téléphone.'
      }
      return 'Email link sign-in is not enabled in your Firebase Console yet. In Firebase Console → Authentication → Sign-in method → Email/Password, toggle ON "Email link (passwordless sign-in)". You can also sign in with Google or Phone Number.'

    case 'auth/unauthorized-domain':
      if (lang === 'ar') {
        return 'نطاق التطبيق الحالي غير مسجل في النطاقات المصرح بها في Firebase. يرجى إضافته في إعدادات Firebase أو تسجيل الدخول بـ Google أو الهاتف.'
      }
      if (lang === 'fr') {
        return 'Ce domaine n’est pas dans la liste des domaines autorisés Firebase. Ajoutez-le dans la console Firebase ou utilisez Google ou Téléphone.'
      }
      return 'This domain is not in Firebase Auth’s Authorized Domains list. Please add it under Authentication → Settings → Authorized domains, or sign in with Google or Phone Number.'

    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      if (lang === 'ar') {
        return 'فشل التحقق الأمني (reCAPTCHA). يرجى المحاولة مرة أخرى أو استخدام البريد الإلكتروني.'
      }
      if (lang === 'fr') {
        return 'Échec de vérification reCAPTCHA. Veuillez réessayer ou utiliser l’e-mail.'
      }
      return 'reCAPTCHA check failed. Please try again or use Email sign-in.'

    case 'auth/invalid-phone-number':
      if (lang === 'ar') {
        return 'رقم الهاتف غير صالح. يرجى كتابة الرمز الدولي (مثال: 222+ لموريتانيا).'
      }
      if (lang === 'fr') {
        return 'Numéro de téléphone invalide. Incluez l’indicatif pays (+222 pour la Mauritanie).'
      }
      return 'Invalid phone number format. Please include country code (+222 for Mauritania).'

    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      if (lang === 'ar') {
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق أو إنشاء حساب جديد.'
      }
      if (lang === 'fr') {
        return 'E-mail ou mot de passe incorrect. Vérifiez ou créez un compte.'
      }
      return 'Invalid email or password. Please verify or create a new account.'

    case 'auth/email-already-in-use':
      if (lang === 'ar') {
        return 'هذا البريد مسجل بالفعل. اضغط على «تسجيل الدخول» بدل إنشاء الحساب.'
      }
      if (lang === 'fr') {
        return 'Cet e-mail est déjà utilisé. Cliquez sur « Se connecter ».'
      }
      return 'This email is already in use. Please sign in instead of creating an account.'

    case 'auth/weak-password':
      if (lang === 'ar') {
        return 'كلمة المرور ضعيفة. يجب أن تتكون من 6 أحرف على الأقل.'
      }
      if (lang === 'fr') {
        return 'Mot de passe trop court (minimum 6 caractères).'
      }
      return 'Password should be at least 6 characters.'

    case 'auth/too-many-requests':
      if (lang === 'ar') {
        return 'محاولات كثيرة مؤخرًا. يرجى الانتظار دقيقة والمحاولة مرة أخرى.'
      }
      if (lang === 'fr') {
        return 'Trop de tentatives. Veuillez patienter un instant avant de réessayer.'
      }
      return 'Too many attempts. Please wait a moment and try again.'

    case 'auth/invalid-action-code':
      if (lang === 'ar') {
        return 'انتهت صلاحية رابط الدخول أو تم استخدامه من قبل. يرجى طلب رابط جديد.'
      }
      if (lang === 'fr') {
        return 'Ce lien de connexion a expiré ou a déjà été utilisé. Demandez-en un nouveau.'
      }
      return 'This sign-in link has expired or has already been used. Please request a new one.'

    default:
      return rawMsg
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
