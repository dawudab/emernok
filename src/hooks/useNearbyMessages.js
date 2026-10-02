import { useEffect, useState } from 'react'
import { subscribeToNearbyMessages } from '../services/messages'

export function useNearbyMessages(center) {
  const [state, setState] = useState({ key: null, messages: [], error: null })

  // Round the centre so small GPS jitter does not tear down the listeners.
  const key = center ? `${center.lat.toFixed(3)},${center.lng.toFixed(3)}` : null

  useEffect(() => {
    if (!center) return undefined
    return subscribeToNearbyMessages(
      center,
      (messages) => setState({ key, messages, error: null }),
      (error) => setState({ key, messages: [], error }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const fresh = state.key === key
  return {
    messages: fresh ? state.messages : [],
    error: fresh ? state.error : null,
  }
}
