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
