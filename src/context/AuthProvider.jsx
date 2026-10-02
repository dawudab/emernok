import { onIdTokenChanged, signInAnonymously } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'
import { auth, isFirebaseConfigured } from '../firebaseConfig'
import { AuthContext } from './useAuth'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(
    isFirebaseConfigured ? 'loading' : 'unconfigured',
  )
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) return

    // onIdTokenChanged (rather than onAuthStateChanged) also fires when an
    // anonymous account is upgraded to a phone account, which keeps the same
    // user object and would otherwise leave the UI stale.
    const unsubscribe = onIdTokenChanged(
      auth,
      (nextUser) => {
        if (nextUser) {
          setUser(nextUser)
          setStatus('authenticated')
          return
        }

        setUser(null)
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

  const value = useMemo(
    () => ({
      uid: user?.uid ?? null,
      user,
      status,
      error,
      isAnonymous: user?.isAnonymous ?? true,
      phoneNumber: user?.phoneNumber ?? null,
    }),
    [error, status, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
