
import { Case } from "./case.ts";
export default function getEstimatedDays(report: Case): number {
    const reportTime = report.createdAt.toMillis();
    const today = Date.now();
    const day = 24 * 60 * 60 * 1000;

    let estimatedDays = 0;
    // Calculate time since Report was made
    let daysSinceReport = today - reportTime;

    // Caclulate time since agression occured
    switch (report.time) {
      case "within-24-hours":
        estimatedDays = (daysSinceReport + day / 2) / day;
        break;
      case "within-week":
        estimatedDays = (daysSinceReport + day * 3.5) / day;
        break;
      case "within-month":
        estimatedDays = (daysSinceReport + day * 15) / day;
        break;
      case "longer-ago":
        estimatedDays = (daysSinceReport + day * 45) / day;
        break;
    }
    return estimatedDays;
}