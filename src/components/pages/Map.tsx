import L, { Point } from "leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MaptilerLayer } from "@maptiler/leaflet-maptilersdk";
import { campuses, allBuildings } from "../../types/locations.ts";
import {
  collection,
  query,
  where,
  QueryConstraint,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase.ts";
import "../../components/css/Map.css";

interface Case {
  campus: string;
  location: string;
  specificLocation: string;
  offenseTypes: string[];
  time: string;
  createdAt: Timestamp;
  additionalInfo: string;
}

interface MapPoint {
  buildingName: string;
  coordinates: [number, number];
  totalIncidents: number;
  incidentCounts: {
    [key: string]: number; // Type -> Count
  };
  campus: string;
  buildingType: string;
  recentIncidents: Case[];
}

interface FilterState {
  selectedCampus: string;
  selectedMonth: string;
  selectedTypes: string[];
  showMenu: boolean;
}

// Incident type options
const incidentTypes = [
  { id: 0, name: "uncomfortable-situation", color: "#de9e36" },
  { id: 1, name: "sexual-misconduct", color: "#ca3c25" },
  { id: 2, name: "physical-aggression", color: "#701d52" },
  { id: 3, name: "verbal-aggression", color: "#212475" },
  { id: 4, name: "discrimination", color: "#1d1a05" },
];

function Map() {
  const [Points, SetPoints] = useState<Case[]>([]);
  const [MapPoints, setMapPoints] = useState<{
    [key: string]: MapPoint;
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    selectedCampus: "All",
    selectedMonth: "All",
    selectedTypes: [],
    showMenu: false,
  });

  // References to keep track of map components
  const mapRef = useRef<L.Map | null>(null);
  const circlesRef = useRef<L.LayerGroup | null>(null);

  // Initiate Map
  useEffect(() => {
    // Fetch Data from Firebase and set it as <Point> type
    const getData = async () => {
      try {
        const reportsRef = collection(db, "reports");
        const q = query(reportsRef);
        const querySnapshot = await getDocs(q);
        console.log(
          "Firebase Points: ",
          querySnapshot.docs.map((doc) => doc.data() as Case)
        );
        SetPoints(querySnapshot.docs.map((doc) => doc.data() as Case));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching incidents:", error);
        setError("Failed to fetch incident data");
        setLoading(false);
      }
    };
    // Call above function
    getData();

    // Set up Map using MapTilerSDK and Leaflet
    if (!mapRef.current) {
      mapRef.current = L.map("map", { maxZoom: 19 })
        .setView([41.7002, -86.2379], 15)
        .setMinZoom(15)
        .setMaxBounds([
          [41.7852, -86.1779],
          [41.5852, -86.2879],
        ]);

      new MaptilerLayer({
        style: "streets-v2",
        apiKey: import.meta.env.VITE_MAP_KEY,
      }).addTo(mapRef.current);

      circlesRef.current = L.layerGroup().addTo(mapRef.current!);
    }
  }, []);

  useEffect(() => {
    // Start displaying MapPoints on Map
    initializeMapPoints();
  }, [Points, filters]);

  // Convert points from Firebase : <Case> into complete <MapPoints> with firebase.ts
  const MapPointConversion = () => {
    const TempMapPoints: { [key: string]: MapPoint } = {};
    // Get points that fit filter criteria
    const filteredPoints = applyFilters(Points);
    filteredPoints.forEach((point) => {
      // Find the building in allBuildings with the same specificLocation name
      const location = allBuildings.find(
        (building: any) => building.name === point.specificLocation
      );

      // Incident types
      const TempIncidentCounts: { [key: string]: number } = {
        "uncomfortable-situation": 0,
        "sexual-misconduct": 0,
        "physical-aggression": 0,
        "verbal-aggression": 0,
        discrimination: 0,
      };
      const totalIncidents = location?.totalIncidents + 1 || 1;
      const incidentCounts: { [key: string]: number } = {
        ...TempIncidentCounts,
      };
      if (point.offenseTypes) {
        point.offenseTypes.forEach((type) => {
          if (incidentCounts[type] !== undefined) {
            incidentCounts[type] += 1;
          } else {
            incidentCounts[type] = 1;
          }
        });
      }

      // Key properties from Case and building
      const buildingName =
        point.specificLocation || location?.name || "Unknown Location";

      const coordinates: [number, number] =
        location &&
        typeof location.latitude === "number" &&
        typeof location.longitude === "number"
          ? [location.latitude, location.longitude]
          : [0, 0];
      const campus = point.campus || location?.campus || "Unknown Campus";
      const buildingType =
        location?.type || location?.buildingType || "Unknown Type";
      const recentIncidents = [point];
      console.log(
        "Individual TempMapPoint: ",
        (TempMapPoints[buildingName] = {
          buildingName,
          coordinates,
          totalIncidents,
          incidentCounts,
          campus,
          buildingType,
          recentIncidents,
        })
      );
      TempMapPoints[buildingName] = {
        buildingName,
        coordinates,
        totalIncidents,
        incidentCounts,
        campus,
        buildingType,
        recentIncidents,
      };
    });
    console.log("TempMapPoints: ", TempMapPoints);
    setMapPoints(TempMapPoints);
    return TempMapPoints;
  };

  // Add individual MapPoints to the Map as circles
  const initializeMapPoints = () => {
    const CurrentMapPoints = MapPointConversion();

    // Clear any circles present
    if (circlesRef.current) circlesRef.current?.clearLayers();

    Object.values(CurrentMapPoints).forEach((mapPoint) => {
      if (mapPoint.totalIncidents > 0) {
        // Determine circle size based on total incidents
        const circleSize = Math.min(mapPoint.totalIncidents * 10 + 15, 100);

        // Determine color based on most common incident type
        const mostCommonType = Object.entries(mapPoint.incidentCounts).sort(
          ([, a], [, b]) => b - a
        )[0][0];

        const typeColors: { [key: string]: string } = {
          "uncomfortable-situation": "#de9e36",
          "sexual-misconduct": "#ca3c25",
          "physical-aggression": "#701d52",
          "verbal-aggression": "#212475",
          discrimination: "#1d1a05",
        };

        const circleColor = typeColors[mostCommonType] || "#666666";
        // Create main incident circle
        L.circle(mapPoint.coordinates, {
          color: circleColor,
          fillColor: circleColor,
          fillOpacity: 0.7,
          radius: circleSize,
          weight: 2,
        }).addTo(circlesRef.current!);

        // Create detailed popup with enhanced information
        const popupContent = createEnhancedPopup(mapPoint);

        // Determine color and border of inner circle based on campus
        let fillColor = "black";
        if (mapPoint.campus == "Notre-Dame") {
          fillColor = "#FFD700";
        } else if (mapPoint.campus == "Holy-Cross") {
          fillColor = "#fff";
        } else if (mapPoint.campus == "Saint-Marys") {
          fillColor = "#87CEEB";
        }

        L.circle(mapPoint.coordinates, {
          fillColor: fillColor,
          fillOpacity: 0.5,
          color: fillColor,
          stroke: false,
          radius: 15,
        })
          .addTo(circlesRef.current!)
          .bindPopup(popupContent, {
            maxWidth: 400,
            className: "enhanced-popup",
          });
      }
    });
  };

  // Get available months from data for FilterMenu
  const getAvailableMonths = () => {
    const months = new Set<string>();
    Points.forEach((point) => {
      const date = new Date(point.createdAt.toMillis());
      const monthYear = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      months.add(monthYear);
    });
    return ["All", ...Array.from(months).sort().reverse()];
  };

  function getEstimatedDays(report: Case): number {
    const reportTime = report.createdAt.toMillis();
    const today = Date.now();
    const day = 24 * 60 * 60 * 1000;

    let estimatedDays = 0;
    // Calculate time since Report was made
    let daysSinceReport = today - reportTime;

    // Caclulate time since agression occured
    switch (report.time) {
      case "within-24-hours":
        estimatedDays = (daysSinceReport + day / 2) / day;
        break;
      case "within-week":
        estimatedDays = (daysSinceReport + day * 3.5) / day;
        break;
      case "within-month":
        estimatedDays = (daysSinceReport + day * 15) / day;
        break;
      case "longer-ago":
        estimatedDays = (daysSinceReport + day * 45) / day;
        break;
    }
    return estimatedDays;
  }
  function calculateRiskScore(reports: Case[]): [number, number] {
    let totalPoints = 0;
    let recentCases = 0;

    // X = Amount of reports in the last 3 days considered CRITICAL
    const maxPointsThreshold = 12.0;

    for (const report of reports) {
      const estimatedAggressionTime = getEstimatedDays(report);

      if (estimatedAggressionTime < 7) recentCases++;

      // x report in 3 days is critical
      // As days pass the weight of each report on the risk score decreases hyperbolically
      const recencyWeight = Math.min((3 / estimatedAggressionTime) * 2, 2);

      totalPoints += recencyWeight;
    }

    if (totalPoints === 0) {
      return [1.0, 0];
    }

    let score = 10.0 + (totalPoints / maxPointsThreshold) * 40.0;

    score = Math.min(score, 50.0);

    return [Math.round(score) / 10, recentCases];
  }

  const applyFilters = (points: Case[]) => {
    return points.filter((point) => {
      // Campus filter
      if (filters.selectedCampus !== "All") {
        const campusData = campuses.find(
          (building) => building === point.campus
        );
        if (!campusData || campusData !== filters.selectedCampus) {
          return false;
        }
      }

      // Month filter
      if (filters.selectedMonth !== "All") {
        const pointDate = new Date(point.createdAt.toMillis());
        const pointMonth = `${pointDate.getFullYear()}-${String(
          pointDate.getMonth() + 1
        ).padStart(2, "0")}`;
        if (pointMonth !== filters.selectedMonth) {
          return false;
        }
      }

      // Type filter
      if (
        filters.selectedTypes.length > 0 &&
        !filters.selectedTypes.some((type) => point.offenseTypes.includes(type))
      ) {
        return false;
      }

      return true;
    });
  };

  // Handle filter changes
  const handleFilterChange = (
    filterType: keyof FilterState,
    value: string | string[] | boolean
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  // Toggle incident type filter
  const toggleIncidentType = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedTypes: prev.selectedTypes.includes(type)
        ? prev.selectedTypes.filter((t) => t !== type)
        : [...prev.selectedTypes, type],
    }));
  };

  // Navigate to campus
  const navigateToCampus = (campus: string) => {
    if (!mapRef.current) return;

    if (campus === "All") {
      mapRef.current.setView([41.7002, -86.2379], 15);
    } else {
      const campusbuildings = allBuildings.filter(
        (building) => building.location === campus
      );
      if (campusbuildings.length > 0) {
        const bounds = L.latLngBounds(
          campusbuildings.map((building) => [
            building.latitude,
            building.longitude,
          ])
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  const createEnhancedPopup = (mapPoint: MapPoint): string => {
    const [riskScore, recentCases] = calculateRiskScore(
      mapPoint.recentIncidents
    );
    // Risk color based on score
    const riskColor =
      riskScore >= 4
        ? "#ca3c25" // Red for high risk
        : riskScore >= 3
        ? "#de9e36" // Orange for medium-high risk
        : riskScore >= 2
        ? "#212475" // Blue for medium risk
        : "#28a745"; // Green for low risk

    const typeInfo = [
      { name: "uncomfortable-situation", color: "#de9e36" },
      { name: "sexual-misconduct", color: "#ca3c25" },
      { name: "physical-aggression", color: "#701d52" },
      { name: "verbal-aggression", color: "#212475" },
      { name: "discrimination", color: "#1d1a05" },
    ];

    return `
      <div class="enhanced-popup-content">
        <h3 style="margin: 0 0 10px 0; color: #333;">${
          mapPoint.buildingName
        }</h3>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold; color: #666;">Campus:</span> ${
            mapPoint.campus
          }<br>
          <span style="font-weight: bold; color: #666;">Building Type:</span> ${
            mapPoint.buildingType
          }
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold; color: #666;">Total Cases:</span> ${
            mapPoint.totalIncidents
          }
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold; color: #666;">Types of Aggressions:</span><br>
          ${Object.entries(mapPoint.incidentCounts)
            .filter(([, count]) => count > 0)
            .map(([type, count]) => {
              const typeData = typeInfo.find((t) => t.name === type);
              if (!typeData) return "";
              const displayName = typeData.name
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
              return `<div style="margin: 2px 0; font-size: 12px;">
                <span style="color: ${typeData.color}; font-weight: bold;">●</span>
                ${displayName}: ${count}
              </div>`;
            })
            .join("")}
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold; color: #666;">Risk Score:</span> 
          <span style="color: ${riskColor}; font-weight: bold; font-size: 16px;">
            ${riskScore}/5
          </span>
          ${
            recentCases > 0
              ? `<br><span style="font-size: 12px; color: #666;">
              (${recentCases} recent case${
                  recentCases > 1 ? "s" : ""
                } in last 7 days)
            </span>`
              : '<br><span style="font-size: 12px; color: #28a745;">(No recent activity)</span>'
          }
        </div>
      </div>
    `;
  };

  return (
    <div className="fullscreen-map-container">
      {/* Filter Menu */}
      <div className="map-filter z-front">
        <div
          className="map-filter-menu m-2"
          style={{
            zIndex: filters.showMenu ? 1001 : -1,
            opacity: filters.showMenu ? 1 : 0,
          }}
        >
          {/* Only show filter content if menu is open */}
          <div className="filter-content">
            <h3>Map Filters</h3>

            {/* Campus Filter */}
            <div className="filter-section">
              <label>Campus:</label>
              <select
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
              <label>Month:</label>
              <select
                value={filters.selectedMonth}
                onChange={(e) =>
                  handleFilterChange("selectedMonth", e.target.value)
                }
                className="form-select"
              >
                {getAvailableMonths().map((month) => (
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
                {incidentTypes.map((type) => (
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
                          style={{
                            display: "block",
                            margin: "auto",
                          }}
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
              <p>Showing {Object.values(MapPoints).length} incidents</p>
              {filters.selectedCampus !== "All" && (
                <p>Campus: {filters.selectedCampus}</p>
              )}
              {filters.selectedMonth !== "All" && (
                <p>Period: {filters.selectedMonth}</p>
              )}
              {filters.selectedTypes.length > 0 && (
                <p>
                  Types:{" "}
                  {filters.selectedTypes
                    .map((id) => incidentTypes.find((t) => t.name === id)?.name)
                    .join(", ")}
                </p>
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
      <div id="map" className="fullscreen-map"></div>
    </div>
  );
}

export default Map;
