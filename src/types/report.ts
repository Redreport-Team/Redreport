import type { FirestoreDataConverter, Timestamp } from "firebase/firestore";

/**
 * Single source of truth for a document in the `reports` collection. Both the
 * write path (Report.tsx) and the read path (Map.tsx) are typed from here, so
 * renaming a field on one side is a compile error on the other — the drift that
 * once blanked the /map page, when reports were written as `submittedAt` but
 * read as `createdAt`.
 *
 * `createdAt` is optional because documents submitted before that fix have no
 * such field. Firestore data is untrusted input: narrow it with
 * `isUsableReport` before touching the timestamp.
 */
export interface StoredReport {
  userID: string;
  campus: string;
  location: string;
  specificLocation: string;
  offenseTypes: string[];
  individualsInvolved: number;
  time: string;
  additionalInfo: string;
  createdAt?: Timestamp;
  recaptchaToken?: string;
}

/** A report validated as safe to work with. */
export interface ReportDoc extends StoredReport {
  createdAt: Timestamp;
}

/**
 * Reading `.toMillis()` on a missing `createdAt` throws during render, and with
 * no ErrorBoundary in the tree that unmounts the whole app. Filter first.
 */
export function isUsableReport(report: StoredReport): report is ReportDoc {
  return typeof report.createdAt?.toMillis === "function";
}

/**
 * Shared converter so reads and writes go through one shape. Writes should
 * annotate their payload as `WithFieldValue<ReportDoc>` (not `StoredReport`)
 * so that omitting `createdAt` fails to compile.
 */
export const reportConverter: FirestoreDataConverter<StoredReport> = {
  toFirestore: (report) => report,
  fromFirestore: (snapshot, options) => snapshot.data(options) as StoredReport,
};
