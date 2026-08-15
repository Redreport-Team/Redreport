import { describe, expect, it } from "vitest";
import {
  applyFilters,
  buildMapPoints,
  buildingsForCampus,
  calculateRiskScore,
  emptyIncidentCounts,
  getAvailableMonths,
  getEstimatedDays,
  toMonthKey,
} from "./mapLogic.ts";
import type { Building, FilterState } from "./mapLogic.ts";
import { isUsableReport } from "../../types/report.ts";
import type { ReportDoc, StoredReport } from "../../types/report.ts";

const DAY = 24 * 60 * 60 * 1000;
/** Fixed "now" so age-based assertions never depend on wall-clock time. */
const NOW = new Date("2026-06-15T12:00:00Z").getTime();

/** Minimal Timestamp stand-in — only `toMillis` is ever used. */
function timestamp(millis: number) {
  return { toMillis: () => millis } as ReportDoc["createdAt"];
}

function makeReport(overrides: Partial<ReportDoc> = {}): ReportDoc {
  return {
    userID: "",
    campus: "Notre-Dame",
    location: "Residence Halls",
    specificLocation: "Alumni Hall",
    offenseTypes: ["verbal-aggression"],
    individualsInvolved: 1,
    time: "within-24-hours",
    additionalInfo: "",
    createdAt: timestamp(NOW),
    ...overrides,
  };
}

const buildings: Building[] = [
  {
    name: "Alumni Hall",
    latitude: 41.6984,
    longitude: -86.2339,
    id: "alumni-hall",
    type: "Residence Halls",
    location: "Notre Dame",
  },
  {
    name: "Badin Hall",
    latitude: 41.7006,
    longitude: -86.2412,
    id: "badin-hall",
    type: "Residence Halls",
    location: "Notre Dame",
  },
];

const noFilters: FilterState = {
  selectedCampus: "All",
  selectedMonth: "All",
  selectedTypes: [],
  showMenu: false,
};

describe("isUsableReport", () => {
  // Regression guard for the outage: reports were written as `submittedAt`
  // but read as `createdAt`, so `.toMillis()` threw during render and — with
  // no ErrorBoundary in the tree — blanked the entire /map page.
  it("rejects a legacy document with no createdAt", () => {
    const legacy = { ...makeReport(), createdAt: undefined } as StoredReport;
    expect(isUsableReport(legacy)).toBe(false);
  });

  it("rejects a createdAt that is not a Timestamp", () => {
    const broken = {
      ...makeReport(),
      createdAt: "2026-06-15",
    } as unknown as StoredReport;
    expect(isUsableReport(broken)).toBe(false);
  });

  it("accepts a well-formed report", () => {
    expect(isUsableReport(makeReport())).toBe(true);
  });

  it("lets downstream logic run without throwing once legacy docs are filtered", () => {
    const mixed = [
      makeReport(),
      { ...makeReport(), createdAt: undefined } as StoredReport,
    ];
    const usable = mixed.filter(isUsableReport);

    expect(usable).toHaveLength(1);
    expect(() => getAvailableMonths(usable)).not.toThrow();
  });
});

describe("getEstimatedDays", () => {
  it("adds the midpoint of each timeframe bucket to the report's age", () => {
    const filedNow = { createdAt: timestamp(NOW) };

    expect(
      getEstimatedDays(makeReport({ ...filedNow, time: "within-24-hours" }), NOW)
    ).toBeCloseTo(0.5);
    expect(
      getEstimatedDays(makeReport({ ...filedNow, time: "within-week" }), NOW)
    ).toBeCloseTo(3.5);
    expect(
      getEstimatedDays(makeReport({ ...filedNow, time: "within-month" }), NOW)
    ).toBeCloseTo(15);
    expect(
      getEstimatedDays(makeReport({ ...filedNow, time: "longer-ago" }), NOW)
    ).toBeCloseTo(45);
  });

  it("counts how long ago the report itself was filed", () => {
    const report = makeReport({
      createdAt: timestamp(NOW - 10 * DAY),
      time: "within-24-hours",
    });
    expect(getEstimatedDays(report, NOW)).toBeCloseTo(10.5);
  });

  it("falls back to elapsed time for an unrecognised timeframe", () => {
    // Previously returned 0 here, which made calculateRiskScore divide by zero.
    const report = makeReport({
      createdAt: timestamp(NOW - 4 * DAY),
      time: "not-a-real-bucket",
    });
    expect(getEstimatedDays(report, NOW)).toBeCloseTo(4);
  });
});

