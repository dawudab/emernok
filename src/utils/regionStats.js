import { distanceBetween } from 'geofire-common'
import {
  ALL_SUB_NEIGHBOURHOODS,
  NEIGHBOURHOODS,
  PAST_OUTAGE_MAX_DAYS,
} from '../constants'
import {
  getReportLastUpdatedMs,
  isWithinHours,
  isWorkingOrResolved,
} from '../services/reports'
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
  return getReportLastUpdatedMs(report) || Date.now()
}

function getSurveyTimestampMs(survey) {
  if (survey.createdAt?.toMillis) return survey.createdAt.toMillis()
  if (typeof survey.createdAt === 'number') return survey.createdAt
  if (typeof survey.createdAt === 'string') {
    const parsed = Date.parse(survey.createdAt)
    if (!Number.isNaN(parsed)) return parsed
  }
  return Date.now()
}

function toDateBucketKey(ms) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function computeHistoryMetrics(areaReports, areaAnnouncements, areaSurveys = []) {
  const weekHours = PAST_OUTAGE_MAX_DAYS * 24 // 168h
  const recentReports = areaReports.filter((r) =>
    isWithinHours(r, weekHours),
  )

  const reports24h = recentReports.filter((r) => isWithinHours(r, 24))
  const working24hReports = reports24h.filter((r) => isWorkingOrResolved(r))
  const outage24hReports = reports24h.filter((r) => !isWorkingOrResolved(r))

  const recentSurveys = (areaSurveys || []).filter(
    (s) => Date.now() - getSurveyTimestampMs(s) <= weekHours * 3600 * 1000,
  )
  const todaySurveys = recentSurveys.filter(
    (s) => Date.now() - getSurveyTimestampMs(s) <= 24 * 3600 * 1000,
  )
  const todayWorkingCount =
    todaySurveys.filter((s) => s.isPowerWorking).length + working24hReports.length
  const totalTodaySignals = todaySurveys.length + reports24h.length
  const todayWorkingPercent =
    totalTodaySignals > 0
      ? Math.round((todayWorkingCount / totalTodaySignals) * 100)
      : null

  // Calculate 24h Power Uptime % using ratio of working/resolved reports & surveys vs outage durations over last 24h
  let outageHours24h = 0
  for (const r of outage24hReports) {
    if (r.durationHours && r.durationHours > 0) {
      outageHours24h += Math.min(24, Number(r.durationHours))
    } else {
      const ageH = Math.max(
        0.5,
        Math.min(12, (Date.now() - getReportTimestampMs(r)) / (3600 * 1000)),
      )
      outageHours24h += ageH * 0.65
    }
  }
  const effectiveOutage24h =
    outage24hReports.length > 0
      ? Math.min(20, outageHours24h / Math.max(1, Math.sqrt(outage24hReports.length)))
      : 0
  let uptime24hPercent = Number(
    Math.max(15, Math.min(100, ((24 - effectiveOutage24h) / 24) * 100)).toFixed(1),
  )
  if (working24hReports.length > 0 || todaySurveys.length > 0) {
    const positiveRatio =
      (working24hReports.length + todaySurveys.filter((s) => s.isPowerWorking).length) /
      Math.max(1, working24hReports.length + outage24hReports.length + todaySurveys.length)
    const positivePct = positiveRatio * 100
    uptime24hPercent = Number(
      (uptime24hPercent * 0.55 + positivePct * 0.45).toFixed(1),
    )
  }

  let downtimeHours = 0
  for (const r of recentReports) {
    if (isWorkingOrResolved(r)) continue
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

  const outageReportsWeek = recentReports.filter((r) => !isWorkingOrResolved(r))
  const effectiveDowntime = Math.min(
    weekHours * 0.65,
    downtimeHours / Math.max(1, Math.sqrt(outageReportsWeek.length)),
  )
  let uptimePercent = Number(
    Math.max(
      35,
      Math.min(100, ((weekHours - effectiveDowntime) / weekHours) * 100),
    ).toFixed(1),
  )

  if (recentSurveys.length > 0 || working24hReports.length > 0) {
    const recentWorkingCount =
      recentSurveys.filter((s) => s.isPowerWorking).length + working24hReports.length
    const totalSignals = recentSurveys.length + working24hReports.length
    const surveyScore = (recentWorkingCount / Math.max(1, totalSignals)) * 100
    uptimePercent = Number(
      (uptimePercent * 0.6 + surveyScore * 0.4).toFixed(1),
    )
  }

  // Build 7-day historical trend
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
      surveys: 0,
      workingSurveys: 0,
    })
  }

  for (const r of recentReports) {
    const ts = getReportTimestampMs(r)
    const key = toDateBucketKey(ts)
    const bucket = dailyMap.get(key)
    if (!bucket) continue
    if (isWorkingOrResolved(r)) {
      bucket.surveys += 1
      bucket.workingSurveys += 1
    } else {
      bucket.outages += 1
      const dur =
        r.durationHours && r.durationHours > 0
          ? Math.min(24, Number(r.durationHours))
          : 2
      bucket.rawDowntimeH += dur
    }
  }

  for (const s of recentSurveys) {
    const ts = getSurveyTimestampMs(s)
    const key = toDateBucketKey(ts)
    const bucket = dailyMap.get(key)
    if (!bucket) continue
    bucket.surveys += 1
    if (s.isPowerWorking) {
      bucket.workingSurveys += 1
    }
  }

  const dailyTrend = Array.from(dailyMap.values()).map((bucket) => {
    const scaledDowntime =
      bucket.outages > 0
        ? Math.min(20, bucket.rawDowntimeH / Math.sqrt(bucket.outages))
        : 0
    let dayUptime = Number(
      Math.max(15, Math.min(100, ((24 - scaledDowntime) / 24) * 100)).toFixed(1),
    )

    if (bucket.surveys > 0) {
      const surveyUptime = (bucket.workingSurveys / bucket.surveys) * 100
      dayUptime = Number(
        (bucket.outages > 0
          ? dayUptime * 0.45 + surveyUptime * 0.55
          : Math.max(25, surveyUptime)
        ).toFixed(1),
      )
    }

    return {
      dateKey: bucket.dateKey,
      dayLabel: bucket.dayLabel,
      uptime: dayUptime,
      outages: bucket.outages,
      surveysCount: bucket.surveys,
    }
  })

  const sortedOutagesByTime = [...outageReportsWeek].sort(
    (a, b) => getReportTimestampMs(b) - getReportTimestampMs(a),
  )
  const latestOutageReport = sortedOutagesByTime[0] ?? null
  const lastOutageInfo = latestOutageReport
    ? {
        timestampMs: getReportTimestampMs(latestOutageReport),
        durationHours: latestOutageReport.durationHours || null,
        reportMode: latestOutageReport.reportMode || 'current',
        details: latestOutageReport.details || null,
      }
    : null

  const allTimestamps = [
    ...recentReports.map((r) => getReportTimestampMs(r)),
    ...recentSurveys.map((s) => getSurveyTimestampMs(s)),
    ...(areaAnnouncements || []).map((a) => a.createdAt?.toMillis?.() ?? 0),
  ].filter(Boolean)
  const lastUpdatedMs =
    allTimestamps.length > 0 ? Math.max(...allTimestamps) : 0

  const latestOfficial = (areaAnnouncements ?? [])[0] ?? null
  const latestMaintReport =
    sortedOutagesByTime.find((r) => r.cause === 'maintenance') ?? null

  let recentMaintenance = null
  if (latestOfficial) {
    recentMaintenance = {
      source: latestOfficial.org || 'SOMELEC',
      text: latestOfficial.text,
      timestampMs: latestOfficial.createdAt?.toMillis?.() ?? Date.now(),
      isOfficial: true,
    }
  } else if (latestMaintReport) {
    recentMaintenance = {
      source: 'Community',
      text: latestMaintReport.details || 'Scheduled / observed maintenance',
      timestampMs: getReportTimestampMs(latestMaintReport),
      isOfficial: false,
    }
  }

  return {
    uptimePercent,
    uptime24hPercent,
    working24hCount: working24hReports.length + todaySurveys.filter((s) => s.isPowerWorking).length,
    dailyTrend,
    lastOutageInfo,
    lastUpdatedMs,
    hasOfficialUpdate: Boolean(latestOfficial),
    recentMaintenance,
    todaySurveysCount: totalTodaySignals,
    todayWorkingPercent,
  }
}

