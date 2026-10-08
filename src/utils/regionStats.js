import { distanceBetween } from 'geofire-common'
import {
  ALL_SUB_NEIGHBOURHOODS,
  NEIGHBOURHOODS,
  PAST_OUTAGE_MAX_DAYS,
} from '../constants'
import { isWithinHours } from '../services/reports'
import { STATUS_NO_GAS, resolveStationStatus } from '../services/stations'

// Minimum thresholds so a neighbourhood never changes color from just 1 or 2
// isolated outages — requires both high report volume and wide spatial spread.
const SUB_WARNING_MIN_CLUSTERS = 3
const SUB_WARNING_MIN_REPORTERS = 5
const SUB_WARNING_MIN_SPREAD_ZONES = 3

const SUB_CRITICAL_MIN_REPORTERS = 10
const SUB_CRITICAL_MIN_VERIFIED_CLUSTERS = 3
const SUB_CRITICAL_MIN_SPREAD_ZONES = 4
const SPREAD_ZONE_SEPARATION_M = 250

const REGION_WARNING_MIN_AFFECTED_SUBS = 2
const REGION_WARNING_MIN_REPORTERS = 12
const REGION_CRITICAL_MIN_AFFECTED_SUBS = 3
const REGION_CRITICAL_MIN_CRITICAL_SUBS = 2
const REGION_CRITICAL_MIN_REPORTERS = 25

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

/**
 * Counts how many distinct spatial zones (separated by at least
 * SPREAD_ZONE_SEPARATION_M) have active outages, plus the maximum distance
 * span across clusters in the area.
 */
function computeSpatialSpread(clusters) {
  if (!clusters || clusters.length === 0) {
    return { spreadZones: 0, maxSpanM: 0 }
  }

  const zones = []
  let maxSpanM = 0

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i]
    const farFromExisting = zones.every(
      (z) =>
        distanceBetween([z.lat, z.lng], [c.lat, c.lng]) * 1000 >=
        SPREAD_ZONE_SEPARATION_M,
    )
    if (farFromExisting) {
      zones.push(c)
    }
    for (let j = i + 1; j < clusters.length; j++) {
      const d =
        distanceBetween(
          [c.lat, c.lng],
          [clusters[j].lat, clusters[j].lng],
        ) * 1000
      if (d > maxSpanM) maxSpanM = d
    }
  }

  return { spreadZones: zones.length, maxSpanM }
}

function getReportTimestampMs(report) {
  if (report.outageStartedAt) {
    const parsed = Date.parse(report.outageStartedAt)
    if (!Number.isNaN(parsed)) return parsed
  }
  return report.createdAt?.toMillis?.() ?? Date.now()
}

function toDateBucketKey(ms) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function computeHistoryMetrics(areaReports, areaAnnouncements) {
  const weekHours = PAST_OUTAGE_MAX_DAYS * 24 // 168h
  const recentReports = areaReports.filter((r) =>
    isWithinHours(r, weekHours),
  )

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

  const effectiveDowntime = Math.min(
    weekHours * 0.65,
    downtimeHours / Math.max(1, Math.sqrt(recentReports.length)),
  )
  const uptimePercent = Number(
    Math.max(
      35,
      Math.min(100, ((weekHours - effectiveDowntime) / weekHours) * 100),
    ).toFixed(1),
  )

  // Build 7-day historical trend (oldest day to today) for Recharts
  const now = new Date()
  const dailyMap = new Map()
  for (let i = PAST_OUTAGE_MAX_DAYS - 1; i >= 0; i--) {
    const dayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - i,
    )
    const key = toDateBucketKey(dayDate.getTime())
    const dayLabel = dayDate.toLocaleDateString([], { weekday: 'short' })
    dailyMap.set(key, {
      dateKey: key,
      dayLabel,
      outages: 0,
      rawDowntimeH: 0,
    })
  }

  for (const r of recentReports) {
    const ts = getReportTimestampMs(r)
    const key = toDateBucketKey(ts)
    const bucket = dailyMap.get(key)
    if (!bucket) continue
    bucket.outages += 1
    const dur =
      r.durationHours && r.durationHours > 0
        ? Math.min(24, Number(r.durationHours))
        : 2
    bucket.rawDowntimeH += dur
  }

  const dailyTrend = Array.from(dailyMap.values()).map((bucket) => {
    const scaledDowntime =
      bucket.outages > 0
        ? Math.min(20, bucket.rawDowntimeH / Math.sqrt(bucket.outages))
        : 0
    const dayUptime = Number(
      Math.max(15, Math.min(100, ((24 - scaledDowntime) / 24) * 100)).toFixed(1),
    )
    return {
      dateKey: bucket.dateKey,
      dayLabel: bucket.dayLabel,
      uptime: dayUptime,
      outages: bucket.outages,
    }
  })

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
    dailyTrend,
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
      const { spreadZones, maxSpanM } = computeSpatialSpread(subClusters)

      // Neighbourhood Color-Change Rule:
      // 1 or 2 outages in a neighbourhood NEVER change the neighbourhood's color.
      // It only changes to 'warning' or 'critical' when there is a significant
      // number of reports spread across multiple separated zones of the neighbourhood.
      let subStatus = 'normal'
      if (
        (totalSubReporters >= SUB_CRITICAL_MIN_REPORTERS ||
          verifiedSubClusters >= SUB_CRITICAL_MIN_VERIFIED_CLUSTERS) &&
        (spreadZones >= SUB_CRITICAL_MIN_SPREAD_ZONES ||
          (spreadZones >= 3 && maxSpanM >= 500))
      ) {
        subStatus = 'critical'
      } else if (
        subClusters.length >= SUB_WARNING_MIN_CLUSTERS &&
        totalSubReporters >= SUB_WARNING_MIN_REPORTERS &&
        spreadZones >= SUB_WARNING_MIN_SPREAD_ZONES
      ) {
        subStatus = 'warning'
      }

      const subPenalty =
        verifiedSubClusters * 15 +
        (subClusters.length - verifiedSubClusters) * 5
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
        spreadZones,
        ...history,
      }
    })

    const verifiedOutages = regionClusters.filter((c) => c.verified).length
    const unverifiedOutages = regionClusters.length - verifiedOutages
    const totalActiveReporters = regionClusters.reduce(
      (sum, c) => sum + (c.reporterCount ?? 1),
      0,
    )

    const criticalSubCount = subNeighbourhoodStats.filter(
      (s) => s.overallStatus === 'critical',
    ).length
    const affectedSubCount = subNeighbourhoodStats.filter(
      (s) => s.overallStatus !== 'normal',
    ).length

    // Whole-Region Color-Change Rule:
    // 1. Gas status NEVER affects region power status.
    // 2. Requires multiple neighbourhoods across the region to be significantly
    //    disrupted before the region changes color.
    let overallStatus = 'normal'
    if (
      affectedSubCount >= REGION_CRITICAL_MIN_AFFECTED_SUBS &&
      criticalSubCount >= REGION_CRITICAL_MIN_CRITICAL_SUBS &&
      totalActiveReporters >= REGION_CRITICAL_MIN_REPORTERS
    ) {
      overallStatus = 'critical'
    } else if (
      affectedSubCount >= REGION_WARNING_MIN_AFFECTED_SUBS &&
      totalActiveReporters >= REGION_WARNING_MIN_REPORTERS
    ) {
      overallStatus = 'warning'
    }

    const penalty = verifiedOutages * 10 + unverifiedOutages * 3
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
