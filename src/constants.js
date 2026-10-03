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

export const REPORT_TYPE_LIST = [REPORT_TYPES.power]

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

// Major service stations across Nouakchott moughataas, supplemented at runtime
// by OpenStreetMap amenity=fuel nodes when online.
export const GAS_STATIONS = [
  {
    id: 'total-tevragh-zeina',
    name: 'TotalEnergies Tevragh Zeina',
    brand: 'TotalEnergies',
    area: 'Tevragh Zeina · Av. Charles de Gaulle',
    lat: 18.1012,
    lng: -15.9785,
  },
  {
    id: 'star-oil-ambassade',
    name: 'Star Oil Ambassades',
    brand: 'Star Oil',
    area: 'Tevragh Zeina · Quartier des Ambassades',
    lat: 18.1068,
    lng: -15.9892,
  },
  {
    id: 'vivo-shell-clinique',
    name: 'Shell / Vivo Energy Clinique',
    brand: 'Shell',
    area: 'Tevragh Zeina · Carrefour Clinique',
    lat: 18.0895,
    lng: -15.9764,
  },
  {
    id: 'wataniya-stade',
    name: 'Wataniya Stade Olympique',
    brand: 'Wataniya',
    area: 'Tevragh Zeina · Stade Olympique',
    lat: 18.0964,
    lng: -15.9712,
  },
  {
    id: 'total-bmd',
    name: 'TotalEnergies Carrefour BMD',
    brand: 'TotalEnergies',
    area: 'Ksar · Av. Gamal Abdel Nasser',
    lat: 18.0858,
    lng: -15.9698,
  },
  {
    id: 'star-oil-ksar',
    name: 'Star Oil Ksar',
    brand: 'Star Oil',
    area: 'Ksar · Route d’Atar',
    lat: 18.0915,
    lng: -15.9562,
  },
  {
    id: 'shell-madrid',
    name: 'Shell Carrefour Madrid',
    brand: 'Shell',
    area: 'Arafat / Ksar · Carrefour Madrid',
    lat: 18.0762,
    lng: -15.9554,
  },
  {
    id: 'total-madrid',
    name: 'TotalEnergies Madrid',
    brand: 'TotalEnergies',
    area: 'Carrefour Madrid',
    lat: 18.0748,
    lng: -15.9568,
  },
  {
    id: 'maurioil-sebkha',
    name: 'MauriOil Sebkha',
    brand: 'MauriOil',
    area: 'Sebkha · Marché Capitale',
    lat: 18.0782,
    lng: -15.9845,
  },
  {
    id: 'wataniya-cinquieme',
    name: 'Wataniya Cinquième',
    brand: 'Wataniya',
    area: 'Sebkha · 5ème Arrondissement',
    lat: 18.0695,
    lng: -15.9818,
  },
  {
    id: 'total-el-mina',
    name: 'TotalEnergies El Mina',
    brand: 'TotalEnergies',
    area: 'El Mina · Route du Port',
    lat: 18.0574,
    lng: -15.9715,
  },
  {
    id: 'star-oil-port',
    name: 'Star Oil Port de l’Amitié',
    brand: 'Star Oil',
    area: 'El Mina · Zone Portuaire',
    lat: 18.0442,
    lng: -15.9885,
  },
  {
    id: 'somap-robinet',
    name: 'Somap Premier Robinet',
    brand: 'Somap',
    area: 'El Mina · Premier Robinet',
    lat: 18.0612,
    lng: -15.9638,
  },
  {
    id: 'total-arafat',
    name: 'TotalEnergies Arafat',
    brand: 'TotalEnergies',
    area: 'Arafat · Route de Rosso',
    lat: 18.0535,
    lng: -15.9512,
  },
  {
    id: 'star-oil-poteau-3',
    name: 'Star Oil Poteau 3',
    brand: 'Star Oil',
    area: 'Arafat · Poteau 3',
    lat: 18.0468,
    lng: -15.9445,
  },
  {
    id: 'wataniya-daaya',
    name: 'Wataniya Carrefour الداية',
    brand: 'Wataniya',
    area: 'Arafat · الداية',
    lat: 18.0395,
    lng: -15.9382,
  },
  {
    id: 'total-pk7',
    name: 'TotalEnergies PK 7',
    brand: 'TotalEnergies',
    area: 'Riyad · PK 7 Route de Rosso',
    lat: 18.0185,
    lng: -15.9428,
  },
  {
    id: 'star-oil-riyad',
    name: 'Star Oil PK 10 Riyad',
    brand: 'Star Oil',
    area: 'Riyad · PK 10',
    lat: 17.9945,
    lng: -15.9342,
  },
  {
    id: 'total-teyarett',
    name: 'TotalEnergies Teyarett',
    brand: 'TotalEnergies',
    area: 'Teyarett · Route de Nouadhibou',
    lat: 18.1245,
    lng: -15.9685,
  },
  {
    id: 'shell-carrefour-aziz',
    name: 'Shell Carrefour Teyarett',
    brand: 'Shell',
    area: 'Teyarett · Av. de l’Unité Nationale',
    lat: 18.1338,
    lng: -15.9612,
  },
  {
    id: 'star-oil-dar-naim',
    name: 'Star Oil Dar Naim',
    brand: 'Star Oil',
    area: 'Dar Naim · Carrefour Tensoueilim',
    lat: 18.1165,
    lng: -15.9355,
  },
  {
    id: 'wataniya-dar-naim',
    name: 'Wataniya Dar Naim',
    brand: 'Wataniya',
    area: 'Dar Naim · Route d’Akjoujt',
    lat: 18.1252,
    lng: -15.9218,
  },
  {
    id: 'total-toujounine',
    name: 'TotalEnergies Toujounine',
    brand: 'TotalEnergies',
    area: 'Toujounine · Route de l’Espoir',
    lat: 18.0842,
    lng: -15.9085,
  },
  {
    id: 'star-oil-hay-saken',
    name: 'Star Oil Route de l’Espoir',
    brand: 'Star Oil',
    area: 'Toujounine · Carrefour Nancy',
    lat: 18.0785,
    lng: -15.8862,
  },
]

