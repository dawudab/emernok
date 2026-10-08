import { distanceBetween } from 'geofire-common'
import {
  PAST_OUTAGE_MAX_DAYS,
  REPORT_TTL_HOURS,
  VERIFY_MIN_USERS,
  VERIFY_RADIUS_M,
} from '../constants'
import { isResolved, isWithinHours } from '../services/reports'

/**
 * Groups active ('current') reports of the same utility that sit within
 * VERIFY_RADIUS_M of each other.
 * - Unverified current reports older than 24 hours are queued for automatic deletion.
 * - Past outage reports older than 7 days are also queued for automatic deletion.
 */
export function buildClustersWithExpiry(reports) {
  const rawClusters = []
  const expiredUnverifiedReports = []

  for (const report of reports) {
    if (report.reportMode === 'past') {
      if (!isWithinHours(report, PAST_OUTAGE_MAX_DAYS * 24)) {
        expiredUnverifiedReports.push(report)
      }
      continue
    }

    if (isResolved(report)) continue

    const match = rawClusters.find(
      (cluster) =>
        cluster.type === report.type &&
        distanceBetween([cluster.lat, cluster.lng], [report.lat, report.lng]) *
          1000 <=
          VERIFY_RADIUS_M,
    )

    if (match) {
      match.reports.push(report)
      match.lat =
        match.reports.reduce((sum, item) => sum + item.lat, 0) /
        match.reports.length
      match.lng =
        match.reports.reduce((sum, item) => sum + item.lng, 0) /
        match.reports.length
      continue
    }

    rawClusters.push({
      id: report.id,
      type: report.type,
      lat: report.lat,
      lng: report.lng,
      reports: [report],
    })
  }

  const activeClusters = []

  for (const cluster of rawClusters) {
    const distinctReporters = new Set(
      cluster.reports.map((report) => report.uid),
    )
    const isClusterVerified = distinctReporters.size >= VERIFY_MIN_USERS

    const validReports = isClusterVerified
      ? cluster.reports
      : cluster.reports.filter((report) => {
          const fresh = isWithinHours(report, REPORT_TTL_HOURS)
          if (!fresh) expiredUnverifiedReports.push(report)
          return fresh
        })

    if (validReports.length === 0) continue

    const reporters = new Set(validReports.map((report) => report.uid))
    const stillOutCount = validReports.reduce(
      (sum, report) => sum + (report.stillOutCount ?? 0),
      0,
    )
    const restoredCount = validReports.reduce(
      (sum, report) => sum + (report.restoredCount ?? 0),
      0,
    )
    const latestWithDetails = validReports.find(
      (report) => typeof report.details === 'string' && report.details.trim(),
    )

    activeClusters.push({
      ...cluster,
      reports: validReports,
      lat:
        validReports.reduce((sum, item) => sum + item.lat, 0) /
        validReports.length,
      lng:
        validReports.reduce((sum, item) => sum + item.lng, 0) /
        validReports.length,
      reporterCount: reporters.size,
      verified: reporters.size >= VERIFY_MIN_USERS,
      stillOutCount,
      restoredCount,
      details: latestWithDetails?.details ?? null,
      latest: validReports[0],
    })
  }

  return { clusters: activeClusters, expiredUnverifiedReports }
}

export function buildClusters(reports) {
  return buildClustersWithExpiry(reports).clusters
}
