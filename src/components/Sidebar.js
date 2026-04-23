// ============================================================
// Sidebar.js
// §1    Imports
// §2    Helper functions
//   §2.1  calcWindComponents — XW/TW from runway heading + wind
// §3    Sub-components
//   §3.1  WeatherCard — metric box (label, value, limit)
//   §3.2  RunwayRow — single runway entry
//     §3.2.1  State: showHover, isBlinking prop
//     §3.2.2  Visible + hidden app split (max 8 shown)
//     §3.2.3  Hover panel: TYPE / RVR / DH table
//     §3.2.4  Row layout: dot (animated if blinking), id, length, apps, status
// §4    Sidebar main component
//   §4.1  State
//   §4.2  Derived values: apt, activeRwy, wind limits
//   §4.3  Status helpers
//     §4.3.1  getWorstStatus — METAR + 6 TAF slots, worst wins
//     §4.3.2  windScore — for runway sorting
//   §4.4  Sorted runways (useMemo)
//   §4.5  Effects
//     §4.5.1  Reset on icao change
//     §4.5.2  Auto-select first runway
//     §4.5.3  Renk değişimi kontrolü → blinkingRwys
//     §4.5.4  Yeni TAF / METAR kontrolü
//   §4.6  Handlers
//     §4.6.1  handleFirstSlot
//     §4.6.2  handleSlotSelect
//     §4.6.3  clearBlink
//   §4.7  Group label calculation (getGroupLabel)
//   §4.8  Render
//     §4.8.1  Container
//     §4.8.2  Loading overlay
//     §4.8.3  Skeleton (apt known, parsed null)
//     §4.8.4  Full content (apt + parsed ready)
//       §4.8.4.1  Header: dot (animated) + ICAO/IATA/name + close
//       §4.8.4.2  Selected runway box
//       §4.8.4.3  Timeline
//       §4.8.4.4  Weather cards: RVR, DH, T.WIND, C.WIND
//       §4.8.4.5  Runway list
//       §4.8.4.6  Raw TAF / METAR panel
// ============================================================

// §1 — Imports
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { selectActiveRunway } from "../services/activeRunway";
import runways from "../data/runways";
import { getRunwayStatus, getBestApproach, WIND_LIMITS, BUFFER } from "../services/runwayStatus";
import Timeline from "./Timeline";
import MinimaTooltip from "./MinimaTooltip";
import minima from "../data/minima";

// §2.1 — Wind component calculation from runway heading
function calcWindComponents(rwyHeading, wdir, wspd) {
  if (wdir === null || wdir === undefined || wdir === "VRB") return { xw: 0, tw: 0 };
  const angle = ((wdir - rwyHeading + 360) % 360) * (Math.PI / 180);
  return {
    xw: Math.round(Math.abs(Math.sin(angle) * wspd) * 10) / 10,
    tw: Math.round(Math.cos(angle) * wspd * 10) / 10,
  };
}

