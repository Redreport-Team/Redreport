import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../css/Map.css";

// Data types
interface HallData {
  name: string;
  latitude: number;
  longitude: number;
  location: string;
  buildingType: string;
}

interface IncidentData {
  id: number;
  Dorm: string;
  Time: Date;
  Type: number;
}

interface IncidentType {
  id: number;
  name: string;
  color: string;
}

interface Filters {
  campus: string;
  month: string;
  types: number[];
}

// Sample data (replace with actual data source)
const sampleHallsData: HallData[] = [
  {
    name: "Dillon Hall",
    latitude: 41.7021,
    longitude: -86.2379,
    location: "Notre Dame",
    buildingType: "Residence Hall",
  },
  {
    name: "Alumni Hall",
    latitude: 41.7031,
    longitude: -86.2389,
    location: "Notre Dame",
    buildingType: "Residence Hall",
  },
  {
    name: "Zahm Hall",
    latitude: 41.7011,
    longitude: -86.2369,
    location: "Notre Dame",
    buildingType: "Residence Hall",
  },
  {
    name: "Carroll Hall",
    latitude: 41.7041,
    longitude: -86.2399,
    location: "Notre Dame",
    buildingType: "Residence Hall",
  },
  {
    name: "Corby Hall",
    latitude: 41.7051,
    longitude: -86.2409,
    location: "Notre Dame",
    buildingType: "Academic",
  },
];

const sampleIncidentsData: IncidentData[] = [
  { id: 1, Dorm: "Dillon Hall", Time: new Date("2024-12-01"), Type: 0 },
  { id: 2, Dorm: "Alumni Hall", Time: new Date("2024-12-02"), Type: 1 },
  { id: 3, Dorm: "Zahm Hall", Time: new Date("2024-12-03"), Type: 2 },
  { id: 4, Dorm: "Carroll Hall", Time: new Date("2024-12-04"), Type: 3 },
  { id: 5, Dorm: "Dillon Hall", Time: new Date("2024-12-05"), Type: 1 },
];

const incidentTypes: IncidentType[] = [
  { id: 0, name: "Uncomfortable Situation", color: "#de9e36" },
  { id: 1, name: "Sexual Harassment", color: "#ca3c25" },
  { id: 2, name: "Physical", color: "#701d52" },
  { id: 3, name: "Verbal Aggression", color: "#212475" },
  { id: 4, name: "Discrimination", color: "#1d1a05" },
];

