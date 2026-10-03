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

// Labels are translation keys rather than text: see src/i18n/translations.
export const REPORT_TYPES = {
  power: {
    id: 'power',
    labelKey: 'type.power',
    shortKey: 'type.power.short',
    icon: '⚡',
    color: '#ef4444',
    button: 'bg-red-500 active:bg-red-600',
  },
  water: {
    id: 'water',
    labelKey: 'type.water',
    shortKey: 'type.water.short',
    icon: '💧',
    color: '#2563eb',
    button: 'bg-blue-600 active:bg-blue-700',
  },
  fuel: {
    id: 'fuel',
    labelKey: 'type.fuel',
    shortKey: 'type.fuel.short',
    icon: '⛽',
    color: '#eab308',
    button: 'bg-yellow-500 active:bg-yellow-600',
  },
}

export const REPORT_TYPE_LIST = Object.values(REPORT_TYPES)

// Nouakchott's moughataas. Centres are approximate and chosen to anchor an
// official notice to a neighbourhood, not to draw administrative boundaries —
// worth replacing with surveyed coordinates before launch.
// Aliases are what the source importer matches against: official notices are
// written in Arabic or French, and transliterations vary widely.
export const NEIGHBOURHOODS = [
  {
    id: 'tevragh-zeina',
    name: 'Tevragh Zeina',
    lat: 18.095,
    lng: -15.98,
    aliases: ['تفرغ زينة', 'Tevragh-Zeina', 'Tevragh Zeïna', 'Tevragh'],
  },
  {
    id: 'ksar',
    name: 'Ksar',
    lat: 18.088,
    lng: -15.96,
    aliases: ['لكصر', 'الكصر', 'Le Ksar'],
  },
  {
    id: 'sebkha',
    name: 'Sebkha',
    lat: 18.073,
    lng: -15.98,
    aliases: ['السبخة', 'Sebkha'],
  },
  {
    id: 'el-mina',
    name: 'El Mina',
    lat: 18.055,
    lng: -15.965,
    aliases: ['لمينة', 'الميناء', 'Elmina', 'El-Mina'],
  },
  {
    id: 'arafat',
    name: 'Arafat',
    lat: 18.05,
    lng: -15.94,
    aliases: ['عرفات'],
  },
  {
    id: 'riyad',
    name: 'Riyad',
    lat: 17.99,
    lng: -15.93,
    aliases: ['الرياض', 'Riad'],
  },
  {
    id: 'dar-naim',
    name: 'Dar Naim',
    lat: 18.12,
    lng: -15.93,
    aliases: ['دار النعيم', 'Dar-Naim', 'Dar Naïm'],
  },
  {
    id: 'teyarett',
    name: 'Teyarett',
    lat: 18.13,
    lng: -15.97,
    aliases: ['تيارت', 'Teyaret'],
  },
  {
    id: 'toujounine',
    name: 'Toujounine',
    lat: 18.09,
    lng: -15.89,
    aliases: ['توجنين', 'Toujounine'],
  },
]

// Official notices cover a whole neighbourhood rather than a single address.
export const ANNOUNCEMENT_RADIUS_M = 2000
export const ANNOUNCEMENT_MAX_HOURS = 48
export const ANNOUNCEMENT_DEFAULT_HOURS = 4
export const MAX_ANNOUNCEMENT_LENGTH = 500
export const OFFICIAL_COLOR = '#7c3aed'
