import { useEffect, useState } from 'react'
import {
  readCachedReports,
  subscribeToReports,
  subscribeToUserReports,
} from '../services/reports'

// Re-subscribe periodically to keep active report windows fresh.
const RESUBSCRIBE_MS = 5 * 60 * 1000

export function useReports() {
  // Initialize directly from cached reports so the map renders known outages
  // immediately even on disconnected or flaky connections.
  const [reports, setReports] = useState(() => readCachedReports())
  const [error, setError] = useState(null)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    const interval = setInterval(
      () => setEpoch((value) => value + 1),
      RESUBSCRIBE_MS,
    )
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    return subscribeToReports(
      (nextReports) => {
        setReports(nextReports)
        setError(null)
      },
      (snapshotError) => setError(snapshotError),
    )
  }, [epoch])

  return { reports, error }
}

export function useMyReports(uid) {
  const [state, setState] = useState({ uid: null, reports: [], error: null })

  useEffect(() => {
    return subscribeToUserReports(
      uid,
      (reports) => setState({ uid, reports, error: null }),
      (error) => setState({ uid, reports: [], error }),
    )
  }, [uid])

  const fresh = state.uid === uid
  return {
    reports: fresh ? state.reports : [],
    error: fresh ? state.error : null,
  }
}
