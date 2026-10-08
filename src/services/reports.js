import { geohashForLocation } from 'geofire-common'
import {
  Timestamp,
  collection,
  deleteDoc,
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
import { OperationType, db, handleFirestoreError } from '../firebaseConfig'
import {
  DAILY_REPORT_LIMIT,
  MAX_REPORT_DETAILS_LENGTH,
  REPORT_COOLDOWN_SECONDS,
  REPORT_TTL_HOURS,
  REPORT_TYPES,
  RESTORED_THRESHOLD,
} from '../constants'

const REPORTS_COLLECTION = 'reports'
const USER_STATS_COLLECTION = 'userStats'
const MAX_REPORTS = 250
const DAY_MS = 24 * 60 * 60 * 1000

export const VOTE_STILL_OUT = 'still_out'
export const VOTE_RESTORED = 'restored'

class TranslatableError extends Error {
  constructor(message, key, vars) {
    super(message)
    this.key = key
    this.vars = vars
  }
}

export class RateLimitError extends TranslatableError {}
export class AlreadyVotedError extends TranslatableError {}

function isPermissionError(error) {
  return (
    error?.code === 'permission-denied' ||
    error?.message?.includes('Missing or insufficient permissions')
  )
}

export function ttlCutoff() {
  return Timestamp.fromMillis(Date.now() - REPORT_TTL_HOURS * 60 * 60 * 1000)
}

function toMillis(value) {
  return value?.toMillis?.() ?? 0
}

export function isWithinHours(report, hours = REPORT_TTL_HOURS) {
  const createdMs = toMillis(report.createdAt)
  if (!createdMs) return true
  return Date.now() - createdMs <= hours * 60 * 60 * 1000
}

// Enough neighbours confirmed service is back, so stop showing the outage.
export function isResolved(report) {
  if (report.reportMode === 'past') return true
  const restored = report.restoredCount ?? 0
  return restored >= RESTORED_THRESHOLD && restored > (report.stillOutCount ?? 0)
}

/**
 * Writes the report and the author's rate-limit counter in one transaction.
 * Supports both current and past outages (up to 7 days), date/time, estimated
 * duration in hours, cause ('unplanned' | 'maintenance'), and optional details.
 */
export async function createReport({
  uid,
  type,
  lat,
  lng,
  details,
  reportMode = 'current',
  outageStartedAt = '',
  durationHours = 0,
  cause = 'unplanned',
}) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')
  if (!REPORT_TYPES[type]) throw new Error(`Unknown report type: ${type}`)

  const statsRef = doc(db, USER_STATS_COLLECTION, uid)
  const reportRef = doc(collection(db, REPORTS_COLLECTION))
  const trimmedDetails =
    typeof details === 'string'
      ? details.trim().slice(0, MAX_REPORT_DETAILS_LENGTH)
      : ''
  const validMode = reportMode === 'past' ? 'past' : 'current'
  const validCause = cause === 'maintenance' ? 'maintenance' : 'unplanned'
  const parsedDuration = Math.max(
    0,
    Math.min(168, Number(durationHours) || 0),
  )
  const trimmedStart =
    typeof outageStartedAt === 'string' ? outageStartedAt.slice(0, 40) : ''

  try {
    await runTransaction(db, async (transaction) => {
      const statsSnap = await transaction.get(statsRef)
      const now = Date.now()

      let dailyCount = 1
      let dayStartedAt = serverTimestamp()

      if (statsSnap.exists()) {
        const stats = statsSnap.data()
        const sinceLast = now - toMillis(stats.lastReportAt)
        if (sinceLast < REPORT_COOLDOWN_SECONDS * 1000) {
          const wait = Math.ceil(
            (REPORT_COOLDOWN_SECONDS * 1000 - sinceLast) / 1000,
          )
          throw new RateLimitError(
            `Please wait ${wait}s before sending another report.`,
            'error.cooldown',
            { seconds: wait },
          )
        }

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

      const payload = {
        uid,
        type,
        lat,
        lng,
        geohash: geohashForLocation([lat, lng]),
        createdAt: serverTimestamp(),
        stillOutCount: 0,
        restoredCount: 0,
        reportMode: validMode,
        cause: validCause,
        durationHours: parsedDuration,
      }
      if (trimmedStart) {
        payload.outageStartedAt = trimmedStart
      }
      if (trimmedDetails) {
        payload.details = trimmedDetails
      }
      transaction.set(reportRef, payload)
    })
  } catch (error) {
    if (error instanceof TranslatableError) throw error
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.CREATE, REPORTS_COLLECTION)
    }
    throw error
  }

  return reportRef.id
}

export async function deleteReport(reportId) {
  if (!db) throw new Error('Firebase is not configured')
  if (!reportId) throw new Error('Missing report ID')

  try {
    await deleteDoc(doc(db, REPORTS_COLLECTION, reportId))
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `${REPORTS_COLLECTION}/${reportId}`,
      )
    }
    throw error
  }
}

export async function purgeExpiredUnverifiedReports(expiredReports) {
  if (!db || !expiredReports?.length) return
  await Promise.allSettled(
    expiredReports.map((report) =>
      deleteDoc(doc(db, REPORTS_COLLECTION, report.id)),
    ),
  )
}

export async function voteOnReport({ reportId, uid, value }) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')
  if (value !== VOTE_STILL_OUT && value !== VOTE_RESTORED) {
    throw new Error(`Unknown vote: ${value}`)
  }

  const reportRef = doc(db, REPORTS_COLLECTION, reportId)
  const voteRef = doc(db, REPORTS_COLLECTION, reportId, 'votes', uid)

  try {
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
        [value === VOTE_RESTORED ? 'restoredCount' : 'stillOutCount']:
          increment(1),
      })
    })
  } catch (error) {
    if (error instanceof TranslatableError) throw error
    if (isPermissionError(error)) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${REPORTS_COLLECTION}/${reportId}`,
      )
    }
    throw error
  }
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
    orderBy('createdAt', 'desc'),
    limit(MAX_REPORTS),
  )

  return onSnapshot(
    reportsQuery,
    (snapshot) => onReports(mapSnapshot(snapshot)),
    (error) => {
      if (isPermissionError(error)) {
        try {
          handleFirestoreError(error, OperationType.LIST, REPORTS_COLLECTION)
        } catch (wrappedError) {
          onError?.(wrappedError)
          return
        }
      }
      onError?.(error)
    },
  )
}

export function subscribeToUserReports(uid, onReports, onError) {
  if (!db || !uid) return () => {}

  const userQuery = query(
    collection(db, REPORTS_COLLECTION),
    where('uid', '==', uid),
    limit(50),
  )

  return onSnapshot(
    userQuery,
    (snapshot) => {
      const sorted = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((report) => REPORT_TYPES[report.type] && report.lat != null)
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        .slice(0, 20)
      onReports(sorted)
    },
    (error) => {
      if (isPermissionError(error)) {
        try {
          handleFirestoreError(error, OperationType.LIST, REPORTS_COLLECTION)
        } catch (wrappedError) {
          onError?.(wrappedError)
          return
        }
      }
      onError?.(error)
    },
  )
}
