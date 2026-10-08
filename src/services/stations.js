import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { NO_GAS_MIN_REPORTS } from '../constants'
import { OperationType, db, handleFirestoreError } from '../firebaseConfig'

const STATION_STATUS_COLLECTION = 'stationStatus'

export const STATUS_HAS_GAS = 'has_gas'
export const STATUS_NO_GAS = 'no_gas'

/**
 * Over 10 people (11+) must report "No Gas" (and outnumber "Has Gas" reports)
 * before a fuel station is declared out of gas.
 */
export function resolveStationStatus(record) {
  if (!record) return STATUS_HAS_GAS
  const noGasCount = record.noGasCount ?? 0
  const hasGasCount = record.hasGasCount ?? 0
  if (noGasCount >= NO_GAS_MIN_REPORTS && noGasCount > hasGasCount) {
    return STATUS_NO_GAS
  }
  return STATUS_HAS_GAS
}

function isPermissionError(error) {
  return (
    error?.code === 'permission-denied' ||
    error?.message?.includes('Missing or insufficient permissions')
  )
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
        const hasGasCount = status === STATUS_HAS_GAS ? 1 : 0
        const noGasCount = status === STATUS_NO_GAS ? 1 : 0
        const effectiveStatus = resolveStationStatus({
          hasGasCount,
          noGasCount,
        })
        transaction.set(ref, {
          stationId,
          status: effectiveStatus,
          hasGasCount,
          noGasCount,
          updatedBy: uid,
          updatedAt: serverTimestamp(),
        })
        return
      }

      const prev = snap.data()
      const hasGasCount =
        (prev.hasGasCount ?? 0) + (status === STATUS_HAS_GAS ? 1 : 0)
      const noGasCount =
        (prev.noGasCount ?? 0) + (status === STATUS_NO_GAS ? 1 : 0)
      const effectiveStatus = resolveStationStatus({
        hasGasCount,
        noGasCount,
      })

      transaction.update(ref, {
        status: effectiveStatus,
        hasGasCount,
        noGasCount,
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
  if (!db) return () => {}

  const q = query(collection(db, STATION_STATUS_COLLECTION), limit(200))

  return onSnapshot(
    q,
    (snapshot) => {
      const map = {}
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        map[docSnap.id] = {
          ...data,
          status: resolveStationStatus(data),
        }
      }
      onStatuses(map)
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
