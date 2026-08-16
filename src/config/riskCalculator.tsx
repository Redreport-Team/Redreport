
import { Case } from "./case.ts";
import getEstimatedDays from "./DateDiff.tsx";
export default function calculateRiskScore(reports: Case[]): [number, number] {
    let totalPoints = 0;
    let recentCases = 0;

    // X = Amount of reports in the last 3 days considered CRITICAL
    const maxPointsThreshold = 12.0;

    for (const report of reports) {
      const estimatedAggressionTime = getEstimatedDays(report);

      if (estimatedAggressionTime < 7) recentCases++;

      // x report in 3 days is critical
      // As days pass the weight of each report on the risk score decreases hyperbolically
      const recencyWeight = Math.min((3 / estimatedAggressionTime) * 2, 2);
      //const individualWeight = ;
      totalPoints += recencyWeight; // add individualWeight to totalPoints
    }

    if (totalPoints <= 0) {
      return [1.0, 0];
    } 
    if (reports.individualsInvolved != 1) {
        calculateNewRisk(totalPoints, reports.individualsInvolved);
    }

    let score = 10.0 + (totalPoints / maxPointsThreshold) * 40.0;

    score = Math.min(score, 50.0);

    return [Math.round(score) / 10, recentCases];
}

export function calculateNewRisk(baseScore: number, individuals: number): number {
    let adjustmentFactor = 0;
    if (individuals >= 4) {
        adjustmentFactor = 30;
    } else if (individuals >= 2) {
        adjustmentFactor = 10;
    }

    let newScore = baseScore + adjustmentFactor;
    // Ensures that the new score is still within the valid range 0-100
    return Math.min(100, Math.max(0, newScore));
}