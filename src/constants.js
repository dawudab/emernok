export const NOUAKCHOTT_CENTER = [18.0735, -15.9582]
export const DEFAULT_ZOOM = 13

// Outages are short-lived news, so pins age out of the map rather than piling
// up forever. Mirrored by the query cutoff in services/reports.js.
export const REPORT_TTL_HOURS = 12
export const MESSAGE_TTL_HOURS = 24

// Anti-spam limits. These are enforced in firestore.rules; the client copies
// are only for friendly messaging before we hit the server.
export const REPORT_COOLDOWN_SECONDS = 60
export const DAILY_REPORT_LIMIT = 20
export const MESSAGE_COOLDOWN_SECONDS = 10
export const DAILY_MESSAGE_LIMIT = 100

// Community validation: distinct reporters of the same utility within this
// radius are treated as one outage, and promoted to "verified" at the
// threshold. Both are computed client-side from public report data.
export const VERIFY_RADIUS_M = 500
export const VERIFY_MIN_USERS = 5

// Once this many neighbours say service is back, the outage drops off the map.
export const RESTORED_THRESHOLD = 3

export const COMMUNITY_RADIUS_KM = 2

// Marker fill reflects validation status; the emoji carries the utility type.
export const STATUS_COLORS = {
  unverified: '#eab308',
  verified: '#ef4444',
}

export const REPORT_TYPES = {
  power: {
    id: 'power',
    label: 'Report Power',
    shortLabel: 'Power outage',
    icon: '⚡',
    color: '#ef4444',
    button: 'bg-red-500 active:bg-red-600',
  },
  water: {
    id: 'water',
    label: 'Report Water',
    shortLabel: 'Water issue',
    icon: '💧',
    color: '#2563eb',
    button: 'bg-blue-600 active:bg-blue-700',
  },
  fuel: {
    id: 'fuel',
    label: 'Report Fuel',
    shortLabel: 'Gas / fuel shortage',
    icon: '⛽',
    color: '#eab308',
    button: 'bg-yellow-500 active:bg-yellow-600',
  },
}

export const REPORT_TYPE_LIST = Object.values(REPORT_TYPES)
