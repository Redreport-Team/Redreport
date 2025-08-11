// client/src/services/analyticsService.ts
import { analytics } from "../config/firebase.ts";
import { Analytics, logEvent } from "firebase/analytics";

const DEDUPE_STORAGE_KEY = "rr_analytics_dedupe";
const SESSION_ID_KEY = "rr_session_id";
const ATTRIBUTION_KEY = "rr_attribution";

type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  ref?: string;
  source?: string;
};

function getFromSessionStorage<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function setInSessionStorage<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function loadDedupeSet(): Set<string> {
  const saved = getFromSessionStorage<string[]>(DEDUPE_STORAGE_KEY);
  return new Set(saved ?? []);
}

function saveDedupeSet(set: Set<string>): void {
  setInSessionStorage(DEDUPE_STORAGE_KEY, Array.from(set));
}

function getOrCreateSessionId(): string {
  let id = getFromSessionStorage<string>(SESSION_ID_KEY);
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setInSessionStorage(SESSION_ID_KEY, id);
  }
  return id;
}

function parseAttributionFromUrl(): Attribution | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = {};
  const keys: (keyof Attribution)[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "ref",
    "source",
  ];
  let hasAny = false;
  for (const key of keys) {
    const value = params.get(key);
    if (value) {
      attribution[key] = value;
      hasAny = true;
    }
  }
  return hasAny ? attribution : null;
}

export class AnalyticsService {
  private static dedupe = loadDedupeSet();

  static init(): void {
    if (typeof window === "undefined") return;
    // Persist attribution the first time we see it in a session
    const existingAttribution =
      getFromSessionStorage<Attribution>(ATTRIBUTION_KEY);
    const fromUrl = parseAttributionFromUrl();
    if (!existingAttribution && fromUrl) {
      setInSessionStorage(ATTRIBUTION_KEY, fromUrl);
    }

    // Ensure a session id exists and log session_started once
    const sessionId = getOrCreateSessionId();
    this.logSessionStart(sessionId);
  }

  static getAttribution(): Attribution | null {
    return getFromSessionStorage<Attribution>(ATTRIBUTION_KEY);
  }

  private static track(
    eventName: string,
    params: Record<string, unknown>,
    dedupeKey?: string
  ) {
    if (!analytics) return;

    const sessionId = getOrCreateSessionId();
    const attribution = this.getAttribution();
    const key = dedupeKey ?? `${eventName}:${sessionId}`;

    if (this.dedupe.has(key)) return;
    this.dedupe.add(key);
    saveDedupeSet(this.dedupe);

    const baseParams = {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      ...(attribution ? { attribution } : {}),
    };

    logEvent(analytics as Analytics, eventName, {
      ...baseParams,
      ...params,
    });
  }

  static logReportSubmission(
    hall: string,
    type: number,
    hallData?: any,
    deviceInfo?: any
  ) {
    const sessionId = getOrCreateSessionId();
    this.track(
      "report_submitted",
      {
        hall_name: hall,
        incident_type: type,
        building_type: hallData?.buildingType || "Unknown",
        location: hallData?.location || "Unknown",
        platform: deviceInfo?.platform || "Unknown",
        browser: deviceInfo?.browser || "Unknown",
        screen_resolution: deviceInfo?.screenResolution || "Unknown",
      },
      `report_submitted:${sessionId}:${hall}:${type}`
    );
  }

  static logMapView() {
    const sessionId = getOrCreateSessionId();
    this.track(
      "map_viewed",
      {},
      `map_viewed:${sessionId}:${location.pathname}`
    );
  }

  static logError(error: string, context?: string) {
    this.track("error_occurred", {
      error_message: error,
      context: context || "general",
    });
  }

  static logHallSelection(hall: string, buildingType: string) {
    const sessionId = getOrCreateSessionId();
    this.track(
      "hall_selected",
      {
        hall_name: hall,
        building_type: buildingType,
      },
      `hall_selected:${sessionId}:${hall}`
    );
  }

  static logTypeSelection(type: number, typeName: string) {
    const sessionId = getOrCreateSessionId();
    this.track(
      "type_selected",
      {
        type_id: type,
        type_name: typeName,
      },
      `type_selected:${sessionId}:${type}`
    );
  }

  static logSessionStart(sessionId: string, deviceInfo?: any) {
    this.track(
      "session_started",
      {
        session_id: sessionId,
        platform: deviceInfo?.platform || "Unknown",
        browser: deviceInfo?.browser || "Unknown",
        language: deviceInfo?.language || "Unknown",
        timezone: deviceInfo?.timezone || "Unknown",
      },
      `session_started:${sessionId}`
    );
  }

  static logIncidentSeverity(severity: number, typeName: string) {
    const sessionId = getOrCreateSessionId();
    this.track(
      "incident_severity",
      {
        severity_level: severity,
        incident_type: typeName,
      },
      `incident_severity:${sessionId}:${typeName}:${severity}`
    );
  }

  static logBuildingTypeAnalysis(buildingType: string, incidentCount: number) {
    const sessionId = getOrCreateSessionId();
    this.track(
      "building_type_analysis",
      {
        building_type: buildingType,
        incident_count: incidentCount,
      },
      `building_type_analysis:${sessionId}:${buildingType}`
    );
  }

  static logGeographicAnalysis(
    location: string,
    latitude?: number,
    longitude?: number
  ) {
    const sessionId = getOrCreateSessionId();
    this.track(
      "geographic_analysis",
      {
        location: location,
        latitude: latitude,
        longitude: longitude,
      },
      `geographic_analysis:${sessionId}:${location}`
    );
  }
}
