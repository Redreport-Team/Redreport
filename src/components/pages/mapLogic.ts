import { campuses } from "../../types/locations.ts";
import type { ReportDoc } from "../../types/report.ts";

/**
 * Pure logic behind the incident map, extracted from the Map component so it
 * can be unit tested. Nothing here touches React, Leaflet, or Firestore.
 */

export interface MapPoint {
  buildingName: string;
  coordinates: [number, number];
  totalIncidents: number;
  incidentCounts: {
    [key: string]: number; // Type -> Count
  };
  campus: string;
  buildingType: string;
  recentIncidents: ReportDoc[];
}

export interface FilterState {
  selectedCampus: string;
  selectedMonth: string;
  selectedTypes: string[];
  showMenu: boolean;
}

/** A building entry from locations.ts (that module infers as `any[]`). */
export interface Building {
  name: string;
  latitude: number;
  longitude: number;
  id: string;
  type: string;
  location: string;
}

export const OFFENSE_TYPES = [
  "uncomfortable-situation",
  "sexual-misconduct",
  "physical-aggression",
  "verbal-aggression",
  "discrimination",
] as const;

/** Fresh zeroed tally so buildings never share a counts object. */
export function emptyIncidentCounts(): { [key: string]: number } {
  return Object.fromEntries(OFFENSE_TYPES.map((type) => [type, 0]));
}

/** `YYYY-MM` key used by the month filter. */
export function toMonthKey(millis: number): string {
  const date = new Date(millis);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

/**
 * Approximate how many days ago the incident happened.
 *
 * Combines how long ago the report was filed with the midpoint of the
 * timeframe bucket the reporter selected.
 */
export function getEstimatedDays(
  report: ReportDoc,
  now: number = Date.now()
): number {
  const reportTime = report.createdAt.toMillis();
  const day = 24 * 60 * 60 * 1000;
  const daysSinceReport = now - reportTime;

  switch (report.time) {
    case "within-24-hours":
      return (daysSinceReport + day / 2) / day;
    case "within-week":
      return (daysSinceReport + day * 3.5) / day;
    case "within-month":
      return (daysSinceReport + day * 15) / day;
    case "longer-ago":
      return (daysSinceReport + day * 45) / day;
    default:
      // Unrecognised timeframe: fall back to elapsed time since filing rather
      // than 0, which would make the recency weight divide by zero.
      return daysSinceReport / day;
  }
}

/**
 * How much heavier an incident counts for the number of people involved.
 *
 * A group incident is treated as more serious than a solo one, but the effect
 * is deliberately mild so recency stays the dominant signal.
 */
export function groupSizeWeight(individualsInvolved: number): number {
  if (!Number.isFinite(individualsInvolved) || individualsInvolved <= 1) {
    return 1.0;
  }
  return individualsInvolved >= 4 ? 1.6 : 1.3;
}

/**
 * Risk score in the 0-5 range, plus a count of incidents from the last 7 days.
 *
 * Each report's weight decays hyperbolically with age, so a cluster of recent
 * incidents outweighs the same number spread over a semester, and is then
 * scaled by how many people were involved.
 */
export function calculateRiskScore(
  reports: ReportDoc[],
  now: number = Date.now()
): [number, number] {
  let totalPoints = 0;
  let recentCases = 0;

  // Reports within 3 days that would push a building to CRITICAL.
  const maxPointsThreshold = 12.0;

  for (const report of reports) {
    const estimatedAggressionTime = getEstimatedDays(report, now);

    if (estimatedAggressionTime < 7) recentCases++;

    // Clamped so a zero/negative age cannot produce an infinite weight.
    const recencyWeight = Math.min((3 / estimatedAggressionTime) * 2, 2);
    const safeRecency = Number.isFinite(recencyWeight) ? recencyWeight : 2;

    totalPoints += safeRecency * groupSizeWeight(report.individualsInvolved);
  }

  if (totalPoints === 0) {
    return [1.0, recentCases];
  }

  const score = Math.min(10.0 + (totalPoints / maxPointsThreshold) * 40.0, 50.0);

  return [Math.round(score) / 10, recentCases];
}

/** Narrow a report list down to what the current filters allow through. */
export function applyFilters(
  points: ReportDoc[],
  filters: FilterState
): ReportDoc[] {
  return points.filter((point) => {
    if (filters.selectedCampus !== "All") {
      const campusData = campuses.find((campus) => campus === point.campus);
      if (!campusData || campusData !== filters.selectedCampus) {
        return false;
      }
    }

    if (filters.selectedMonth !== "All") {
      if (toMonthKey(point.createdAt.toMillis()) !== filters.selectedMonth) {
        return false;
      }
    }

    if (
      filters.selectedTypes.length > 0 &&
      !filters.selectedTypes.some((type) => point.offenseTypes.includes(type))
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Collapse individual reports into one entry per building, tallying totals and
 * per-offence counts.
 */
export function buildMapPoints(
  points: ReportDoc[],
  filters: FilterState,
  buildings: Building[]
): { [key: string]: MapPoint } {
  const mapPoints: { [key: string]: MapPoint } = {};

  applyFilters(points, filters).forEach((point) => {
    const building = buildings.find((b) => b.name === point.specificLocation);
    const buildingName =
      point.specificLocation || building?.name || "Unknown Location";

    if (!mapPoints[buildingName]) {
      const coordinates: [number, number] =
        building &&
        typeof building.latitude === "number" &&
        typeof building.longitude === "number"
          ? [building.latitude, building.longitude]
          : [0, 0];

      mapPoints[buildingName] = {
        buildingName,
        coordinates,
        totalIncidents: 1,
        incidentCounts: emptyIncidentCounts(),
        campus: point.campus || building?.location || "Unknown Campus",
        buildingType: building?.type || "Unknown Type",
        recentIncidents: [point],
      };
    } else {
      mapPoints[buildingName].totalIncidents++;
      mapPoints[buildingName].recentIncidents.push(point);
    }

    point.offenseTypes?.forEach((type) => {
      if (mapPoints[buildingName].incidentCounts[type] !== undefined) {
        mapPoints[buildingName].incidentCounts[type]++;
      }
    });
  });

  return mapPoints;
}

/**
 * Buildings belonging to a campus.
 *
 * Campus keys are hyphenated (`"Notre-Dame"`, from `Object.keys` over the
 * building directory) while each building's own `location` field is spaced
 * (`"Notre Dame"`). Comparing them directly never matches, which left the
 * campus dropdown unable to move the map — normalise both sides.
 */
export function buildingsForCampus(
  buildings: Building[],
  campus: string
): Building[] {
  const normalise = (value: string) => value.replace(/-/g, " ").toLowerCase();
  const target = normalise(campus);
  return buildings.filter((building) => normalise(building.location) === target);
}

/** Month options for the filter dropdown, newest first. */
export function getAvailableMonths(points: ReportDoc[]): string[] {
  const months = new Set<string>();
  points.forEach((point) => {
    months.add(toMonthKey(point.createdAt.toMillis()));
  });
  return ["All", ...Array.from(months).sort().reverse()];
}
