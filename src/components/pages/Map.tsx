import L from "leaflet";
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

interface MapProps {
  reports?: Case[];
  onReportClick?: (report: Case) => void;
}

interface EnhancedMapPoint {
  buildingName: string;
  coordinates: [number, number];
  totalIncidents: number;
  incidentCounts: {
    [key: string]: number; // Type -> Count
  };
  location: string;
  buildingType: string;
  recentIncidents: Case[];
}

interface FilterState {
  selectedCampus: string;
  selectedMonth: string;
  selectedTypes: string[];
  showMenu: boolean;
}

function Map({ reports = [], onReportClick }: MapProps) {
  const [Points, SetPoints] = useState<Case[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<Case[]>([]);
  const [enhancedMapPoints, setEnhancedMapPoints] = useState<
    EnhancedMapPoint[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    selectedCampus: "All",
    selectedMonth: "All",
    selectedTypes: [],
    showMenu: false,
  });
  const mapRef = useRef<L.Map | null>(null);

  // Get available months from data
  const getAvailableMonths = () => {
    console.log("months");
    const months = new Set<string>();
    Points.forEach((point) => {
      const date = new Date(point.createdAt.toMillis());
      console.log(date);
      const monthYear = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      months.add(monthYear);
    });
    return ["All", ...Array.from(months).sort().reverse()];
  };

  // Incident type options
  const incidentTypes = [
    { id: 0, name: "uncomfortable-situation", color: "#de9e36" },
    { id: 1, name: "sexual-misconduct", color: "#ca3c25" },
    { id: 2, name: "physical-aggression", color: "#701d52" },
    { id: 3, name: "verbal-aggression", color: "#212475" },
    { id: 4, name: "discrimination", color: "#1d1a05" },
  ];

  // Convert building data to map format with enhanced information
  const initializeMapPoints = (): { [key: string]: EnhancedMapPoint } => {
    const mapPoints: { [key: string]: EnhancedMapPoint } = {};

    allBuildings.forEach((building) => {
      mapPoints[building.name] = {
        buildingName: building.name,
        coordinates: [building.latitude, building.longitude],
        totalIncidents: 0,
        incidentCounts: {
          "uncomfortable-situation": 0,
          "sexual-misconduct": 0,
          "physical-aggression": 0,
          "verbal-aggression": 0,
          discrimination: 0,
        },
        buildingType: building.type,
        location: building.location,
        recentIncidents: [],
      };
    });

    return mapPoints;
  };

  // Apply filters to points
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

  useEffect(() => {
    const getData = async () => {
      try {
        const constraints: QueryConstraint[] = [];

        if (filters.selectedCampus !== "All") {
          constraints.push(where("campus", "==", filters.selectedCampus));
        }
        if (filters.selectedMonth !== "All") {
          constraints.push(where("createdAt", ">=", filters.selectedMonth));
        }

        const reportsRef = collection(db, "reports");
        const q = query(reportsRef, ...constraints);
        const querySnapshot = await getDocs(q);
        console.log(querySnapshot);
        querySnapshot.docs.map((doc) => console.log(doc.data()));
        SetPoints(querySnapshot.docs.map((doc) => doc.data() as Case));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching incidents:", error);
        throw new Error("Failed to fetch incident data");
      }
    };

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
    }

    getData();
  }, []);

  // Apply filters when filters change
  useEffect(() => {
    setFilteredPoints(applyFilters(Points));
  }, [Points, filters]);

  useEffect(() => {
    if (!mapRef.current || filteredPoints.length === 0) return;

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Circle) {
        mapRef.current!.removeLayer(layer);
      }
    });

    // Initialize enhanced map points
    const mapPoints = initializeMapPoints();

    // Process incidents and build enhanced data
    filteredPoints.forEach((point) => {
      try {
        const buildingName = point.specificLocation;
        if (mapPoints[buildingName]) {
          // Update incident counts
          mapPoints[buildingName].totalIncidents++;
          point.offenseTypes.forEach((offense: string) => {
            if (mapPoints[buildingName].incidentCounts[offense] !== undefined) {
              mapPoints[buildingName].incidentCounts[offense]++;
            }
          });
          // Add to recent incidents (keep last 10)
          mapPoints[buildingName].recentIncidents.push(point);
          if (mapPoints[buildingName].recentIncidents.length > 10) {
            mapPoints[buildingName].recentIncidents.shift();
          }
        }
      } catch (error) {
        console.warn(
          `Error processing incident for ${point.specificLocation}:`,
          error
        );
      }
    });

    setEnhancedMapPoints(Object.values(mapPoints));

    // Create map markers with enhanced information
    Object.values(mapPoints).forEach((mapPoint) => {
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
          Discrimination: "#1d1a05",
        };

        const circleColor = typeColors[mostCommonType] || "#666666";
        // Create main incident circle
        L.circle(mapPoint.coordinates, {
          color: circleColor,
          fillColor: circleColor,
          fillOpacity: 0.7,
          radius: circleSize,
          weight: 2,
        }).addTo(mapRef.current!);

        // Create detailed popup with enhanced information
        const popupContent = createEnhancedPopup(mapPoint);

        // Determine campus-based color and border
        let fillColor = "black";
        if (mapPoint.location === "Notre Dame") {
          fillColor = "#FFD700"; // gold
        } else if (mapPoint.location === "Holy Cross") {
          fillColor = "#fff";
        } else if (mapPoint.location === "Saint Mary's") {
          fillColor = "#87CEEB"; // light blue
        }

        L.circle(mapPoint.coordinates, {
          fillColor: fillColor,
          fillOpacity: 0.5,
          color: fillColor,
          radius: 15,
        })
          .addTo(mapRef.current!)
          .bindPopup(popupContent, {
            maxWidth: 400,
            className: "enhanced-popup",
          });
      }
    });
  }, [filteredPoints]);

  const createEnhancedPopup = (mapPoint: EnhancedMapPoint): string => {
    // Calculate risk score based on recent incidents (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentIncidents = mapPoint.recentIncidents.filter(
      (incident) => new Date(incident.time) >= sevenDaysAgo
    );

    // Calculate risk score based on number of recent incidents (all types equal)
    let riskScore = 1;

    // Simple count-based risk scoring (all incident types treated equally)
    if (recentIncidents.length >= 5) riskScore = 5;
    else if (recentIncidents.length >= 3) riskScore = 4;
    else if (recentIncidents.length >= 2) riskScore = 3;
    else if (recentIncidents.length >= 1) riskScore = 2;
    else riskScore = 1;

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
      { name: "Uncomfortable Situation", color: "#de9e36" },
      { name: "Sexual Harassment", color: "#ca3c25" },
      { name: "Physical", color: "#701d52" },
      { name: "Verbal Aggression", color: "#212475" },
      { name: "Discrimination", color: "#1d1a05" },
    ];

    return `
      <div class="enhanced-popup-content">
        <h3 style="margin: 0 0 10px 0; color: #333;">${
          mapPoint.buildingName
        }</h3>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold; color: #666;">Location:</span> ${
            mapPoint.location
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
          <span style="font-weight: bold; color: #666;">Cases by Type:</span><br>
          ${Object.entries(mapPoint.incidentCounts)
            .filter(([, count]) => count > 0)
            .map(([type, count]) => {
              const typeData = typeInfo.find((t) => t.name === type);
              if (!typeData) return "";
              return `<div style="margin: 2px 0; font-size: 12px;">
                <span style="color: ${typeData.color}; font-weight: bold;">●</span>
                ${typeData.name}: ${count}
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
            recentIncidents.length > 0
              ? `<br><span style="font-size: 12px; color: #666;">
              (${recentIncidents.length} recent case${
                  recentIncidents.length > 1 ? "s" : ""
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
      <div className={`map-filter-menu m-2`}>
        <button
          className="menu-toggle-btn"
          onClick={() => handleFilterChange("showMenu", !filters.showMenu)}
        >
          {filters.showMenu ? "✕" : "☰"}
        </button>

        {/* Only show filter content if menu is open */}
        {filters.showMenu && (
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
              <p>Showing {filteredPoints.length} incidents</p>
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
        )}
      </div>

      {/* Back Button */}
      <div>
        <a href="../" className="back-button">
          <button className="option abs right small">Back</button>
        </a>
        <a
          data-az-l="1e9e1abc-2335-4838-949d-8ab8af0dd8c9"
          className="back-button"
        >
          <button className="option abs right mt-5 small">
            Leave Feedback
          </button>
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
