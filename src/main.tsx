import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SelectHall from "./components/SelectHall/SelectHall.tsx";
import Map from "./components/Map/Map.tsx";
import "./index.css";
import { AnalyticsService } from "./services/analyticsService.ts";

// Initialize analytics/session attribution once at startup
AnalyticsService.init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SelectHall />} />
        <Route path="/client" element={<SelectHall />} />
        <Route path="/map" element={<Map />} />
        <Route path="/client/map" element={<Map />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
