import { distanceBetween } from 'geofire-common'
import {
  PAST_OUTAGE_MAX_DAYS,
  REPORT_TTL_HOURS,
  STALE_REPORT_DIM_HOURS,
  VERIFY_MIN_USERS,
  VERIFY_RADIUS_M,
  WORKING_REPORT_TTL_HOURS,
} from '../constants'
import {
  getReportLastUpdatedMs,
  isWithinHours,
  isWorkingOrResolved,
} from '../services/reports'

/**
 * Groups active ('current') reports of the same utility and status category
 * that sit within VERIFY_RADIUS_M of each other into 3 distinct tiers:
 * 1. 'reported' (Unverified Outage: 1-2 community confirmations)
 * 2. 'verified' (Verified Outage: 3+ community confirmations OR Official report)
 * 3. 'working' (Resolved Outage or positive "Power is Working" report)
 *
 * - Stale unconfirmed outage pins (> 6h without update) are flagged `isStale: true` to dim on map.
 * - Unverified outage reports older than REPORT_TTL_HOURS (12h) without update are queued for expiry.
 * - Past outage reports older than 7 days are queued for expiry.
 */
export function buildClustersWithExpiry(reports) {
  const rawOutageClusters = []
  const rawWorkingClusters = []
  const expiredUnverifiedReports = []

  for (const report of reports) {
    if (!report || report.lat == null || report.lng == null) continue

    if (report.reportMode === 'past') {
      if (!isWithinHours(report, PAST_OUTAGE_MAX_DAYS * 24)) {
        expiredUnverifiedReports.push(report)
      }
      continue
    }

    const workingState = isWorkingOrResolved(report)
    const targetList = workingState ? rawWorkingClusters : rawOutageClusters

    if (workingState && !isWithinHours(report, WORKING_REPORT_TTL_HOURS)) {
      continue
    }

    const match = targetList.find(
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

    targetList.push({
      id: report.id,
      type: report.type,
      isWorkingCluster: workingState,
      lat: report.lat,
      lng: report.lng,
      reports: [report],
    })
  }

  const activeClusters = []

  // Process Outage Clusters (Tier 1: 'reported' & Tier 2: 'verified')
  for (const cluster of rawOutageClusters) {
    const distinctReporters = new Set(
      cluster.reports.map((report) => report.uid),
    )
    const totalStillOutVotes = cluster.reports.reduce(
      (sum, r) => sum + (r.stillOutCount ?? 0),
      0,
    )
    const hasOfficial = cluster.reports.some((r) => Boolean(r.isOfficial))
    const confirmationCount = distinctReporters.size + totalStillOutVotes
    const isClusterVerified =
      hasOfficial ||
      distinctReporters.size >= VERIFY_MIN_USERS ||
      confirmationCount >= VERIFY_MIN_USERS

    const validReports = isClusterVerified
      ? cluster.reports.filter((r) => isWithinHours(r, REPORT_TTL_HOURS * 2))
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
    const confirmedTotal = reporters.size + stillOutCount
    const verified =
      hasOfficial ||
      reporters.size >= VERIFY_MIN_USERS ||
      confirmedTotal >= VERIFY_MIN_USERS
    const latestWithDetails = validReports.find(
      (report) => typeof report.details === 'string' && report.details.trim(),
    )
    const sortedByUpdate = [...validReports].sort(
      (a, b) => getReportLastUpdatedMs(b) - getReportLastUpdatedMs(a),
    )
    const latestReport = sortedByUpdate[0] ?? validReports[0]
    const lastUpdatedMs = getReportLastUpdatedMs(latestReport)
    const isStale =
      !verified &&
      lastUpdatedMs > 0 &&
      Date.now() - lastUpdatedMs >= STALE_REPORT_DIM_HOURS * 3600 * 1000

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
      confirmedCount: confirmedTotal,
      verified,
      isOfficial: hasOfficial,
      tier: verified ? 'verified' : 'reported',
      status: 'outage',
      isStale,
      lastUpdatedMs,
      stillOutCount,
      restoredCount,
      details: latestWithDetails?.details ?? null,
      latest: latestReport,
    })
  }

  // Process Working / Resolved Clusters (Tier 3: 'working')
  for (const cluster of rawWorkingClusters) {
    const validReports = cluster.reports.filter((r) =>
      isWithinHours(r, WORKING_REPORT_TTL_HOURS),
    )
    if (validReports.length === 0) continue

    const reporters = new Set(validReports.map((r) => r.uid))
    const stillOutCount = validReports.reduce(
      (sum, r) => sum + (r.stillOutCount ?? 0),
      0,
    )
    const restoredCount = validReports.reduce(
      (sum, r) => sum + (r.restoredCount ?? 0),
      0,
    )
    const hasOfficial = validReports.some((r) => Boolean(r.isOfficial))
    const latestWithDetails = validReports.find(
      (report) => typeof report.details === 'string' && report.details.trim(),
    )
    const sortedByUpdate = [...validReports].sort(
      (a, b) => getReportLastUpdatedMs(b) - getReportLastUpdatedMs(a),
    )
    const latestReport = sortedByUpdate[0] ?? validReports[0]
    const lastUpdatedMs = getReportLastUpdatedMs(latestReport)

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
      confirmedCount: reporters.size + restoredCount,
      verified: true,
      isOfficial: hasOfficial,
      tier: 'working',
      status: latestReport.status === 'resolved' ? 'resolved' : 'working',
      isStale: false,
      lastUpdatedMs,
      stillOutCount,
      restoredCount,
      details: latestWithDetails?.details ?? null,
      latest: latestReport,
    })
  }

  return { clusters: activeClusters, expiredUnverifiedReports }
}

export function buildClusters(reports) {
  return buildClustersWithExpiry(reports).clusters
}

