// Utility functions to gather device and user information

export interface DeviceInfo {
  platform: string;
  browser: string;
  screenResolution?: string;
  userAgent: string;
  language: string;
  timezone: string;
  viewport: {
    width: number;
    height: number;
  };
}

export interface UserContext {
  sessionId: string;
  timestamp: Date;
  deviceInfo: DeviceInfo;
}

const DEVICE_ID_KEY = "rr_device_id";
const LAST_SUBMISSION_TS_KEY = "rr_last_submission_ts";

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;

  // Detect browser
  let browser = "Unknown";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";

  // Detect platform
  let platform = "Unknown";
  if (userAgent.includes("Windows")) platform = "Windows";
  else if (userAgent.includes("Mac")) platform = "Mac";
  else if (userAgent.includes("Linux")) platform = "Linux";
  else if (userAgent.includes("Android")) platform = "Android";
  else if (userAgent.includes("iOS")) platform = "iOS";

  return {
    platform,
    browser,
    screenResolution: `${screen.width}x${screen.height}`,
    userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

export function getUserContext(): UserContext {
  return {
    sessionId: generateSessionId(),
    timestamp: new Date(),
    deviceInfo: getDeviceInfo(),
  };
}

export function getIncidentTypeName(type: number): string {
  const typeNames = [
    "Uncomfortable Situation",
    "Sexual Misconduct",
    "Physical Aggression",
    "Verbal Aggression",
    "Discrimination",
  ];
  return typeNames[type] || "Unknown";
}

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      const base = `${navigator.userAgent}|${screen.width}x${screen.height}|${
        navigator.language
      }|${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
      id = `dev_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 10)}_${hashString(base).toString(36)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // Fallback: ephemeral id if storage blocked
    return `dev_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }
}

export function getLastSubmissionTs(): number | null {
  try {
    const val = localStorage.getItem(LAST_SUBMISSION_TS_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

export function setLastSubmissionTs(ms: number): void {
  try {
    localStorage.setItem(LAST_SUBMISSION_TS_KEY, String(ms));
  } catch {
    // ignore
  }
}

export function isWithinThrottleWindow(days: number): boolean {
  const last = getLastSubmissionTs();
  if (!last) return false;
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  return now - last < windowMs;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit int
  }
  return Math.abs(hash);
}
