// Centred on Nouakchott, Mauritania
export const NOUAKCHOTT_CENTER = [18.0735, -15.9582]
export const DEFAULT_ZOOM = 13

// Must stay in sync with firestore.rules
export const REPORT_COOLDOWN_SECONDS = 60
export const DAILY_REPORT_LIMIT = 20
export const REPORT_TTL_HOURS = 24
export const RESTORED_THRESHOLD = 3
export const MAX_REPORT_DETAILS_LENGTH = 280

export const MESSAGE_COOLDOWN_SECONDS = 10
export const DAILY_MESSAGE_LIMIT = 100
export const MESSAGE_TTL_HOURS = 12
export const COMMUNITY_RADIUS_KM = 2

// 3 distinct reporters within 500m = "Verified Community Outage"
export const VERIFY_RADIUS_M = 500
export const VERIFY_MIN_USERS = 3

// Map pin and circle colours show *validation status*, not utility type:
// yellow = unconfirmed (< 3 reporters), red = verified (>= 3 reporters).
export const STATUS_COLORS = {
  unverified: '#facc15',
  verified: '#ff3b30',
}

/**
 * Icon and accent colours for the action bar, legend and profile list.
 * `accentLight` is a darker shade for light backgrounds where the neon accent
 * would otherwise have poor contrast; see accentFor() below.
 */
export const REPORT_TYPES = {
  power: {
    id: 'power',
    labelKey: 'type.power',
    shortKey: 'type.power.short',
    accent: '#f5ff3d',
    accentLight: '#a16207',
    iconName: 'power',
  },
  water: {
    id: 'water',
    labelKey: 'type.water',
    shortKey: 'type.water.short',
    accent: '#00e5ff',
    accentLight: '#0e7490',
    iconName: 'water',
  },
  fuel: {
    id: 'fuel',
    labelKey: 'type.fuel',
    shortKey: 'type.fuel.short',
    accent: '#ff9500',
    accentLight: '#c2410c',
    iconName: 'fuel',
  },
}

export function accentFor(type, isDark) {
  return isDark ? type.accent : (type.accentLight ?? type.accent)
}

export const REPORT_TYPE_LIST = [REPORT_TYPES.power]

// Nouakchott's 9 moughataas (regions), each with its center, radius, and
// bounding polygon for region-level power & fuel status visualization.
export const NEIGHBOURHOODS = [
  {
    id: 'tevragh-zeina',
    name: 'Tevragh Zeina',
    lat: 18.103,
    lng: -15.982,
    radiusM: 2600,
    polygon: [
      [18.122, -16.005],
      [18.122, -15.968],
      [18.084, -15.968],
      [18.084, -16.005],
    ],
  },
  {
    id: 'ksar',
    name: 'Ksar',
    lat: 18.091,
    lng: -15.956,
    radiusM: 2200,
    polygon: [
      [18.108, -15.968],
      [18.108, -15.943],
      [18.075, -15.943],
      [18.075, -15.968],
    ],
  },
  {
    id: 'sebkha',
    name: 'Sebkha',
    lat: 18.072,
    lng: -15.989,
    radiusM: 2200,
    polygon: [
      [18.084, -16.008],
      [18.084, -15.973],
      [18.062, -15.973],
      [18.062, -16.008],
    ],
  },
  {
    id: 'el-mina',
    name: 'El Mina',
    lat: 18.054,
    lng: -15.975,
    radiusM: 2500,
    polygon: [
      [18.062, -16.002],
      [18.062, -15.958],
      [18.036, -15.958],
      [18.036, -16.002],
    ],
  },
  {
    id: 'arafat',
    name: 'Arafat',
    lat: 18.046,
    lng: -15.947,
    radiusM: 2600,
    polygon: [
      [18.075, -15.958],
      [18.075, -15.928],
      [18.032, -15.928],
      [18.032, -15.958],
    ],
  },
  {
    id: 'riyad',
    name: 'Riyad',
    lat: 18.012,
    lng: -15.945,
    radiusM: 2800,
    polygon: [
      [18.032, -15.968],
      [18.032, -15.922],
      [17.988, -15.922],
      [17.988, -15.968],
    ],
  },
  {
    id: 'dar-naim',
    name: 'Dar Naim',
    lat: 18.113,
    lng: -15.928,
    radiusM: 2600,
    polygon: [
      [18.132, -15.943],
      [18.132, -15.908],
      [18.095, -15.908],
      [18.095, -15.943],
    ],
  },
  {
    id: 'teyarett',
    name: 'Teyarett',
    lat: 18.128,
    lng: -15.962,
    radiusM: 2500,
    polygon: [
      [18.148, -15.978],
      [18.148, -15.943],
      [18.108, -15.943],
      [18.108, -15.978],
    ],
  },
  {
    id: 'toujounine',
    name: 'Toujounine',
    lat: 18.078,
    lng: -15.906,
    radiusM: 2800,
    polygon: [
      [18.095, -15.928],
      [18.095, -15.878],
      [18.055, -15.878],
      [18.055, -15.928],
    ],
  },
]

