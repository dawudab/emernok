import { useEffect, useState } from 'react'
import { subscribeToReports, subscribeToUserReports } from '../services/reports'

// The TTL cutoff is baked into the query, so re-subscribe periodically to let
// pins age out without a page reload.
const RESUBSCRIBE_MS = 5 * 60 * 1000

export function useReports() {
  const [reports, setReports] = useState([])
  const [error, setError] = useState(null)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setEpoch((value) => value + 1), RESUBSCRIBE_MS)
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
  // Tracked together with the uid they belong to, so switching accounts shows
  // an empty list immediately instead of the previous user's reports.
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
