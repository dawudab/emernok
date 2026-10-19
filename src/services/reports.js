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
  updateDoc,
  where,
} from 'firebase/firestore'
import { OperationType, auth, db, handleFirestoreError } from '../firebaseConfig'
import {
  DAILY_REPORT_LIMIT,
  MAX_REPORT_DETAILS_LENGTH,
  REPORT_COOLDOWN_SECONDS,
  REPORT_TTL_HOURS,
  REPORT_TYPES,
  RESTORED_THRESHOLD,
  STALE_REPORT_DIM_HOURS,
  WORKING_REPORT_TTL_HOURS,
} from '../constants'

const REPORTS_COLLECTION = 'reports'
const USER_STATS_COLLECTION = 'userStats'
const REPORTS_CACHE_KEY = 'nem.cachedReports.v1'
const ACTIVE_REPORT_KEY_PREFIX = 'emernok_active_report_'
const MAX_REPORTS = 200
const DAY_MS = 24 * 60 * 60 * 1000

export const VOTE_STILL_OUT = 'still_out'
export const VOTE_RESTORED = 'restored'

export function toMillis(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.seconds === 'number') return value.seconds * 1000
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export function getReportLastUpdatedMs(report) {
  if (!report) return 0
  return (
    toMillis(report.lastUpdatedAt) ||
    toMillis(report.resolvedAt) ||
    toMillis(report.createdAt) ||
    report.lastUpdatedAtMs ||
    report.createdAtMs ||
    0
  )
}

/**
 * Formats any timestamp into a concise, human-friendly relative string
 * (e.g. "8m ago", "منذ 8 د", "il y a 8 min").
 */
