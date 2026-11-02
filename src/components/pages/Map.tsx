import { useEffect, useMemo, useRef, useState } from "react";
import {
  config,
  LngLatBounds,
  Map as MaptilerMap,
  Popup,
  type GeoJSONSource,
} from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import type { FeatureCollection, Point } from "geojson";
import { campuses, allBuildings } from "../../types/locations.ts";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase.ts";
import { isUsableReport, reportConverter } from "../../types/report.ts";
import type { ReportDoc } from "../../types/report.ts";
import {
  buildMapPoints,
  buildingsForCampus,
  calculateRiskScore,
  getAvailableMonths,
} from "./mapLogic.ts";
import type { Building, FilterState, MapPoint } from "./mapLogic.ts";
import "../../components/css/Map.css";

// MapTiler/MapLibre takes [longitude, latitude] — the reverse of the
// [latitude, longitude] pairs used in locations.ts and mapLogic.
const TRI_CAMPUS_CENTER: [number, number] = [-86.2379, 41.7002];
const TRI_CAMPUS_BOUNDS: [[number, number], [number, number]] = [
  [-86.2879, 41.5852], // south-west
  [-86.1779, 41.7852], // north-east
];

const INCIDENT_SOURCE = "incidents";
const INCIDENT_LAYER = "incident-circles";
const CAMPUS_LAYER = "incident-campus-dots";

// Single source of truth for offense types: drives the filter checkboxes, the
// circle colours, and the popup legend.
const INCIDENT_TYPES = [
  { name: "uncomfortable-situation", color: "#de9e36" },
  { name: "sexual-misconduct", color: "#ca3c25" },
  { name: "physical-aggression", color: "#701d52" },
  { name: "verbal-aggression", color: "#212475" },
  { name: "discrimination", color: "#1d1a05" },
];

const INCIDENT_COLORS: Record<string, string> = Object.fromEntries(
  INCIDENT_TYPES.map((type) => [type.name, type.color])
);

const CAMPUS_COLORS: Record<string, string> = {
  "Notre-Dame": "#FFD700",
  "Holy-Cross": "#ffffff",
  "Saint-Marys": "#87CEEB",
};

const EMPTY_COLLECTION: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/** Offense type with the highest count at a building. */
function dominantType(mapPoint: MapPoint): string {
  const [type] =
    Object.entries(mapPoint.incidentCounts).sort(([, a], [, b]) => b - a)[0] ??
    [];
  return type ?? "";
}

function buildPopupHtml(mapPoint: MapPoint): string {
  const [riskScore, recentCases] = calculateRiskScore(mapPoint.recentIncidents);

  const riskColor =
    riskScore >= 4
      ? "#ca3c25" // High
      : riskScore >= 3
      ? "#de9e36" // Medium-high
      : riskScore >= 2
      ? "#212475" // Medium
      : "#28a745"; // Low

  const typeBreakdown = Object.entries(mapPoint.incidentCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => {
      const color = INCIDENT_COLORS[type];
      if (!color) return "";
      const displayName = type
        .replace(/-/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      return `<div style="margin: 2px 0; font-size: 12px;">
          <span style="color: ${color}; font-weight: bold;">●</span>
          ${displayName}: ${count}
        </div>`;
    })
    .join("");

  const recency =
    recentCases > 0
      ? `<br><span style="font-size: 12px; color: #666;">(${recentCases} recent case${
          recentCases > 1 ? "s" : ""
        } in last 7 days)</span>`
      : '<br><span style="font-size: 12px; color: #28a745;">(No recent activity)</span>';

  return `
    <div class="enhanced-popup-content">
      <h3 style="margin: 0 0 10px 0; color: #333;">${mapPoint.buildingName}</h3>

      <div style="margin-bottom: 10px;">
        <span style="font-weight: bold; color: #666;">Campus:</span> ${mapPoint.campus}<br>
        <span style="font-weight: bold; color: #666;">Building Type:</span> ${mapPoint.buildingType}
      </div>

      <div style="margin-bottom: 10px;">
        <span style="font-weight: bold; color: #666;">Total Cases:</span> ${mapPoint.totalIncidents}
      </div>

      <div style="margin-bottom: 10px;">
        <span style="font-weight: bold; color: #666;">Types of Aggressions:</span><br>
        ${typeBreakdown}
      </div>

      <div style="margin-bottom: 10px;">
        <span style="font-weight: bold; color: #666;">Risk Score:</span>
        <span style="color: ${riskColor}; font-weight: bold; font-size: 16px;">${riskScore}/5</span>
        ${recency}
      </div>
    </div>
  `;
}

/** One point feature per building, carrying its own styling and popup. */
function toIncidentGeoJSON(mapPoints: {
  [key: string]: MapPoint;
}): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: Object.values(mapPoints)
      .filter((mapPoint) => mapPoint.totalIncidents > 0)
      .map((mapPoint) => {
        const [latitude, longitude] = mapPoint.coordinates;
        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [longitude, latitude],
          },
          properties: {
            radius: Math.min(mapPoint.totalIncidents * 3 + 8, 34),
            color: INCIDENT_COLORS[dominantType(mapPoint)] ?? "#666666",
            campusColor: CAMPUS_COLORS[mapPoint.campus] ?? "#000000",
            popupHtml: buildPopupHtml(mapPoint),
          },
        };
      }),
  };
}

