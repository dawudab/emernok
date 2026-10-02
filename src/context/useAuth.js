import { createContext, useContext } from 'react'

export const AuthContext = createContext({
  uid: null,
  user: null,
  status: 'loading',
  error: null,
  isAnonymous: true,
  phoneNumber: null,
})

export function useAuth() {
  return useContext(AuthContext)
}
