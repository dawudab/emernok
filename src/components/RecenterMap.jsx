import { useEffect, useRef } from 'react'
import { Circle, useMap } from 'react-leaflet'
import { DEFAULT_ZOOM } from '../constants'

// Pans to the user once their position arrives, then leaves the map alone so we
// never fight someone who is panning around manually.
function RecenterMap({ position }) {
  const map = useMap()
  const centred = useRef(false)

  useEffect(() => {
    if (!position || centred.current) return
    centred.current = true
    map.setView([position.lat, position.lng], DEFAULT_ZOOM)
  }, [map, position])

  if (!position) return null

  return (
    <Circle
      center={[position.lat, position.lng]}
      radius={40}
      pathOptions={{
        color: '#0f172a',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 0.6,
      }}
    />
  )
}

export default RecenterMap
