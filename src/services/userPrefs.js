// ============================================================
// userPrefs.js
// §1  Default preferences
// §2  Load / Save — localStorage
// §3  Export
// ============================================================

// §1 — Default preferences
export const DEFAULT_PREFS = {
  defaultZoom:          6,
  dotScale:             3,
  acCat:                "C",
  tWindLimit:           10,
  cWindLimit:           25,
  amberBuffer:          "medium",
  amberBufferRvr:       500,
  amberBufferDh:        200,
  amberBufferTw:        3,
  amberBufferCw:        3,
  tafHours:             6,
  tafHoursManual:       6,
  newTafDuration:       10,
  newTafDurationManual: 15,
  newMetarDuration:     10,
  newMetarDurationManual: 15,
  blinkDuration:        10,
  blinkDurationManual:  15,
tafWindowMode:  "from_now",   // "from_now" | "time_range"
tafWindowFrom:  0,            // UTC saat (0-23)
tafWindowTo:    23,           // UTC saat (0-23)  hoverIcao:        true,
hoverAptName:     false,
hoverRunways:     true,
hoverTafSummary:  true,
hoverMetarSummary: true,
hoverLastTime:    true,
hoverRawTaf:      false,
hoverRawMetar:    false,
};

// §2.1 — Load from localStorage
export function loadPrefs() {
  try {
    const stored = localStorage.getItem("opsradar_prefs");
    if (!stored) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

// §2.2 — Save to localStorage
export function savePrefs(prefs) {
  try {
    localStorage.setItem("opsradar_prefs", JSON.stringify(prefs));
  } catch {
    console.error("Prefs save failed");
  }
}

// §3 — Amber buffer değerlerini hesapla
export function getAmberBuffer(prefs) {
  switch (prefs.amberBuffer) {
    case "low":    return { rvr: 200, dh: 100 };
    case "medium": return { rvr: 500, dh: 200 };
    case "high":   return { rvr: 800, dh: 300 };
    case "manual": return { rvr: prefs.amberBufferRvr, dh: prefs.amberBufferDh };
    default:       return { rvr: 500, dh: 200 };
  }
}

export function getDurationMs(value, manualValue) {
  if (value === "off") return null;
  if (value === "manual") return (manualValue ?? 15) * 60 * 1000;
  return (value ?? 10) * 60  * 1000;
}