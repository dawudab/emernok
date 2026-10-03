import { onIdTokenChanged, signInAnonymously } from 'firebase/auth'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { auth, isFirebaseConfigured } from '../firebaseConfig'
import {
  completeEmailLink,
  isEmailLinkUrl,
  pendingEmail,
} from '../services/auth'
import { AuthContext } from './useAuth'

// Decided before the first render so the effect below never has to set state
// synchronously just to record what the URL already told us.
function initialLinkState() {
  if (!isFirebaseConfigured || !isEmailLinkUrl()) return 'idle'
  // No stored address means the link was opened in a different browser, so we
  // have to ask the user to retype it before the credential can be built.
  return pendingEmail() ? 'pending' : 'needs-email'
}

// Linking an account, and verifying an email, both mutate the *same* Firebase
// user object. Storing a fresh snapshot instead of the object itself is what
// makes React see the change at all.
function snapshot(user) {
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    phoneNumber: user.phoneNumber ?? null,
    email: user.email ?? null,
    emailVerified: user.emailVerified,
  }
}

function AuthProvider({ children }) {
  const [identity, setIdentity] = useState(null)
  const [status, setStatus] = useState(
    isFirebaseConfigured ? 'loading' : 'unconfigured',
  )
  const [error, setError] = useState(null)
  const [linkStatus, setLinkStatus] = useState(initialLinkState)
  const [linkError, setLinkError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) return

    // onIdTokenChanged (rather than onAuthStateChanged) also fires when an
    // anonymous account is upgraded, or when a freshly verified email forces a
    // token refresh, both of which keep the same user object.
    const unsubscribe = onIdTokenChanged(
      auth,
      (nextUser) => {
        if (nextUser) {
          setIdentity(snapshot(nextUser))
          setStatus('authenticated')
          return
        }

        setIdentity(null)
        signInAnonymously(auth).catch((signInError) => {
          setError(signInError)
          setStatus('error')
        })
      },
      (authError) => {
        setError(authError)
        setStatus('error')
      },
    )

    return unsubscribe
  }, [])

  const finishEmailLink = useCallback(async (address) => {
    setLinkStatus('completing')
    setLinkError(null)
    try {
      await completeEmailLink(address)
      // Strip the one-time code so a reload cannot retry a spent link.
      window.history.replaceState({}, '', window.location.pathname)
      setLinkStatus('done')
    } catch (completionError) {
      setLinkError(completionError)
      setLinkStatus('error')
    }
  }, [])

  useEffect(() => {
    // Needs a signed-in (anonymous) user to upgrade, so this waits for auth.
    if (linkStatus !== 'pending' || !identity) return
    // The linter cannot see that every setState inside runs after an await.
    // oxlint-disable-next-line react/set-state-in-effect
    finishEmailLink(pendingEmail())
  }, [finishEmailLink, identity, linkStatus])

  const value = useMemo(() => {
    const { phoneNumber, email, emailVerified, isAnonymous } = identity ?? {
      phoneNumber: null,
      email: null,
      emailVerified: false,
      isAnonymous: true,
    }

    return {
      uid: identity?.uid ?? null,
      status,
      error,
      isAnonymous,
      phoneNumber,
      email,
      emailVerified,
      // Must mirror verifiedUser() in firestore.rules. An unverified email can
      // sign in but cannot write, so the UI should not pretend otherwise.
      canWrite: Boolean(
        identity && !isAnonymous && (phoneNumber || emailVerified),
      ),
      identityLabel: phoneNumber ?? email ?? 'Guest',
      emailLinkStatus: linkStatus,
      emailLinkError: linkError,
      finishEmailLink,
    }
  }, [error, finishEmailLink, identity, linkError, linkStatus, status])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
