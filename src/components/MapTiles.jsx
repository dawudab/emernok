import { TileLayer } from 'react-leaflet'
import { useTheme } from '../theme/useTheme'

// CARTO Voyager basemap keeps roads, blocks and neighbourhood names clearly
// legible while letting the outage pins stand out on top.
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const CARTO_API_KEY =
  import.meta.env.VITE_CARTO_API_KEY || 'cb1_48ru_1_25bc62287fdbf2855b83cb54'

function MapTiles() {
  const { isDark } = useTheme()
  const query = CARTO_API_KEY ? `?key=${encodeURIComponent(CARTO_API_KEY)}` : ''

  return (
    <TileLayer
      key={isDark ? 'dark' : 'light'}
      url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${query}`}
      subdomains="abcd"
      maxZoom={20}
      detectRetina
      attribution={ATTRIBUTION}
    />
  )
}

export default MapTiles
