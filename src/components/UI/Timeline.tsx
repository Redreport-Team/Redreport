import React from "react";
import "../css/Timeline.css";

const Timeline: React.FC = () => {
  return (
    <section id="timeline" className="content-section">
      <div className="section-header">
        <h2>
          Our <span className="highlight">Timeline</span>
        </h2>
        <p>
          See how RedReport is evolving to better serve the Notre Dame Tricampus
          community
        </p>
      </div>

      <div className="timeline">
        <div className="timeline-item">
          <div className="timeline-dot"></div>
          <div className="timeline-content">
            <h3>Phase 1: Idea phase</h3>
            <p>
              Redreport started coming to life in notes rough prototypes and
              small user tests.
            </p>
          </div>
        </div>

        <div className="timeline-item">
          <div className="timeline-dot"></div>
          <div className="timeline-content">
            <h3>Phase 2: Research and Proposal</h3>
            <p>
              Wrote several reports backed by in depth research receiving
              recognition{" "}
              <a href="https://library-research-award.library.nd.edu/2025.html">
                Hesburgh Libraries
              </a>
              .
            </p>
          </div>
        </div>

        <div className="timeline-item">
          <div className="timeline-dot"></div>
          <div className="timeline-content current">
            <h3 className="highlight">Phase 3: Launch</h3>
            <p className="highlight">
              Forming a small team to start making actual change across campus.
              Continously updating our system to get stuff done.
            </p>
          </div>
        </div>

        <div className="timeline-item">
          <div className="timeline-dot"></div>
          <div className="timeline-content">
            <h3>Phase 4: Expansion</h3>
            <p>
              Grow team, and develop ties with campus administration to amplify
              Redreport's impact.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Timeline;
