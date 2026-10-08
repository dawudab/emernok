import { useEffect, useState } from 'react'
import { subscribeToCommunityMessages } from '../services/messages'

export function useNearbyMessages(options) {
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)

  const scope = options?.scope ?? 'radius'
  const lat = options?.center?.lat
  const lng = options?.center?.lng
  const radiusKm = options?.radiusKm ?? 2
  const neighbourhoodId = options?.neighbourhoodId ?? null
  const regionId = options?.regionId ?? null

  useEffect(() => {
    return subscribeToCommunityMessages(
      {
        scope,
        center: lat != null && lng != null ? { lat, lng } : null,
        radiusKm,
        neighbourhoodId,
        regionId,
      },
      (nextMessages) => {
        setError(null)
        setMessages(nextMessages)
      },
      setError,
    )
  }, [scope, lat, lng, radiusKm, neighbourhoodId, regionId])

  return { messages, error }
}
