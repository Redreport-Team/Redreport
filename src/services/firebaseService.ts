// client/src/services/firebaseService.ts
import { db } from "../config/firebase.ts";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { Report, Case, ApiResponse } from "../types/index.ts";
import { FirebaseErrorHandler } from "../utils/fireBaseUtils.ts";

export class FirebaseService {
  private static readonly COLLECTION_NAME = "Test";

  static async submitReport(
    report: Omit<Report, "id" | "Time">
  ): Promise<string> {
    return FirebaseErrorHandler.withRetry(async () => {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...report,
        Time: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    });
  }

  static async getReports(limitCount: number = 100): Promise<Case[]> {
    return FirebaseErrorHandler.withRetry(async () => {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy("Time", "desc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          Dorm: data.Dorm,
          Type: data.Type,
          Time: data.Time?.toDate() || new Date(),
          deviceId: data.deviceId,
          repeated: data.repeated,
          labels: data.labels,
          // Enhanced data fields
          hallData: data.hallData,
          userAgent: data.userAgent,
          timestamp:
            data.timestamp?.toDate() || data.Time?.toDate() || new Date(),
          sessionId: data.sessionId,
          deviceInfo: data.deviceInfo,
          incidentDetails: data.incidentDetails,
        } as Case;
      });
    });
  }

  static async getReportsByHall(hallName: string): Promise<Case[]> {
    return FirebaseErrorHandler.withRetry(async () => {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy("Time", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            Dorm: data.Dorm,
            Type: data.Type,
            Time: data.Time?.toDate() || new Date(),
            deviceId: data.deviceId,
            repeated: data.repeated,
            labels: data.labels,
            // Enhanced data fields
            hallData: data.hallData,
            userAgent: data.userAgent,
            timestamp:
              data.timestamp?.toDate() || data.Time?.toDate() || new Date(),
            sessionId: data.sessionId,
            deviceInfo: data.deviceInfo,
            incidentDetails: data.incidentDetails,
          } as Case;
        })
        .filter((report) => report.Dorm === hallName);
    });
  }

  static async getReportsByType(type: number): Promise<Case[]> {
    return FirebaseErrorHandler.withRetry(async () => {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy("Time", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            Dorm: data.Dorm,
            Type: data.Type,
            Time: data.Time?.toDate() || new Date(),
            deviceId: data.deviceId,
            repeated: data.repeated,
            labels: data.labels,
            // Enhanced data fields
            hallData: data.hallData,
            userAgent: data.userAgent,
            timestamp:
              data.timestamp?.toDate() || data.Time?.toDate() || new Date(),
            sessionId: data.sessionId,
            deviceInfo: data.deviceInfo,
            incidentDetails: data.incidentDetails,
          } as Case;
        })
        .filter((report) => report.Type === type);
    });
  }

  // New method to get reports by building type
  static async getReportsByBuildingType(buildingType: string): Promise<Case[]> {
    return FirebaseErrorHandler.withRetry(async () => {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy("Time", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            Dorm: data.Dorm,
            Type: data.Type,
            Time: data.Time?.toDate() || new Date(),
            // Enhanced data fields
            hallData: data.hallData,
            userAgent: data.userAgent,
            timestamp:
              data.timestamp?.toDate() || data.Time?.toDate() || new Date(),
            sessionId: data.sessionId,
            deviceInfo: data.deviceInfo,
            incidentDetails: data.incidentDetails,
          } as Case;
        })
        .filter((report) => report.hallData?.buildingType === buildingType);
    });
  }
}
