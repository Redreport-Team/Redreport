import React from "react";
import "../css/Hero.css";

const Hero: React.FC = () => {
  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1>
            <span className="highlight">Student voices</span>
            <br />
            SAFER CAMPUS
          </h1>
          <p>
            Anonymous reporting tool built by and for students in the Notre Dame
            Tricampus community. Empowering students to share experiences
            without fear while creating meaningful change.
          </p>
          <a href="#mission" className="cta-button">
            Learn more
          </a>
        </div>

        <div className="hero-visual">
          <div className="campus-circle">
            <img src="/abstract.svg" alt="Logo" className="campus-image" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
