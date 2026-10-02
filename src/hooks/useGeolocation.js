import { useCallback, useEffect, useState } from 'react'
import { getCurrentPosition } from '../utils/geolocation'

/**
 * Asks for location as soon as the app loads so reporting and the community
 * feed work without an extra tap. A denial is not an error state: the rest of
 * the app falls back to tapping the map.
 */
export function useGeolocation() {
  // Starts in 'locating' rather than setting that synchronously inside the
  // effect, which would kick off an extra render pass.
  const [state, setState] = useState({ position: null, status: 'locating' })

  const locate = useCallback(async () => {
    try {
      const coords = await getCurrentPosition()
      setState({ position: coords, status: 'ready' })
      return coords
    } catch {
      setState({ position: null, status: 'denied' })
      return null
    }
  }, [])

  useEffect(() => {
    // The linter cannot see that every setState here runs after an await, so
    // no synchronous re-render is triggered. Geolocation is an external system,
    // which is precisely what an effect is for.
    // oxlint-disable-next-line react/set-state-in-effect
    locate()
  }, [locate])

  return { position: state.position, status: state.status, locate }
}