function Map() {
  const [Points, SetPoints] = useState<ReportDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [styleReady, setStyleReady] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    selectedCampus: "All",
    selectedMonth: "All",
    selectedTypes: [],
    showMenu: false,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaptilerMap | null>(null);

  // Derived, not stored: recomputing is cheap and keeps one source of truth.
  const mapPoints = useMemo(
    () => buildMapPoints(Points, filters, allBuildings as Building[]),
    [Points, filters]
  );

  // Load reports
  useEffect(() => {
    const getData = async () => {
      try {
        const reportsRef = collection(db, "reports").withConverter(
          reportConverter
        );
        const querySnapshot = await getDocs(query(reportsRef));
        // Skip legacy/malformed docs missing a valid createdAt Timestamp —
        // reading .toMillis() on those throws during render and blanks the page.
        SetPoints(
          querySnapshot.docs.map((doc) => doc.data()).filter(isUsableReport)
        );
      } catch (err) {
        console.error("Error fetching incidents:", err);
        setError("Failed to fetch incident data");
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  // Create the map
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    config.apiKey = import.meta.env.VITE_MAP_KEY;

    const map = new MaptilerMap({
      container: containerRef.current,
      style: "streets-v4",
      center: TRI_CAMPUS_CENTER,
      zoom: 15,
      minZoom: 15,
      maxZoom: 19,
      maxBounds: TRI_CAMPUS_BOUNDS,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(INCIDENT_SOURCE, {
        type: "geojson",
        data: EMPTY_COLLECTION,
      });

      // Outer circle: size by incident count, colour by dominant offense type.
      map.addLayer({
        id: INCIDENT_LAYER,
        type: "circle",
        source: INCIDENT_SOURCE,
        paint: {
          "circle-radius": ["get", "radius"],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.7,
          "circle-stroke-width": 2,
          "circle-stroke-color": ["get", "color"],
        },
      });

      // Inner dot: colour by campus.
      map.addLayer({
        id: CAMPUS_LAYER,
        type: "circle",
        source: INCIDENT_SOURCE,
        paint: {
          "circle-radius": 5,
          "circle-color": ["get", "campusColor"],
          "circle-opacity": 0.5,
        },
      });

      map.on("click", INCIDENT_LAYER, (event) => {
        const feature = event.features?.[0];
        if (!feature) return;

        const { coordinates } = feature.geometry as Point;
        new Popup({ maxWidth: "400px", className: "enhanced-popup" })
          .setLngLat([coordinates[0], coordinates[1]])
          .setHTML(String(feature.properties?.popupHtml ?? ""))
          .addTo(map);
      });

      map.on("mouseenter", INCIDENT_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", INCIDENT_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });

      setStyleReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setStyleReady(false);
    };
  }, []);

  // Push the current points onto the map whenever they or the filters change
  useEffect(() => {
    if (!styleReady) return;

    const source = mapRef.current?.getSource(INCIDENT_SOURCE) as
      | GeoJSONSource
      | undefined;
    source?.setData(toIncidentGeoJSON(mapPoints));
  }, [mapPoints, styleReady]);

  const handleFilterChange = (
    filterType: keyof FilterState,
    value: string | string[] | boolean
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const toggleIncidentType = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedTypes: prev.selectedTypes.includes(type)
        ? prev.selectedTypes.filter((t) => t !== type)
        : [...prev.selectedTypes, type],
    }));
  };

  const navigateToCampus = (campus: string) => {
    const map = mapRef.current;
    if (!map) return;

    if (campus === "All") {
      map.easeTo({ center: TRI_CAMPUS_CENTER, zoom: 15 });
      return;
    }

    const campusBuildings = buildingsForCampus(
      allBuildings as Building[],
      campus
    );
    if (campusBuildings.length === 0) return;

    const bounds = new LngLatBounds();
    campusBuildings.forEach((building) => {
      bounds.extend([building.longitude, building.latitude]);
    });
    map.fitBounds(bounds, { padding: 50 });
  };

  return (
    <div className="fullscreen-map-container">
      {/* Filter Menu */}
      <div className="map-filter z-front">
        <div
          className={`map-filter-menu m-1${filters.showMenu ? " open" : ""}`}
          style={{
            zIndex: filters.showMenu ? 1001 : -1,
            opacity: filters.showMenu ? 1 : 0,
          }}
        >
          <div className="filter-content">
            <h3>Map Filters</h3>

            {/* Campus Filter */}
            <div className="filter-section">
              <label htmlFor="campus-filter">Campus:</label>
              <select
                id="campus-filter"
                value={filters.selectedCampus}
                onChange={(e) => {
                  handleFilterChange("selectedCampus", e.target.value);
                  navigateToCampus(e.target.value);
                }}
                className="form-select"
              >
                {campuses.map((campus) => (
                  <option key={campus.toString()} value={campus.toString()}>
                    {campus.toString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="filter-section">
              <label htmlFor="month-filter">Month:</label>
              <select
                id="month-filter"
                value={filters.selectedMonth}
                onChange={(e) =>
                  handleFilterChange("selectedMonth", e.target.value)
                }
                className="form-select"
              >
                {getAvailableMonths(Points).map((month) => (
                  <option key={month} value={month}>
                    {month === "All" ? "All Time" : month}
                  </option>
                ))}
              </select>
            </div>

            {/* Incident Type Filter */}
            <div className="filter-section">
              <label>Incident Types:</label>
              <div className="type-filters">
                {INCIDENT_TYPES.map((type) => (
                  <label
                    key={type.name}
                    className="type-checkbox custom-circle-checkbox"
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.selectedTypes.includes(type.name)}
                      onChange={() => toggleIncidentType(type.name)}
                      style={{ display: "none" }}
                    />
                    <span
                      className={`type-color-dot-circle ${
                        filters.selectedTypes.includes(type.name)
                          ? "selected"
                          : ""
                      }`}
                      style={{
                        backgroundColor: type.color,
                        borderColor: type.color,
                      }}
                    >
                      {filters.selectedTypes.includes(type.name) && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          style={{ display: "block", margin: "auto" }}
                        >
                          <circle
                            cx="13"
                            cy="13"
                            r="10"
                            fill="#fff"
                            opacity="0.8"
                          />
                        </svg>
                      )}
                    </span>
                    <span style={{ marginLeft: 8 }}>{type.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <button
              className="clear-filters-btn"
              onClick={() =>
                setFilters({
                  selectedCampus: "All",
                  selectedMonth: "All",
                  selectedTypes: [],
                  showMenu: filters.showMenu,
                })
              }
            >
              Clear All Filters
            </button>

            {/* Results Summary */}
            <div className="results-summary">
              <p>Showing {Object.values(mapPoints).length} incidents</p>
              {filters.selectedCampus !== "All" && (
                <p>Campus: {filters.selectedCampus}</p>
              )}
              {filters.selectedMonth !== "All" && (
                <p>Period: {filters.selectedMonth}</p>
              )}
              {filters.selectedTypes.length > 0 && (
                <p>Types: {filters.selectedTypes.join(", ")}</p>
              )}
            </div>
          </div>
        </div>
        <button
          className="menu-toggle-btn"
          onClick={() => handleFilterChange("showMenu", !filters.showMenu)}
        >
          {filters.showMenu ? "✕" : "☰"}
        </button>
      </div>

      {/* Back Button */}
      <div className="form-group abs right ">
        <a href="../" className="back-button form-btn">
          <button className=" small">Back</button>
        </a>
        <a
          data-az-l="1e9e1abc-2335-4838-949d-8ab8af0dd8c9"
          className="back-button form-btn mt-4"
        >
          <button className=" small">Leave Feedback</button>
        </a>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">Loading incident data...</div>
        </div>
      )}

      {/* Error Overlay */}
      {error && <div className="error-overlay">{error}</div>}

      {/* Map Container */}
      <div ref={containerRef} id="map" className="fullscreen-map"></div>
    </div>
  );
}

export default Map;
