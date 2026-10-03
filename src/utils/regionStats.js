import { distanceBetween } from 'geofire-common'
import { NEIGHBOURHOODS } from '../constants'
import { STATUS_HAS_GAS, STATUS_NO_GAS } from '../services/stations'

function findClosestRegionId(lat, lng) {
  let bestId = NEIGHBOURHOODS[0].id
  let bestDist = Infinity
  for (const region of NEIGHBOURHOODS) {
    const d = distanceBetween([lat, lng], [region.lat, region.lng]) * 1000
    if (d < bestDist) {
      bestDist = d
      bestId = region.id
    }
  }
  return bestId
}

export function computeRegionStats(clusters, stations, stationStatuses) {
  return NEIGHBOURHOODS.map((region) => {
    const regionClusters = (clusters ?? []).filter((cluster) => {
      const dist =
        distanceBetween([region.lat, region.lng], [cluster.lat, cluster.lng]) *
        1000
      return (
        dist <= (region.radiusM ?? 2500) ||
        findClosestRegionId(cluster.lat, cluster.lng) === region.id
      )
    })

    const verifiedOutages = regionClusters.filter((c) => c.verified).length
    const unverifiedOutages = regionClusters.length - verifiedOutages

    // Calculate estimated regional grid power availability level (0-100%)
    const penalty = verifiedOutages * 25 + unverifiedOutages * 10
    const powerLevel = Math.max(15, 100 - penalty)

    const regionStations = (stations ?? [])
      .filter((station) => {
        if (station.regionId) return station.regionId === region.id
        return findClosestRegionId(station.lat, station.lng) === region.id
      })
      .map((station) => {
        const record = stationStatuses?.[station.id]
        const status = record?.status ?? STATUS_HAS_GAS
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

    let overallStatus = 'normal'
    if (verifiedOutages > 0 || noGasCount > regionStations.length / 2) {
      overallStatus = 'critical'
    } else if (unverifiedOutages > 0 || noGasCount > 0) {
      overallStatus = 'warning'
    }

    return {
      ...region,
      powerLevel,
      outageCount: regionClusters.length,
      verifiedOutages,
      unverifiedOutages,
      stations: regionStations,
      totalStations: regionStations.length,
      hasGasCount,
      noGasCount,
      overallStatus,
    }
  })
}