const Map: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [incidentsData, setIncidentsData] = useState<IncidentData[]>([]);
  const [filteredData, setFilteredData] = useState<IncidentData[]>([]);
  const [filters, setFilters] = useState<Filters>({
    campus: "All",
    month: "All",
    types: [],
  });

  // Stats state
  const [stats, setStats] = useState({
    totalIncidents: 0,
    highRiskAreas: 0,
    recentIncidents: 0,
    affectedBuildings: 0,
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, {
      maxZoom: 19,
      minZoom: 13,
    }).setView([41.7002, -86.2379], 15);

    // Add MapTiler layer (replace with your API key)
    L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${
        import.meta.env.VITE_MAP_KEY
      }`,
      {
        attribution: "© MapTiler © OpenStreetMap contributors",
        maxZoom: 19,
      }
    ).addTo(map);

    // Set map bounds
    map.setMaxBounds([
      [41.6852, -86.1779],
      [41.7152, -86.2879],
    ]);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  // Fetch incidents data
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch(
          "https://red-report.vercel.app/api/import"
        );
        const data = await response.json();
        console.log("Fetched incidents data:", data);
        const incidents: IncidentData[] = data.map((point: any) => ({
          id: point.id,
          Dorm: point.Location,
          Time: new Date(point.Time),
          Type: point.Type,
        }));
        setIncidentsData(incidents);
        setFilteredData(incidents);
        setIsLoading(false);
        applyFilters();
      } catch (error) {
        console.error("Failed to fetch incidents data:", error);
        setIsLoading(false);
      }
    };

    fetchIncidents();
  }, []);

  // Apply filters whenever filters change
  useEffect(() => {
    applyFilters();
  }, [filters]);

  const applyFilters = () => {
    const filtered = incidentsData.filter((incident) => {
      // Campus filter
      if (filters.campus !== "All") {
        const hallData = sampleHallsData.find(
          (hall) => hall.name === incident.Dorm
        );
        if (!hallData || hallData.location !== filters.campus) return false;
      }

      // Month filter
      if (filters.month !== "All") {
        const incidentMonth = `${incident.Time.getFullYear()}-${String(
          incident.Time.getMonth() + 1
        ).padStart(2, "0")}`;
        if (incidentMonth !== filters.month) return false;
      }

      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(incident.Type)) {
        return false;
      }

      return true;
    });

    setFilteredData(filtered);
    updateMap(filtered);
    updateStats(filtered);
    updateResultsSummary(filtered);
  };

  const updateMap = (data: IncidentData[]) => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      mapInstanceRef.current!.removeLayer(marker);
    });
    markersRef.current = [];

    // Group incidents by location
    const locationGroups: {
      [key: string]: {
        hallData: HallData;
        incidents: IncidentData[];
        typeCounts: { [key: number]: number };
      };
    } = {};

    data.forEach((incident) => {
      const hallData = sampleHallsData.find(
        (hall) => hall.name === incident.Dorm
      );
      if (hallData) {
        if (!locationGroups[incident.Dorm]) {
          locationGroups[incident.Dorm] = {
            hallData,
            incidents: [],
            typeCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
          };
        }
        locationGroups[incident.Dorm].incidents.push(incident);
        locationGroups[incident.Dorm].typeCounts[incident.Type]++;
      }
    });

    // Create markers
    Object.values(locationGroups).forEach((group) => {
      const { hallData, incidents, typeCounts } = group;

      // Calculate marker size based on incident count
      const totalIncidents = incidents.length;
      const markerSize = Math.min(totalIncidents * 8 + 20, 80);

      // Determine primary color based on most common incident type
      const primaryType = Object.entries(typeCounts).reduce((a, b) =>
        typeCounts[parseInt(a[0])] > typeCounts[parseInt(b[0])] ? a : b
      )[0];
      const primaryColor = incidentTypes[parseInt(primaryType)].color;

      // Create incident circle
      const incidentCircle = L.circle([hallData.latitude, hallData.longitude], {
        color: primaryColor,
        fillColor: primaryColor,
        fillOpacity: 0.6,
        radius: markerSize,
        weight: 3,
      });

      // Create campus indicator
      let campusColor = "#333333";
      if (hallData.location === "Notre Dame") campusColor = "#FFD700";
      else if (hallData.location === "Holy Cross") campusColor = "#ffffff";
      else if (hallData.location === "Saint Mary's") campusColor = "#87CEEB";

      const campusIndicator = L.circle(
        [hallData.latitude, hallData.longitude],
        {
          fillColor: campusColor,
          fillOpacity: 0.8,
          color: campusColor,
          radius: 12,
          weight: 2,
        }
      );

      // Create popup content
      const popupContent = createPopupContent(hallData, incidents, typeCounts);

      incidentCircle.bindPopup(popupContent, {
        maxWidth: 350,
        className: "enhanced-popup",
      });

      campusIndicator.bindPopup(popupContent, {
        maxWidth: 350,
        className: "enhanced-popup",
      });

      incidentCircle.addTo(mapInstanceRef.current!);
      campusIndicator.addTo(mapInstanceRef.current!);

      markersRef.current.push(incidentCircle, campusIndicator);
    });
  };

  const createPopupContent = (
    hallData: HallData,
    incidents: IncidentData[],
    typeCounts: { [key: number]: number }
  ): string => {
    const totalIncidents = incidents.length;

    // Calculate risk score
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentIncidents = incidents.filter((inc) => inc.Time >= sevenDaysAgo);

    let riskScore = 1;
    let riskClass = "risk-low";

    if (recentIncidents.length >= 5) {
      riskScore = 5;
      riskClass = "risk-high";
    } else if (recentIncidents.length >= 3) {
      riskScore = 4;
      riskClass = "risk-high";
    } else if (recentIncidents.length >= 2) {
      riskScore = 3;
      riskClass = "risk-medium-high";
    } else if (recentIncidents.length >= 1) {
      riskScore = 2;
      riskClass = "risk-medium";
    }

    const typesList = Object.entries(typeCounts)
      .filter(([, count]) => count > 0)
      .map(([typeId, count]) => {
        const type = incidentTypes[parseInt(typeId)];
        return `
          <div class="incident-type-item">
            <div class="type-color-dot" style="background-color: ${type.color}; width: 12px; height: 12px;"></div>
            <span>${type.name}: ${count}</span>
          </div>
        `;
      })
      .join("");

    return `
      <div>
        <h4 class="popup-header">${hallData.name}</h4>

        <div class="popup-section">
          <div class="popup-label">Location: <span class="popup-value">${
            hallData.location
          }</span></div>
          <div class="popup-label">Type: <span class="popup-value">${
            hallData.buildingType
          }</span></div>
        </div>

        <div class="popup-section">
          <div class="popup-label">Total Reports: <span class="popup-value">${totalIncidents}</span></div>
        </div>

        <div class="popup-section">
          <div class="popup-label">Reports by Type:</div>
          <div class="incident-type-list">${typesList}</div>
        </div>

        <div class="popup-section">
          <div class="popup-label">Risk Assessment:</div>
          <div class="risk-score ${riskClass}">
            ${riskScore}/5 Risk Level
          </div>
          ${
            recentIncidents.length > 0
              ? `<div style="font-size: 0.875rem; color: #6c757d; margin-top: 0.5rem;">
            ${recentIncidents.length} report${
                  recentIncidents.length > 1 ? "s" : ""
                } in last 7 days
          </div>`
              : `<div style="font-size: 0.875rem; color: #28a745; margin-top: 0.5rem;">
            No recent activity
          </div>`
          }
        </div>
      </div>
    `;
  };

  const updateStats = (data: IncidentData[]) => {
    const totalIncidents = data.length;

    // Count high risk areas (areas with 3+ incidents)
    const locationCounts: { [key: string]: number } = {};
    data.forEach((incident) => {
      locationCounts[incident.Dorm] = (locationCounts[incident.Dorm] || 0) + 1;
    });
    const highRiskAreas = Object.values(locationCounts).filter(
      (count) => count >= 3
    ).length;

    // Count recent incidents (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentIncidents = data.filter(
      (incident) => incident.Time >= sevenDaysAgo
    ).length;

    // Count affected buildings
    const affectedBuildings = new Set(data.map((incident) => incident.Dorm))
      .size;

    setStats({
      totalIncidents,
      highRiskAreas,
      recentIncidents,
      affectedBuildings,
    });
  };

  const updateResultsSummary = (data: IncidentData[]) => {
    // This would update a summary display if needed
  };

  const handleCampusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const campus = e.target.value;
    setFilters((prev) => ({ ...prev, campus }));
    if (campus !== "All") {
      navigateToCampus(campus);
    }
  };

  const handleMonthFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, month: e.target.value }));
  };

  const handleTypeFilter = (typeId: number, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      types: checked
        ? [...prev.types, typeId]
        : prev.types.filter((id) => id !== typeId),
    }));
  };

  const clearAllFilters = () => {
    setFilters({ campus: "All", month: "All", types: [] });
  };

  const navigateToCampus = (campus: string) => {
    if (!mapInstanceRef.current) return;

    if (campus === "All") {
      mapInstanceRef.current.setView([41.7002, -86.2379], 15);
    } else {
      const campusHalls = sampleHallsData.filter(
        (hall) => hall.location === campus
      );
      if (campusHalls.length > 0) {
        const bounds = L.latLngBounds(
          campusHalls.map((hall) => [hall.latitude, hall.longitude])
        );
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  const toggleFilterPanel = () => {
    setFilterPanelOpen(!filterPanelOpen);
  };

  const closeFilterPanel = () => {
    setFilterPanelOpen(false);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo-section">
          <div className="logo">R</div>
          <span className="brand-text">RedReport</span>
        </div>
        <div className="header-actions">
          <a href="#" className="btn btn-secondary">
            <i className="fas fa-question-circle"></i>
            Help
          </a>
          <a href="#" className="btn btn-primary">
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </a>
        </div>
      </header>

      {/* Filter Toggle Button */}
      <button className="filter-toggle" onClick={toggleFilterPanel}>
        <i className="fas fa-filter"></i>
      </button>

      {/* Filter Panel */}
      <div className={`filter-panel ${filterPanelOpen ? "open" : ""}`}>
        <div className="filter-header">
          <h3 className="filter-title">Map Filters</h3>
          <button className="filter-close" onClick={closeFilterPanel}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="filter-content">
          {/* Campus Filter */}
          <div className="filter-section">
            <label className="filter-label">Campus</label>
            <select
              className="filter-select"
              value={filters.campus}
              onChange={handleCampusFilter}
            >
              <option value="All">All Campuses</option>
              <option value="Notre Dame">Notre Dame</option>
              <option value="Holy Cross">Holy Cross</option>
              <option value="Saint Mary's">Saint Mary's</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="filter-section">
            <label className="filter-label">Time Period</label>
            <select
              className="filter-select"
              value={filters.month}
              onChange={handleMonthFilter}
            >
              <option value="All">All Time</option>
              <option value="2024-12">December 2024</option>
              <option value="2024-11">November 2024</option>
              <option value="2024-10">October 2024</option>
              <option value="2024-09">September 2024</option>
            </select>
          </div>

          {/* Incident Type Filter */}
          <div className="filter-section">
            <label className="filter-label">Incident Types</label>
            <div className="type-filters">
              {incidentTypes.map((type) => (
                <label key={type.id} className="type-checkbox">
                  <input
                    type="checkbox"
                    value={type.id}
                    style={{ display: "none" }}
                    checked={filters.types.includes(type.id)}
                    onChange={(e) =>
                      handleTypeFilter(type.id, e.target.checked)
                    }
                  />
                  <div
                    className={`type-color-dot ${
                      filters.types.includes(type.id) ? "selected" : ""
                    }`}
                    style={{ backgroundColor: type.color }}
                  ></div>
                  <span>{type.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear Filters Button */}
          <button
            className="btn btn-secondary"
            onClick={clearAllFilters}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <i className="fas fa-undo"></i>
            Clear All Filters
          </button>

          {/* Results Summary */}
          <div className="results-summary">
            <p>
              <strong>Showing {filteredData.length} incidents</strong>
            </p>
            {filters.campus !== "All" && <p>Campus: {filters.campus}</p>}
            {filters.month !== "All" && <p>Period: {filters.month}</p>}
            {filters.types.length > 0 && (
              <p>
                Types:{" "}
                {filters.types
                  .map((id) => incidentTypes.find((t) => t.id === id)?.name)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container">
        <div id="map" ref={mapRef}></div>
      </div>

      {/* Stats Panel */}
      <div className="stats-panel">
        <h4 className="stats-title">Campus Safety Overview</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{stats.totalIncidents}</span>
            <span className="stat-label">Total Reports</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.highRiskAreas}</span>
            <span className="stat-label">High Risk Areas</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.recentIncidents}</span>
            <span className="stat-label">This Week</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.affectedBuildings}</span>
            <span className="stat-label">Buildings</span>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Loading campus safety data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
