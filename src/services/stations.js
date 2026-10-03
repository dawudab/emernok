import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { OperationType, db, handleFirestoreError } from '../firebaseConfig'

const STATION_STATUS_COLLECTION = 'stationStatus'
const STATION_CACHE_KEY = 'nem:cachedStations:v1'

export const STATUS_HAS_GAS = 'has_gas'
export const STATUS_NO_GAS = 'no_gas'

function isPermissionError(error) {
  return (
    error?.code === 'permission-denied' ||
    error?.message?.includes('Missing or insufficient permissions')
  )
}

function writeCachedStationStatuses(map) {
  try {
    const serializable = {}
    for (const [id, data] of Object.entries(map)) {
      serializable[id] = {
        stationId: data.stationId ?? id,
        status: data.status,
        hasGasCount: data.hasGasCount ?? 0,
        noGasCount: data.noGasCount ?? 0,
      }
    }
    localStorage.setItem(STATION_CACHE_KEY, JSON.stringify(serializable))
  } catch {
    // Ignore storage errors
  }
}

export function readCachedStationStatuses() {
  try {
    const raw = localStorage.getItem(STATION_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export async function reportStationGasStatus({ stationId, uid, status }) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')
  if (status !== STATUS_HAS_GAS && status !== STATUS_NO_GAS) {
    throw new Error(`Invalid station status: ${status}`)
  }

  const ref = doc(db, STATION_STATUS_COLLECTION, stationId)

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref)
      if (!snap.exists()) {
        transaction.set(ref, {
          stationId,
          status,
          hasGasCount: status === STATUS_HAS_GAS ? 1 : 0,
          noGasCount: status === STATUS_NO_GAS ? 1 : 0,
          updatedBy: uid,
          updatedAt: serverTimestamp(),
        })
        return
      }

      const prev = snap.data()
      transaction.update(ref, {
        status,
        hasGasCount:
          (prev.hasGasCount ?? 0) + (status === STATUS_HAS_GAS ? 1 : 0),
        noGasCount:
          (prev.noGasCount ?? 0) + (status === STATUS_NO_GAS ? 1 : 0),
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      })
    })
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `${STATION_STATUS_COLLECTION}/${stationId}`,
      )
    }
    throw error
  }
}

export function subscribeToStationStatuses(onStatuses, onError) {
  const cached = readCachedStationStatuses()
  if (Object.keys(cached).length > 0) {
    onStatuses(cached)
  }

  if (!db) return () => {}

  const q = query(collection(db, STATION_STATUS_COLLECTION), limit(200))

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const map = {}
      for (const docSnap of snapshot.docs) {
        map[docSnap.id] = docSnap.data()
      }
      if (Object.keys(map).length > 0 || !snapshot.metadata.fromCache) {
        writeCachedStationStatuses(map)
        onStatuses(map)
      }
    },
    (error) => {
      if (isPermissionError(error)) {
        try {
          handleFirestoreError(
            error,
            OperationType.LIST,
            STATION_STATUS_COLLECTION,
          )
        } catch (wrappedError) {
          onError?.(wrappedError)
          return
        }
      }
      onError?.(error)
    },
  )
}
