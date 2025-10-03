import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./components/pages/LandingPage";
import Report from "./components/pages/Report";
import Map from "./components/pages/Map";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/client/" element={<LandingPage />} />
        <Route path="/report" element={<Report />} />
        <Route path="/client/report" element={<Report />} />
        <Route path="/map" element={<Map />} />
        <Route path="/client/map" element={<Map />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
