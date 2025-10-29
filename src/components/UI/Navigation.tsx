import React from "react";
import "../css/Navigation.css";

const Navigation: React.FC = () => {
  return (
    <>
      <div className="scroll-indicator"></div>
      <nav>
        <div className="nav-container">
          <a href="./#home" className="logo">
            Red<span className="highlight">Report </span>
          </a>
          <ul className="nav-links">
            <li>
              <a href="./#home">Home</a>
            </li>
            <li>
              <a href="./#mission">Mission</a>
            </li>
            <li>
              <a href="./#timeline">Timeline</a>
            </li>
            <li>
              <a href="/report" className="report-btn">
                REPORT
              </a>
            </li>
            <li>
              <a href="/map" className="map-btn">
                MAP
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
