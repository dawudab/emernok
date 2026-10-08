import { distanceBetween } from 'geofire-common'
import {
  ALL_SUB_NEIGHBOURHOODS,
  NEIGHBOURHOODS,
  PAST_OUTAGE_MAX_DAYS,
  VERIFY_MIN_USERS,
} from '../constants'
import { isWithinHours } from '../services/reports'
import { STATUS_NO_GAS, resolveStationStatus } from '../services/stations'

function pointInPolygon(lat, lng, polygon) {
  if (!polygon?.length) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function findRegionForPoint(lat, lng) {
  if (lat == null || lng == null) return NEIGHBOURHOODS[0]
  for (const region of NEIGHBOURHOODS) {
    if (pointInPolygon(lat, lng, region.polygon)) return region
  }
  let best = NEIGHBOURHOODS[0]
  let bestDist = Infinity
  for (const region of NEIGHBOURHOODS) {
    const d = distanceBetween([lat, lng], [region.lat, region.lng]) * 1000
    if (d < bestDist) {
      bestDist = d
      best = region
    }
  }
  return best
}

export function findSubNeighbourhoodForPoint(lat, lng) {
  if (lat == null || lng == null) return ALL_SUB_NEIGHBOURHOODS[0]
  for (const sub of ALL_SUB_NEIGHBOURHOODS) {
    if (pointInPolygon(lat, lng, sub.polygon)) return sub
  }
  let best = ALL_SUB_NEIGHBOURHOODS[0]
  let bestDist = Infinity
  for (const sub of ALL_SUB_NEIGHBOURHOODS) {
    const d = distanceBetween([lat, lng], [sub.lat, sub.lng]) * 1000
    if (d < bestDist) {
      bestDist = d
      best = sub
    }
  }
  return best
}

function getReportTimestampMs(report) {
  if (report.outageStartedAt) {
    const parsed = Date.parse(report.outageStartedAt)
    if (!Number.isNaN(parsed)) return parsed
  }
  return report.createdAt?.toMillis?.() ?? Date.now()
}

function computeHistoryMetrics(areaReports, areaAnnouncements) {
  const weekHours = PAST_OUTAGE_MAX_DAYS * 24 // 168h
  const recentReports = areaReports.filter((r) =>
    isWithinHours(r, weekHours),
  )

  // Estimate downtime hours over the past 7 days
  let downtimeHours = 0
  for (const r of recentReports) {
    if (r.durationHours && r.durationHours > 0) {
      downtimeHours += Math.min(24, Number(r.durationHours))
    } else if (r.reportMode !== 'past') {
      const ageHours = Math.max(
        0.5,
        Math.min(12, (Date.now() - getReportTimestampMs(r)) / (3600 * 1000)),
      )
      downtimeHours += ageHours * 0.5
    } else {
      downtimeHours += 2
    }
  }
  // Cap downtime so multiple people reporting the same event don't over-subtract
  const effectiveDowntime = Math.min(
    weekHours * 0.65,
    downtimeHours / Math.max(1, Math.sqrt(recentReports.length)),
  )
  const uptimePercent = Number(
    Math.max(35, Math.min(100, ((weekHours - effectiveDowntime) / weekHours) * 100)).toFixed(1),
  )

  // Latest outage
  const sortedByTime = [...recentReports].sort(
    (a, b) => getReportTimestampMs(b) - getReportTimestampMs(a),
  )
  const latestOutageReport = sortedByTime[0] ?? null
  const lastOutageInfo = latestOutageReport
    ? {
        timestampMs: getReportTimestampMs(latestOutageReport),
        durationHours: latestOutageReport.durationHours || null,
        reportMode: latestOutageReport.reportMode || 'current',
        details: latestOutageReport.details || null,
      }
    : null

  // Recent maintenance (from either official announcements or maintenance-tagged reports)
  const latestOfficial = (areaAnnouncements ?? [])[0] ?? null
  const latestMaintReport =
    sortedByTime.find((r) => r.cause === 'maintenance') ?? null

  let recentMaintenance = null
  if (latestOfficial) {
    recentMaintenance = {
      source: latestOfficial.org || 'SOMELEC',
      text: latestOfficial.text,
      timestampMs: latestOfficial.createdAt?.toMillis?.() ?? Date.now(),
    }
  } else if (latestMaintReport) {
    recentMaintenance = {
      source: 'Community',
      text: latestMaintReport.details || 'Scheduled / observed maintenance',
      timestampMs: getReportTimestampMs(latestMaintReport),
    }
  }

  return {
    uptimePercent,
    lastOutageInfo,
    recentMaintenance,
  }
}

export function computeRegionStats(
  clusters,
  allReports,
  announcements,
  stations,
  stationStatuses,
) {
  const powerReports = (allReports ?? []).filter((r) => r.type === 'power')

  return NEIGHBOURHOODS.map((region) => {
    const regionClusters = (clusters ?? []).filter(
      (cluster) => findRegionForPoint(cluster.lat, cluster.lng).id === region.id,
    )
    const regionReports = powerReports.filter(
      (report) => findRegionForPoint(report.lat, report.lng).id === region.id,
    )
    const regionAnnouncements = (announcements ?? []).filter(
      (ann) =>
        ann.areaId === region.id ||
        findRegionForPoint(ann.lat, ann.lng).id === region.id,
    )

    // Compute stats for each of the 4 sub-neighbourhoods inside this region
    const subNeighbourhoodStats = region.subNeighbourhoods.map((sub) => {
      const subClusters = regionClusters.filter(
        (c) => findSubNeighbourhoodForPoint(c.lat, c.lng).id === sub.id,
      )
      const subReports = regionReports.filter(
        (r) => findSubNeighbourhoodForPoint(r.lat, r.lng).id === sub.id,
      )
      const verifiedSubClusters = subClusters.filter((c) => c.verified).length
      const totalSubReporters = subClusters.reduce(
        (sum, c) => sum + (c.reporterCount ?? 1),
        0,
      )

      // A smaller sub-neighbourhood reflects a power outage if a good number of people report it
      let subStatus = 'normal'
      if (verifiedSubClusters >= 1 || totalSubReporters >= VERIFY_MIN_USERS) {
        subStatus = 'critical'
      } else if (subClusters.length > 0) {
        subStatus = 'warning'
      }

      const subPenalty =
        verifiedSubClusters * 30 +
        (subClusters.length - verifiedSubClusters) * 12
      const subPowerLevel = Math.max(15, 100 - subPenalty)

      const history = computeHistoryMetrics(subReports, regionAnnouncements)

      return {
        ...sub,
        regionName: region.name,
        overallStatus: subStatus,
        powerLevel: subPowerLevel,
        outageCount: subClusters.length,
        verifiedOutages: verifiedSubClusters,
        reporterCount: totalSubReporters,
        ...history,
      }
    })

    const verifiedOutages = regionClusters.filter((c) => c.verified).length
    const unverifiedOutages = regionClusters.length - verifiedOutages
    const totalActiveReporters = regionClusters.reduce(
      (sum, c) => sum + (c.reporterCount ?? 1),
      0,
    )

    // Spread check: how many distinct sub-neighbourhoods in this region have outages?
    const criticalSubCount = subNeighbourhoodStats.filter(
      (s) => s.overallStatus === 'critical',
    ).length
    const affectedSubCount = subNeighbourhoodStats.filter(
      (s) => s.overallStatus !== 'normal',
    ).length

    // Whole-region status rule:
    // 1. Gas status NEVER affects region power status.
    // 2. The entire region only turns 'critical' if there is a significant amount of
    //    reported outages AND they are spread out across multiple neighbourhoods in the region.
    let overallStatus = 'normal'
    if (
      (criticalSubCount >= 2 && totalActiveReporters >= 6) ||
      (affectedSubCount >= 3 && verifiedOutages >= 2)
    ) {
      overallStatus = 'critical'
    } else if (
      affectedSubCount >= 2 ||
      verifiedOutages >= 1 ||
      totalActiveReporters >= 4
    ) {
      overallStatus = 'warning'
    }

    const penalty = verifiedOutages * 18 + unverifiedOutages * 6
    const powerLevel = Math.max(20, 100 - penalty)

    const regionStations = (stations ?? [])
      .filter((station) => {
        if (station.regionId) return station.regionId === region.id
        return findRegionForPoint(station.lat, station.lng).id === region.id
      })
      .map((station) => {
        const record = stationStatuses?.[station.id]
        const status = resolveStationStatus(record)
        return {
          ...station,
          status,
          hasGasCount: record?.hasGasCount ?? 0,
          noGasCount: record?.noGasCount ?? 0,
        }
      })

    const noGasCount = regionStations.filter(
      (s) => s.status === STATUS_NO_GAS,
    ).length
    const hasGasCount = regionStations.length - noGasCount

    const regionHistory = computeHistoryMetrics(
      regionReports,
      regionAnnouncements,
    )

    return {
      ...region,
      powerLevel,
      outageCount: regionClusters.length,
      verifiedOutages,
      unverifiedOutages,
      totalActiveReporters,
      affectedSubCount,
      subNeighbourhoods: subNeighbourhoodStats,
      stations: regionStations,
      totalStations: regionStations.length,
      hasGasCount,
      noGasCount,
      overallStatus,
      ...regionHistory,
    }
  })
}