export function formatRelativeTime(value, lang = 'en') {
  const ms = toMillis(value)
  if (!ms) {
    return lang === 'ar' ? 'الآن' : lang === 'fr' ? "À l'instant" : 'Just now'
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (diffSec < 60) {
    return lang === 'ar' ? 'الآن' : lang === 'fr' ? "À l'instant" : 'Just now'
  }
  const mins = Math.floor(diffSec / 60)
  if (mins < 60) {
    if (lang === 'ar') return `منذ ${mins} د`
    if (lang === 'fr') return `il y a ${mins} min`
    return `${mins}m ago`
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    if (lang === 'ar') return `منذ ${hours} س`
    if (lang === 'fr') return `il y a ${hours} h`
    return `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  if (lang === 'ar') return `منذ ${days} ي`
  if (lang === 'fr') return `il y a ${days} j`
  return `${days}d ago`
}

export function getReportStartTimeMs(report) {
  if (!report) return Date.now()
  if (report.outageStartedAt) {
    const parsed = Date.parse(report.outageStartedAt)
    if (!Number.isNaN(parsed) && parsed > 0) return parsed
  }
  return (
    toMillis(report.createdAt) ||
    report.createdAtMs ||
    toMillis(report.lastUpdatedAt) ||
    report.lastUpdatedAtMs ||
    Date.now()
  )
}

export function formatDurationHMS(seconds) {
  const totalSecs = Math.max(0, Math.floor(seconds))
  const hrs = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (hrs > 0) {
    return `${hrs}h ${pad(mins)}m ${pad(secs)}s`
  }
  return `${pad(mins)}m ${pad(secs)}s`
}

export function formatTimerDigital(seconds) {
  const totalSecs = Math.max(0, Math.floor(seconds))
  const hrs = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
}

export function readCachedReports() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(REPORTS_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && REPORT_TYPES[item.type] && item.lat != null)
      .map((item) => ({
        ...item,
        createdAt: item.createdAtMs
          ? Timestamp.fromMillis(item.createdAtMs)
          : null,
        lastUpdatedAt: item.lastUpdatedAtMs
          ? Timestamp.fromMillis(item.lastUpdatedAtMs)
          : null,
        resolvedAt: item.resolvedAtMs
          ? Timestamp.fromMillis(item.resolvedAtMs)
          : null,
      }))
  } catch {
    return []
  }
}

function writeCachedReports(reports) {
  if (typeof window === 'undefined') return
  try {
    const serializable = reports.slice(0, 120).map((report) => ({
      ...report,
      createdAtMs: toMillis(report.createdAt) || report.createdAtMs || null,
      lastUpdatedAtMs:
        toMillis(report.lastUpdatedAt) || report.lastUpdatedAtMs || null,
      resolvedAtMs: toMillis(report.resolvedAt) || report.resolvedAtMs || null,
    }))
    window.localStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(serializable))
  } catch {
    // Ignore storage quota errors
  }
}

export function saveLocalActiveReport(uid, reportSummary) {
  if (typeof window === 'undefined' || !uid) return
  try {
    const key = `${ACTIVE_REPORT_KEY_PREFIX}${uid}`
    if (!reportSummary) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, JSON.stringify(reportSummary))
    }
  } catch {
    // Ignore storage errors
  }
}

export function readLocalActiveReport(uid) {
  if (typeof window === 'undefined' || !uid) return null
  try {
    const raw = window.localStorage.getItem(`${ACTIVE_REPORT_KEY_PREFIX}${uid}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.id) return null
    const ageHours =
      (Date.now() - (parsed.lastUpdatedAtMs || parsed.createdAtMs || 0)) /
      (3600 * 1000)
    if (ageHours > REPORT_TTL_HOURS) {
      window.localStorage.removeItem(`${ACTIVE_REPORT_KEY_PREFIX}${uid}`)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

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

export function isWithinHours(report, hours = REPORT_TTL_HOURS) {
  const refMs = getReportLastUpdatedMs(report) || toMillis(report.createdAt)
  if (!refMs) return true
  return Date.now() - refMs <= hours * 60 * 60 * 1000
}

export function isStaleUnconfirmed(report) {
  if (!report || report.status === 'working' || report.status === 'resolved') {
    return false
  }
  const refMs = getReportLastUpdatedMs(report) || toMillis(report.createdAt)
  if (!refMs) return false
  return Date.now() - refMs >= STALE_REPORT_DIM_HOURS * 60 * 60 * 1000
}

/**
 * Returns true if the report represents a resolved outage or positive working report.
 */
export function isWorkingOrResolved(report) {
  if (!report) return false
  if (report.status === 'working' || report.status === 'resolved') return true
  const restored = report.restoredCount ?? 0
  return restored >= RESTORED_THRESHOLD && restored > (report.stillOutCount ?? 0)
}

// Legacy helper for checking if an outage is no longer an active outage
export function isResolved(report) {
  if (report.reportMode === 'past') return true
  return isWorkingOrResolved(report)
}

/**
 * Finds the user's most recent unresolved live outage report so we can prompt
 * for follow-up ("Still Out" vs "Power is Back!") or gate new live reports.
 */
export function findUserActiveOutageReport(reports = [], uid) {
  if (!uid) return null
  const matching = (reports || [])
    .filter(
      (r) =>
        r &&
        r.uid === uid &&
        r.reportMode !== 'past' &&
        r.status !== 'working' &&
        r.status !== 'resolved' &&
        !isWorkingOrResolved(r) &&
        isWithinHours(r, REPORT_TTL_HOURS),
    )
    .sort((a, b) => getReportLastUpdatedMs(b) - getReportLastUpdatedMs(a))

  if (matching.length > 0) {
    return matching[0]
  }
  return null
}

/**
 * Writes the report and the author's rate-limit counter in one transaction.
 * Supports:
 * - status: 'outage' | 'working'
 * - reportMode: 'current' | 'past' (unrestricted historical logging)
 * - outageStartedAt, durationHours, cause, details, isOfficial
 */
export async function createReport({
  uid,
  type = 'power',
  status = 'outage',
  lat,
  lng,
  details,
  reportMode = 'current',
  outageStartedAt = '',
  durationHours = 0,
  cause = 'unplanned',
  isOfficial = false,
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
  const validStatus =
    status === 'working'
      ? 'working'
      : status === 'resolved'
        ? 'resolved'
        : 'outage'
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

      const isAdminUser = auth.currentUser?.email === 'davionbase@gmail.com'

      if (statsSnap.exists()) {
        const stats = statsSnap.data()
        const sinceLast = now - toMillis(stats.lastReportAt)
        // Past outage reports and admin are unrestricted by short cooldowns; live reports enforce cooldown
        if (!isAdminUser && validMode === 'current' && sinceLast < REPORT_COOLDOWN_SECONDS * 1000) {
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
          if (!isAdminUser && stats.dailyCount >= DAILY_REPORT_LIMIT) {
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
        status: validStatus,
        lat: Number(lat),
        lng: Number(lng),
        geohash: geohashForLocation([Number(lat), Number(lng)]),
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        stillOutCount: 0,
        restoredCount: 0,
        reportMode: validMode,
        cause: validCause,
        durationHours: parsedDuration,
      }
      if (isOfficial) {
        payload.isOfficial = true
      }
      if (trimmedStart) {
        payload.outageStartedAt = trimmedStart
      }
      if (trimmedDetails) {
        payload.details = trimmedDetails
      }
      transaction.set(reportRef, payload)
    })

    if (validMode === 'current' && validStatus === 'outage') {
      saveLocalActiveReport(uid, {
        id: reportRef.id,
        uid,
        type,
        status: 'outage',
        lat: Number(lat),
        lng: Number(lng),
        createdAtMs: Date.now(),
        lastUpdatedAtMs: Date.now(),
      })
    } else if (validStatus === 'working') {
      saveLocalActiveReport(uid, null)
    }
  } catch (error) {
    if (error instanceof TranslatableError) throw error
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.CREATE, REPORTS_COLLECTION)
    }
    throw error
  }

  return reportRef.id
}

/**
 * Author or community confirms an active outage is still ongoing:
 * bumps `lastUpdatedAt` and `stillOutCount` so the pin stays fresh.
 */
export async function confirmReportStillOut({ reportId, uid }) {
  if (!db) throw new Error('Firebase is not configured')
  if (!reportId) throw new Error('Missing report ID')

  const reportRef = doc(db, REPORTS_COLLECTION, reportId)
  try {
    await updateDoc(reportRef, {
      stillOutCount: increment(1),
      lastUpdatedAt: serverTimestamp(),
      status: 'outage',
    })
    if (uid) {
      const existing = readLocalActiveReport(uid)
      if (existing && existing.id === reportId) {
        saveLocalActiveReport(uid, {
          ...existing,
          lastUpdatedAtMs: Date.now(),
        })
      }
    }
  } catch (error) {
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

/**
 * Marks an active outage report as resolved ("Power is Back!"), recording
 * `resolvedAt` and transitioning the pin to the Emerald Green "Working / Restored" state.
 */
export async function resolveUserReport({ reportId, uid }) {
  if (!db) throw new Error('Firebase is not configured')
  if (!reportId) throw new Error('Missing report ID')

  const reportRef = doc(db, REPORTS_COLLECTION, reportId)
  try {
    await updateDoc(reportRef, {
      status: 'resolved',
      restoredCount: increment(1),
      resolvedAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
    })
    if (uid) {
      saveLocalActiveReport(uid, null)
    }
  } catch (error) {
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

export async function deleteReport(reportId, uid) {
  if (!db) throw new Error('Firebase is not configured')
  if (!reportId) throw new Error('Missing report ID')

  try {
    await deleteDoc(doc(db, REPORTS_COLLECTION, reportId))
    if (uid) {
      const active = readLocalActiveReport(uid)
      if (active?.id === reportId) {
        saveLocalActiveReport(uid, null)
      }
    }
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

const attemptedPurgeReportIds = new Set()

export async function purgeExpiredUnverifiedReports(expiredReports) {
  if (!db || !auth?.currentUser || !expiredReports?.length) return
  const pending = expiredReports.filter(
    (report) => report?.id && !attemptedPurgeReportIds.has(report.id),
  )
  if (pending.length === 0) return
  for (const report of pending) {
    attemptedPurgeReportIds.add(report.id)
  }
  await Promise.allSettled(
    pending.map((report) => deleteDoc(doc(db, REPORTS_COLLECTION, report.id))),
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
      const reportSnap = await transaction.get(reportRef)
      if (!reportSnap.exists()) {
        throw new Error('That report is no longer available.')
      }

      const data = reportSnap.data()
      const nextStillOut =
        (data.stillOutCount ?? 0) + (value === VOTE_STILL_OUT ? 1 : 0)
      const nextRestored =
        (data.restoredCount ?? 0) + (value === VOTE_RESTORED ? 1 : 0)

      const updates = {
        [value === VOTE_RESTORED ? 'restoredCount' : 'stillOutCount']:
          increment(1),
        lastUpdatedAt: serverTimestamp(),
      }

      if (
        value === VOTE_RESTORED &&
        nextRestored >= RESTORED_THRESHOLD &&
        nextRestored > nextStillOut
      ) {
        updates.status = 'resolved'
        updates.resolvedAt = serverTimestamp()
      }

      transaction.set(voteRef, { uid, value, createdAt: serverTimestamp() })
      transaction.update(reportRef, updates)
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
    (snapshot) => {
      const mapped = mapSnapshot(snapshot)
      writeCachedReports(mapped)
      onReports(mapped)
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

export { WORKING_REPORT_TTL_HOURS }