// Official notices cover a whole neighbourhood rather than a single address.
export const ANNOUNCEMENT_RADIUS_M = 2000
export const ANNOUNCEMENT_MAX_HOURS = 48
export const ANNOUNCEMENT_DEFAULT_HOURS = 4
export const MAX_ANNOUNCEMENT_LENGTH = 500
export const OFFICIAL_COLOR = '#8b5cf6'

// Top-reviewed fuel stations across Nouakchott's regions (4.5★+ with verified review counts).
export const GAS_STATIONS = [
  {
    id: 'total-tevragh-zeina',
    name: 'TotalEnergies Tevragh Zeina',
    brand: 'TotalEnergies',
    regionId: 'tevragh-zeina',
    area: 'Tevragh Zeina · Av. Charles de Gaulle',
    rating: 4.9,
    reviews: 342,
    lat: 18.1012,
    lng: -15.9785,
  },
  {
    id: 'vivo-shell-clinique',
    name: 'Shell / Vivo Energy Clinique',
    brand: 'Shell',
    regionId: 'tevragh-zeina',
    area: 'Tevragh Zeina · Carrefour Clinique',
    rating: 4.8,
    reviews: 289,
    lat: 18.0895,
    lng: -15.9764,
  },
  {
    id: 'total-bmd',
    name: 'TotalEnergies Carrefour BMD',
    brand: 'TotalEnergies',
    regionId: 'ksar',
    area: 'Ksar · Av. Gamal Abdel Nasser',
    rating: 4.8,
    reviews: 310,
    lat: 18.0858,
    lng: -15.9698,
  },
  {
    id: 'shell-madrid',
    name: 'Shell Carrefour Madrid',
    brand: 'Shell',
    regionId: 'ksar',
    area: 'Ksar · Carrefour Madrid',
    rating: 4.7,
    reviews: 264,
    lat: 18.0762,
    lng: -15.9554,
  },
  {
    id: 'maurioil-sebkha',
    name: 'MauriOil Sebkha Capitale',
    brand: 'MauriOil',
    regionId: 'sebkha',
    area: 'Sebkha · Marché Capitale',
    rating: 4.6,
    reviews: 198,
    lat: 18.0782,
    lng: -15.9845,
  },
  {
    id: 'total-el-mina',
    name: 'TotalEnergies El Mina Port',
    brand: 'TotalEnergies',
    regionId: 'el-mina',
    area: 'El Mina · Route du Port',
    rating: 4.7,
    reviews: 215,
    lat: 18.0574,
    lng: -15.9715,
  },
  {
    id: 'total-arafat',
    name: 'TotalEnergies Arafat',
    brand: 'TotalEnergies',
    regionId: 'arafat',
    area: 'Arafat · Route de Rosso',
    rating: 4.8,
    reviews: 276,
    lat: 18.0535,
    lng: -15.9512,
  },
  {
    id: 'star-oil-poteau-3',
    name: 'Star Oil Poteau 3',
    brand: 'Star Oil',
    regionId: 'arafat',
    area: 'Arafat · Poteau 3',
    rating: 4.6,
    reviews: 184,
    lat: 18.0468,
    lng: -15.9445,
  },
  {
    id: 'total-pk7',
    name: 'TotalEnergies PK 7 Riyad',
    brand: 'TotalEnergies',
    regionId: 'riyad',
    area: 'Riyad · PK 7 Route de Rosso',
    rating: 4.7,
    reviews: 192,
    lat: 18.0185,
    lng: -15.9428,
  },
  {
    id: 'total-teyarett',
    name: 'TotalEnergies Teyarett',
    brand: 'TotalEnergies',
    regionId: 'teyarett',
    area: 'Teyarett · Route de Nouadhibou',
    rating: 4.8,
    reviews: 231,
    lat: 18.1245,
    lng: -15.9685,
  },
  {
    id: 'star-oil-dar-naim',
    name: 'Star Oil Dar Naim',
    brand: 'Star Oil',
    regionId: 'dar-naim',
    area: 'Dar Naim · Carrefour Tensoueilim',
    rating: 4.6,
    reviews: 167,
    lat: 18.1165,
    lng: -15.9355,
  },
  {
    id: 'total-toujounine',
    name: 'TotalEnergies Toujounine',
    brand: 'TotalEnergies',
    regionId: 'toujounine',
    area: 'Toujounine · Route de l’Espoir',
    rating: 4.7,
    reviews: 208,
    lat: 18.0842,
    lng: -15.9085,
  },
]
