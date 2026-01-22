// File Created for Katie's safety tips and a resource hub
//copied from Matus's feature and added onto.

import React, { useState, useEffect } from "react";
import Navigation from "../../UI/Navigation";
import { collection, getDocs } from "firebase/firestore";
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

  //dorm-level risk insight
  highRiskDorms: {
    name: string;
    count: number;
    percentage: number;
    riskScore: number;
  }[];

  //raw reports for last-month drill-down
  lastMonthReports: {
    location: string;
    category: string;
    timestamp: Date;
  }[];
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

    highRiskDorms: [], //added
    lastMonthReports: [] //added
  });

  const [loading, setLoading] = useState(true);


  //allows dynamic switching between time aggregation 
  type TimeView = "day" | "week" | "month" | "semester";
  const [timeView, setTimeView] = useState<TimeView>("month");

  //last-month drill-down toggle
  const [showPastReports, setShowPastReports] = useState(false);


  useEffect(() => {
    fetchDashboardData();
  }, [timeView]); 
  //timeView added as dependency so chart updates dynamically- previously empty dependency array only loaded data once

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

      //store raw last-month reports for drill-down
      const lastMonthReports: {
        location: string;
        category: string;
        timestamp: Date;
      }[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate() || new Date();
        const month = timestamp.getMonth();
        const year = timestamp.getFullYear();

        const location = data.specificLocation || data.location || "Unknown";
        const category = data.offenseType || "Other";

        //month counts
        if (year === currentYear && month === currentMonth) {
          thisMonthCount++;

          monthlyLocationData.set(
            location,
            (monthlyLocationData.get(location) || 0) + 1
          );
        }

        //TODO: make this dynamic
        if (
          (year === currentYear && month === currentMonth - 1) ||
          (currentMonth === 0 && month === 11 && year === currentYear - 1)
        ) {
          lastMonthCount++;

          //capture report for user drill-down
          lastMonthReports.push({
            location,
            category,
            timestamp
          });
        }

        //location and category
        locationMap.set(location, (locationMap.get(location) || 0) + 1);
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);


        // const monthKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}`; (old trend logic)
        // Commented out because this only supported monthly aggregation
        //new trend logic:

        let timeKey = "";

        if (timeView === "day") {
          timeKey = timestamp.toISOString().split("T")[0];
        } else if (timeView === "week") {
          const week = Math.ceil(timestamp.getDate() / 7);
          timeKey = `${timestamp.getFullYear()}-W${week}`;
        } else if (timeView === "semester") {
          timeKey =
            timestamp.getMonth() < 5
              ? `Spring ${timestamp.getFullYear()}`
              : `Fall ${timestamp.getFullYear()}`;
        } else {
          timeKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}`;
        }

        monthlyData.set(timeKey, (monthlyData.get(timeKey) || 0) + 1);
      });

      //location processing

      const allLocations = Array.from(locationMap.entries()).map(
        ([name, count]) => ({
          name,
          count,
          percentage: (count / snapshot.size) * 100
        })
      );

      const dormStats = allLocations.slice(0, 10);
      const academicStats = allLocations.slice(10, 20);


      // const topDorms = dormStats.slice(0, 5); //old top dorm logic
      //only ranked by raw count, not by contextual risk

      //new risk logic

      const dormRiskStats = dormStats
        .map(dorm => ({
          ...dorm,
          riskScore: dorm.count * 10 //simple, explainable metric
        }))
        .sort((a, b) => b.riskScore - a.riskScore);

      const trendData = Array.from(monthlyData.entries())
        .map(([month, count]) => ({ month, count }))
        .slice(-6);

      setStats({
        totalReports: snapshot.size,
        thisMonth: thisMonthCount,
        lastMonth: lastMonthCount,
        topLocation: allLocations[0] || null,
        topLocationThisMonth:
          Array.from(monthlyLocationData.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)[0] || null,
        allLocations,
        dormStats,
        academicStats,
        trendData,
        categoryBreakdown: Array.from(categoryMap.entries()).map(
          ([category, count]) => ({ category, count })
        ),

        //added
        highRiskDorms: dormRiskStats.slice(0, 5),
        lastMonthReports
      });
    } finally {
      setLoading(false);
    }
  };

  //risk score

  const calculateRiskScore = () => {
    const trendChange =
      stats.lastMonth === 0
        ? 0
        : ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100;

    const concentration = stats.topLocation
      ? (stats.topLocation.count / stats.totalReports) * 100
      : 0;

    const score =
      stats.thisMonth * 0.5 +
      trendChange * 0.3 +
      concentration * 0.2;

    return Math.min(Math.max(Math.round(score), 0), 100);
  };

  const riskScore = calculateRiskScore();
  const riskLevel =
    riskScore > 65 ? "High" : riskScore > 30 ? "Medium" : "Low";

  //jsx

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="dashboard-container">
          <p>Loading dashboard data...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="dashboard-container">

        <div className="metric-card primary">
          <h3>Campus Risk Level</h3>
          <p className="metric-value">{riskScore}</p>
          <span>{riskLevel} Risk</span>
        </div>

        <div className="chart-controls"> 
          {(["day", "week", "month", "semester"] as TimeView[]).map(view => (
            <button
              key={view}
              className={timeView === view ? "active" : ""}
              onClick={() => setTimeView(view)}
            >
              {view}
            </button>
          ))}
        </div>

        {/* High Risk Dorms */}
        <div className="chart-card">
          <h2>High-Risk Residence Halls</h2>
          {stats.highRiskDorms.map((dorm, i) => (
            <div key={i}>
              {dorm.name} — Risk Score: {dorm.riskScore}
            </div>
          ))}
        </div>

        {/* Last Month Drill-Down */}
        <button onClick={() => setShowPastReports(!showPastReports)}>
          {showPastReports ? "Hide" : "View"} Last Month Reports
        </button>

        {showPastReports &&
          stats.lastMonthReports.map((r, i) => (
            <div key={i}>
              <strong>{r.category}</strong> — {r.location} (
              {r.timestamp.toLocaleDateString()})
            </div>
          ))}

      </div>
    </>
  );
}

export default Dashboard;


// HTML ELement to add in other tsx files
// <Dashboard />;
