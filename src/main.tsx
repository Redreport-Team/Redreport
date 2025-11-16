import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./components/pages/LandingPage";
import Report from "./components/pages/Report";
import Map from "./components/pages/Map";
import Clarity from "@microsoft/clarity";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

const projectId = import.meta.env.VITE_CLARITY_ID;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

Clarity.init(projectId);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
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
    </GoogleReCaptchaProvider>
  </React.StrictMode>
);
