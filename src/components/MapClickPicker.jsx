import { useEffect } from 'react'
import { useMapEvents } from 'react-leaflet'

// Rendered only while we are waiting for the user to tap a location.
function MapClickPicker({ onPick }) {
  const map = useMapEvents({
    click: (event) => onPick(event.latlng),
  })

  useEffect(() => {
    const container = map.getContainer()
    const previousCursor = container.style.cursor
    container.style.cursor = 'crosshair'
    return () => {
      container.style.cursor = previousCursor
    }
  }, [map])

  return null
}

export default MapClickPicker
