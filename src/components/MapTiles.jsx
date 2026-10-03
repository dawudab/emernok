import { TileLayer } from 'react-leaflet'
import { useTheme } from '../theme/useTheme'

// CARTO's basemaps are deliberately desaturated, which keeps the outage
// colours as the only thing competing for attention. Attribution to both
// OpenStreetMap and CARTO is required by their terms.
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const CARTO_API_KEY =
  import.meta.env.VITE_CARTO_API_KEY || 'cb1_48ru_1_25bc62287fdbf2855b83cb54'

function MapTiles() {
  const { isDark } = useTheme()
  const variant = isDark ? 'dark_all' : 'light_all'
  const query = CARTO_API_KEY ? `?key=${encodeURIComponent(CARTO_API_KEY)}` : ''

  return (
    <TileLayer
      // Keyed so Leaflet swaps the layer at dusk instead of re-using the old
      // tile cache under a new URL template.
      key={variant}
      url={`https://{s}.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png${query}`}
      subdomains="abcd"
      maxZoom={20}
      detectRetina
      attribution={ATTRIBUTION}
    />
  )
}

export default MapTiles
