import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
  WithFieldValue,
} from "firebase/firestore";

/**
 * Single source of truth for a document in the `reports` collection.
 *
 * Both the write path (Report.tsx) and the read path (Map.tsx) are typed from
 * this file. Renaming a field on one side is now a compile error on the other —
 * which is exactly the drift that once blanked the /map page, when reports were
 * written as `submittedAt` but read as `createdAt`.
 */

/**
 * The report as it may actually come back from Firestore.
 *
 * `createdAt` is optional here on purpose: documents submitted before the
 * write/read mismatch was fixed were stored under a different field name and
 * have no `createdAt` at all. Firestore data is untrusted input — narrow it
 * with `isUsableReport` before touching the timestamp.
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
  userAgent?: string;
}

/** A report that has been validated as safe for the app to work with. */
export interface ReportDoc extends StoredReport {
  createdAt: Timestamp;
}

/**
 * Type guard separating usable reports from legacy/malformed ones.
 *
 * Reading `.toMillis()` on a missing `createdAt` throws during render, and with
 * no ErrorBoundary in the tree that unmounts the whole app. Filter first.
 */
export function isUsableReport(report: StoredReport): report is ReportDoc {
  return (
    !!report.createdAt && typeof report.createdAt.toMillis === "function"
  );
}

/**
 * Shared converter so reads and writes go through one shape.
 *
 * Writes should annotate their payload as `WithFieldValue<ReportDoc>` (not
 * `StoredReport`) so that omitting `createdAt` fails to compile.
 */
export const reportConverter: FirestoreDataConverter<StoredReport> = {
  toFirestore(report: WithFieldValue<StoredReport>): DocumentData {
    return report as DocumentData;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): StoredReport {
    return snapshot.data(options) as StoredReport;
  },
};
