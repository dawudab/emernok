import { geohashForLocation } from 'geofire-common'
import {
  Timestamp,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import {
  DAILY_REPORT_LIMIT,
  REPORT_COOLDOWN_SECONDS,
  REPORT_TTL_HOURS,
  REPORT_TYPES,
  RESTORED_THRESHOLD,
} from '../constants'

const REPORTS_COLLECTION = 'reports'
const USER_STATS_COLLECTION = 'userStats'
const MAX_REPORTS = 200
const DAY_MS = 24 * 60 * 60 * 1000

export const VOTE_STILL_OUT = 'still_out'
export const VOTE_RESTORED = 'restored'

// Carry a translation key alongside the English message: these are the only
// service errors shown to users verbatim.
class TranslatableError extends Error {
  constructor(message, key, vars) {
    super(message)
    this.key = key
    this.vars = vars
  }
}

export class RateLimitError extends TranslatableError {}
export class AlreadyVotedError extends TranslatableError {}

export function ttlCutoff() {
  return Timestamp.fromMillis(Date.now() - REPORT_TTL_HOURS * 60 * 60 * 1000)
}

function toMillis(value) {
  return value?.toMillis?.() ?? 0
}

// Enough neighbours confirmed service is back, so stop showing the outage.
export function isResolved(report) {
  const restored = report.restoredCount ?? 0
  return restored >= RESTORED_THRESHOLD && restored > (report.stillOutCount ?? 0)
}

/**
 * Writes the report and the author's rate-limit counter in one transaction.
 * The rules require both halves (via getAfter), so a client cannot write a
 * report while skipping its own counter bump.
 */
export async function createReport({ uid, type, lat, lng }) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')
  if (!REPORT_TYPES[type]) throw new Error(`Unknown report type: ${type}`)

  const statsRef = doc(db, USER_STATS_COLLECTION, uid)
  const reportRef = doc(collection(db, REPORTS_COLLECTION))

  await runTransaction(db, async (transaction) => {
    const statsSnap = await transaction.get(statsRef)
    const now = Date.now()

    let dailyCount = 1
    let dayStartedAt = serverTimestamp()

    if (statsSnap.exists()) {
      const stats = statsSnap.data()
      const sinceLast = now - toMillis(stats.lastReportAt)
      if (sinceLast < REPORT_COOLDOWN_SECONDS * 1000) {
        const wait = Math.ceil((REPORT_COOLDOWN_SECONDS * 1000 - sinceLast) / 1000)
        throw new RateLimitError(
          `Please wait ${wait}s before sending another report.`,
          'error.cooldown',
          { seconds: wait },
        )
      }

      // Rolling 24h window, reset once it elapses.
      if (now - toMillis(stats.dayStartedAt) < DAY_MS) {
        if (stats.dailyCount >= DAILY_REPORT_LIMIT) {
          throw new RateLimitError(
            `Daily limit of ${DAILY_REPORT_LIMIT} reports reached. Try again later.`,
            'error.dailyLimit',
            { limit: DAILY_REPORT_LIMIT },
          )
        }
        dailyCount = stats.dailyCount + 1
        dayStartedAt = stats.dayStartedAt
      }
    }

    transaction.set(statsRef, {
      uid,
      lastReportAt: serverTimestamp(),
      dailyCount,
      dayStartedAt,
    })
    transaction.set(reportRef, {
      uid,
      type,
      lat,
      lng,
      geohash: geohashForLocation([lat, lng]),
      createdAt: serverTimestamp(),
      stillOutCount: 0,
      restoredCount: 0,
    })
  })

  return reportRef.id
}

/**
 * One vote per user per report. The vote document is the proof: rules only
 * accept the counter increment when the matching vote doc is created in the
 * same commit and did not already exist.
 */
export async function voteOnReport({ reportId, uid, value }) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')
  if (value !== VOTE_STILL_OUT && value !== VOTE_RESTORED) {
    throw new Error(`Unknown vote: ${value}`)
  }

  const reportRef = doc(db, REPORTS_COLLECTION, reportId)
  const voteRef = doc(db, REPORTS_COLLECTION, reportId, 'votes', uid)

  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(voteRef)).exists()) {
      throw new AlreadyVotedError(
        'You already responded to this report.',
        'error.alreadyVoted',
      )
    }
    if (!(await transaction.get(reportRef)).exists()) {
      throw new Error('That report is no longer available.')
    }

    transaction.set(voteRef, { uid, value, createdAt: serverTimestamp() })
    transaction.update(reportRef, {
      [value === VOTE_RESTORED ? 'restoredCount' : 'stillOutCount']: increment(1),
    })
  })
}

function mapSnapshot(snapshot) {
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((report) => REPORT_TYPES[report.type] && report.lat != null)
}

export function subscribeToReports(onReports, onError) {
  if (!db) return () => {}

  const reportsQuery = query(
    collection(db, REPORTS_COLLECTION),
    where('createdAt', '>=', ttlCutoff()),
    orderBy('createdAt', 'desc'),
    limit(MAX_REPORTS),
  )

  return onSnapshot(
    reportsQuery,
    (snapshot) => onReports(mapSnapshot(snapshot)),
    onError,
  )
}

export function subscribeToUserReports(uid, onReports, onError) {
  if (!db || !uid) return () => {}

  const userQuery = query(
    collection(db, REPORTS_COLLECTION),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20),
  )

  return onSnapshot(
    userQuery,
    (snapshot) => onReports(mapSnapshot(snapshot)),
    onError,
  )
}