export function computeRegionStats(
  clusters,
  allReports,
  announcements,
  stations,
  stationStatuses,
  surveys = [],
) {
  const powerReports = (allReports ?? []).filter((r) => r.type === 'power')
  const outageClusters = (clusters ?? []).filter((c) => c.tier !== 'working')
  const workingClusters = (clusters ?? []).filter((c) => c.tier === 'working')

  return NEIGHBOURHOODS.map((region) => {
    const regionClusters = outageClusters.filter(
      (cluster) => findRegionForPoint(cluster.lat, cluster.lng).id === region.id,
    )
    const regionWorkingClusters = workingClusters.filter(
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
    const regionSurveys = (surveys ?? []).filter(
      (s) =>
        s.regionId === region.id ||
        findRegionForPoint(s.lat, s.lng).id === region.id,
    )

    const subNeighbourhoodStats = region.subNeighbourhoods.map((sub) => {
      const subClusters = regionClusters.filter(
        (c) => findSubNeighbourhoodForPoint(c.lat, c.lng).id === sub.id,
      )
      const subWorkingClusters = regionWorkingClusters.filter(
        (c) => findSubNeighbourhoodForPoint(c.lat, c.lng).id === sub.id,
      )
      const subReports = regionReports.filter(
        (r) => findSubNeighbourhoodForPoint(r.lat, r.lng).id === sub.id,
      )
      const subSurveys = regionSurveys.filter(
        (s) =>
          s.subNeighbourhoodId === sub.id ||
          findSubNeighbourhoodForPoint(s.lat, s.lng).id === sub.id,
      )
      const verifiedSubClusters = subClusters.filter((c) => c.verified).length
      const totalSubReporters = subClusters.reduce(
        (sum, c) => sum + (c.confirmedCount ?? c.reporterCount ?? 1),
        0,
      )
      const { spreadZones, maxSpanM } = computeSpatialSpread(subClusters)

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

      const history = computeHistoryMetrics(
        subReports,
        regionAnnouncements,
        subSurveys,
      )

      return {
        ...sub,
        regionName: region.name,
        overallStatus: subStatus,
        powerLevel: subPowerLevel,
        outageCount: subClusters.length,
        workingClusterCount: subWorkingClusters.length,
        verifiedOutages: verifiedSubClusters,
        reporterCount: totalSubReporters,
        spreadZones,
        ...history,
      }
    })

    const verifiedOutages = regionClusters.filter((c) => c.verified).length
    const unverifiedOutages = regionClusters.length - verifiedOutages
    const totalActiveReporters = regionClusters.reduce(
      (sum, c) => sum + (c.confirmedCount ?? c.reporterCount ?? 1),
      0,
    )

    const criticalSubCount = subNeighbourhoodStats.filter(
      (s) => s.overallStatus === 'critical',
    ).length
    const affectedSubCount = subNeighbourhoodStats.filter(
      (s) => s.overallStatus !== 'normal',
    ).length

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
          updatedAtMs: record?.updatedAt?.toMillis?.() ?? 0,
        }
      })

    const noGasCount = regionStations.filter(
      (s) => s.status === STATUS_NO_GAS,
    ).length
    const hasGasCount = regionStations.length - noGasCount

    const regionHistory = computeHistoryMetrics(
      regionReports,
      regionAnnouncements,
      regionSurveys,
    )

    return {
      ...region,
      powerLevel,
      outageCount: regionClusters.length,
      workingClusterCount: regionWorkingClusters.length,
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