// §3.1 — WeatherCard
function WeatherCard({ label, value, limit, warn, amber, theme }) {
  const borderColor = warn ? theme.red : amber ? theme.amber : theme.border;
  const valueColor  = warn ? theme.red : amber ? theme.amber : theme.textPrimary;
  return (
    <div style={{
      background: theme.bgPage, border: `1px solid ${borderColor}`,
      borderRadius: "3px", padding: "5px 8px",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      height: "54px", boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: theme.textDim, letterSpacing: "1px" }}>{label}</span>
        {limit !== null && limit !== undefined && (
          <span style={{ fontSize: "11px", color: theme.textDim }}>{limit}</span>
        )}
      </div>
      <div style={{ fontSize: "18px", color: valueColor, textAlign: "center", lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

// §3.2 — RunwayRow
function RunwayRow({ rwy, durum, renk, isDisplayed, isToOnly, apps, getAppColor, theme, onClick, isBlinking }) {

  // §3.2.1 — State
  const [showHover, setShowHover] = useState(false);

  // §3.2.2 — Split apps into visible (max 8) and hidden
  const MAX_SHOW    = 8;
  const visibleApps = apps.slice(0, MAX_SHOW);
  const hiddenApps  = apps.slice(MAX_SHOW);
  const hasHidden   = hiddenApps.length > 0;

  // §3.2.3 — Row layout
  return (
    <>
      <style>{`
        @keyframes opsradar-blink {
          0%   { opacity: 1; }
          50%  { opacity: 0.25; }
          100% { opacity: 1; }
        }
      `}</style>
      <div
        onClick={onClick}
        onMouseEnter={() => setShowHover(true)}
        onMouseLeave={() => setShowHover(false)}
        style={{
          display: "flex", alignItems: "center",
          padding: "6px 8px", marginBottom: "4px",
          background: isDisplayed ? theme.bgActive : theme.bgPage,
          border: `1px solid ${isDisplayed ? renk : theme.border}`,
          borderRadius: "3px",
          cursor: isToOnly ? "default" : "pointer",
          opacity: isToOnly ? 0.4 : 1,
          position: "relative",
        }}
      >
        {/* §3.2.4 — Status dot */}
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: renk, marginRight: "10px", flexShrink: 0,
          animation: isBlinking ? "opsradar-blink 1s ease-in-out infinite" : "none",
        }} />

        <span style={{ fontSize: "13px", fontWeight: "bold", color: theme.textPrimary, minWidth: "36px" }}>{rwy.id}</span>
        <span style={{ fontSize: "10px", color: theme.textDim, marginLeft: "8px", marginRight: "12px", flexShrink: 0 }}>{rwy.length}m</span>

        {isToOnly ? (
          <span style={{ fontSize: "9px", color: theme.textDim }}>TO ONLY</span>
        ) : (
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flex: 1 }}>
            {visibleApps.map((app, i) => (
              <span key={i} style={{ fontSize: "9px", fontWeight: "bold", color: getAppColor(app), whiteSpace: "nowrap" }}>
                {app.appTyp}
              </span>
            ))}
            {hasHidden && <span style={{ fontSize: "9px", color: theme.textDim, flexShrink: 0 }}>...</span>}
          </div>
        )}

        {!isToOnly && (
          <span style={{ fontSize: "10px", color: renk, marginLeft: "auto", flexShrink: 0 }}>{durum.toUpperCase()}</span>
        )}

        {/* §3.2.3 — Hover panel */}
        {showHover && apps.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
              background: theme.bgSurface, border: `1px solid ${theme.border}`,
              borderRadius: "4px", padding: "8px", zIndex: 2000,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)", minWidth: "170px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "56px 52px 50px", gap: "2px", marginBottom: "3px" }}>
              <span style={{ fontSize: "8px", color: theme.textDim }}>TYPE</span>
              <span style={{ fontSize: "8px", color: theme.textDim }}>RVR</span>
              <span style={{ fontSize: "8px", color: theme.textDim }}>DH</span>
            </div>
            {apps.map((app, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "56px 52px 50px", gap: "2px", borderTop: `1px solid ${theme.border}`, padding: "2px 0" }}>
                <span style={{ fontSize: "9px", fontWeight: "bold", color: getAppColor(app) }}>{app.appTyp}</span>
                <span style={{ fontSize: "9px", color: getAppColor(app) }}>{app.rvr}m</span>
                <span style={{ fontSize: "9px", color: getAppColor(app) }}>{app.dh === 0 ? "—" : app.dh + "ft"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// §4 — Sidebar main component
function Sidebar({ icao, parsed, onClose, theme, prevRawTaf, prevMetarObsTime, prefs }) {

  // §4.1 — State
  const [rawOpen, setRawOpen]           = useState(true);
  const [selectedFcst, setSelectedFcst] = useState(null);
  const [selectedTs, setSelectedTs]     = useState(null);
  const [selectedRwy, setSelectedRwy]   = useState(null);
  const [isMetar, setIsMetar]           = useState(false);
  const [blinkingRwys, setBlinkingRwys] = useState({});
  const [newTaf, setNewTaf]             = useState(null);
  const [newMetar, setNewMetar]         = useState(null);
  const prevRwyStatus                   = useRef({});
  const initializedRef                  = useRef(false);

  // §4.2 — Derived values
  const apt    = runways[icao];
  const activeRwy = parsed ? selectActiveRunway(icao, parsed.wdir, parsed.wspd) : null;

  // prefs'ten wind limitleri al
  const maxTW = prefs?.tWindLimit ?? WIND_LIMITS.maxTW;
  const maxXW = prefs?.cWindLimit ?? WIND_LIMITS.maxXW;
  const acCat = prefs?.acCat ?? "C";

  // prefs'ten amber buffer al
  const amberBufferRvr = (() => {
    if (!prefs) return BUFFER.rvr;
    if (prefs.amberBuffer === "low")    return 200;
    if (prefs.amberBuffer === "medium") return 500;
    if (prefs.amberBuffer === "high")   return 1000;
    if (prefs.amberBuffer === "manual") return prefs.amberBufferRvr ?? 500;
    return BUFFER.rvr;
  })();

  const amberBufferDh = (() => {
    if (!prefs) return BUFFER.dh;
    if (prefs.amberBuffer === "low")    return 100;
    if (prefs.amberBuffer === "medium") return 200;
    if (prefs.amberBuffer === "high")   return 500;
    if (prefs.amberBuffer === "manual") return prefs.amberBufferDh ?? 200;
    return BUFFER.dh;
  })();

  const STATUS_COLOR = {
    green:   theme.green,
    amber:   theme.amber,
    red:     theme.red,
    unknown: theme.unknown,
  };

  // §4.3.1 — getWorstStatus
  function getWorstStatus(rwyId) {
    if (!parsed?.fcsts) return "unknown";
    const nowTs = Math.floor(Date.now() / 1000);
    const slots = [];
    if (parsed.metar) {
      slots.push(getRunwayStatus(icao, rwyId, parsed.metar.rvr, parsed.metar.dh, parsed.metar.wdir, parsed.metar.wspd, prefs));
    }
const tafCheckHours = (() => {
  if (!prefs) return 6;
  if (prefs.tafHours === "manual") return prefs.tafHoursManual ?? 6;
  return typeof prefs.tafHours === "number" ? prefs.tafHours : 6;
})();

for (let i = 0; i < tafCheckHours; i++) {      const slotTs = nowTs + i * 3600;
      const fcst = parsed.fcsts.find((f) => slotTs >= f.timeFrom && slotTs < f.timeTo)
        || parsed.fcsts[parsed.fcsts.length - 1];
      slots.push(getRunwayStatus(icao, rwyId, fcst.rvr, fcst.dh, fcst.wdir, fcst.wspd, prefs));
    }
    if (slots.includes("red"))               return "red";
    if (slots.includes("amber"))             return "amber";
    if (slots.every((s) => s === "unknown")) return "unknown";
    return "green";
  }

  // §4.3.2 — windScore
  function windScore(rwyId) {
    const rwyData = apt?.runways.find((r) => r.id === rwyId);
    const w = calcWindComponents(rwyData?.heading ?? 0, parsed?.wdir, parsed?.wspd);
    return w.tw + w.xw;
  }

  // §4.4 — Sorted runways
  const sortedRunways = useMemo(() => {
    if (!apt) return [];
    return [...apt.runways].sort((a, b) => {
      const aDurum  = getWorstStatus(a.id);
      const bDurum  = getWorstStatus(b.id);
      const aToOnly = aDurum === "unknown";
      const bToOnly = bDurum === "unknown";
      if (aToOnly && !bToOnly) return 1;
      if (!aToOnly && bToOnly) return -1;
      if (aToOnly && bToOnly)  return 0;
      const aScore = windScore(a.id);
      const bScore = windScore(b.id);
      if (Math.abs(aScore - bScore) < 0.5) return b.length - a.length;
      return aScore - bScore;
    });
  }, [parsed, icao]);

  // §4.5.1 — Reset on icao change
  useEffect(() => {
    setSelectedRwy(null);
    setSelectedFcst(null);
    setSelectedTs(null);
    setIsMetar(false);
    setNewTaf(null);
    setNewMetar(null);
    initializedRef.current = false;
    prevRawTaf.current = null;
    prevMetarObsTime.current = null;
    setBlinkingRwys((prev) => {
      Object.values(prev).forEach(clearTimeout);
      return {};
    });
  }, [icao]);

  // §4.5.2 — Auto-select first runway
  useEffect(() => {
    if (sortedRunways.length > 0 && !selectedRwy) {
      const first = sortedRunways.find((r) => getWorstStatus(r.id) !== "unknown");
      if (first) setSelectedRwy(first.id);
    }
  }, [sortedRunways]);

  // §4.5.3 — Renk değişimi kontrolü
  useEffect(() => {
    if (!parsed || !apt) return;
    apt.runways.forEach((rwy) => {
      const newStatus = getWorstStatus(rwy.id);
      const oldStatus = prevRwyStatus.current[rwy.id];
      if (oldStatus && oldStatus !== newStatus) {
        setBlinkingRwys((prev) => {
          if (prev[rwy.id]) clearTimeout(prev[rwy.id]);
          const timerId = setTimeout(() => {
            setBlinkingRwys((p) => { const copy = { ...p }; delete copy[rwy.id]; return copy; });
          }, 10 * 60 * 1000);
          return { ...prev, [rwy.id]: timerId };
        });
      }
      prevRwyStatus.current[rwy.id] = newStatus;
    });
  }, [parsed]);

  // §4.5.4 — Yeni TAF / METAR kontrolü
  useEffect(() => {
    if (!parsed) return;
    if (parsed.rawTaf && parsed.rawTaf !== prevRawTaf.current) {
      if (prevRawTaf.current) {
        setNewTaf(parsed.issueTime ?? true);
        setTimeout(() => setNewTaf(null), 10 * 60 * 1000);
      }
      prevRawTaf.current = parsed.rawTaf;
    }
    if (parsed.metar?.obsTime && parsed.metar.obsTime !== prevMetarObsTime.current) {
      if (prevMetarObsTime.current) {
        setNewMetar(parsed.metar.obsTime);
        setTimeout(() => setNewMetar(null), 10 * 60 * 1000);
      }
      prevMetarObsTime.current = parsed.metar?.obsTime;
    }
  }, [parsed]);

  // §4.6.1 — handleFirstSlot
  const handleFirstSlot = useCallback((ts, fcst) => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setSelectedTs(ts);
      setSelectedFcst(fcst);
      setIsMetar(false);
    }
  }, []);

  // §4.6.2 — handleSlotSelect
  const handleSlotSelect = useCallback((fcst, ts) => {
    if (ts === "metar") {
      setSelectedFcst(fcst);
      setSelectedTs("metar");
      setIsMetar(true);
    } else {
      setSelectedFcst(fcst);
      setSelectedTs(ts);
      setIsMetar(false);
    }
  }, []);

  // §4.6.3 — clearBlink
  function clearBlink(rwyId) {
    setBlinkingRwys((prev) => {
      if (prev[rwyId]) clearTimeout(prev[rwyId]);
      const copy = { ...prev }; delete copy[rwyId]; return copy;
    });
  }

  const displayedRwy     = selectedRwy || activeRwy;
  const displayed        = selectedFcst || parsed;
  const displayedRwyData = apt?.runways.find((r) => r.id === displayedRwy);
  const rwyHeading       = displayedRwyData?.heading ?? 0;
  const { xw, tw }       = parsed ? calcWindComponents(rwyHeading, displayed?.wdir, displayed?.wspd) : { xw: 0, tw: 0 };
  const bestApp          = parsed ? getBestApproach(icao, displayedRwy, prefs) : null;
  const isVrb            = displayed?.wdir === "VRB";

  // §4.7 — Group label calculation
  function getGroupLabel() {
    if (isMetar) return null;
    if (!selectedTs) return "—";
    if (!parsed?.fcsts) return `${new Date(selectedTs * 1000).getUTCHours().toString().padStart(2, "0")}Z`;
    const nowTs = Math.floor(Date.now() / 1000);
    const selectedSlotTs = typeof selectedTs === "number" ? selectedTs : nowTs;
    const selectedFcstPeriod = parsed.fcsts.find(
      (f) => selectedSlotTs >= f.timeFrom && selectedSlotTs < f.timeTo
    ) || parsed.fcsts[parsed.fcsts.length - 1];
    const slotsInGroup = [];
    for (let i = 0; i < 24; i++) {
      const slotTs = nowTs + i * 3600;
      const fcst = parsed.fcsts.find((f) => slotTs >= f.timeFrom && slotTs < f.timeTo)
        || parsed.fcsts[parsed.fcsts.length - 1];
      if (fcst.timeFrom === selectedFcstPeriod.timeFrom) {
        const nowDay  = Math.floor(nowTs / 86400);
        const slotDay = Math.floor(slotTs / 86400);
        const hour    = new Date(slotTs * 1000).getUTCHours().toString().padStart(2, "0");
        slotsInGroup.push(slotDay > nowDay ? `+${hour}Z` : `${hour}Z`);
      }
    }
    if (slotsInGroup.length === 0) return "—";
    if (slotsInGroup.length === 1) return slotsInGroup[0];
    return `${slotsInGroup[0]} - ${slotsInGroup[slotsInGroup.length - 1]}`;
  }

  const selectedLabel = getGroupLabel();

  // §4.8 — Render
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute", top: 0, left: 0,
        width: "30vw", minWidth: "480px", maxWidth: "480px",
        height: "100vh",
        background: theme.bgSurface, color: theme.textPrimary,
        fontFamily: "'Courier New', monospace",
        zIndex: 1000,
        overflowY: !parsed ? "hidden" : "auto",
        borderLeft: `1px solid ${theme.border}`,
        padding: "12px", boxSizing: "border-box",
      }}
    >

      {/* §4.8.2 — Loading overlay */}
      {!parsed && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          background: `${theme.bgSurface}60`, zIndex: 20,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px",
        }}>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: theme.green }}>{icao}</div>
          <div style={{ fontSize: "11px", color: theme.textDim, letterSpacing: "2px" }}>LOADING...</div>
        </div>
      )}

      {/* §4.8.3 — Skeleton */}
      {apt && !parsed && (
        <div>
          <div style={{ marginBottom: "16px", borderBottom: `1px solid ${theme.border}`, paddingBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "20px", fontWeight: "bold", color: theme.green }}>{icao}</span>
              <span style={{ fontSize: "20px", fontWeight: "bold", color: theme.green }}> / {apt.iata}</span>
              <span style={{ fontSize: "12px", color: theme.textDim, marginLeft: "12px" }}>{apt.name}</span>
            </div>
            <button onClick={onClose} style={{ background: "none", border: `1px solid ${theme.border}`, color: theme.textDim, cursor: "pointer", fontSize: "14px", borderRadius: "3px", padding: "2px 8px" }}>✕</button>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "11px", color: theme.textDim, marginBottom: "6px" }}>SELECTED RUNWAY</div>
            <div style={{ background: theme.bgActive, border: `1px solid ${theme.border}`, borderRadius: "4px", padding: "10px", height: "54px" }} />
          </div>
          <div style={{ height: "80px", background: theme.bgActive, borderRadius: "4px", marginBottom: "16px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px", marginBottom: "16px" }}>
            {[0,1,2,3].map((i) => <div key={i} style={{ height: "54px", background: theme.bgActive, borderRadius: "3px" }} />)}
          </div>
          <div style={{ height: "200px", background: theme.bgActive, borderRadius: "4px" }} />
        </div>
      )}

      {/* §4.8.4 — Full content */}
      {apt && parsed && (
        <>
          {/* §4.8.4.1 — Header */}
          <div style={{ marginBottom: "16px", borderBottom: `1px solid ${theme.border}`, paddingBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "10px", height: "10px", borderRadius: "50%",
                background: STATUS_COLOR[getWorstStatus(displayedRwy)], flexShrink: 0,
                animation: apt?.runways.some((r) => blinkingRwys[r.id]) ? "opsradar-blink 1s ease-in-out infinite" : "none",
                boxShadow: newTaf && newMetar ? `0 0 0 2px ${theme.taf}, 0 0 0 4px ${theme.metar}` : newTaf ? `0 0 0 2px ${theme.taf}` : newMetar ? `0 0 0 2px ${theme.metar}` : "none",
              }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px", fontWeight: "bold", color: theme.green }}>{icao}</span>
                  <span style={{ fontSize: "20px", fontWeight: "bold", color: theme.green }}> / {apt.iata}</span>
                  <span style={{ fontSize: "12px", color: theme.textDim, marginLeft: "4px" }}>{apt.name}</span>
                </div>
                {(newTaf || newMetar) && (
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {newTaf && (
                      <span onClick={() => setNewTaf(null)} style={{ fontSize: "10px", fontWeight: "bold", color: theme.taf, cursor: "pointer", letterSpacing: "1px" }}>
                        NEW TAF {parsed?.issueTime ? (() => { const d = new Date(parsed.issueTime); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })() : ""}
                      </span>
                    )}
                    {newMetar && (
                      <span onClick={() => setNewMetar(null)} style={{ fontSize: "10px", fontWeight: "bold", color: theme.metar, cursor: "pointer", letterSpacing: "1px" }}>
                        NEW METAR {(() => { const d = new Date(newMetar * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: `1px solid ${theme.border}`, color: theme.textDim, cursor: "pointer", fontSize: "14px", borderRadius: "3px", padding: "2px 8px" }}>✕</button>
          </div>

          {/* §4.8.4.2 — Selected runway box */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "11px", color: theme.textDim, marginBottom: "6px" }}>SELECTED RUNWAY</div>
            <div style={{
              background: theme.bgActive,
              border: `1px solid ${STATUS_COLOR[getWorstStatus(displayedRwy)]}`,
              borderRadius: "4px", padding: "10px",
              fontSize: "22px", fontWeight: "bold",
              color: STATUS_COLOR[getWorstStatus(displayedRwy)],
              display: "flex", alignItems: "center",
            }}>
              {displayedRwy}
              <MinimaTooltip aptId={icao} rwyId={displayedRwy} rvr={displayed.rvr} dh={displayed.dh} theme={theme} />
            </div>
          </div>

          {/* §4.8.4.3 — Timeline */}
          <Timeline
            icao={icao}
            rwyId={displayedRwy}
            fcsts={parsed.fcsts}
            metar={parsed.metar}
            onSlotSelect={handleSlotSelect}
            onFirstSlot={handleFirstSlot}
            selectedTs={selectedTs}
            theme={theme}
          />

          {/* §4.8.4.4 — Weather cards */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: theme.textDim, marginBottom: "6px" }}>
              SELECTED :
              {isMetar ? (
                <>
                  <span style={{ color: theme.metar, marginLeft: "8px" }}>METAR </span>
                  <span style={{ color: theme.metar, marginLeft: "4px" }}>
                    {parsed?.metar?.obsTime ? (() => { const d = new Date(parsed.metar.obsTime * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })() : ""}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: theme.taf, marginLeft: "8px" }}>TAF </span>
                  <span style={{ color: theme.taf, marginLeft: "4px" }}>{selectedLabel}</span>
                </>
              )}
              {bestApp && <span style={{ marginLeft: "8px", color: theme.green }}>{bestApp.appTyp}</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
              <WeatherCard label="RVR" value={displayed.rvr === null ? "—" : displayed.rvr >= 9999 ? "9999+" : `${displayed.rvr}m`} limit={bestApp ? `${bestApp.rvr}m` : null} warn={bestApp && displayed.rvr !== null && displayed.rvr < bestApp.rvr} amber={bestApp && displayed.rvr !== null && displayed.rvr >= bestApp.rvr && displayed.rvr < bestApp.rvr + amberBufferRvr} theme={theme} />
              <WeatherCard label="DH" value={displayed.dh >= 9999 ? "—" : `${displayed.dh}ft`} limit={bestApp ? (bestApp.dh === 0 ? "0ft" : `${bestApp.dh}ft`) : null} warn={bestApp && displayed.dh < bestApp.dh} amber={bestApp && displayed.dh >= bestApp.dh && displayed.dh < bestApp.dh + amberBufferDh} theme={theme} />
              <WeatherCard label="T.WIND" value={isVrb ? `VRB${displayed.wspd}kt` : displayed.wdir == null ? "—" : `${tw > 0 ? "+" : ""}${tw}kt`} limit={`${maxTW}kt`} warn={!isVrb && displayed.wdir != null && tw > maxTW} amber={!isVrb && displayed.wdir != null && tw > maxTW - 2 && tw <= maxTW} theme={theme} />
              <WeatherCard label="C.WIND" value={isVrb ? `VRB${displayed.wspd}kt` : displayed.wdir == null ? "—" : `${xw}kt`} limit={`${maxXW}kt`} warn={!isVrb && displayed.wdir != null && xw > maxXW} amber={!isVrb && displayed.wdir != null && xw > maxXW - 5 && xw <= maxXW} theme={theme} />
            </div>
          </div>

          {/* §4.8.4.5 — Runway list */}
          <div>
            <div style={{ fontSize: "11px", color: theme.textDim, marginBottom: "6px" }}>RUNWAYS</div>
            {sortedRunways.map((rwy) => {
              const durum       = getWorstStatus(rwy.id);
              const renk        = STATUS_COLOR[durum];
              const isDisplayed = rwy.id === displayedRwy;
              const isToOnly    = durum === "unknown";

              const apps = minima
                .filter((m) => m.aptId === icao && m.rwyId === rwy.id && m.rwyId !== "ALL" && m.acCat === acCat && m.appTyp !== "TO" && m.appTyp !== "ETOPS")
                .sort((a, b) => a.rvr !== b.rvr ? a.rvr - b.rvr : a.dh - b.dh);

              function getAppColor(app) {
                if (displayed.rvr < app.rvr || displayed.dh < app.dh) return theme.red;
                if (displayed.rvr < app.rvr + amberBufferRvr || displayed.dh < app.dh + amberBufferDh) return theme.amber;
                return theme.green;
              }

              return (
                <RunwayRow
                  key={rwy.id}
                  rwy={rwy}
                  durum={durum}
                  renk={renk}
                  isDisplayed={isDisplayed}
                  isToOnly={isToOnly}
                  apps={apps}
                  getAppColor={getAppColor}
                  theme={theme}
                  isBlinking={!!blinkingRwys[rwy.id]}
                  onClick={() => { clearBlink(rwy.id); if (!isToOnly) setSelectedRwy(rwy.id); }}
                />
              );
            })}
          </div>

          {/* §4.8.4.6 — Raw TAF / METAR panel */}
          <div style={{ marginTop: "16px", borderTop: `1px solid ${theme.border}`, paddingTop: "10px" }}>
            <div onClick={() => setRawOpen(!rawOpen)} style={{ fontSize: "11px", color: theme.textDim, cursor: "pointer", userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span>RAW TAF / METAR</span>
                {parsed?.issueTime && (
                  <span style={{ color: theme.taf, fontSize: "10px", letterSpacing: "1px" }}>
                    Last TAF {(() => { const d = new Date(parsed.issueTime); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}
                  </span>
                )}
                {parsed?.metar?.obsTime && (
                  <span style={{ color: theme.metar, fontSize: "10px", letterSpacing: "1px" }}>
                    Last METAR {(() => { const d = new Date(parsed.metar.obsTime * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}
                  </span>
                )}
              </div>
              <span>{rawOpen ? "▲" : "▼"}</span>
            </div>
            {rawOpen && (
              <div style={{ marginTop: "8px", background: theme.bgPage, border: `1px solid ${theme.border}`, borderRadius: "3px", padding: "8px", fontSize: "10px", color: theme.textPrimary, lineHeight: "1.8", wordBreak: "break-all" }}>
                {parsed?.metar?.rawMetar && (
                  <div style={{ marginBottom: "8px" }}>
                    <span style={{ color: theme.metar }}>METAR </span>
                    {parsed.metar.rawMetar}
                  </div>
                )}
                {parsed?.rawTaf && (
                  <div>
                    <span style={{ color: theme.taf }}>TAF </span>
                    {parsed.rawTaf}
                  </div>
                )}
                {!parsed?.metar?.rawMetar && !parsed?.rawTaf && (
                  <div style={{ color: theme.textDim }}>No data</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Sidebar;