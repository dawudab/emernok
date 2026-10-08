import { distanceBetween, geohashForLocation } from 'geofire-common'
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import {
  COMMUNITY_RADIUS_KM,
  DAILY_MESSAGE_LIMIT,
  MESSAGE_COOLDOWN_SECONDS,
  MESSAGE_TTL_HOURS,
  NOUAKCHOTT_CENTER,
} from '../constants'
import { OperationType, db, handleFirestoreError } from '../firebaseConfig'
import {
  findRegionForPoint,
  findSubNeighbourhoodForPoint,
} from '../utils/regionStats'
import { RateLimitError } from './reports'

const MESSAGES_COLLECTION = 'messages'
const CHAT_STATS_COLLECTION = 'chatStats'
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_CHAT_MESSAGES = 200

export const MAX_MESSAGE_LENGTH = 300

function toMillis(value) {
  return value?.toMillis?.() ?? 0
}

function isPermissionError(error) {
  return (
    error?.code === 'permission-denied' ||
    error?.message?.includes('Missing or insufficient permissions')
  )
}

export async function sendMessage({
  uid,
  text,
  lat,
  lng,
  scope = 'radius',
  neighbourhoodId,
  neighbourhoodName,
  regionId,
  regionName,
}) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')

  const trimmed = text.trim()
  if (!trimmed) throw new Error('Message is empty')
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Keep messages under ${MAX_MESSAGE_LENGTH} characters`)
  }

  const safeLat = lat ?? NOUAKCHOTT_CENTER[0]
  const safeLng = lng ?? NOUAKCHOTT_CENTER[1]
  const validScope = ['radius', 'neighbourhood', 'region', 'global'].includes(
    scope,
  )
    ? scope
    : 'radius'

  const sub = findSubNeighbourhoodForPoint(safeLat, safeLng)
  const reg = findRegionForPoint(safeLat, safeLng)

  const statsRef = doc(db, CHAT_STATS_COLLECTION, uid)
  const messageRef = doc(collection(db, MESSAGES_COLLECTION))

  try {
    await runTransaction(db, async (transaction) => {
      const statsSnap = await transaction.get(statsRef)
      const now = Date.now()

      let dailyCount = 1
      let dayStartedAt = serverTimestamp()

      if (statsSnap.exists()) {
        const stats = statsSnap.data()
        const sinceLast = now - toMillis(stats.lastMessageAt)
        if (sinceLast < MESSAGE_COOLDOWN_SECONDS * 1000) {
          const wait = Math.ceil(
            (MESSAGE_COOLDOWN_SECONDS * 1000 - sinceLast) / 1000,
          )
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
        lat: safeLat,
        lng: safeLng,
        geohash: geohashForLocation([safeLat, safeLng]),
        scope: validScope,
        neighbourhoodId: (neighbourhoodId || sub.id).slice(0, 80),
        neighbourhoodName: (neighbourhoodName || sub.name).slice(0, 120),
        regionId: (regionId || reg.id).slice(0, 80),
        regionName: (regionName || reg.name).slice(0, 120),
        createdAt: serverTimestamp(),
      })
    })
  } catch (error) {
    if (error instanceof RateLimitError) throw error
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.CREATE, MESSAGES_COLLECTION)
    }
    throw error
  }
}

export async function purgeExpiredMessages(expiredMessages) {
  if (!db || !expiredMessages?.length) return
  await Promise.allSettled(
    expiredMessages.map((msg) =>
      deleteDoc(doc(db, MESSAGES_COLLECTION, msg.id)),
    ),
  )
}

/**
 * Subscribes to public community messages and filters by the active chat scope:
 * - 'radius': within radiusKm of center (based on user's current location)
 * - 'neighbourhood': strictly matching the user's current neighbourhoodId (not radius)
 * - 'region': strictly matching the user's current regionId
 * - 'global': city-wide Nouakchott chat
 * Messages older than MESSAGE_TTL_HOURS (72h / 3 days) disappear automatically.
 */
export function subscribeToCommunityMessages(
  {
    scope = 'radius',
    center,
    radiusKm = COMMUNITY_RADIUS_KM,
    neighbourhoodId,
    regionId,
  },
  onMessages,
  onError,
) {
  if (!db) return () => {}

  const messagesQuery = query(
    collection(db, MESSAGES_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(MAX_CHAT_MESSAGES),
  )

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const cutoff = Date.now() - MESSAGE_TTL_HOURS * 60 * 60 * 1000
      const active = []
      const expired = []

      for (const docSnap of snapshot.docs) {
        const message = { id: docSnap.id, ...docSnap.data() }
        if (message.lat == null || message.lng == null) continue

        const createdMs = toMillis(message.createdAt)
        if (createdMs && createdMs < cutoff) {
          expired.push(message)
          continue
        }

        const msgScope = message.scope || 'radius'
        const msgSubId =
          message.neighbourhoodId ||
          findSubNeighbourhoodForPoint(message.lat, message.lng).id
        const msgRegionId =
          message.regionId ||
          findRegionForPoint(message.lat, message.lng).id

        const distance = center
          ? distanceBetween(
              [center.lat, center.lng],
              [message.lat, message.lng],
            ) * 1000
          : null

        if (scope === 'radius') {
          if (!center) continue
          if (msgScope !== 'radius') continue
          if (distance == null || distance > radiusKm * 1000) continue
        } else if (scope === 'neighbourhood') {
          if (msgScope !== 'neighbourhood') continue
          if (neighbourhoodId && msgSubId !== neighbourhoodId) continue
        } else if (scope === 'region') {
          if (msgScope !== 'region') continue
          if (regionId && msgRegionId !== regionId) continue
        } else if (scope === 'global') {
          if (msgScope !== 'global') continue
        }

        active.push({
          ...message,
          distance,
          neighbourhoodId: msgSubId,
          regionId: msgRegionId,
        })
      }

      if (expired.length > 0) {
        purgeExpiredMessages(expired)
      }

      active.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))
      onMessages(active)
    },
    (error) => {
      if (isPermissionError(error)) {
        try {
          handleFirestoreError(error, OperationType.LIST, MESSAGES_COLLECTION)
        } catch (wrappedError) {
          onError?.(wrappedError)
          return
        }
      }
      onError?.(error)
    },
  )
}
