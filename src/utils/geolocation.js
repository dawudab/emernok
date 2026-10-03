export const GEOLOCATION_SUPPORTED =
  typeof navigator !== 'undefined' && 'geolocation' in navigator

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!GEOLOCATION_SUPPORTED) {
      reject(new Error('Geolocation is not supported on this device'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => {
        // Fallback to standard-accuracy positioning if high-accuracy GPS times
        // out or is unavailable on desktop/indoors.
        navigator.geolocation.getCurrentPosition(
          ({ coords }) =>
            resolve({ lat: coords.latitude, lng: coords.longitude }),
          reject,
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 },
        )
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
    )
  })
}

/**
 * Distinguishing these matters: a denial can only be undone in browser
 * settings, while a timeout just needs another try. Collapsing both into
 * "denied" leaves people with advice that cannot work.
 */
export function statusFromError(error) {
  switch (error?.code) {
    case 1:
      return 'denied'
    case 3:
      return 'timeout'
    case 2:
      return 'unavailable'
    default:
      return GEOLOCATION_SUPPORTED ? 'unavailable' : 'unsupported'
  }
}

/**
 * Permissions API support is uneven (Safari only gained it in 16), so a null
 * result means "unknown", never "denied".
 */
export async function readPermission() {
  if (!navigator.permissions?.query) return null
  try {
    return await navigator.permissions.query({ name: 'geolocation' })
  } catch {
    return null
  }
}
