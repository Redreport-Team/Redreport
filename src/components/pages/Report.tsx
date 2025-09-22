import React, { useState, useRef } from "react";
import "../css/Report.css";
import Navigation from "../UI/Navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import locationsData from "../../locations.json";

interface FormData {
  campus: string;
  location: string;
  specificLocation: string;
  offenseTypes: string[];
  time: string;
  additionalInfo: string;
}

const Report: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<FormData>({
    campus: "",
    location: "",
    specificLocation: "",
    offenseTypes: [],
    time: "",
    additionalInfo: "",
  });
  const campusObj: Record<string, any> = locationsData.Campuses;
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reportId, setReportId] = useState<string>("");
  const [suggestionsList, setSuggestionsList] = useState<string[]>([]);
  const [inlineSuggestion, setInlineSuggestion] = useState<string>("");
  const mirrorRef = useRef<HTMLSpanElement | null>(null);
  const specificInputRef = useRef<HTMLInputElement | null>(null);

  const totalSteps = 4;

  var [locations, setLocations] = useState<Record<string, any>>(
    campusObj["Notre-Dame"]
  );
  var suggestions: string[] = [];

  // Form Handlers
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    console.log("Input Change ", name, value);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name == "campus") {
      setLocations(campusObj[value]);
    } else if (locations && formData.location) {
      suggestions = locations[formData.location].suggestions || [];
    } else {
      console.log("No campus or location selected yet.");
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      offenseTypes: checked
        ? [...prev.offenseTypes, value]
        : prev.offenseTypes.filter((type) => type !== value),
    }));
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      if (!formData.location) {
        alert("Please select where you felt unsafe.");
        return false;
      }
    } else if (currentStep === 2) {
      if (formData.offenseTypes.length === 0) {
        alert("Please select at least one type of offense.");
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.time) {
        alert("Please select when this occurred.");
        return false;
      }
    }
    return true;
  };

  const changeStep = (direction: number) => {
    if (direction > 0 && !validateCurrentStep()) {
      return;
    }

    const newStep = currentStep + direction;
    if (newStep >= 1 && newStep <= totalSteps) {
      setCurrentStep(newStep);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      const id = SubmitReport();
      setReportId(id.toString());
      setCurrentStep(5); // Show success
      setIsSubmitting(false);
    }, 2000);
  };

  const formatLocation = (location: string): string => {
    return location.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatTime = (time: string): string => {
    return time.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Returns an array of suggestions matching the input (case-insensitive, prefix match)
  const AutoCompleteHall = (inputValue: string): string[] => {
    const cleanInput = inputValue.replace(/[^a-zA-Z0-9 ]/g, "").trim();
    if (!cleanInput || !suggestions || suggestions.length === 0) return [];
    const lower = cleanInput.toLowerCase();
    const matches = suggestions.filter((s) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .includes(lower.replace(/[^a-z0-9]/g, ""))
    );
    return matches;
  };

  const offenseTypeLabels: { [key: string]: string } = {
    "uncomfortable-situation": "Uncomfortable Situation",
    "Sexual Misconduct": "Sexual Misconduct",
    "physical-aggression": "Physical Aggression",
    "verbal-aggression": "Verbal Aggression",
    discrimination: "Discrimination",
  };

  const renderReview = () => {
    return (
      <div
        id="report-summary"
        style={{
          background: "rgba(216, 47, 37, 0.05)",
          padding: "1.5rem",
          borderRadius: "10px",
          marginBottom: "2rem",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <strong>Campus:</strong> {formatLocation(formData.campus)}
          {formData.campus && ` (${formData.campus})`}
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <strong>Location:</strong> {formatLocation(formData.location)}
          {formData.specificLocation && ` (${formData.specificLocation})`}
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <strong>Incident Types:</strong>{" "}
          {formData.offenseTypes
            .map((type) => offenseTypeLabels[type])
            .join(", ")}
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <strong>When:</strong> {formatTime(formData.time)}
        </div>
        {formData.additionalInfo.trim() && (
          <div>
            <strong>Additional Information:</strong>{" "}
            {formData.additionalInfo.substring(0, 200)}
            {formData.additionalInfo.length > 200 ? "..." : ""}
          </div>
        )}
      </div>
    );
  };

  // Handler for specificLocation input change: update value and compute suggestions
  const handleSpecificLocationChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleInputChange(e);
    const value = e.target.value.trim();
    const list = AutoCompleteHall(value);
    setSuggestionsList(list);

    // Only show suggestion if we have matches and current input is a prefix
    if (list.length > 0) {
      const first = list[0];
      const cleanInput = value.toLowerCase();
      const cleanSuggestion = first.toLowerCase();

      // Only show suggestion if input is a prefix of the suggestion
      if (cleanSuggestion.startsWith(cleanInput) && cleanInput.length > 0) {
        setInlineSuggestion(first.substring(value.length));
      } else {
        setInlineSuggestion("");
      }
    } else {
      setInlineSuggestion("");
    }
  };

  // Handle keydown for accepting inline suggestion on Enter
  const handleSpecificLocationKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      // If there is an inline suggestion, accept it by appending to current value
      if (inlineSuggestion) {
        e.preventDefault();
        const newValue = formData.specificLocation + inlineSuggestion;
        // create a synthetic event for handleInputChange
        const syntheticEvent = {
          target: { name: "specificLocation", value: newValue },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleInputChange(syntheticEvent);
        setInlineSuggestion("");
        setSuggestionsList([]);
      }
    }
  };
  async function SubmitReport() {
    const docRef = await addDoc(collection(db, "Test"), {
      ...formData,
      Time: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
  return (
    <>
      <Navigation></Navigation>
      <div>
        {/* Main Container */}
        <div className="report-container">
          {/* Header */}
          <div className="report-header">
            <h1>
              Anonymous <span className="highlight">Report</span>
            </h1>
            <p>
              Your voice matters. Share your experience in a safe, secure
              environment where your identity remains completely protected.
            </p>
          </div>

          {/* Security Notice */}
          <div className="security-notice">
            <h3>Your Privacy is Protected</h3>
            <p>
              This form uses advanced encryption and anonymization techniques.
              No identifying information is collected or stored.
            </p>
          </div>

          {/* Report Form */}
          <div className="report-form">
            {/* Progress Indicator */}
            <div className="form-progress">
              <div
                className={`progress-step ${currentStep === 1 ? "active" : ""}`}
              >
                <div className="step-circle">1</div>
                <span>Location</span>
              </div>
              <div
                className={`progress-step ${currentStep === 2 ? "active" : ""}`}
              >
                <div className="step-circle">2</div>
                <span>Incident</span>
              </div>
              <div
                className={`progress-step ${currentStep === 3 ? "active" : ""}`}
              >
                <div className="step-circle">3</div>
                <span>Details</span>
              </div>
              <div
                className={`progress-step ${currentStep === 4 ? "active" : ""}`}
              >
                <div className="step-circle">4</div>
                <span>Submit</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Step 1: Location */}
              <div
                className={`form-section ${currentStep === 1 ? "active" : ""}`}
              >
                <div className="form-group">
                  <label htmlFor="campus">Where did you feel unsafe? *</label>
                  <div className="label-description">
                    Select the location where the incident occurred
                  </div>
                  <select
                    id="campus"
                    name="campus"
                    value={formData.campus}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Choose a campus</option>
                    <option value="Notre-Dame">Notre Dame</option>
                    <option value="Saint-Mary">Saint Mary's College</option>
                    <option value="Holy-Cross">Holy Cross College</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="location">Where did you feel unsafe? *</label>
                  <div className="label-description">
                    Select the location where the incident occurred
                  </div>
                  <select
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Choose a location</option>
                    {locations && Object.keys(locations).length > 0
                      ? Object.keys(locations).map((cat: string) => (
                          <option key={cat} value={cat}>
                            {cat
                              .replace(/-/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))
                      : null}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="specificLocation">
                    Specific Location (Optional)
                  </label>
                  <div className="label-description">
                    Provide more details if comfortable (building name, room,
                    etc.)
                  </div>
                  <div style={{ position: "relative" }}>
                    {/* Hidden text measuring span */}
                    <span
                      ref={mirrorRef}
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        visibility: "hidden",
                        whiteSpace: "pre",
                        fontSize: "inherit",
                        fontFamily: "inherit",
                        letterSpacing: "inherit",
                        padding: "8px",
                        border: "0",
                      }}
                    >
                      {formData.specificLocation}
                    </span>

                    <input
                      ref={specificInputRef}
                      type="text"
                      id="specificLocation"
                      name="specificLocation"
                      value={formData.specificLocation}
                      onChange={handleSpecificLocationChange}
                      onKeyDown={handleSpecificLocationKeyDown}
                      placeholder="e.g., Main Library, 2nd floor"
                      style={{
                        background: "transparent",
                        width: "100%",
                        padding: "8px",
                      }}
                      autoComplete="off"
                    />

                    {inlineSuggestion && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${
                            (mirrorRef.current?.offsetWidth || 0) + 8
                          }px`,
                          top: "50%",
                          transform: "translateY(-50%)",
                          opacity: 0.45,
                          color: "#666",
                          pointerEvents: "none",
                          whiteSpace: "pre",
                          fontFamily: "inherit",
                          fontSize: "inherit",
                          letterSpacing: "inherit",
                        }}
                      >
                        {inlineSuggestion}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Incident Type */}
              <div
                className={`form-section ${currentStep === 2 ? "active" : ""}`}
              >
                <div className="form-group">
                  <label>What type of offense would you group it as? *</label>
                  <div className="label-description">
                    Select all that apply to your experience
                  </div>
                  <div className="checkbox-group">
                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        name="offense-type"
                        value="uncomfortable-situation"
                        checked={formData.offenseTypes.includes(
                          "uncomfortable-situation"
                        )}
                        onChange={handleCheckboxChange}
                      />
                      <div className="checkbox-content">
                        <strong>Uncomfortable Situation</strong>
                        <small>
                          Situations that made you feel uneasy or uncomfortable
                        </small>
                      </div>
                    </label>

                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        name="offense-type"
                        value="Sexual Misconduct"
                        checked={formData.offenseTypes.includes(
                          "Sexual Misconduct"
                        )}
                        onChange={handleCheckboxChange}
                      />
                      <div className="checkbox-content">
                        <strong>Unconsented Contact</strong>
                        <small>Physical contact without permission</small>
                      </div>
                    </label>

                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        name="offense-type"
                        value="physical-aggression"
                        checked={formData.offenseTypes.includes(
                          "physical-aggression"
                        )}
                        onChange={handleCheckboxChange}
                      />
                      <div className="checkbox-content">
                        <strong>Physical Aggression</strong>
                        <small>Physical violence or threat of violence</small>
                      </div>
                    </label>

                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        name="offense-type"
                        value="verbal-aggression"
                        checked={formData.offenseTypes.includes(
                          "verbal-aggression"
                        )}
                        onChange={handleCheckboxChange}
                      />
                      <div className="checkbox-content">
                        <strong>Verbal Aggression</strong>
                        <small>Threatening, hostile, or abusive language</small>
                      </div>
                    </label>

                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        name="offense-type"
                        value="discrimination"
                        checked={formData.offenseTypes.includes(
                          "discrimination"
                        )}
                        onChange={handleCheckboxChange}
                      />
                      <div className="checkbox-content">
                        <strong>Discrimination</strong>
                        <small>
                          Treatment based on identity, race, gender, religion,
                          etc.
                        </small>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Step 3: Details */}
              <div
                className={`form-section ${currentStep === 3 ? "active" : ""}`}
              >
                <div className="form-group">
                  <label htmlFor="time">When did this occur? *</label>
                  <select
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select timeframe</option>
                    <option value="within-24-hours">
                      Within the last 24 hours
                    </option>
                    <option value="within-week">Within the last week</option>
                    <option value="within-month">Within the last month</option>
                    <option value="within-semester">
                      Within this semester
                    </option>
                    <option value="longer-ago">Longer ago</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="additionalInfo">
                    Additional Information (Optional)
                  </label>
                  <div className="label-description">
                    Anything else you'd like to share
                  </div>
                  <textarea
                    id="additionalInfo"
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    placeholder="Any additional context, concerns, or information you'd like to provide"
                  ></textarea>
                </div>
              </div>

              {/* Step 4: Review & Submit */}
              <div
                className={`form-section ${currentStep === 4 ? "active" : ""}`}
              >
                <div id="review-content">
                  <h3 style={{ color: "#113052", marginBottom: "1rem" }}>
                    Review Your Report
                  </h3>
                  <p style={{ marginBottom: "2rem", opacity: 0.8 }}>
                    Please review the information below before submitting your
                    anonymous report.
                  </p>

                  {renderReview()}

                  <div className="security-notice" style={{ marginBottom: 0 }}>
                    <h3>Final Privacy Reminder</h3>
                    <p>
                      Once submitted, this report cannot be traced back to you.
                      Your anonymity is guaranteed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 5: Success */}
              {currentStep === 5 && (
                <div className="success-message">
                  <div className="success-icon">✓</div>
                  <h2>Report Submitted Successfully</h2>
                  <p>
                    Thank you for sharing your experience. Your voice
                    contributes to making our campus community safer for
                    everyone.
                  </p>
                  <p>
                    <strong>Report ID:</strong> {reportId}
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => window.close()}
                  >
                    Return to Home
                  </button>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep < 5 && (
                <div className="form-navigation">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => changeStep(-1)}
                    style={{ display: currentStep > 1 ? "block" : "none" }}
                  >
                    Previous
                  </button>
                  {currentStep < 4 && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => changeStep(1)}
                    >
                      Next
                    </button>
                  )}
                  {currentStep === 4 && (
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {!isSubmitting && <span>Submit Anonymous Report</span>}
                      {isSubmitting && (
                        <span>
                          <span className="loading"></span>
                          Submitting...
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Report;
