import { useEffect, useState } from 'react'
import {
  isAdminUser,
  subscribeToAnnouncements,
  subscribeToMyRequest,
  subscribeToRole,
} from '../services/officials'

/**
 * The approved role and any pending application for the signed-in user. Both
 * are tracked against the uid so switching accounts never shows the previous
 * user's status.
 */
export function useOfficial(uid) {
  const [state, setState] = useState({
    uid: null,
    role: null,
    request: null,
    isAdmin: false,
  })

  useEffect(() => {
    // No reset needed when the uid goes away: the freshness check below
    // already discards state belonging to a different uid.
    if (!uid) return

    let active = true
    isAdminUser(uid).then((isAdmin) => {
      if (active) setState((previous) => ({ ...previous, uid, isAdmin }))
    })

    const stopRole = subscribeToRole(uid, (role) =>
      setState((previous) => ({ ...previous, uid, role })),
    )
    const stopRequest = subscribeToMyRequest(uid, (request) =>
      setState((previous) => ({ ...previous, uid, request })),
    )

    return () => {
      active = false
      stopRole()
      stopRequest()
    }
  }, [uid])

  const fresh = state.uid === uid
  const role = fresh ? state.role : null

  return {
    role,
    request: fresh ? state.request : null,
    isAdmin: fresh ? state.isAdmin : false,
    // Rules re-check this on every write; this only decides what the UI shows.
    isOfficial: Boolean(role?.approved),
  }
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    return subscribeToAnnouncements(
      (next) => {
        setAnnouncements(next)
        setError(null)
      },
      (subscribeError) => setError(subscribeError),
    )
  }, [])

  return { announcements, error }
}
