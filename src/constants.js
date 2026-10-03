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

// Marker fill reflects validation status; the icon carries the utility type.
export const STATUS_COLORS = {
  unverified: '#facc15',
  verified: '#ff3b30',
}

// Labels are translation keys rather than text: see src/i18n/translations.
// `accent` is the only colour each type carries — the palette is otherwise
// monochrome, so these read as signal rather than decoration. Icons are named
// here and resolved in src/components/icons.js to keep this file free of JSX,
// since the Node importer imports it too.
export const REPORT_TYPES = {
  power: {
    id: 'power',
    labelKey: 'type.power',
    shortKey: 'type.power.short',
    iconName: 'power',
    accent: '#f5ff3d',
    accentLight: '#a16207',
  },
  water: {
    id: 'water',
    labelKey: 'type.water',
    shortKey: 'type.water.short',
    iconName: 'water',
    accent: '#22d3ee',
    accentLight: '#0e7490',
  },
  fuel: {
    id: 'fuel',
    labelKey: 'type.fuel',
    shortKey: 'type.fuel.short',
    iconName: 'fuel',
    accent: '#fafafa',
    accentLight: '#3f3f46',
  },
}

/**
 * Neon on black does not survive on white: bright white and neon yellow both
 * disappear against light glass, so each accent carries a darker twin for
 * light mode. The dark values stay exact wherever the icon sits on a dark
 * chip, such as the active report button.
 */
export function accentFor(type, isDark) {
  return isDark ? type.accent : (type.accentLight ?? type.accent)
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
export const OFFICIAL_COLOR = '#8b5cf6'
