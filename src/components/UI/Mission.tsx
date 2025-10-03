import React from "react";
import "../css/Mission.css";

const Mission: React.FC = () => {
  return (
    <section id="mission" className="content-section">
      <div className="section-header">
        <h2>
          Our <span className="highlight">Mission</span>
        </h2>
        <p>
          Existing reporting systems are intimidating to the point nothing ever
          gets reported. <span className="highlight">RedReport</span> makes
          everything entirely anonymous focusing on your safety.
        </p>
      </div>

      <div className="mission-grid">
        <div className="mission-card">
          <h3>Anonymous & Safe</h3>
          <p>
            Report experiences without fear of retaliation. We never collect any
            personal identifiers, our goal is to assist you when you are still
            not comfortable with a full report.
          </p>
        </div>
        <div className="mission-card">
          <h3>Campus Wide Access to Data</h3>
          <p>
            We allow anyone on campus see current campus trends. No filter, we
            show the reality; the good, the bad, and the ugly.
          </p>
        </div>
        <div className="mission-card">
          <h3>Working to prevent</h3>
          <p>
            We use our data to take action and prevent future cases. We wish our
            product didn't need to exist, so that's the goal we are working
            towards.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">100%</span>
          <span className="stat-label">Anonymous</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">24/7</span>
          <span className="stat-label">Available</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">3</span>
          <span className="stat-label">Campuses</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">∞</span>
          <span className="stat-label">Impact</span>
        </div>
      </div>
    </section>
  );
};

export default Mission;
