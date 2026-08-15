// File Created for Joey's safety tips and a resource hub
import React from "react";
import "./SafetyHub.css";

// Function for all JS or TS functions they should handle the logic
function SafetyHub() {
  //HTML Code handling Visual Structure
  return (
    <>
      <div className="" id="safety-resources">
        <h1>Safety and Resources</h1>

        <div className="" id="sexual-harassment">
          <h2>Sexual Harassment</h2>
          <ul>
            <a href="https://equity.nd.edu/sexual-misconduct-titleix/">
              Notre Dame Office of Institutional Equity Sexual Harassment
              Resources
            </a>
          </ul>
        </div>

        <div className="" id="discrimination">
          <h2>Discrimination</h2>
          <ul>
            <a href="https://equity.nd.edu/discriminatory-harassment/">
              Notre Dame Office of Institutional Equity Discrimination Resources
            </a>
          </ul>
        </div>

        <div className="" id="resources">
          <div className="" id="confidential-resources">
            <h2>Confidential Resources</h2>

            <div className="" id="subsection">
              <h3>Office of Institutional Equity</h3>
              <ul>
                <li>
                  ND Integrity Line: 800-688-9918 or visit{" "}
                  <a href="globalcompliance.com">globalcompliance.com</a>
                </li>
              </ul>
            </div>

            <div className="" id="subsection">
              <h3>Counseling</h3>
              <ul>
                <li>
                  <a href="https://ucc.nd.edu/">University Counseling Center</a>
                  : 574-631-7336
                </li>
                <li>
                  <a href="https://www.fjcsjc.org/">
                    Family Justice Center of St. Joseph County & S-O-S Rape
                    Crisis Hotline
                  </a>
                  : 574-289-4357
                </li>
                <li>
                  <a href="https://rainn.org/">
                    {" "}
                    RAINN (Rape Abuse and Incest National Network)
                  </a>
                  : 800-656-4673
                </li>
              </ul>
            </div>

            <div className="" id="subsection">
              <h3>Medical</h3>
              <ul>
                <li>
                  <a href="https://uhs.nd.edu/">University Health Services</a>:
                  574-631-7497
                </li>
                <li>
                  <a href="https://notredamewellnesscenter.com/">
                    Notre Dame Wellness Center
                  </a>
                  : 574-634-9355
                </li>
              </ul>
            </div>

            <div className="" id="subsection">
              <h3>Pastoral</h3>
              <ul>
                <li>
                  <a href="https://campusministry.nd.edu/care-and-support/need-to-talk/">
                    Vowed Religious Staff in Campus Ministry
                  </a>
                  : 574-631-7800
                </li>
              </ul>
            </div>
          </div>

          <div className="" id="non-confidential-resources">
            <h2>Non-Confidential Resources</h2>

            <div className="" id="subsection">
              <h3>Office of Institutional Equity</h3>
              <ul>
                <li>574-631-0444, equity@nd.edu, or speakup.nd.edu</li>
              </ul>
            </div>

            <div className="" id="subsection">
              <h3>Residence Hall Staff</h3>
              <ul>
                <li>Rector, Assistant Rector, or Resident Assistant</li>
              </ul>
            </div>

            <div className="" id="subsection">
              <h3>Notre Dame Police Department</h3>
              <ul>
                <li>574-631-5555</li>
              </ul>
            </div>
          </div>

          <div className="" id="off-campus-resources">
            <h2>Off-Campus Resources</h2>

            <div className="" id="subsection">
              <h3>South Bend Police Department</h3>
              <ul>
                <li>574-235-9201</li>
              </ul>
            </div>

            <div className="" id="subsection">
              <h3>St. Joseph County Police Department</h3>
              <ul>
                <li>574-235-9611</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SafetyHub;
// HTML ELement to add in other tsx files
// <SafetyHub />;
