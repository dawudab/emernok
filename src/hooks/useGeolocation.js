import { useCallback, useEffect, useState } from 'react'
import {
  GEOLOCATION_SUPPORTED,
  getCurrentPosition,
  readPermission,
  statusFromError,
} from '../utils/geolocation'

/**
 * Asks for location the moment the app opens, before and regardless of any
 * sign-in, because every other feature reads better when the map is already
 * centred on you.
 *
 * Status is one of: locating | ready | denied | timeout | unavailable |
 * unsupported. They are kept apart so the UI can offer advice that actually
 * applies — a browser-level denial cannot be re-prompted from JavaScript, only
 * reset by the user in site settings.
 */
export function useGeolocation() {
  const [state, setState] = useState({
    position: null,
    status: GEOLOCATION_SUPPORTED ? 'locating' : 'unsupported',
    permission: null,
  })

  const locate = useCallback(async () => {
    if (!GEOLOCATION_SUPPORTED) {
      setState((previous) => ({ ...previous, status: 'unsupported' }))
      return null
    }

    setState((previous) =>
      previous.status === 'locating'
        ? previous
        : { ...previous, status: 'locating' },
    )

    try {
      const coords = await getCurrentPosition()
      setState((previous) => ({
        ...previous,
        position: coords,
        status: 'ready',
      }))
      return coords
    } catch (error) {
      setState((previous) => ({
        ...previous,
        position: null,
        status: statusFromError(error),
      }))
      return null
    }
  }, [])

  useEffect(() => {
    // The linter cannot see that every setState here runs after an await.
    // Geolocation is an external system, which is what effects are for.
    // oxlint-disable-next-line react/set-state-in-effect
    locate()
  }, [locate])

  useEffect(() => {
    let cancelled = false
    let permissionStatus = null

    const sync = () => {
      if (cancelled || !permissionStatus) return
      setState((previous) => ({
        ...previous,
        permission: permissionStatus.state,
      }))
      // Granting permission in site settings fires this instead of a prompt,
      // so without it the map would stay stuck until a manual reload.
      if (permissionStatus.state === 'granted') locate()
    }

    readPermission().then((result) => {
      if (cancelled || !result) return
      permissionStatus = result
      setState((previous) => ({ ...previous, permission: result.state }))
      result.addEventListener('change', sync)
    })

    return () => {
      cancelled = true
      permissionStatus?.removeEventListener('change', sync)
    }
  }, [locate])

  return {
    position: state.position,
    status: state.status,
    permission: state.permission,
    locate,
  }
}
