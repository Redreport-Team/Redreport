import React, { useEffect } from "react";
import Navigation from "../UI/Navigation";
import Hero from "../UI/Hero";
import Mission from "../UI/Mission";
import Timeline from "../UI/Timeline";
import "../css/LandingPage.css";

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
            nav.style.background = "rgba(254, 248, 243, 0.98)";
            nav.style.boxShadow = "0 2px 20px rgba(216, 47, 37, 0.1)";
          } else {
            nav.style.background = "rgba(254, 248, 243, 0.95)";
            nav.style.boxShadow = "none";
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

      // Mission cards animation
      document.querySelectorAll(".mission-card").forEach((card, index) => {
        (card as HTMLElement).style.animationDelay = `${index * 0.2}s`;
        card.addEventListener("mouseenter", () => {
          (card as HTMLElement).style.borderLeft = "8px solid #D82F25";
        });
        card.addEventListener("mouseleave", () => {
          (card as HTMLElement).style.borderLeft = "4px solid #D82F25";
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
      <Timeline />
    </div>
  );
};

export default LandingPage;
