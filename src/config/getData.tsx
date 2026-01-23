import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../config/firebase";
import { Case } from "../types/case.ts";

const getData = async () => {
    
      try {
        const reportsRef = collection(db, "reports");
        const q = query(reportsRef);
        const querySnapshot = await getDocs(q);
        console.log(
          "Firebase Points: ",
          querySnapshot.docs.map((doc) => doc.data() as Case)
        );
        return (querySnapshot.docs.map((doc) => doc.data() as Case));
      } catch (error) {
        return [];
        console.error("Error fetching incidents:", error);
      }
    };
export default getData;