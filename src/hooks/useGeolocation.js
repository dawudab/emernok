import { useCallback, useEffect, useState } from 'react'
import { NOUAKCHOTT_CENTER } from '../constants'
import {
  GEOLOCATION_SUPPORTED,
  getCurrentPosition,
  readPermission,
  statusFromError,
} from '../utils/geolocation'

const FALLBACK_POSITION = {
  lat: NOUAKCHOTT_CENTER[0],
  lng: NOUAKCHOTT_CENTER[1],
}

/**
 * Continuously tracks the user's current position so all reports and community
 * messages are automatically anchored to where the user currently is without
 * needing to tap the map first.
 */
export function useGeolocation() {
  const [state, setState] = useState({
    position: FALLBACK_POSITION,
    hasHardwareFix: false,
    status: GEOLOCATION_SUPPORTED ? 'locating' : 'ready',
    permission: null,
  })

  const locate = useCallback(async () => {
    if (!GEOLOCATION_SUPPORTED) {
      setState((previous) => ({
        ...previous,
        position: previous.position ?? FALLBACK_POSITION,
        status: 'ready',
      }))
      return FALLBACK_POSITION
    }

    try {
      const coords = await getCurrentPosition()
      setState((previous) => ({
        ...previous,
        position: coords,
        hasHardwareFix: true,
        status: 'ready',
      }))
      return coords
    } catch (error) {
      let currentPos = FALLBACK_POSITION
      setState((previous) => {
        currentPos = previous.position ?? FALLBACK_POSITION
        return {
          ...previous,
          position: currentPos,
          status: statusFromError(error),
        }
      })
      return currentPos
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    locate()

    if (!GEOLOCATION_SUPPORTED || !navigator.geolocation.watchPosition) {
      return undefined
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setState((previous) => ({
          ...previous,
          position: { lat: coords.latitude, lng: coords.longitude },
          hasHardwareFix: true,
          status: 'ready',
        }))
      },
      () => {
        // Keep last known or default Nouakchott position on watch errors.
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
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
    position: state.position ?? FALLBACK_POSITION,
    hasHardwareFix: state.hasHardwareFix,
    status: state.status,
    permission: state.permission,
    locate,
  }
}