describe("calculateRiskScore", () => {
  it("returns the baseline for no reports", () => {
    expect(calculateRiskScore([], NOW)).toEqual([1.0, 0]);
  });

  it("keeps the score within the 0-5 range even when flooded", () => {
    const flood = Array.from({ length: 500 }, () =>
      makeReport({ time: "within-24-hours" })
    );
    const [score] = calculateRiskScore(flood, NOW);

    expect(score).toBeLessThanOrEqual(5.0);
    expect(score).toBeGreaterThan(0);
  });

  it("scores recent incidents above old ones", () => {
    const recent = [makeReport({ time: "within-24-hours" })];
    const old = [
      makeReport({
        createdAt: timestamp(NOW - 200 * DAY),
        time: "longer-ago",
      }),
    ];

    const [recentScore] = calculateRiskScore(recent, NOW);
    const [oldScore] = calculateRiskScore(old, NOW);

    expect(recentScore).toBeGreaterThan(oldScore);
  });

  it("counts only incidents estimated within the last 7 days as recent", () => {
    const reports = [
      makeReport({ time: "within-24-hours" }),
      makeReport({ time: "within-week" }),
      makeReport({ time: "longer-ago" }),
    ];

    const [, recentCases] = calculateRiskScore(reports, NOW);
    expect(recentCases).toBe(2);
  });

  it("does not produce NaN or Infinity for a zero-age report", () => {
    // 3 / 0 => Infinity before the weight is clamped.
    const report = makeReport({
      createdAt: timestamp(NOW),
      time: "not-a-real-bucket",
    });

    const [score] = calculateRiskScore([report], NOW);

    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeLessThanOrEqual(5.0);
  });
});

describe("applyFilters", () => {
  const reports = [
    makeReport({ campus: "Notre-Dame", offenseTypes: ["verbal-aggression"] }),
    makeReport({ campus: "Holy-Cross", offenseTypes: ["discrimination"] }),
  ];

  it("passes everything through when no filter is set", () => {
    expect(applyFilters(reports, noFilters)).toHaveLength(2);
  });

  it("filters by campus", () => {
    const result = applyFilters(reports, {
      ...noFilters,
      selectedCampus: "Holy-Cross",
    });

    expect(result).toHaveLength(1);
    expect(result[0].campus).toBe("Holy-Cross");
  });

  it("filters by offense type", () => {
    const result = applyFilters(reports, {
      ...noFilters,
      selectedTypes: ["discrimination"],
    });

    expect(result).toHaveLength(1);
    expect(result[0].offenseTypes).toContain("discrimination");
  });

  it("filters by month", () => {
    const month = toMonthKey(NOW);
    const older = makeReport({ createdAt: timestamp(NOW - 90 * DAY) });

    const result = applyFilters([...reports, older], {
      ...noFilters,
      selectedMonth: month,
    });

    expect(result).toHaveLength(2);
  });

  it("applies campus and type filters together", () => {
    const result = applyFilters(reports, {
      ...noFilters,
      selectedCampus: "Notre-Dame",
      selectedTypes: ["discrimination"],
    });

    expect(result).toHaveLength(0);
  });
});

