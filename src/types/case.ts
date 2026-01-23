import {
  Timestamp,
} from "firebase/firestore";
interface Case {
  campus: string;
  location: string;
  specificLocation: string;
  offenseTypes: string[];
  time: string;
  createdAt: Timestamp;
  additionalInfo: string;
}
export type { Case };