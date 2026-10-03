import { createContext, useContext } from 'react'

export const AuthContext = createContext({
  uid: null,
  status: 'loading',
  error: null,
  isAnonymous: true,
  phoneNumber: null,
  email: null,
  emailVerified: false,
  // Mirrors verifiedUser() in firestore.rules: the server is the real gate.
  canWrite: false,
  identityLabel: 'Guest',
})

export function useAuth() {
  return useContext(AuthContext)
}
