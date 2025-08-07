// Firebase and API Types
export interface Report {
  id?: string;
  Dorm: string;
  Type: number;
  Time: Date;
  userId?: string;
  location?: string;
  // Enhanced data fields
  hallData?: {
    name: string;
    location: string;
    buildingType: string;
    latitude?: number;
    longitude?: number;
  };
  userAgent?: string;
  timestamp?: Date;
  sessionId?: string;
  deviceInfo?: {
    platform: string;
    browser: string;
    screenResolution?: string;
  };
  incidentDetails?: {
    typeName: string;
    description?: string;
  };
}

export interface Case {
  id: string;
  Dorm: string;
  Time: Date;
  Type: number;
  // Enhanced data fields
  hallData?: {
    name: string;
    location: string;
    buildingType: string;
    latitude?: number;
    longitude?: number;
  };
  userAgent?: string;
  timestamp?: Date;
  sessionId?: string;
  deviceInfo?: {
    platform: string;
    browser: string;
    screenResolution?: string;
  };
  incidentDetails?: {
    typeName: string;
    description?: string;
  };
}

// Hall Data Types
export interface HallData {
  name: string;
  location: string;
  buildingType: string;
}

export interface HallDataWithCoordinates extends HallData {
  latitude: number;
  longitude: number;
}

// Map Types
export interface MapPoint {
  coordinates: [number, number];
  count: number;
  typeCounts: [number, number, number, number, number]; // [uncomfortable, harassment, physical, verbal, discrimination]
}

// Component Props Types
export interface SelectHallProps {
  onHallSelect?: (hall: string) => void;
  onTypeSelect?: (type: number) => void;
  onSubmit?: (data: { Dorm: string; Type: number }) => void;
}

export interface MapProps {
  reports?: Case[];
  onReportClick?: (report: Case) => void;
}

// Form Types
export interface ReportFormData {
  Dorm: string;
  Type: number;
  hallData?: {
    name: string;
    location: string;
    buildingType: string;
    latitude?: number;
    longitude?: number;
  };
  userAgent?: string;
  timestamp?: Date;
  sessionId?: string;
  deviceInfo?: {
    platform: string;
    browser: string;
    screenResolution?: string;
  };
  incidentDetails?: {
    typeName: string;
    severity?: number;
    description?: string;
  };
}

// Error Types
export interface FirebaseError {
  code: string;
  message: string;
  details?: any;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
