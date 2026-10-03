import { useCallback, useEffect, useState } from 'react'
import { getCurrentPosition } from '../utils/geolocation'

function failureStatus(error) {
  // GeolocationPositionError.PERMISSION_DENIED is 1. Timeouts and temporary
  // GPS failures must not be presented as if the user rejected permission.
  if (error?.code === 1) return 'denied'
  if (!navigator.geolocation) return 'unsupported'
  return 'unavailable'
}

/**
 * Requests location immediately on page mount, before and independently of any
 * sign-in. The browser owns the permission prompt: it appears on first use over
 * HTTPS/localhost, will not appear again once granted, and cannot be forced to
 * reappear after the user has blocked it in browser settings.
 */
export function useGeolocation() {
  const [state, setState] = useState({ position: null, status: 'locating' })

  const locate = useCallback(async () => {
    try {
      const coords = await getCurrentPosition()
      setState({ position: coords, status: 'ready' })
      return coords
    } catch (error) {
      setState({ position: null, status: failureStatus(error) })
      return null
    }
  }, [])

  useEffect(() => {
    // Every update runs after the geolocation promise settles. The request is
    // deliberately unconditional: guest visitors need local map context too.
    // oxlint-disable-next-line react/set-state-in-effect
    locate()
  }, [locate])

  return { position: state.position, status: state.status, locate }
}
