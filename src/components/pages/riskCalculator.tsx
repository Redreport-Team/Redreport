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