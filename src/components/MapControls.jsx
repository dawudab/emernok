import { Minus, Navigation, Plus } from 'lucide-react'
import { DEFAULT_ZOOM } from '../constants'
import { useT } from '../i18n/useI18n'

function MapControls({ map, onRecenter }) {
  const t = useT()

  return (
    <div className="pointer-events-none absolute end-4 bottom-22 z-20 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onRecenter}
        aria-label={t('menu.recenter')}
        title={t('menu.recenter')}
        className="icon-button pointer-events-auto size-11 shadow-lg"
      >
        <Navigation size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>

      <div className="glass pointer-events-auto flex flex-col overflow-hidden rounded-full">
        <button
          type="button"
          onClick={() => map?.zoomIn()}
          aria-label={t('map.zoomIn')}
          title={t('map.zoomIn')}
          className="flex size-11 items-center justify-center border-b border-black/10 text-zinc-800 transition-colors active:bg-black/10 dark:border-white/10 dark:text-zinc-100 dark:active:bg-white/10"
        >
          <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() =>
            map ? map.zoomOut() : map?.setZoom(DEFAULT_ZOOM - 1)
          }
          aria-label={t('map.zoomOut')}
          title={t('map.zoomOut')}
          className="flex size-11 items-center justify-center text-zinc-800 transition-colors active:bg-black/10 dark:text-zinc-100 dark:active:bg-white/10"
        >
          <Minus size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default MapControls
