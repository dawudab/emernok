import { useEffect, useState } from 'react'
import {
  readCachedSurveys,
  subscribeToRecentSurveys,
} from '../services/surveys'

export function useSurveys() {
  const [surveys, setSurveys] = useState(() => readCachedSurveys())
  const [error, setError] = useState(null)

  useEffect(() => {
    return subscribeToRecentSurveys(
      (next) => {
        setSurveys(next)
        setError(null)
      },
      (err) => {
        setError(err)
      },
    )
  }, [])

  return { surveys, error }
}
