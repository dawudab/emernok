// Centred on Nouakchott, Mauritania
export const NOUAKCHOTT_CENTER = [18.0735, -15.9582]
export const DEFAULT_ZOOM = 13

// Must stay in sync with firestore.rules
export const REPORT_COOLDOWN_SECONDS = 60
export const DAILY_REPORT_LIMIT = 20
export const REPORT_TTL_HOURS = 24
export const PAST_OUTAGE_MAX_DAYS = 7
export const RESTORED_THRESHOLD = 3
export const MAX_REPORT_DETAILS_LENGTH = 280

export const MESSAGE_COOLDOWN_SECONDS = 10
export const DAILY_MESSAGE_LIMIT = 100
export const MESSAGE_TTL_HOURS = 72 // 3 days across all chat channels
export const COMMUNITY_RADIUS_KM = 2

// Over 10 people (11+) must report no gas before a station is marked Out of Gas
export const NO_GAS_MIN_REPORTS = 11

// 3 distinct reporters within ~200ft (60m) = "Verified Community Outage"
// Individual report circle covers the immediate ~150ft (45m) area around the user
export const REPORT_PIN_RADIUS_M = 45
export const VERIFY_RADIUS_M = 60
export const VERIFY_MIN_USERS = 3

// Map pin and circle colours show *validation status*, not utility type:
// yellow = unconfirmed (< 3 reporters), red = verified (>= 3 reporters).
export const STATUS_COLORS = {
  unverified: '#facc15',
  verified: '#ff3b30',
}

