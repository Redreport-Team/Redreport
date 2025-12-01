// Community Impact Dashboard for Redreport Analytics
import React, { useState, useEffect } from "react";
import Navigation from "../../UI/Navigation";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import "./Dashboard.css";

interface ReportStats {
  totalReports: number;
  thisMonth: number;
  lastMonth: number;
  topLocation: { name: string; count: number } | null;
  topLocationThisMonth: { name: string; count: number } | null;
  allLocations: { name: string; count: number; percentage: number }[];
  dormStats: { name: string; count: number; percentage: number }[];
  academicStats: { name: string; count: number; percentage: number }[];
  trendData: { month: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  timeDistribution: { hour: string; count: number }[];
}

function Dashboard() {
  const [stats, setStats] = useState<ReportStats>({
    totalReports: 0,
    thisMonth: 0,
    lastMonth: 0,
    topLocation: null,
    topLocationThisMonth: null,
    allLocations: [],
    dormStats: [],
    academicStats: [],
    trendData: [],
    categoryBreakdown: [],
    timeDistribution: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const reportsRef = collection(db, "reports");
      const snapshot = await getDocs(reportsRef);
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      let thisMonthCount = 0;
      let lastMonthCount = 0;
      const locationMap = new Map<string, number>();
      const categoryMap = new Map<string, number>();
      const monthlyData = new Map<string, number>();
      const monthlyLocationData = new Map<string, number>();
      const locationTypeMap = new Map<string, string>();

      // Track which category each specific location belongs to
      const isDorm = (location: string) => {
        const storedType = locationTypeMap.get(location);
        if (storedType) {
          return storedType.toLowerCase().includes('residence');
        }
        // Fallback: check if it's the generic category name
        const lower = location.toLowerCase();
        if (lower === 'residence halls' || lower === 'residence hall') return false;
        return false; // Default to non-dorm if we don't have type info
      };

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate() || new Date();
        const month = timestamp.getMonth();
        const year = timestamp.getFullYear();

        // Count this month and last month
        if (year === currentYear && month === currentMonth) {
          thisMonthCount++;
          // Use specificLocation if available, otherwise fall back to location
          const location = data.specificLocation || data.location || "Unknown";
          monthlyLocationData.set(location, (monthlyLocationData.get(location) || 0) + 1);
        } else if (
          (year === currentYear && month === currentMonth - 1) ||
          (month === 11 && currentMonth === 0 && year === currentYear - 1)
        ) {
          lastMonthCount++;
        }

        // Count by location - use specificLocation if available
        const location = data.specificLocation || data.location || "Unknown";
        locationMap.set(location, (locationMap.get(location) || 0) + 1);
        
        // Store the building category/type for classification
        if (data.location && !locationTypeMap.has(location)) {
          locationTypeMap.set(location, data.location);
        }

        // Count by category
        const category = data.offenseType || "Other";
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);

        // Monthly trend (last 6 months)
        const monthKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}`;
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
      });

      // Convert maps to arrays and sort
      const allLocations = Array.from(locationMap.entries())
        .filter(([name]) => {
          // Exclude generic category names
          const lower = name.toLowerCase();
          return lower !== 'residence halls' && 
                 lower !== 'residence hall' && 
                 lower !== 'academic buildings' && 
                 lower !== 'academic building' &&
                 lower !== 'unknown';
        })
        .map(([name, count]) => ({
          name,
          count,
          percentage: (count / snapshot.size) * 100
        }))
        .sort((a, b) => b.count - a.count);

      // Separate dorms and academic buildings
      const dormStats = allLocations
        .filter(loc => isDorm(loc.name))
        .slice(0, 10);

      const academicStats = allLocations
        .filter(loc => !isDorm(loc.name))
        .slice(0, 10);

      // Top location overall
      const topLocation = allLocations[0] || null;

      // Top location this month
      const topLocationThisMonth = Array.from(monthlyLocationData.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)[0] || null;

      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Get last 6 months trend
      const trendData = Array.from(monthlyData.entries())
        .map(([key, count]) => {
          const [year, month] = key.split("-").map(Number);
          const date = new Date(year, month);
          return {
            month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            count
          };
        })
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6);

      setStats({
        totalReports: snapshot.size,
        thisMonth: thisMonthCount,
        lastMonth: lastMonthCount,
        topLocation,
        topLocationThisMonth,
        allLocations,
        dormStats,
        academicStats,
        trendData,
        categoryBreakdown,
        timeDistribution: []
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = () => {
    if (stats.lastMonth === 0) return "+0%";
    const change = ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100;
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="dashboard-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading dashboard data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-title">Community Impact Dashboard</h1>
          <p className="dashboard-subtitle">Real-time analytics and insights for campus safety</p>
        </header>

        {/* Key Metrics Cards */}
        <div className="metrics-grid">
          <div className="metric-card primary">
            <div className="metric-icon"></div>
            <div className="metric-content">
              <h3>Total Reports</h3>
              <p className="metric-value">{stats.totalReports}</p>
              <span className="metric-label">All Time</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon"></div>
            <div className="metric-content">
              <h3>This Month</h3>
              <p className="metric-value">{stats.thisMonth}</p>
              <span className={`metric-trend ${stats.thisMonth > stats.lastMonth ? 'up' : 'down'}`}>
                {calculateTrend()} vs last month
              </span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon"></div>
            <div className="metric-content">
              <h3>Top Location (All Time)</h3>
              <p className="metric-value metric-location">{stats.topLocation?.name || "N/A"}</p>
              <span className="metric-label">{stats.topLocation?.count || 0} reports</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon"></div>
            <div className="metric-content">
              <h3>Top Location (This Month)</h3>
              <p className="metric-value metric-location">{stats.topLocationThisMonth?.name || "N/A"}</p>
              <span className="metric-label">{stats.topLocationThisMonth?.count || 0} reports</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          {/* Monthly Trend */}
          <div className="chart-card full-width">
            <h2 className="chart-title">Report Trend (Last 6 Months)</h2>
            <div className="trend-chart">
              {stats.trendData.map((item, index) => (
                <div key={index} className="trend-bar-wrapper">
                  <div 
                    className="trend-bar" 
                    style={{ height: `${(item.count / Math.max(...stats.trendData.map(d => d.count))) * 100}%` }}
                  >
                    <span className="bar-value">{item.count}</span>
                  </div>
                  <span className="bar-label">{item.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Dorms */}
          <div className="chart-card">
            <h2 className="chart-title">Top Residence Halls / Dorms</h2>
            <div className="location-list">
              {stats.dormStats.length > 0 ? stats.dormStats.map((location, index) => (
                <div key={index} className="location-item">
                  <span className="location-rank">#{index + 1}</span>
                  <span className="location-name">{location.name}</span>
                  <div className="location-bar-bg">
                    <div 
                      className="location-bar" 
                      style={{ 
                        width: `${(location.count / stats.dormStats[0].count) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="location-count">{location.count} ({location.percentage.toFixed(1)}%)</span>
                </div>
              )) : <p className="no-data">No dorm data available</p>}
            </div>
          </div>

          {/* Academic & Athletic Buildings */}
          <div className="chart-card">
            <h2 className="chart-title">Academic & Athletic Buildings</h2>
            <div className="location-list">
              {stats.academicStats.length > 0 ? stats.academicStats.map((location, index) => (
                <div key={index} className="location-item">
                  <span className="location-rank">#{index + 1}</span>
                  <span className="location-name">{location.name}</span>
                  <div className="location-bar-bg">
                    <div 
                      className="location-bar" 
                      style={{ 
                        width: `${(location.count / stats.academicStats[0].count) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="location-count">{location.count} ({location.percentage.toFixed(1)}%)</span>
                </div>
              )) : <p className="no-data">No academic building data available</p>}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="chart-card">
            <h2 className="chart-title">Report Categories</h2>
            <div className="category-list">
              {stats.categoryBreakdown.map((cat, index) => {
                const percentage = ((cat.count / stats.totalReports) * 100).toFixed(1);
                return (
                  <div key={index} className="category-item">
                    <div className="category-header">
                      <span className="category-name">{cat.category}</span>
                      <span className="category-percentage">{percentage}%</span>
                    </div>
                    <div className="category-bar-bg">
                      <div 
                        className="category-bar" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="category-count">{cat.count} reports</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Insights Section */}
        <div className="insights-section">
          <h2 className="section-title">Key Insights</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <h3>Monthly Activity</h3>
              <p>{stats.thisMonth > stats.lastMonth ? "Increased" : "Decreased"} reporting activity this month shows {stats.thisMonth > stats.lastMonth ? "higher" : "lower"} community engagement - {stats.thisMonth} reports vs {stats.lastMonth} last month.</p>
            </div>
            <div className="insight-card">
              <h3>High Priority Location</h3>
              <p>Top reported location overall: {stats.topLocation?.name || "N/A"} ({stats.topLocation?.count || 0} reports) - consider targeted safety measures.</p>
            </div>
            <div className="insight-card">
              <h3>Current Hotspot</h3>
              <p>This month's most reported location: {stats.topLocationThisMonth?.name || "N/A"} ({stats.topLocationThisMonth?.count || 0} reports) - immediate attention may be warranted.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
