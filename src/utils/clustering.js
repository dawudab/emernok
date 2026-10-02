import { distanceBetween } from 'geofire-common'
import { VERIFY_MIN_USERS, VERIFY_RADIUS_M } from '../constants'
import { isResolved } from '../services/reports'

/**
 * Groups reports of the same utility that sit within VERIFY_RADIUS_M of each
 * other. A cluster becomes "verified" once enough *distinct* reporters are in
 * it, so one person spamming pins can never verify their own outage.
 *
 * Deliberately computed on the client from public data: no trusted writer is
 * involved, so there is nothing for a malicious client to forge.
 */
export function buildClusters(reports) {
  const clusters = []

  for (const report of reports) {
    if (isResolved(report)) continue

    const match = clusters.find(
      (cluster) =>
        cluster.type === report.type &&
        distanceBetween([cluster.lat, cluster.lng], [report.lat, report.lng]) *
          1000 <=
          VERIFY_RADIUS_M,
    )

    if (match) {
      match.reports.push(report)
      // Re-centre on the mean so the circle tracks the affected area.
      match.lat =
        match.reports.reduce((sum, item) => sum + item.lat, 0) / match.reports.length
      match.lng =
        match.reports.reduce((sum, item) => sum + item.lng, 0) / match.reports.length
      continue
    }

    clusters.push({
      id: report.id,
      type: report.type,
      lat: report.lat,
      lng: report.lng,
      reports: [report],
    })
  }

  return clusters.map((cluster) => {
    const reporters = new Set(cluster.reports.map((report) => report.uid))
    const stillOutCount = cluster.reports.reduce(
      (sum, report) => sum + (report.stillOutCount ?? 0),
      0,
    )
    const restoredCount = cluster.reports.reduce(
      (sum, report) => sum + (report.restoredCount ?? 0),
      0,
    )

    return {
      ...cluster,
      reporterCount: reporters.size,
      verified: reporters.size >= VERIFY_MIN_USERS,
      stillOutCount,
      restoredCount,
      // Newest report in the cluster is the one users vote on.
      latest: cluster.reports[0],
    }
  })
}