/**
 * Icon and accent colours for the action bar, legend and profile list.
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

export function getLocalName(item, lang = 'ar') {
  if (!item) return ''
  return lang === 'ar' ? (item.nameAr ?? item.name) : item.name
}

export function getLocalArea(item, lang = 'ar') {
  if (!item) return ''
  return lang === 'ar' ? (item.areaAr ?? item.area) : item.area
}

function mid(a, b, t = 0.5) {
  return [
    Number((a[0] + (b[0] - a[0]) * t).toFixed(5)),
    Number((a[1] + (b[1] - a[1]) * t).toFixed(5)),
  ]
}

function centroid(pts) {
  const sum = pts.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0])
  return [
    Number((sum[0] / pts.length).toFixed(5)),
    Number((sum[1] / pts.length).toFixed(5)),
  ]
}

function carveOrganicSubNeighbourhoods(
  regionId,
  names,
  namesAr,
  chains,
  hubPoint,
) {
  return chains.map((outerChain, index) => {
    const polygon = [...outerChain, hubPoint]
    const [lat, lng] = centroid(polygon)
    return {
      id: `${regionId}-q${index + 1}`,
      regionId,
      name: names[index],
      nameAr: namesAr?.[index] ?? names[index],
      lat,
      lng,
      polygon,
    }
  })
}

// Primary shared boundary vertices across Nouakchott (North to South, West to East)
const V = {
  // Atlantic Coastline (West boundary)
  C_N1: [18.152, -16.022],
  C_N2: [18.128, -16.025],
  C_N3: [18.106, -16.026],
  C_TZ_SB: [18.085, -16.027],
  C_SB_MID: [18.073, -16.028],
  C_SB_EM: [18.061, -16.029],
  C_EM_MID: [18.046, -16.03],
  C_EM_RY: [18.029, -16.028],
  C_RY_MID: [18.008, -16.025],
  C_S1: [17.986, -16.018],

  // Northern Desert Perimeter
  N_TZ_MID: [18.154, -15.996],
  N_TZ_TY: [18.153, -15.972],
  N_TY_MID: [18.155, -15.955],
  N_TY_DN: [18.152, -15.938],
  N_DN_MID: [18.149, -15.908],
  N_E1: [18.142, -15.878],

  // Upper Interior Corridor (Route de Nouadhibou & Route d'Akjoujt junctions)
  J_TZ_TY_MID: [18.131, -15.974],
  J_TZ_TY_KS: [18.112, -15.971],
  J_TY_KS_MID: [18.11, -15.954],
  J_TY_DN_MID: [18.132, -15.941],
  J_TY_DN_KS: [18.107, -15.939],
  J_DN_KS_TJ: [18.104, -15.926],
  J_DN_TJ_MID: [18.106, -15.901],
  E_DN_TJ: [18.108, -15.874],

  // Central Corridor (Av. Gamal Abdel Nasser, Capitale, BMD, Carrefour Madrid)
  J_TZ_KS_MID: [18.097, -15.972],
  J_TZ_SB_KS: [18.084, -15.976],
  J_TZ_SB_MID: [18.085, -16.002],
  J_SB_KS_MID: [18.074, -15.974],
  J_SB_EM_KS: [18.063, -15.973],
  J_SB_EM_MID: [18.062, -16.001],

  // Madrid & Route de l'Espoir Corridor
  J_KS_AR_W: [18.072, -15.961],
  J_KS_AR_MID: [18.075, -15.946],
  J_KS_TJ_AR: [18.077, -15.93],
  J_KS_TJ_MID: [18.091, -15.928],

  // Southern Interior Corridor (Route de Rosso & Toujounine Sud)
  J_EM_AR_MID: [18.051, -15.962],
  J_EM_AR_RY: [18.033, -15.963],
  J_EM_RY_MID: [18.031, -15.995],
  J_AR_TJ_MID: [18.056, -15.927],
  J_AR_TJ_RY: [18.035, -15.922],
  J_AR_RY_MID: [18.034, -15.943],

  // Eastern & Southern Perimeter
  E_TJ_MID: [18.072, -15.869],
  E_TJ_RY: [18.037, -15.876],
  J_TJ_RY_MID: [18.036, -15.899],
  E_RY_MID: [18.01, -15.884],
  S_RY_E: [17.984, -15.895],
  S_RY_MID1: [17.982, -15.938],
  S_RY_MID2: [17.984, -15.978],
}

export const NEIGHBOURHOODS = [
  {
    id: 'tevragh-zeina',
    name: 'Tevragh Zeina',
    nameAr: 'تفرغ زينة',
    lat: 18.116,
    lng: -15.998,
    radiusM: 2800,
    polygon: [
      V.C_N1,
      V.N_TZ_MID,
      V.N_TZ_TY,
      V.J_TZ_TY_MID,
      V.J_TZ_TY_KS,
      V.J_TZ_KS_MID,
      V.J_TZ_SB_KS,
      V.J_TZ_SB_MID,
      V.C_TZ_SB,
      V.C_N3,
      V.C_N2,
    ],
    subNeighbourhoods: carveOrganicSubNeighbourhoods(
      'tevragh-zeina',
      [
        'Plage Nord & Ribat',
        'Ambassades & Stade Olympique',
        'Ilot K, C & Clinique',
        'Socogim PS & Las Palmas',
      ],
      [
        'الشاطئ الشمالي والرباط',
        'حي السفارات والملعب الأولمبي',
        'إيلو K و C والعيادة',
        'سوكوجيم PS ولاس بالماس',
      ],
      [
        [V.C_N2, V.C_N1, V.N_TZ_MID],
        [V.N_TZ_MID, V.N_TZ_TY, V.J_TZ_TY_MID, V.J_TZ_TY_KS],
        [V.J_TZ_TY_KS, V.J_TZ_KS_MID, V.J_TZ_SB_KS, V.J_TZ_SB_MID],
        [V.J_TZ_SB_MID, V.C_TZ_SB, V.C_N3, V.C_N2],
      ],
      [18.115, -15.997],
    ),
  },
  {
    id: 'teyarett',
    name: 'Teyarett',
    nameAr: 'تيارت',
    lat: 18.131,
    lng: -15.956,
    radiusM: 2500,
    polygon: [
      V.N_TZ_TY,
      V.N_TY_MID,
      V.N_TY_DN,
      V.J_TY_DN_MID,
      V.J_TY_DN_KS,
      V.J_TY_KS_MID,
      V.J_TZ_TY_KS,
      V.J_TZ_TY_MID,
    ],
    subNeighbourhoods: carveOrganicSubNeighbourhoods(
      'teyarett',
      [
        'Teyarett Nord-Ouest',
        'Ain Talh & Nord-Est',
        'Teyarett Sud / Marché',
        'Carrefour Teyarett',
      ],
      [
        'تيارت الشمال الغربي',
        'عين الطلح والشمال الشرقي',
        'تيارت الجنوبية والسوق',
        'ملتقى طرق تيارت',
      ],
      [
        [V.J_TZ_TY_MID, V.N_TZ_TY, V.N_TY_MID],
        [V.N_TY_MID, V.N_TY_DN, V.J_TY_DN_MID],
        [V.J_TY_DN_MID, V.J_TY_DN_KS, V.J_TY_KS_MID],
        [V.J_TY_KS_MID, V.J_TZ_TY_KS, V.J_TZ_TY_MID],
      ],
      [18.131, -15.956],
    ),
  },
  {
    id: 'dar-naim',
    name: 'Dar Naim',
    nameAr: 'دار النعيم',
    lat: 18.128,
    lng: -15.908,
    radiusM: 2800,
    polygon: [
      V.N_TY_DN,
      V.N_DN_MID,
      V.N_E1,
      V.E_DN_TJ,
      V.J_DN_TJ_MID,
      V.J_DN_KS_TJ,
      V.J_TY_DN_KS,
      V.J_TY_DN_MID,
    ],
    subNeighbourhoods: carveOrganicSubNeighbourhoods(
      'dar-naim',
      [
        'Dar Naim Ouest',
        'Dar Naim Nord-Est',
        'Zaatar & Route d’Akjoujt',
        'Carrefour Tensoueilim',
      ],
      [
        'دار النعيم الغربية',
        'دار النعيم الشمال الشرقي',
        'الزعتر وطريق أكجوجت',
        'ملتقى تنسويلم',
      ],
      [
        [V.J_TY_DN_MID, V.N_TY_DN, V.N_DN_MID],
        [V.N_DN_MID, V.N_E1, mid(V.N_E1, V.E_DN_TJ)],
        [mid(V.N_E1, V.E_DN_TJ), V.E_DN_TJ, V.J_DN_TJ_MID],
        [V.J_DN_TJ_MID, V.J_DN_KS_TJ, V.J_TY_DN_KS, V.J_TY_DN_MID],
      ],
      [18.127, -15.91],
    ),
  },
  {
    id: 'sebkha',
    name: 'Sebkha',
    nameAr: 'السبخة',
    lat: 18.073,
    lng: -16.0,
    radiusM: 2200,
    polygon: [
      V.C_TZ_SB,
      V.J_TZ_SB_MID,
      V.J_TZ_SB_KS,
      V.J_SB_KS_MID,
      V.J_SB_EM_KS,
      V.J_SB_EM_MID,
      V.C_SB_EM,
      V.C_SB_MID,
    ],
    subNeighbourhoods: carveOrganicSubNeighbourhoods(
      'sebkha',
      [
        'Plage des Pêcheurs / Cinquième',
        'Marché Capitale Ouest',
        'Basra & Sebkha Est',
        'Sebkha Sud-Ouest',
      ],
      [
        'شاطئ الصيادين / السينكيم',
        'سوق العاصمة الغربي',
        'البصرة والسبخة الشرقية',
        'السبخة الجنوب الغربي',
      ],
      [
        [V.C_SB_MID, V.C_TZ_SB, V.J_TZ_SB_MID],
        [V.J_TZ_SB_MID, V.J_TZ_SB_KS, V.J_SB_KS_MID],
        [V.J_SB_KS_MID, V.J_SB_EM_KS, V.J_SB_EM_MID],
        [V.J_SB_EM_MID, V.C_SB_EM, V.C_SB_MID],
      ],
      [18.073, -16.0],
    ),
  },
  {
    id: 'ksar',
    name: 'Ksar',
    nameAr: 'القصر',
    lat: 18.091,
    lng: -15.952,
    radiusM: 2200,
    polygon: [
      V.J_TZ_TY_KS,
      V.J_TY_KS_MID,
      V.J_TY_DN_KS,
      V.J_DN_KS_TJ,
      V.J_KS_TJ_MID,
      V.J_KS_TJ_AR,
      V.J_KS_AR_MID,
      V.J_KS_AR_W,
      V.J_SB_EM_KS,
      V.J_SB_KS_MID,
      V.J_TZ_SB_KS,
      V.J_TZ_KS_MID,
    ],
    subNeighbourhoods: carveOrganicSubNeighbourhoods(
      'ksar',
      [
        'Ilot V & BMD Nord',
        'Ksar Ancien & Nord-Est',
        'Carrefour Madrid Nord',
        'Socogim K & Capitale Est',
      ],
      [
        'إيلو V و BMD شمال',
        'القصر القديم والشمال الشرقي',
        'ملتقى مدريد شمال',
        'سوكوجيم K وشرق العاصمة',
      ],
      [
        [V.J_TZ_KS_MID, V.J_TZ_TY_KS, V.J_TY_KS_MID],
        [V.J_TY_KS_MID, V.J_TY_DN_KS, V.J_DN_KS_TJ, V.J_KS_TJ_MID],
        [V.J_KS_TJ_MID, V.J_KS_TJ_AR, V.J_KS_AR_MID, V.J_KS_AR_W],
        [V.J_KS_AR_W, V.J_SB_EM_KS, V.J_SB_KS_MID, V.J_TZ_SB_KS, V.J_TZ_KS_MID],
      ],
      [18.091, -15.952],
    ),
  },
  {
    id: 'toujounine',
    name: 'Toujounine',
    nameAr: 'توجنين',
    lat: 18.072,
    lng: -15.901,
    radiusM: 3000,
    polygon: [
      V.J_DN_KS_TJ,
      V.J_DN_TJ_MID,
      V.E_DN_TJ,
      V.E_TJ_MID,
      V.E_TJ_RY,
      V.J_TJ_RY_MID,
      V.J_AR_TJ_RY,
      V.J_AR_TJ_MID,
      V.J_KS_TJ_AR,
      V.J_KS_TJ_MID,
    ],
    subNeighbourhoods: carveOrganicSubNeighbourhoods(
      'toujounine',
      [
        'Hay Saken & Mellah Nord',
        'Toujounine Nord-Est',
        'Tenweich & Route de l’Espoir',
        'Bouhdida & Toujounine Ouest',
      ],
      [
        'حي الساكن وملح الشمالي',
        'توجنين الشمال الشرقي',
        'تنويش وطريق الأمل',
        'بوحديدة وتوجنين الغربية',
      ],
      [
        [V.J_KS_TJ_MID, V.J_DN_KS_TJ, V.J_DN_TJ_MID],
        [V.J_DN_TJ_MID, V.E_DN_TJ, V.E_TJ_MID],
        [V.E_TJ_MID, V.E_TJ_RY, V.J_TJ_RY_MID, V.J_AR_TJ_RY],
        [V.J_AR_TJ_RY, V.J_AR_TJ_MID, V.J_KS_TJ_AR, V.J_KS_TJ_MID],
      ],
      [18.072, -15.902],
    ),
  },
  {
    id: 'el-mina',
    name: 'El Mina',
    nameAr: 'الميناء',
    lat: 18.047,
    lng: -15.995,
    radiusM: 2500,
    polygon: [
      V.C_SB_EM,
      V.J_SB_EM_MID,
      V.J_SB_EM_KS,
      V.J_KS_AR_W,
      V.J_EM_AR_MID,
      V.J_EM_AR_RY,
      V.J_EM_RY_MID,
      V.C_EM_RY,
      V.C_EM_MID,
    ],
    subNeighbourhoods: carveOrganicSubNeighbourhoods(
      'el-mina',
      [
        'Port & Zone Industrielle Nord',
        'Sixième & El Mina Centre',
        'Robinet & Route de Rosso Ouest',
        'Port de l’Amitié & Plage Sud',
      ],
      [
        'الميناء والمنطقة الصناعية',
        'السيزيم ووسط الميناء',
        'روبينيت وغرب طريق روصو',
        'ميناء الصداقة والشاطئ الجنوبي',
      ],
      [
        [V.C_EM_MID, V.C_SB_EM, V.J_SB_EM_MID],
        [V.J_SB_EM_MID, V.J_SB_EM_KS, V.J_KS_AR_W, V.J_EM_AR_MID],
        [V.J_EM_AR_MID, V.J_EM_AR_RY, V.J_EM_RY_MID],
        [V.J_EM_RY_MID, V.C_EM_RY, V.C_EM_MID],
      ],
      [18.047, -15.994],
    ),
  },
  {
    id: 'arafat',
    name: 'Arafat',
    nameAr: 'عرفات',
    lat: 18.054,
    lng: -15.944,
    radiusM: 2600,
    polygon: [
      V.J_KS_AR_W,
      V.J_KS_AR_MID,
      V.J_KS_TJ_AR,
      V.J_AR_TJ_MID,
      V.J_AR_TJ_RY,
      V.J_AR_RY_MID,
      V.J_EM_AR_RY,
      V.J_EM_AR_MID,
    ],
    subNeighbourhoods: carveOrganicSubNeighbourhoods(
      'arafat',
      [
        'Carrefour Madrid Sud',
        'Arafat Marché & Mosquée Nour',
        'Daya & Arafat Sud-Est',
        'Poteau 3 & Rosso Est',
      ],
      [
        'ملتقى مدريد جنوب',
        'سوق عرفات ومسجد النور',
        'الداية وعرفات الجنوب الشرقي',
        'العمود 3 وشرق طريق روصو',
      ],
      [
        [V.J_EM_AR_MID, V.J_KS_AR_W, V.J_KS_AR_MID],
        [V.J_KS_AR_MID, V.J_KS_TJ_AR, V.J_AR_TJ_MID],
        [V.J_AR_TJ_MID, V.J_AR_TJ_RY, V.J_AR_RY_MID],
        [V.J_AR_RY_MID, V.J_EM_AR_RY, V.J_EM_AR_MID],
      ],
      [18.054, -15.944],
    ),
  },
  {
    id: 'riyad',
    name: 'Riyad',
    nameAr: 'الرياض',
    lat: 18.009,
    lng: -15.952,
    radiusM: 3200,
    polygon: [
      V.C_EM_RY,
      V.J_EM_RY_MID,
      V.J_EM_AR_RY,
      V.J_AR_RY_MID,
      V.J_AR_TJ_RY,
      V.J_TJ_RY_MID,
      V.E_TJ_RY,
      V.E_RY_MID,
      V.S_RY_E,
      V.S_RY_MID1,
      V.S_RY_MID2,
      V.C_S1,
      V.C_RY_MID,
    ],
    subNeighbourhoods: carveOrganicSubNeighbourhoods(
      'riyad',
      [
        'PK 7 & Riyad Ouest',
        'PK 8 & Tarhil Nord-Est',
        'PK 10 & Riyad Sud-Est',
        'PK 9 & Dunes Sud-Ouest',
      ],
      [
        'الكيلومتر 7 وغرب الرياض',
        'الكيلومتر 8 والترحيل شمال شرق',
        'الكيلومتر 10 وجنوب شرق الرياض',
        'الكيلومتر 9 والكثبان الجنوبية',
      ],
      [
        [V.C_RY_MID, V.C_EM_RY, V.J_EM_RY_MID, V.J_EM_AR_RY],
        [V.J_EM_AR_RY, V.J_AR_RY_MID, V.J_AR_TJ_RY, V.J_TJ_RY_MID, V.E_TJ_RY],
        [V.E_TJ_RY, V.E_RY_MID, V.S_RY_E, V.S_RY_MID1],
        [V.S_RY_MID1, V.S_RY_MID2, V.C_S1, V.C_RY_MID],
      ],
      [18.009, -15.952],
    ),
  },
]

export const ALL_SUB_NEIGHBOURHOODS = NEIGHBOURHOODS.flatMap((region) =>
  region.subNeighbourhoods.map((sub) => ({
    ...sub,
    regionName: region.name,
    regionNameAr: region.nameAr,
  })),
)

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
    nameAr: 'توتال إنرجيز تفرغ زينة',
    brand: 'TotalEnergies',
    regionId: 'tevragh-zeina',
    area: 'Tevragh Zeina · Av. Charles de Gaulle',
    areaAr: 'تفرغ زينة · شارع شارل ديغول',
    rating: 4.9,
    reviews: 342,
    lat: 18.1012,
    lng: -15.9825,
  },
  {
    id: 'vivo-shell-clinique',
    name: 'Shell / Vivo Energy Clinique',
    nameAr: 'شل / فيفو إنرجي العيادة',
    brand: 'Shell',
    regionId: 'tevragh-zeina',
    area: 'Tevragh Zeina · Carrefour Clinique',
    areaAr: 'تفرغ زينة · ملتقى العيادة',
    rating: 4.8,
    reviews: 289,
    lat: 18.0895,
    lng: -15.9804,
  },
  {
    id: 'total-bmd',
    name: 'TotalEnergies Carrefour BMD',
    nameAr: 'توتال إنرجيز ملتقى BMD',
    brand: 'TotalEnergies',
    regionId: 'ksar',
    area: 'Ksar · Av. Gamal Abdel Nasser',
    areaAr: 'القصر · شارع جمال عبد الناصر',
    rating: 4.8,
    reviews: 310,
    lat: 18.0858,
    lng: -15.9648,
  },
  {
    id: 'shell-madrid',
    name: 'Shell Carrefour Madrid',
    nameAr: 'شل ملتقى مدريد',
    brand: 'Shell',
    regionId: 'ksar',
    area: 'Ksar · Carrefour Madrid',
    areaAr: 'القصر · ملتقى مدريد',
    rating: 4.7,
    reviews: 264,
    lat: 18.0782,
    lng: -15.9524,
  },
  {
    id: 'maurioil-sebkha',
    name: 'MauriOil Sebkha Capitale',
    nameAr: 'موري أويل السبخة العاصمة',
    brand: 'MauriOil',
    regionId: 'sebkha',
    area: 'Sebkha · Marché Capitale',
    areaAr: 'السبخة · سوق العاصمة',
    rating: 4.6,
    reviews: 198,
    lat: 18.0742,
    lng: -15.9885,
  },
  {
    id: 'total-el-mina',
    name: 'TotalEnergies El Mina Port',
    nameAr: 'توتال إنرجيز الميناء',
    brand: 'TotalEnergies',
    regionId: 'el-mina',
    area: 'El Mina · Route du Port',
    areaAr: 'الميناء · طريق الميناء',
    rating: 4.7,
    reviews: 215,
    lat: 18.0524,
    lng: -15.9825,
  },
  {
    id: 'total-arafat',
    name: 'TotalEnergies Arafat',
    nameAr: 'توتال إنرجيز عرفات',
    brand: 'TotalEnergies',
    regionId: 'arafat',
    area: 'Arafat · Route de Rosso',
    areaAr: 'عرفات · طريق روصو',
    rating: 4.8,
    reviews: 276,
    lat: 18.0535,
    lng: -15.9512,
  },
  {
    id: 'star-oil-poteau-3',
    name: 'Star Oil Poteau 3',
    nameAr: 'ستار أويل العمود 3',
    brand: 'Star Oil',
    regionId: 'arafat',
    area: 'Arafat · Poteau 3',
    areaAr: 'عرفات · العمود 3',
    rating: 4.6,
    reviews: 184,
    lat: 18.0468,
    lng: -15.9445,
  },
  {
    id: 'total-pk7',
    name: 'TotalEnergies PK 7 Riyad',
    nameAr: 'توتال إنرجيز الكيلومتر 7 الرياض',
    brand: 'TotalEnergies',
    regionId: 'riyad',
    area: 'Riyad · PK 7 Route de Rosso',
    areaAr: 'الرياض · الكيلومتر 7 طريق روصو',
    rating: 4.7,
    reviews: 192,
    lat: 18.0185,
    lng: -15.9488,
  },
  {
    id: 'total-teyarett',
    name: 'TotalEnergies Teyarett',
    nameAr: 'توتال إنرجيز تيارت',
    brand: 'TotalEnergies',
    regionId: 'teyarett',
    area: 'Teyarett · Route de Nouadhibou',
    areaAr: 'تيارت · طريق نواذيبو',
    rating: 4.8,
    reviews: 231,
    lat: 18.1245,
    lng: -15.9585,
  },
  {
    id: 'star-oil-dar-naim',
    name: 'Star Oil Dar Naim',
    nameAr: 'ستار أويل دار النعيم',
    brand: 'Star Oil',
    regionId: 'dar-naim',
    area: 'Dar Naim · Carrefour Tensoueilim',
    areaAr: 'دار النعيم · ملتقى تنسويلم',
    rating: 4.6,
    reviews: 167,
    lat: 18.1185,
    lng: -15.9225,
  },
  {
    id: 'total-toujounine',
    name: 'TotalEnergies Toujounine',
    nameAr: 'توتال إنرجيز توجنين',
    brand: 'TotalEnergies',
    regionId: 'toujounine',
    area: 'Toujounine · Route de l’Espoir',
    areaAr: 'توجنين · طريق الأمل',
    rating: 4.7,
    reviews: 208,
    lat: 18.0842,
    lng: -15.9045,
  },
]
