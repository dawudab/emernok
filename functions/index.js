import { randomInt, timingSafeEqual } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { defineSecret, defineString } from 'firebase-functions/params'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { logger, setGlobalOptions } from 'firebase-functions/v2'

setGlobalOptions({ region: 'europe-west1', maxInstances: 10 })

const CHINGUISOFT_API_TOKEN = defineSecret('CHINGUISOFT_API_TOKEN')
const CHINGUISOFT_CAMPAIGN_KEY = defineSecret('CHINGUISOFT_CAMPAIGN_KEY')
// The web app talks to a named Firestore database, not "(default)".
const FIRESTORE_DATABASE_ID = defineString('FIRESTORE_DATABASE_ID', {
  default: 'ai-studio-emernok-996ca8ce-3f0e-47c3-9369-ff3d25cb5d1d',
})

const OTP_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPTS = 5
const COLLECTION = 'phone_verifications'

initializeApp()

let firestore
function db() {
  firestore ??= getFirestore(FIRESTORE_DATABASE_ID.value())
  return firestore
}

/**
 * Accepts "+222XXXXXXXX", "00222XXXXXXXX", "222XXXXXXXX" or "XXXXXXXX" and
 * returns both the E.164 form (Firebase Auth) and the 8-digit local form
 * (Chinguisoft). Mauritanian mobiles start with 2 (Chinguitel), 3 (Mattel) or
 * 4 (Mauritel).
 */
function normalizeMauritanianPhone(input) {
  const digits = String(input ?? '').replace(/[\s()+-]/g, '')
  const local = digits.replace(/^(00)?222(?=\d{8}$)/, '')
  if (!/^[234]\d{7}$/.test(local)) {
    throw new HttpsError('invalid-argument', 'Invalid Mauritanian phone number', {
      reason: 'invalid-phone',
    })
  }
  return { e164: `+222${local}`, local }
}

function codesMatch(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && timingSafeEqual(left, right)
}

async function dispatchSms({ local, code, lang }) {
  const response = await fetch(
    `https://chinguisoft.com/api/sms/campaign/${encodeURIComponent(CHINGUISOFT_CAMPAIGN_KEY.value())}`,
    {
      method: 'POST',
      headers: {
        'Campaign-token': CHINGUISOFT_API_TOKEN.value(),
        'Content-Type': 'application/json',
      },
      // The SMS text itself is the campaign template configured on Chinguisoft;
      // its {code} placeholder is replaced with this OTP.
      body: JSON.stringify({ phone: local, lang, code }),
    },
  )
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    logger.error('Chinguisoft dispatch failed', { status: response.status, body })
    throw new Error(`Chinguisoft responded ${response.status}`)
  }
}

export const sendChinguiOtp = onCall(
  { secrets: [CHINGUISOFT_API_TOKEN, CHINGUISOFT_CAMPAIGN_KEY] },
  async (request) => {
    // Every visitor holds at least an anonymous session, so this only rejects
    // scripted calls that skip the app entirely.
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign-in session required')
    }

    const { e164, local } = normalizeMauritanianPhone(request.data?.phoneNumber)
    const lang = request.data?.lang === 'fr' ? 'fr' : 'ar'
    const ref = db().collection(COLLECTION).doc(e164)

    const existing = await ref.get()
    const lastSent = existing.get('createdAt')?.toMillis?.() ?? 0
    if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
      throw new HttpsError('resource-exhausted', 'Please wait before requesting a new code', {
        reason: 'cooldown',
      })
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    await ref.set({
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      createdAt: FieldValue.serverTimestamp(),
    })

    try {
      await dispatchSms({ local, code, lang })
    } catch (error) {
      await ref.delete().catch(() => {})
      logger.error(error)
      throw new HttpsError('internal', 'Chinguisoft dispatch failed', { reason: 'sms-failed' })
    }

    return { success: true }
  },
)

export const verifyChinguiOtp = onCall(async (request) => {
  const { e164 } = normalizeMauritanianPhone(request.data?.phoneNumber)
  const code = String(request.data?.code ?? '').trim()
  if (!/^\d{6}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Invalid code', { reason: 'invalid-code' })
  }

  const ref = db().collection(COLLECTION).doc(e164)

  // Throwing inside the transaction would roll back the attempt counter, so
  // the outcome is returned and only turned into an error once it commits.
  const outcome = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists || snap.get('expiresAt') < Date.now()) {
      if (snap.exists) tx.delete(ref)
      return { status: 'expired' }
    }
    if (codesMatch(code, snap.get('code'))) {
      tx.delete(ref)
      return { status: 'ok' }
    }
    const attempts = (snap.get('attempts') ?? 0) + 1
    if (attempts >= MAX_ATTEMPTS) {
      tx.delete(ref)
      return { status: 'too-many-attempts' }
    }
    tx.update(ref, { attempts })
    return { status: 'invalid-code', attemptsLeft: MAX_ATTEMPTS - attempts }
  })

  if (outcome.status === 'expired') {
    throw new HttpsError('deadline-exceeded', 'OTP expired or not found', { reason: 'expired' })
  }
  if (outcome.status === 'too-many-attempts') {
    throw new HttpsError('permission-denied', 'Too many failed attempts', {
      reason: 'too-many-attempts',
    })
  }
  if (outcome.status === 'invalid-code') {
    throw new HttpsError('invalid-argument', 'Invalid code', {
      reason: 'invalid-code',
      attemptsLeft: outcome.attemptsLeft,
    })
  }

  const auth = getAuth()
  let user
  try {
    user = await auth.getUserByPhoneNumber(e164)
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error
  }

  if (!user) {
    // Attach the number to the caller's anonymous account so they keep their
    // uid, and with it every report they filed as a guest.
    const caller = request.auth
    const isAnonymousCaller = caller?.token?.firebase?.sign_in_provider === 'anonymous'
    user = isAnonymousCaller
      ? await auth.updateUser(caller.uid, { phoneNumber: e164 })
      : await auth.createUser({ phoneNumber: e164 })
  }

  const customToken = await auth.createCustomToken(user.uid, { phoneNumber: e164 })
  return { customToken }
})