describe("buildMapPoints", () => {
  it("collapses repeat incidents into one entry per building", () => {
    const reports = [
      makeReport({ specificLocation: "Alumni Hall" }),
      makeReport({ specificLocation: "Alumni Hall" }),
    ];

    const points = buildMapPoints(reports, noFilters, buildings);

    expect(Object.keys(points)).toEqual(["Alumni Hall"]);
    expect(points["Alumni Hall"].totalIncidents).toBe(2);
    expect(points["Alumni Hall"].recentIncidents).toHaveLength(2);
  });

  it("keeps separate buildings separate", () => {
    const reports = [
      makeReport({ specificLocation: "Alumni Hall" }),
      makeReport({ specificLocation: "Badin Hall" }),
    ];

    const points = buildMapPoints(reports, noFilters, buildings);

    expect(Object.keys(points).sort()).toEqual(["Alumni Hall", "Badin Hall"]);
    expect(points["Alumni Hall"].totalIncidents).toBe(1);
    expect(points["Badin Hall"].totalIncidents).toBe(1);
  });

  it("tallies each offense type", () => {
    const reports = [
      makeReport({ offenseTypes: ["verbal-aggression"] }),
      makeReport({ offenseTypes: ["verbal-aggression"] }),
      makeReport({ offenseTypes: ["discrimination"] }),
    ];

    const counts = buildMapPoints(reports, noFilters, buildings)["Alumni Hall"]
      .incidentCounts;

    expect(counts["verbal-aggression"]).toBe(2);
    expect(counts["discrimination"]).toBe(1);
    expect(counts["sexual-misconduct"]).toBe(0);
  });

  it("does not share one counts object between buildings", () => {
    const reports = [
      makeReport({ specificLocation: "Alumni Hall" }),
      makeReport({ specificLocation: "Badin Hall" }),
    ];

    const points = buildMapPoints(reports, noFilters, buildings);

    expect(points["Alumni Hall"].incidentCounts).not.toBe(
      points["Badin Hall"].incidentCounts
    );
    expect(points["Alumni Hall"].incidentCounts["verbal-aggression"]).toBe(1);
  });

  it("resolves coordinates from the building directory", () => {
    const points = buildMapPoints([makeReport()], noFilters, buildings);
    expect(points["Alumni Hall"].coordinates).toEqual([41.6984, -86.2339]);
  });

  it("falls back to [0, 0] for a building it cannot place", () => {
    const report = makeReport({ specificLocation: "Nonexistent Hall" });
    const points = buildMapPoints([report], noFilters, buildings);

    expect(points["Nonexistent Hall"].coordinates).toEqual([0, 0]);
    expect(points["Nonexistent Hall"].buildingType).toBe("Unknown Type");
  });

  it("groups reports with no specific location under Unknown Location", () => {
    const report = makeReport({ specificLocation: "" });
    const points = buildMapPoints([report], noFilters, buildings);

    expect(points["Unknown Location"].totalIncidents).toBe(1);
  });

  it("respects the active filters", () => {
    const reports = [
      makeReport({ specificLocation: "Alumni Hall", campus: "Notre-Dame" }),
      makeReport({ specificLocation: "Badin Hall", campus: "Holy-Cross" }),
    ];

    const points = buildMapPoints(
      reports,
      { ...noFilters, selectedCampus: "Notre-Dame" },
      buildings
    );

    expect(Object.keys(points)).toEqual(["Alumni Hall"]);
  });
});

describe("buildingsForCampus", () => {
  // The campus dropdown passes a hyphenated key while buildings store a spaced
  // name, so a direct comparison silently matched nothing and the map never moved.
  it("matches a hyphenated campus key against spaced building names", () => {
    expect(buildingsForCampus(buildings, "Notre-Dame")).toHaveLength(2);
  });

  it("returns nothing for a campus with no buildings", () => {
    expect(buildingsForCampus(buildings, "Saint-Marys")).toHaveLength(0);
  });
});

describe("helpers", () => {
  it("builds a zeroed tally covering every offense type", () => {
    const counts = emptyIncidentCounts();

    expect(Object.values(counts).every((count) => count === 0)).toBe(true);
    expect(Object.keys(counts)).toHaveLength(5);
  });

  it("formats a month key as YYYY-MM", () => {
    expect(toMonthKey(new Date("2026-01-09T00:00:00Z").getTime())).toMatch(
      /^\d{4}-\d{2}$/
    );
  });

  it("lists months newest first behind an All option", () => {
    const months = getAvailableMonths([
      makeReport({ createdAt: timestamp(new Date("2026-01-10").getTime()) }),
      makeReport({ createdAt: timestamp(new Date("2026-03-10").getTime()) }),
    ]);

    expect(months[0]).toBe("All");
    expect(months.slice(1)).toEqual(["2026-03", "2026-01"]);
  });
});
