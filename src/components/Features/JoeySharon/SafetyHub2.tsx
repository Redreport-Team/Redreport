// File Created for Joey's safety tips and a resource hub
import React from "react";
import "./SafetyHub.css";

// Function for all JS or TS functions they should handle the logic
function SafetyHub() {
  //HTML Code handling Visual Structure
  return (
    <div className="safety-hub-container">  
            <h1 className="safetyhub-title"> Safety Resources Hub</h1>
            <p className="safetyhub-subtitle">
              If you feel unsafe or need immediate support, use the resources listed below.
            </p>
            <div className="resource-columns" >

              <div className="resource-section">
                <h2 className="resource-header">Sexual Harassment Resources</h2>

                <div className="resource-item">
                  <h3 className="resource-name">National Sexual Assault Hotline</h3>
                  <p className="resource-description">Support and resources for survivors of sexual assault.</p>
                    <p className="resource-privacy confidential">Confidential (Not Anonymous)</p>
                  <a href="tel:+18006564673">Call: 1-800-656-HOPE (4673)</a>
                </div>

                <div className="resource-item">
                  <h3 className="resource-name">Title IX Office</h3>
                  <p className="resource-description">Report harassment or request confidential support.</p>
                    <p className="resource-privacy not-anonymous">Not Anonymous</p>
                  <a href="https://titleix.nd.edu" target="_blank" rel="noopener noreferrer" className="resource-link">
                    Visit Title IX Website
                  </a>
                </div>

                <div className="resource-item">
                  <h3 className="resource-name">Notre Dame Sexual Assault Hotline</h3>
                  <p className="resource-description">Available 24/7 for urgent support.</p>
                  <p className="resource-privacy confidential">Confidential (Not Anonymous)</p>
                  <a href="tel:+15746312333">Call: 574-631-2333</a>
                </div>

                <div className="resource-item">
                  <h3 className="resource-name">Campus Safety Escort Service</h3>
                  <p className="resource-description">Request a safety escort on campus during late hours.</p>
                  <p className="resource-privacy not-anonymous">Not Anonymous</p>
                  <a href="https://campussafety.nd.edu/services/escort-service/" target="_blank" rel="noopener noreferrer" className="resource-link">
                    Request an Escort
                  </a>
                </div>

                <div className="resource-item">
                  <h3 className="resource-name">Counseling Center</h3>
                  <p className="resource-description">Counseling services for survivors of harassment.</p>
                  <p className="resource-privacy confidential">Confidential (Not Anonymous)</p>
                  <a href="https://counseling.nd.edu" target="_blank" rel="noopener noreferrer" className="resource-link">
                    Visit Counseling Center
                  </a>
                </div>

              </div>

              <div className="resource-section">
                <h2 className="resource-header">Discrimination and Bias Resources</h2>

                <div className="resource-item">
                  <h3 className="resource-name">Office of Institutional Equity</h3>
                  <p className="resource-description">Report incidents of discrimination or bias.</p>
                  <p className="resource-privacy not-anonymous">Not Anonymous</p>
                  <a href="https://equity.nd.edu" target="_blank" rel="noopener noreferrer" className="resource-link">
                    Visit OIE Website
                  </a>
                </div>

                <div className="resource-item">
                  <h3 className="resource-name">ND Integrity Line</h3>
                  <p className="resource-description">Reporting of discrimination, misconduct, or safety concerns.</p>
                  <p className="resource-privacy anonymous">Anonymous</p>
                  <a href="https://integrity.nd.edu" target="_blank" rel="noopener noreferrer" className="resource-link">
                    Visit Integrity Line Website or 
                  </a>
                  <a href="tel:+18006638888"> Call: 1-800-663-8888</a>
                </div>

                <div className="resource-item">
                  <h3 className="resource-name">Bias Incident Reporting</h3>
                  <p className="resource-description">Report bias incidents on campus.</p>
                  <p className="resource-privacy not-anonymous">Not Anonymous</p>
                  <a href="https://biasreporting.nd.edu" target="_blank" rel="noopener noreferrer" className="resource-link">
                    Report a Bias Incident
                  </a>
                </div>

                <div className="resource-item">
                  <h3 className="resource-name">Counseling Center</h3>
                  <p className="resource-description">Counseling services for those affected by discrimination.</p>
                  <p className="resource-privacy confidential">Confidential (Not Anonymous)</p>
                  <a href="https://counseling.nd.edu" target="_blank" rel="noopener noreferrer" className="resource-link">
                    Visit Counseling Center
                  </a>
                </div>

                <div className="resource-item">
                  <h3 className="resource-name">Campus Police (NDSP)</h3>
                  <p className="resource-description">Immediate assistance or to report an urgent threat.</p>
                  <p className="resource-privacy not-anonymous">Not Anonymous</p>
                  <a href="https://ndsp.nd.edu" target="_blank" rel="noopener noreferrer" className="resource-link">
                    Visit NDSP Website or 
                  </a>
                  <a href="tel:+15746311111"> Call: 574-631-1111</a>
                </div> 

              </div>

            </div>
          </div>
  );
}

export default SafetyHub;
// HTML ELement to add in other tsx files
// <SafetyHub />;
