import React, { useEffect } from "react";
import Navigation from "../UI/Navigation";
import Hero from "../UI/Hero";
import Mission from "../UI/Mission";
import Timeline from "../UI/Timeline";
import "../css/LandingPage.css";
import OffenseClassification from "../Features/Maureen/OffenseClassification";

const LandingPage: React.FC = () => {
  useEffect(() => {
    // Scroll progress indicator
    const updateScrollIndicator = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      const indicator = document.querySelector(
        ".scroll-indicator"
      ) as HTMLElement;
      if (indicator) {
        indicator.style.width = scrollPercent + "%";
      }
    };

    // Smooth scrolling for navigation links
    const initSmoothScrolling = () => {
      document
        .querySelectorAll<HTMLAnchorElement>('a[href^="#"]')
        .forEach((anchor) => {
          anchor.addEventListener(
            "click",
            function (this: HTMLAnchorElement, e: Event) {
              e.preventDefault();
              const target = document.querySelector(this.getAttribute("href")!);
              if (target) {
                target.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }
          );
        });
    };

    // Intersection Observer for animations
    const initScrollAnimations = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
            }
          });
        },
        { threshold: 0.1 }
      );

      document.querySelectorAll(".content-section").forEach((section) => {
        observer.observe(section);
      });
    };

    // Navigation background on scroll
    const initNavScroll = () => {
      const nav = document.querySelector("nav");
      if (nav) {
        window.addEventListener("scroll", () => {
          if (window.scrollY > 100) {
            nav.style.background = "rgba(255, 255, 255)";
          } else {
            nav.style.background = "rgba(255, 255, 255, 0.4)";
          }
        });
      }
    };

    // Initialize all functions
    initSmoothScrolling();
    initScrollAnimations();
    initNavScroll();

    window.addEventListener("scroll", updateScrollIndicator);
    updateScrollIndicator();

    // Add some interactive hover effects
    const initHoverEffects = () => {
      // Stats animation on hover
      document.querySelectorAll(".stat-card").forEach((card) => {
        card.addEventListener("mouseenter", () => {
          (card as HTMLElement).style.transform = "scale(1.05) rotate(2deg)";
        });

        card.addEventListener("mouseleave", () => {
          (card as HTMLElement).style.transform = "scale(1) rotate(0deg)";
        });
      });
    };

    initHoverEffects();

    // Cleanup
    return () => {
      window.removeEventListener("scroll", updateScrollIndicator);
    };
  }, []);

  return (
    <div className="landing-page">
      <Navigation />
      <Hero />
      <Mission />
      <OffenseClassification />
      <Timeline />
      <SafetyHub />
    </div>
  );
};

export default LandingPage;
