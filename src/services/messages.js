import { distanceBetween, geohashForLocation, geohashQueryBounds } from 'geofire-common'
import {
  collection,
  doc,
  endAt,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAt,
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import {
  COMMUNITY_RADIUS_KM,
  DAILY_MESSAGE_LIMIT,
  MESSAGE_COOLDOWN_SECONDS,
  MESSAGE_TTL_HOURS,
} from '../constants'
import { RateLimitError } from './reports'

const MESSAGES_COLLECTION = 'messages'
const CHAT_STATS_COLLECTION = 'chatStats'
const DAY_MS = 24 * 60 * 60 * 1000
const PER_BOUND_LIMIT = 60

export const MAX_MESSAGE_LENGTH = 300

function toMillis(value) {
  return value?.toMillis?.() ?? 0
}

export async function sendMessage({ uid, text, lat, lng }) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')

  const trimmed = text.trim()
  if (!trimmed) throw new Error('Message is empty')
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Keep messages under ${MAX_MESSAGE_LENGTH} characters`)
  }

  const statsRef = doc(db, CHAT_STATS_COLLECTION, uid)
  const messageRef = doc(collection(db, MESSAGES_COLLECTION))

  await runTransaction(db, async (transaction) => {
    const statsSnap = await transaction.get(statsRef)
    const now = Date.now()

    let dailyCount = 1
    let dayStartedAt = serverTimestamp()

    if (statsSnap.exists()) {
      const stats = statsSnap.data()
      const sinceLast = now - toMillis(stats.lastMessageAt)
      if (sinceLast < MESSAGE_COOLDOWN_SECONDS * 1000) {
        const wait = Math.ceil((MESSAGE_COOLDOWN_SECONDS * 1000 - sinceLast) / 1000)
        throw new RateLimitError(`Please wait ${wait}s before posting again.`)
      }
      if (now - toMillis(stats.dayStartedAt) < DAY_MS) {
        if (stats.dailyCount >= DAILY_MESSAGE_LIMIT) {
          throw new RateLimitError('Daily message limit reached.')
        }
        dailyCount = stats.dailyCount + 1
        dayStartedAt = stats.dayStartedAt
      }
    }

    transaction.set(statsRef, {
      uid,
      lastMessageAt: serverTimestamp(),
      dailyCount,
      dayStartedAt,
    })
    transaction.set(messageRef, {
      uid,
      text: trimmed,
      lat,
      lng,
      geohash: geohashForLocation([lat, lng]),
      createdAt: serverTimestamp(),
    })
  })
}

/**
 * Geohash range queries only approximate a circle, so each bound is a separate
 * listener and the results are merged, distance-filtered and time-filtered on
 * the client. Returns an unsubscribe for all of them.
 */
export function subscribeToNearbyMessages(center, onMessages, onError) {
  if (!db || !center) return () => {}

  const radiusM = COMMUNITY_RADIUS_KM * 1000
  const bounds = geohashQueryBounds([center.lat, center.lng], radiusM)
  const perBound = new Map()
  let cancelled = false

  const publish = () => {
    if (cancelled) return
    const cutoff = Date.now() - MESSAGE_TTL_HOURS * 60 * 60 * 1000
    const merged = new Map()

    for (const docs of perBound.values()) {
      for (const message of docs) {
        if (message.lat == null) continue
        const distance =
          distanceBetween([center.lat, center.lng], [message.lat, message.lng]) * 1000
        if (distance > radiusM) continue
        // Pending writes have a null timestamp; keep them so the author sees
        // their own message immediately.
        const createdAt = toMillis(message.createdAt)
        if (createdAt && createdAt < cutoff) continue
        merged.set(message.id, { ...message, distance })
      }
    }

    onMessages(
      [...merged.values()].sort(
        (a, b) => toMillis(a.createdAt) - toMillis(b.createdAt),
      ),
    )
  }

  const unsubscribes = bounds.map(([start, end], index) =>
    onSnapshot(
      query(
        collection(db, MESSAGES_COLLECTION),
        orderBy('geohash'),
        startAt(start),
        endAt(end),
        limit(PER_BOUND_LIMIT),
      ),
      (snapshot) => {
        perBound.set(
          index,
          snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        )
        publish()
      },
      onError,
    ),
  )

  return () => {
    cancelled = true
    for (const unsubscribe of unsubscribes) unsubscribe()
  }
}
