// ============================================================
// ListView.js
// §1    Imports and constants
// §2    Helper functions
// §3    WeatherCard component
// §4    MinimaPanel component
// §5    RunwayDetail component
// §6    RunwayTimelinePopup — hover timeline (DOT + RWY)
// §7    AirportRow component
// §8    ListView root component
// ============================================================

// §1 — Imports and constants
import { useState, useEffect, useRef, useMemo } from "react";
import { fetchTaf, parseTaf, fetchMetar, parseMetar } from "../services/tafService";
import { getRunwayStatus, getBestApproach, WIND_LIMITS } from "../services/runwayStatus";
import runwaysData from "../data/runways";
import minima from "../data/minima";

const SLOT_W = 46;
const SLOT_H = 46;
const DOTS_W = 0;
const DOT_CARD_W = 90;

// §2 — Helper functions

function getHourLabel(ts) {
  const nowTs = Math.floor(Date.now() / 1000);
  const nowDay = Math.floor(nowTs / 86400);
  const slotDay = Math.floor(ts / 86400);
  const hour = new Date(ts * 1000).getUTCHours().toString().padStart(2, "0");
  return slotDay > nowDay ? `+${hour}Z` : `${hour}Z`;
}

function getObsLabel(obsTime) {
  const d = new Date(obsTime * 1000);
  return d.getUTCHours().toString().padStart(2, "0") + d.getUTCMinutes().toString().padStart(2, "0");
}

function calcWindComponents(heading, wdir, wspd) {
  if (!wdir || wdir === "VRB") return { xw: 0, tw: 0 };
  const angle = ((wdir - heading + 360) % 360) * (Math.PI / 180);
  return {
    xw: Math.round(Math.abs(Math.sin(angle) * wspd) * 10) / 10,
    tw: Math.round(Math.cos(angle) * wspd * 10) / 10,
  };
}

function getDotsCount(slotCount) {
  const hidden = slotCount - 2;
  if (hidden <= 0) return 0;
  if (hidden === 1) return 1;
  if (hidden === 2) return 2;
  return 3;
}

function getVisibleItems(slots) {
  if (slots.length === 1) return [slots[0]];
  if (slots.length === 2) return [slots[0], slots[1]];
  return [slots[0], { dots: getDotsCount(slots.length) }, slots[slots.length - 1]];
}

function getRwyStatus(icao, rwyId, parsed, prefs) {
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

for (let i = 0; i < tafCheckHours; i++) {    const slotTs = nowTs + i * 3600;
    const fcst = parsed.fcsts.find((f) => slotTs >= f.timeFrom && slotTs < f.timeTo)
      || parsed.fcsts[parsed.fcsts.length - 1];
    slots.push(getRunwayStatus(icao, rwyId, fcst.rvr, fcst.dh, fcst.wdir, fcst.wspd, prefs));
  }
  if (slots.includes("red"))   return "red";
  if (slots.includes("amber")) return "amber";
  if (slots.every((s) => s === "unknown")) return "unknown";
  return "green";
}

function getOverallStatus(icao, apt, parsed, prefs) {
  if (!parsed?.fcsts) return "unknown";
  const statuses = apt.runways.map((rwy) => getRwyStatus(icao, rwy.id, parsed, prefs));
  if (statuses.includes("green"))  return "green";
  if (statuses.includes("amber"))  return "amber";
  if (statuses.every((s) => s === "unknown")) return "unknown";
  return "red";
}

function build8hGroups(icao, rwyId, parsed, theme, extendLastGroup = true, prefs) {
  if (!parsed?.fcsts) return { metarSlot: null, groups: [] };
  const nowTs = Math.floor(Date.now() / 1000);

  const metarSlot = parsed.metar ? {
    durum: getRunwayStatus(icao, rwyId, parsed.metar.rvr, parsed.metar.dh, parsed.metar.wdir, parsed.metar.wspd, prefs),
    obsTime: parsed.metar.obsTime,
  } : null;

  const tafSlots = [];
  for (let i = 0; i < 8; i++) {
    const slotTs = nowTs + i * 3600;
    const fcst = parsed.fcsts.find((f) => slotTs >= f.timeFrom && slotTs < f.timeTo)
      || parsed.fcsts[parsed.fcsts.length - 1];
    tafSlots.push({ ts: slotTs, label: getHourLabel(slotTs), durum: getRunwayStatus(icao, rwyId, fcst.rvr, fcst.dh, fcst.wdir, fcst.wspd, prefs), fcst });
  }

  if (extendLastGroup && tafSlots.length > 0) {
    const lastFcst = tafSlots[tafSlots.length - 1].fcst;
    let extraTs = nowTs + 8 * 3600;
    while (true) {
      const fcst = parsed.fcsts.find((f) => extraTs >= f.timeFrom && extraTs < f.timeTo);
      if (!fcst || fcst.timeFrom !== lastFcst.timeFrom) break;
      tafSlots.push({ ts: extraTs, label: getHourLabel(extraTs), durum: getRunwayStatus(icao, rwyId, fcst.rvr, fcst.dh, fcst.wdir, fcst.wspd, prefs), fcst });
      extraTs += 3600;
    }
  }

  const groups = [];
  let i = 0;
  while (i < tafSlots.length) {
    const tf = tafSlots[i].fcst.timeFrom;
    const grp = [];
    while (i < tafSlots.length && tafSlots[i].fcst.timeFrom === tf) { grp.push(tafSlots[i]); i++; }
    groups.push({ durum: grp[0].durum, slots: grp });
  }

  return { metarSlot, groups };
}

// §3 — WeatherCard
function WeatherCard({ label, value, limit, warn, amber, theme }) {
  const borderColor = warn ? theme.red : amber ? theme.amber : theme.border;
  const valueColor  = warn ? theme.red : amber ? theme.amber : theme.textPrimary;
  return (
    <div style={{
      background: theme.bgPage, border: `1px solid ${borderColor}`,
      borderRadius: "3px", padding: "5px 8px",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      height: "54px", boxSizing: "border-box", width: "110px", flexShrink: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", color: theme.textDim, letterSpacing: "1px" }}>{label}</span>
        {limit != null && <span style={{ fontSize: "11px", color: theme.textDim }}>{limit}</span>}
      </div>
      <div style={{ fontSize: "18px", color: valueColor, textAlign: "center", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// §4 — MinimaPanel
function MinimaPanel({ aptId, rwyId, rvr, dh, theme, prefs }) {
  const acCat = prefs?.acCat ?? "C";
  const apps = minima
    .filter((m) => m.aptId === aptId && m.rwyId === rwyId && m.rwyId !== "ALL" && m.acCat === acCat && m.appTyp !== "TO" && m.appTyp !== "ETOPS")
    .sort((a, b) => a.rvr !== b.rvr ? a.rvr - b.rvr : a.dh - b.dh);

  function getColor(app) {
    if (rvr < app.rvr || dh < app.dh) return theme.red;
    if (rvr < app.rvr + 500 || dh < app.dh + 200) return theme.amber;
    return theme.green;
  }

  if (apps.length === 0) return <div style={{ fontSize: "9px", color: theme.textDim, padding: "4px" }}>No minima data</div>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "56px 52px 50px", gap: "2px", marginBottom: "3px" }}>
        {["TYPE","RVR","DH"].map((h) => <span key={h} style={{ fontSize: "8px", color: theme.textDim }}>{h}</span>)}
      </div>
      {apps.map((app, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "56px 52px 50px", gap: "2px", borderTop: `1px solid ${theme.border}`, padding: "2px 0" }}>
          <span style={{ fontSize: "9px", fontWeight: "bold", color: getColor(app) }}>{app.appTyp}</span>
          <span style={{ fontSize: "9px", color: getColor(app) }}>{app.rvr}m</span>
          <span style={{ fontSize: "9px", color: getColor(app) }}>{app.dh === 0 ? "—" : app.dh + "ft"}</span>
        </div>
      ))}
    </div>
  );
}

// §5 — RunwayDetail
function RunwayDetail({ icao, rwyId, parsed, theme, prefs }) {
  const [selectedTs, setSelectedTs] = useState(null);
  const [selectedFcst, setSelectedFcst] = useState(null);
  const [showMinima, setShowMinima] = useState(false);
  const tlRef = useRef(null);

  const apt = runwaysData[icao];
  const rwyData = apt?.runways.find((r) => r.id === rwyId);
  const heading = rwyData?.heading ?? 0;
  const bestApp = getBestApproach(icao, rwyId, prefs);

  const statusColor = { green: theme.green, amber: theme.amber, red: theme.red, unknown: theme.unknown };
  const groupBg     = { green: theme.groupBgGreen, amber: theme.groupBgAmber, red: theme.groupBgRed, unknown: theme.groupBgUnknown };
  const groupBorder = { green: theme.groupBorderGreen, amber: theme.groupBorderAmber, red: theme.groupBorderRed, unknown: theme.groupBorderUnknown };

  const tWindLimit = prefs?.tWindLimit ?? WIND_LIMITS.maxTW;
  const cWindLimit = prefs?.cWindLimit ?? WIND_LIMITS.maxXW;

  useEffect(() => {
    if (parsed?.fcsts) {
      const nowTs = Math.floor(Date.now() / 1000);
      const fcst = parsed.fcsts.find((f) => nowTs >= f.timeFrom && nowTs < f.timeTo) || parsed.fcsts[0];
      setSelectedTs(Math.floor(nowTs / 3600) * 3600);
      setSelectedFcst(fcst);
    }
  }, [rwyId]);

  if (!parsed?.fcsts) return null;

  const nowTs = Math.floor(Date.now() / 1000);
  const slots = [];
  for (let i = 0; i < 24; i++) {
    const slotTs = nowTs + i * 3600;
    const fcst = parsed.fcsts.find((f) => slotTs >= f.timeFrom && slotTs < f.timeTo) || parsed.fcsts[parsed.fcsts.length - 1];
    slots.push({ ts: slotTs, label: getHourLabel(slotTs), durum: getRunwayStatus(icao, rwyId, fcst.rvr, fcst.dh, fcst.wdir, fcst.wspd, prefs), fcst });
  }

  const groups = [];
  let i = 0;
  while (i < slots.length) {
    const tf = slots[i].fcst.timeFrom;
    const grp = [];
    while (i < slots.length && slots[i].fcst.timeFrom === tf) { grp.push(slots[i]); i++; }
    groups.push({ durum: grp[0].durum, slots: grp });
  }

  const metarDurum = parsed.metar
    ? getRunwayStatus(icao, rwyId, parsed.metar.rvr, parsed.metar.dh, parsed.metar.wdir, parsed.metar.wspd, prefs)
    : "unknown";

  const displayed = selectedFcst || parsed;
  const { xw, tw } = calcWindComponents(heading, displayed.wdir, displayed.wspd);
  const isVrb = displayed.wdir === "VRB";

  return (
    <div style={{ marginTop: "8px", background: theme.bgPage, border: `1px solid ${theme.border}`, borderRadius: "4px", padding: "8px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
        <span style={{ fontSize: "13px", color: theme.textDim, cursor: "pointer", padding: "0 2px", flexShrink: 0 }} onClick={() => { if (tlRef.current) tlRef.current.scrollLeft -= 120; }}>◀</span>
        <div ref={tlRef} style={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "visible", scrollbarWidth: "none", paddingTop: "3px", paddingBottom: "3px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "3px", width: "max-content" }}>

            {parsed.metar && (
              <div style={{ display: "flex", alignItems: "center", gap: "1px", marginRight: "3px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: `${SLOT_H}px`, width: "12px", flexShrink: 0, gap: "1px", marginRight: "1px" }}>
                  {"METAR".split("").map((c, idx) => <span key={idx} style={{ fontSize: "8px", color: theme.metar, fontWeight: "bold", lineHeight: 1, fontFamily: "Arial, sans-serif" }}>{c}</span>)}
                </div>
                <div onClick={() => { setSelectedFcst(parsed.metar); setSelectedTs("metar"); }} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  width: `${SLOT_W}px`, height: `${SLOT_H}px`, boxSizing: "border-box",
                  background: groupBg[metarDurum], borderRadius: "3px",
                  border: `1px solid ${groupBorder[metarDurum]}`,
                  boxShadow: selectedTs === "metar" ? `0 0 0 2px ${statusColor[metarDurum]}` : "none",
                  cursor: "pointer", flexShrink: 0, paddingTop: "4px",
                }}>
                  <span style={{ fontSize: "9px", color: theme.metar, fontWeight: "bold", lineHeight: 1, fontFamily: "'Courier New', monospace" }}>
                    {parsed.metar.obsTime ? getObsLabel(parsed.metar.obsTime) : "—"}
                  </span>
                  <div style={{ flex: 1 }} />
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusColor[metarDurum], outline: selectedTs === "metar" ? `2px solid ${statusColor[metarDurum]}` : "none", outlineOffset: "2px", flexShrink: 0, marginBottom: "10px" }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: `${SLOT_H}px`, width: "12px", flexShrink: 0, gap: "1px", marginRight: "1px" }}>
                {"TAF".split("").map((c, idx) => <span key={idx} style={{ fontSize: "8px", color: theme.taf, fontWeight: "bold", lineHeight: 1, fontFamily: "Arial, sans-serif" }}>{c}</span>)}
              </div>
              {groups.map((grp, gi) => {
                const color = statusColor[grp.durum];
                const visible = getVisibleItems(grp.slots);
                const isGroupSelected = grp.slots.some((s) => selectedTs !== "metar" && selectedTs !== null && Math.floor(selectedTs / 3600) === Math.floor(s.ts / 3600));
                return (
                  <div key={gi} style={{ display: "flex", alignItems: "stretch", background: groupBg[grp.durum], border: `1px solid ${groupBorder[grp.durum]}`, boxShadow: isGroupSelected ? `0 0 0 2px ${color}` : "none", borderRadius: "3px", flexShrink: 0 }}>
                    {visible.map((item) => {
                      if (item.dots !== undefined) {
                        return (
                          <div key="dots" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: `${DOTS_W}px`, height: `${SLOT_H}px` }}>
                            <div style={{ flex: 1 }} />
                            <div style={{ display: "flex", gap: "2px", marginBottom: "13px" }}>
                              {Array.from({ length: item.dots }).map((_, j) => <div key={j} style={{ width: "3px", height: "3px", borderRadius: "50%", background: color, opacity: 0.6 }} />)}
                            </div>
                          </div>
                        );
                      }
                      const isSelected = selectedTs !== "metar" && selectedTs !== null && Math.floor(selectedTs / 3600) === Math.floor(item.ts / 3600);
                      return (
                        <div key={item.ts} onClick={() => { setSelectedTs(item.ts); setSelectedFcst(item.fcst); }} style={{
                          display: "flex", flexDirection: "column", alignItems: "center",
                          width: `${SLOT_W}px`, height: `${SLOT_H}px`, boxSizing: "border-box",
                          background: "transparent", borderRadius: "2px", cursor: "pointer", paddingTop: "4px",
                        }}>
                          <span style={{ fontSize: "9px", color: theme.taf, fontFamily: "'Courier New', monospace", lineHeight: 1 }}>{item.label}</span>
                          <div style={{ flex: 1 }} />
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, outline: (isSelected || isGroupSelected) ? `2px solid ${color}` : "none", outlineOffset: "2px", flexShrink: 0, marginBottom: "10px" }} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <span style={{ fontSize: "13px", color: theme.textDim, cursor: "pointer", padding: "0 2px", flexShrink: 0 }} onClick={() => { if (tlRef.current) tlRef.current.scrollLeft += 120; }}>▶</span>
      </div>

      <div style={{ display: "flex", gap: "5px" }}>
        <WeatherCard label="RVR" value={displayed.rvr === null ? "—" : displayed.rvr >= 9999 ? "9999+" : `${displayed.rvr}m`} limit={bestApp ? `${bestApp.rvr}m` : null} warn={bestApp && displayed.rvr !== null && displayed.rvr < bestApp.rvr} amber={bestApp && displayed.rvr !== null && displayed.rvr >= bestApp.rvr && displayed.rvr < bestApp.rvr + 500} theme={theme} />
        <WeatherCard label="DH" value={displayed.dh >= 9999 ? "—" : `${displayed.dh}ft`} limit={bestApp ? (bestApp.dh === 0 ? "0ft" : `${bestApp.dh}ft`) : null} warn={bestApp && displayed.dh < bestApp.dh} amber={bestApp && displayed.dh >= bestApp.dh && displayed.dh < bestApp.dh + 200} theme={theme} />
        <WeatherCard label="T.WIND" value={isVrb ? `VRB${displayed.wspd}kt` : displayed.wdir == null ? "—" : `${tw > 0 ? "+" : ""}${tw}kt`} limit={`${tWindLimit}kt`} warn={!isVrb && displayed.wdir != null && tw > tWindLimit} amber={!isVrb && displayed.wdir != null && tw > tWindLimit - 2 && tw <= tWindLimit} theme={theme} />
        <WeatherCard label="C.WIND" value={isVrb ? `VRB${displayed.wspd}kt` : displayed.wdir == null ? "—" : `${xw}kt`} limit={`${cWindLimit}kt`} warn={!isVrb && displayed.wdir != null && xw > cWindLimit} amber={!isVrb && displayed.wdir != null && xw > cWindLimit - 5 && xw <= cWindLimit} theme={theme} />
        <div style={{ position: "relative", flexShrink: 0 }} onMouseEnter={() => setShowMinima(true)} onMouseLeave={() => setShowMinima(false)}>
          <div style={{ height: "54px", width: "70px", background: theme.bgPage, border: `1px solid ${theme.border}`, borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: theme.textDim, letterSpacing: "1px" }}>MIN</span>
          </div>
          {showMinima && (
            <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 6px)", background: theme.bgSurface, border: `1px solid ${theme.border}`, borderRadius: "4px", padding: "8px", zIndex: 2000, minWidth: "170px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
              <MinimaPanel aptId={icao} rwyId={rwyId} rvr={displayed.rvr} dh={displayed.dh} theme={theme} prefs={prefs} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// §6 — RunwayTimelinePopup
function RunwayTimelinePopup({ icao, rwyId, parsed, theme, prefs }) {
  const { metarSlot, groups } = build8hGroups(icao, rwyId, parsed, theme, true, prefs);
  if (!groups.length && !metarSlot) return null;

  const statusColor = { green: theme.green, amber: theme.amber, red: theme.red, unknown: theme.unknown };
  const groupBg     = { green: theme.groupBgGreen, amber: theme.groupBgAmber, red: theme.groupBgRed, unknown: theme.groupBgUnknown };
  const groupBorder = { green: theme.groupBorderGreen, amber: theme.groupBorderAmber, red: theme.groupBorderRed, unknown: theme.groupBorderUnknown };

  return (
    <div style={{
      position: "absolute", left: "50%", transform: "translateX(-50%)",
      bottom: "calc(100% + 8px)", zIndex: 3000,
      background: theme.bgSurface, border: `1px solid ${theme.border}`,
      borderRadius: "4px", padding: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      pointerEvents: "none",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "3px", height: `${SLOT_H}px` }}>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "12px", height: "100%", gap: "1px", marginRight: "1px" }}>
          {"MET".split("").map((c, idx) => <span key={idx} style={{ fontSize: "8px", color: theme.metar, fontWeight: "bold", lineHeight: 1, fontFamily: "Arial, sans-serif" }}>{c}</span>)}
        </div>

        {metarSlot && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            width: `${SLOT_W}px`, height: "100%", boxSizing: "border-box",
            background: groupBg[metarSlot.durum], border: `1px solid ${groupBorder[metarSlot.durum]}`,
            borderRadius: "3px", paddingTop: "4px", flexShrink: 0, marginRight: "6px",
          }}>
            <span style={{ fontSize: "9px", color: theme.metar, fontWeight: "bold", lineHeight: 1, fontFamily: "'Courier New', monospace" }}>
              {metarSlot.obsTime ? getObsLabel(metarSlot.obsTime) : "M"}
            </span>
            <div style={{ flex: 1 }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: statusColor[metarSlot.durum], flexShrink: 0, marginBottom: "10px" }} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "12px", height: "100%", gap: "1px", marginRight: "1px" }}>
          {"TAF".split("").map((c, idx) => <span key={idx} style={{ fontSize: "8px", color: theme.taf, fontWeight: "bold", lineHeight: 1, fontFamily: "Arial, sans-serif" }}>{c}</span>)}
        </div>

        {groups.map((grp, gi) => {
          const color = statusColor[grp.durum];
          const visible = getVisibleItems(grp.slots);
          return (
            <div key={gi} style={{ display: "flex", alignItems: "stretch", height: "100%", boxSizing: "border-box", background: groupBg[grp.durum], border: `1px solid ${groupBorder[grp.durum]}`, borderRadius: "3px", flexShrink: 0 }}>
              {visible.map((item) => {
                if (item.dots !== undefined) {
                  return (
                    <div key="dots" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: `${DOTS_W}px`, height: "100%" }}>
                      <div style={{ flex: 1 }} />
                      <div style={{ display: "flex", gap: "2px", marginBottom: "13px" }}>
                        {Array.from({ length: item.dots }).map((_, j) => <div key={j} style={{ width: "3px", height: "3px", borderRadius: "50%", background: color, opacity: 0.6 }} />)}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={item.ts} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: `${SLOT_W}px`, height: "100%", paddingTop: "4px", boxSizing: "border-box" }}>
                    <span style={{ fontSize: "9px", color: theme.taf, fontFamily: "'Courier New', monospace", lineHeight: 1 }}>{item.label}</span>
                    <div style={{ flex: 1 }} />
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, flexShrink: 0, marginBottom: "10px" }} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "10px", borderTop: `1px solid ${theme.border}`, paddingTop: "4px", marginTop: "4px" }}>
        {parsed?.metar?.obsTime && (
          <span style={{ fontSize: "8px", color: theme.metar, fontFamily: "'Courier New', monospace", letterSpacing: "0.5px" }}>
            Last MET {(() => { const d = new Date(parsed.metar.obsTime * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}
          </span>
        )}
        {parsed?.issueTime && (
          <span style={{ fontSize: "8px", color: theme.taf, fontFamily: "'Courier New', monospace", letterSpacing: "0.5px" }}>
            Last TAF {(() => { const d = new Date(parsed.issueTime); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}
          </span>
        )}
      </div>
    </div>
  );
}

// §7 — AirportRow
function AirportRow({ icao, onAptClick, level, theme, onUpdated, prefs }) {

  // §7.1 — State
  const [parsed, setParsed] = useState(null);
  const [selectedRwy, setSelectedRwy] = useState(null);
  const [showAptHover, setShowAptHover] = useState(false);
  const [hoveredRwy, setHoveredRwy] = useState(null);
  const [blinkingRwys, setBlinkingRwys] = useState({});
  const [newTaf, setNewTaf]     = useState(null);
  const [newMetar, setNewMetar] = useState(null);
  const prevRwyStatus    = useRef({});
  const prevRawTaf       = useRef(null);
  const prevMetarObsTime = useRef(null);
  const cardRef          = useRef(null);

  const apt = runwaysData[icao];
  const statusColor = { green: theme.green, amber: theme.amber, red: theme.red, unknown: theme.unknown };

  // §7.2 — Data fetch, polling every 60s
  useEffect(() => {
    async function load() {
      const [taf, metar] = await Promise.all([fetchTaf(icao), fetchMetar(icao)]);
      const parsedTaf = parseTaf(taf);
      const parsedMetar = parseMetar(metar);
      if (parsedTaf) {
        const newParsed = { ...parsedTaf, metar: parsedMetar };
        setParsed(newParsed);
        if (onUpdated) onUpdated();

        // §7.2.2 — Yeni TAF / METAR kontrolü
        if (parsedTaf.rawTaf && parsedTaf.rawTaf !== prevRawTaf.current) {
          /// NEW TAF TEST için aşağıdaki IF i commente al ///
          if (prevRawTaf.current) {
            setNewTaf(parsedTaf.issueTime ?? true);
            setTimeout(() => setNewTaf(null), 10 * 60 * 1000);
          }
          prevRawTaf.current = parsedTaf.rawTaf;
        }

        if (parsedMetar?.obsTime && parsedMetar.obsTime !== prevMetarObsTime.current) {
          /// NEW METAR TEST için aşağıdaki IF i commente al ///
          if (prevMetarObsTime.current) {
            setNewMetar(parsedMetar.obsTime);
            setTimeout(() => setNewMetar(null), 10 * 60 * 1000);
          }
          prevMetarObsTime.current = parsedMetar.obsTime;
        }

        // §7.2.1 — Renk değişimi kontrolü
        apt?.runways.forEach((rwy) => {
          const newStatus = getRwyStatus(icao, rwy.id, newParsed, prefs);
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
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [icao]);

  // §7.3 — Reset on icao change
  useEffect(() => {
    setSelectedRwy(null);
    setNewTaf(null);
    setNewMetar(null);
    prevRawTaf.current = null;
    prevMetarObsTime.current = null;
  }, [icao]);

  if (!apt) return null;

  const overallStatus = getOverallStatus(icao, apt, parsed, prefs);

  // §7.4 — Blink helpers
  function clearBlink(rwyId) {
    setBlinkingRwys((prev) => {
      if (prev[rwyId]) clearTimeout(prev[rwyId]);
      const copy = { ...prev }; delete copy[rwyId]; return copy;
    });
  }

  function clearAllBlinks() {
    setBlinkingRwys((prev) => { Object.values(prev).forEach(clearTimeout); return {}; });
  }

  // §7.5 — DOT level render
  if (level === 1) {
    return (
      <div ref={cardRef} style={{
        position: "relative", display: "inline-flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        width: "120px", height: "36px", background: theme.bgSurface,
        border: `1px solid ${theme.border}`, borderRadius: "4px",
        cursor: "pointer", padding: "0 10px", boxSizing: "border-box",
      }}
        onMouseEnter={() => setShowAptHover(true)}
        onMouseLeave={() => setShowAptHover(false)}
        onClick={() => { clearAllBlinks(); onAptClick(icao); }}
      >
        {/* §7.5.2 — Status dot + ICAO/IATA */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", animation: apt?.runways.some((r) => blinkingRwys[r.id]) ? "opsradar-blink 1s ease-in-out infinite" : "none" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: statusColor[overallStatus], flexShrink: 0,
            boxShadow: newTaf && newMetar ? `0 0 0 2px ${theme.taf}, 0 0 0 4px ${theme.metar}` : newTaf ? `0 0 0 2px ${theme.taf}` : newMetar ? `0 0 0 2px ${theme.metar}` : "none",
          }} />
          <span style={{ fontSize: "13px", fontWeight: "bold", color: statusColor[overallStatus], fontFamily: "'Courier New', monospace", whiteSpace: "nowrap" }}>
            {icao}{apt.iata ? ` / ${apt.iata}` : ""}
          </span>
        </div>

        {/* §7.5.2.1 — TAF / MET zamanları */}
        {(newTaf || newMetar) && (
          <div style={{ position: "absolute", bottom: "2px", left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}>
            {newTaf && (
              <span onClick={(e) => { e.stopPropagation(); setNewTaf(null); }} style={{ fontSize: "7px", fontWeight: "bold", color: theme.taf, cursor: "pointer", letterSpacing: "0.5px", lineHeight: 1, whiteSpace: "nowrap" }}>
                TAF{newTaf !== true ? ` ${(() => { const d = new Date(newTaf); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}` : ""}
              </span>
            )}
            {newMetar && (
              <span onClick={(e) => { e.stopPropagation(); setNewMetar(null); }} style={{ fontSize: "7px", fontWeight: "bold", color: theme.metar, cursor: "pointer", letterSpacing: "0.5px", lineHeight: 1, whiteSpace: "nowrap" }}>
                MET {(() => { const d = new Date(newMetar * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}
              </span>
            )}
          </div>
        )}

        {/* §7.5.3 — Hover popup */}
        {showAptHover && parsed && (() => {
          const rect = cardRef.current?.getBoundingClientRect();
          const left = rect ? rect.left : 0;
          const top  = rect ? rect.bottom : 0;
          return (
            <div style={{ position: "fixed", left: `${left}px`, top: `${top}px`, zIndex: 3000, background: theme.bgSurface, border: `1px solid ${theme.border}`, borderRadius: "4px", padding: "8px 10px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", pointerEvents: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
              {apt.runways.map((rwy) => {
                const { metarSlot, groups } = build8hGroups(icao, rwy.id, parsed, theme, false, prefs);
                const tafSlots = groups.flatMap((g) => g.slots);
                const sc = { green: theme.green, amber: theme.amber, red: theme.red, unknown: theme.unknown };
                return (
                  <div key={rwy.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "10px", fontWeight: "bold", color: sc[getRwyStatus(icao, rwy.id, parsed, prefs)], fontFamily: "'Courier New', monospace", width: "28px", flexShrink: 0 }}>{rwy.id}</span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "10px", gap: "1px" }}>
                      {"MET".split("").map((c, idx) => <span key={idx} style={{ fontSize: "7px", color: theme.metar, fontWeight: "bold", lineHeight: 1 }}>{c}</span>)}
                    </div>
                    {metarSlot ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                        <span style={{ fontSize: "7px", color: theme.metar, fontFamily: "'Courier New', monospace", lineHeight: 1 }}>{metarSlot.obsTime ? getObsLabel(metarSlot.obsTime) : "M"}</span>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: sc[metarSlot.durum] }} />
                      </div>
                    ) : <div style={{ width: "7px", height: "7px", flexShrink: 0 }} />}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "10px", gap: "1px" }}>
                      {"TAF".split("").map((c, idx) => <span key={idx} style={{ fontSize: "7px", color: theme.taf, fontWeight: "bold", lineHeight: 1 }}>{c}</span>)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      {tafSlots.map((s) => (
                        <div key={s.ts} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                          <span style={{ fontSize: "7px", color: theme.taf, fontFamily: "'Courier New', monospace", lineHeight: 1 }}>{s.label}</span>
                          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: sc[s.durum] }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: "10px", borderTop: `1px solid ${theme.border}`, paddingTop: "4px", marginTop: "2px" }}>
                {parsed?.metar?.obsTime && (
                  <span style={{ fontSize: "8px", color: theme.metar, fontFamily: "'Courier New', monospace", letterSpacing: "0.5px" }}>
                    Last MET {(() => { const d = new Date(parsed.metar.obsTime * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}
                  </span>
                )}
                {parsed?.issueTime && (
                  <span style={{ fontSize: "8px", color: theme.taf, fontFamily: "'Courier New', monospace", letterSpacing: "0.5px" }}>
                    Last TAF {(() => { const d = new Date(parsed.issueTime); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // §7.6 — RWY level render
  if (level === 2) {
    return (
      <div style={{ background: theme.bgSurface, border: `1px solid ${theme.border}`, borderRadius: "4px", marginBottom: "6px", padding: "8px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: statusColor[overallStatus], flexShrink: 0,
                animation: apt?.runways.some((r) => blinkingRwys[r.id]) ? "opsradar-blink 1s ease-in-out infinite" : "none",
                boxShadow: newTaf && newMetar ? `0 0 0 2px ${theme.taf}, 0 0 0 4px ${theme.metar}` : newTaf ? `0 0 0 2px ${theme.taf}` : newMetar ? `0 0 0 2px ${theme.metar}` : "none",
              }} />
              <span style={{ fontSize: "13px", fontWeight: "bold", color: statusColor[overallStatus], cursor: "pointer", fontFamily: "'Courier New', monospace" }} onClick={() => onAptClick(icao)}>
                {icao}{apt.iata ? ` / ${apt.iata}` : ""}
              </span>
            </div>
            {(newTaf || newMetar) && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center", paddingLeft: "14px" }}>
                {newTaf && <span onClick={(e) => { e.stopPropagation(); setNewTaf(null); }} style={{ fontSize: "7px", fontWeight: "bold", color: theme.taf, cursor: "pointer", letterSpacing: "0.5px", lineHeight: 1, whiteSpace: "nowrap" }}>TAF{newTaf !== true ? ` ${(() => { const d = new Date(newTaf); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}` : ""}</span>}
                {newMetar && <span onClick={(e) => { e.stopPropagation(); setNewMetar(null); }} style={{ fontSize: "7px", fontWeight: "bold", color: theme.metar, cursor: "pointer", letterSpacing: "0.5px", lineHeight: 1, whiteSpace: "nowrap" }}>MET {(() => { const d = new Date(newMetar * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}</span>}
              </div>
            )}
          </div>

          {apt.runways.map((rwy) => {
            const status = getRwyStatus(icao, rwy.id, parsed, prefs);
            const isBlinking = !!blinkingRwys[rwy.id];
            return (
              <div key={rwy.id} style={{ position: "relative" }} onMouseEnter={() => setHoveredRwy(rwy.id)} onMouseLeave={() => setHoveredRwy(null)}>
                <div onClick={() => clearBlink(rwy.id)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", border: `1px solid ${isBlinking ? statusColor[status] : theme.border}`, background: theme.bgPage, cursor: isBlinking ? "pointer" : "default" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor[status], animation: isBlinking ? "opsradar-blink 1s ease-in-out infinite" : "none" }} />
                  <span style={{ fontSize: "11px", color: theme.textPrimary, fontFamily: "'Courier New', monospace" }}>{rwy.id}</span>
                </div>
                {hoveredRwy === rwy.id && parsed && <RunwayTimelinePopup icao={icao} rwyId={rwy.id} parsed={parsed} theme={theme} prefs={prefs} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // §7.7 — FULL level render
  return (
    <div style={{ background: theme.bgSurface, border: `1px solid ${theme.border}`, borderRadius: "4px", marginBottom: "6px", padding: "10px 12px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "9px", height: "9px", borderRadius: "50%",
            background: statusColor[overallStatus], flexShrink: 0,
            animation: apt?.runways.some((r) => blinkingRwys[r.id]) ? "opsradar-blink 1s ease-in-out infinite" : "none",
            boxShadow: newTaf && newMetar ? `0 0 0 2px ${theme.taf}, 0 0 0 4px ${theme.metar}` : newTaf ? `0 0 0 2px ${theme.taf}` : newMetar ? `0 0 0 2px ${theme.metar}` : "none",
          }} />
          <span style={{ fontSize: "14px", fontWeight: "bold", color: statusColor[overallStatus], cursor: "pointer" }} onClick={() => onAptClick(icao)}>
            {icao}{apt.iata ? ` / ${apt.iata}` : ""}
          </span>
          <span style={{ fontSize: "11px", color: theme.textDim }}>{apt.name}</span>
          {parsed?.metar?.obsTime && <span style={{ fontSize: "9px", color: theme.metar, fontFamily: "'Courier New', monospace", letterSpacing: "0.5px" }}>Last MET {(() => { const d = new Date(parsed.metar.obsTime * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}</span>}
          {parsed?.issueTime && <span style={{ fontSize: "9px", color: theme.taf, fontFamily: "'Courier New', monospace", letterSpacing: "0.5px" }}>Last TAF {(() => { const d = new Date(parsed.issueTime); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}</span>}
          {!parsed && <span style={{ fontSize: "9px", color: theme.textDim, marginLeft: "auto" }}>Loading...</span>}
        </div>
        {(newTaf || newMetar) && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", paddingLeft: "17px" }}>
            {newTaf && <span onClick={(e) => { e.stopPropagation(); setNewTaf(null); }} style={{ fontSize: "7px", fontWeight: "bold", color: theme.taf, cursor: "pointer", letterSpacing: "0.5px", lineHeight: 1, whiteSpace: "nowrap" }}>TAF{newTaf !== true ? ` ${(() => { const d = new Date(newTaf); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}` : ""}</span>}
            {newMetar && <span onClick={(e) => { e.stopPropagation(); setNewMetar(null); }} style={{ fontSize: "7px", fontWeight: "bold", color: theme.metar, cursor: "pointer", letterSpacing: "0.5px", lineHeight: 1, whiteSpace: "nowrap" }}>MET {(() => { const d = new Date(newMetar * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}</span>}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {apt.runways.map((rwy) => {
          const status = getRwyStatus(icao, rwy.id, parsed, prefs);
          const isSelected = selectedRwy === rwy.id;
          const isBlinking = !!blinkingRwys[rwy.id];
          const pillBg = isSelected ? (status === "green" ? theme.groupBgGreen : status === "amber" ? theme.groupBgAmber : status === "red" ? theme.groupBgRed : theme.groupBgUnknown) : theme.bgPage;
          return (
            <div key={rwy.id} onClick={() => { clearBlink(rwy.id); setSelectedRwy(isSelected ? null : rwy.id); }} style={{ flex: "0 0 auto", minWidth: "60px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "4px 12px", borderRadius: "20px", border: `1px solid ${isSelected || isBlinking ? statusColor[status] : theme.border}`, background: pillBg, cursor: "pointer" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: statusColor[status], animation: isBlinking ? "opsradar-blink 1s ease-in-out infinite" : "none" }} />
              <span style={{ fontSize: "11px", fontWeight: isSelected ? "bold" : "normal", color: isSelected ? statusColor[status] : theme.textPrimary }}>{rwy.id}</span>
            </div>
          );
        })}
      </div>

      {selectedRwy && parsed && <RunwayDetail icao={icao} rwyId={selectedRwy} parsed={parsed} theme={theme} prefs={prefs} />}
    </div>
  );
}






// §8 — ListView root
function ListView({ onAptClick, theme, initialIcaos = [], initialLevel = 1, popout = false, prefs, onPrefsOpen }) {

  // §8.1 — State
  const [input, setInput] = useState(initialIcaos.join(", "));
  const [searches, setSearches] = useState(
    initialIcaos.length > 0 ? [{
      id: Date.now(),
      icaos: initialIcaos,
      searchPrefs: { level: initialLevel, acCat: prefs?.acCat ?? "C", tafHours: prefs?.tafHours ?? 6, tafHoursManual: prefs?.tafHoursManual ?? 6, tWindLimit: prefs?.tWindLimit ?? 10, cWindLimit: prefs?.cWindLimit ?? 25, amberBuffer: prefs?.amberBuffer ?? "medium" },
      input: initialIcaos.join(", "),
      listName: "",
    }] : []
  );
  const [popoutWidth, setPopoutWidth] = useState(window.innerWidth);

useEffect(() => {
  const handleResize = () => setPopoutWidth(window.innerWidth);
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [savedLists, setSavedLists] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aptLists") || "[]"); }
    catch { return []; }
  });

  const iataToIcao = useMemo(() => {
    const map = {};
    Object.entries(runwaysData).forEach(([icao, apt]) => {
      if (apt.iata) map[apt.iata.toUpperCase()] = icao;
    });
    return map;
  }, []);

  // §8.2 — Handlers
function handleAdd() {
  const items = input.toUpperCase().split(/[,;:\-\.&\s]+/).map((s) => s.trim()).filter(Boolean);
  const resolved = [];
  items.forEach((item) => {
    if (item.includes("%")) {
      const pattern = new RegExp("^" + item.replace(/%/g, ".*") + "$");
      Object.keys(runwaysData).filter((icao) => pattern.test(icao)).forEach((m) => resolved.push(m));
    } else {
      resolved.push(iataToIcao[item] || item);
    }
  });
  if (resolved.length === 0) return;
  if (resolved.length > 50) {
    alert(`${resolved.length} airports found. Showing first 50.`);
    resolved.splice(50);
  }
  setSearches((prev) => [...prev, {
    id: Date.now(),
    icaos: resolved,
    searchPrefs: {
      level: 1, acCat: prefs?.acCat ?? "C",
      tafHours: prefs?.tafHours ?? 6, tafHoursManual: prefs?.tafHoursManual ?? 6,
      tWindLimit: prefs?.tWindLimit ?? 10, cWindLimit: prefs?.cWindLimit ?? 25,
      amberBuffer: prefs?.amberBuffer ?? "medium",
    },
    input: input.trim(), listName: "",
  }]);
}

  function handleRemoveSearch(id) {
    setSearches((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSearchLevel(id, level) {
    setSearches((prev) => prev.map((s) => s.id === id ? { ...s, searchPrefs: { ...s.searchPrefs, level } } : s));
  }

  function updateSearchListName(id, name) {
    setSearches((prev) => prev.map((s) => s.id === id ? { ...s, listName: name } : s));
  }

  function handleSaveSearch(search) {
    if (!search.listName?.trim() || search.icaos.length === 0) return;
    const newList = { id: Date.now(), name: search.listName.trim(), icaos: search.icaos };
    const updated = [...savedLists, newList];
    setSavedLists(updated);
    localStorage.setItem("aptLists", JSON.stringify(updated));
  }

  function handlePopOutSearch(search) {
    const sp = search.searchPrefs;
    const popLevel = sp.level === 3 ? 2 : sp.level;
    const params = new URLSearchParams({ icaos: search.icaos.join(","), level: popLevel });
    window.open(`/popout?${params.toString()}`, "_blank", "width=520,height=700,resizable=yes");
  }

  function handleLoad(list) {
    setInput(list.icaos.join(", "));
    setSearches((prev) => [...prev, {
      id: Date.now(),
      icaos: list.icaos,
      searchPrefs: {
        level:          1,
        acCat:          prefs?.acCat          ?? "C",
        tafHours:       prefs?.tafHours       ?? 6,
        tafHoursManual: prefs?.tafHoursManual ?? 6,
        tWindLimit:     prefs?.tWindLimit     ?? 10,
        cWindLimit:     prefs?.cWindLimit     ?? 25,
        amberBuffer:    prefs?.amberBuffer    ?? "medium",
      },
      input: list.name,
      listName: "",
    }]);
  }

  function handleDelete(id) {
    const updated = savedLists.filter((l) => l.id !== id);
    setSavedLists(updated);
    localStorage.setItem("aptLists", JSON.stringify(updated));
  }

  // §8.3 — Search badges
  function SearchBadges({ sp }) {
    return (
      <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "9px", color: theme.textDim, background: theme.bgPage, padding: "2px 5px", borderRadius: "3px" }}>CAT-{sp.acCat}</span>
        <span style={{ fontSize: "9px", color: theme.textDim, background: theme.bgPage, padding: "2px 5px", borderRadius: "3px" }}>+{sp.tafHours === "manual" ? sp.tafHoursManual : sp.tafHours}H</span>
        <span style={{ fontSize: "9px", color: theme.amber, background: theme.bgPage, padding: "2px 5px", borderRadius: "3px" }}>{sp.amberBuffer.toUpperCase()}</span>
        <span style={{ fontSize: "9px", color: theme.textDim, background: theme.bgPage, padding: "2px 5px", borderRadius: "3px" }}>{sp.tWindLimit}kt/{sp.cWindLimit}kt</span>
      </div>
    );
  }

  // §8.4 — Render
  return (
    <div style={{
      position: "absolute", top: 0, left: 0,
      width: "100%", height: "100vh",
      background: theme.bgPage, color: theme.textPrimary,
      fontFamily: "'Courier New', monospace",
      display: "flex", flexDirection: "column",
      padding: popout ? "10px 16px 16px" : "60px 16px 16px", 
      boxSizing: "border-box",
      overflowY: "auto", zIndex: 500,
    }}>

      <style>{`
        @keyframes opsradar-blink { 0%{opacity:1} 50%{opacity:0.25} 100%{opacity:1} }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* §8.4.1 — Search bar */}
{!popout && <div style={{ display: "flex", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="LTFM, SAW, LT%..."
          style={{ flex: 1, background: theme.bgSurface, border: `1px solid ${theme.border}`, borderRadius: "4px", color: theme.textPrimary, fontFamily: "monospace", fontSize: "12px", padding: "8px 10px" }}
        />
        <button onClick={handleAdd} style={{ background: theme.bgActive, border: `1px solid ${theme.green}`, borderRadius: "4px", color: theme.green, fontFamily: "monospace", fontSize: "12px", padding: "8px 16px", cursor: "pointer" }}>SHOW</button>
        {onPrefsOpen && (
          <button onClick={onPrefsOpen} style={{ background: theme.bgSurface, border: `1px solid ${theme.border}`, borderRadius: "4px", color: theme.textDim, fontFamily: "'Courier New', monospace", fontSize: "13px", padding: "8px 12px", cursor: "pointer" }}>⚙</button>
        )}
      </div>}

      {/* §8.4.2 — Saved lists */}
      {!popout && savedLists.length > 0 && (
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "10px" }}>
          {savedLists.map((list) => (
            <div key={list.id} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <button onClick={() => handleLoad(list)} style={{ background: theme.bgSurface, border: `1px solid ${theme.border}`, borderRadius: "3px", color: theme.textPrimary, fontFamily: "monospace", fontSize: "10px", padding: "3px 8px", cursor: "pointer" }}>{list.name}</button>
              <button onClick={() => handleDelete(list.id)} style={{ background: "none", border: "none", color: theme.textDim, cursor: "pointer", fontSize: "11px", padding: "2px 3px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* §8.4.3 — Search cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {searches.map((search) => {
          const sp = search.searchPrefs;
          const mergedPrefs = {
            ...prefs,
            acCat:          sp.acCat,
            tafHours:       sp.tafHours,
            tafHoursManual: sp.tafHoursManual,
            tWindLimit:     sp.tWindLimit,
            cWindLimit:     sp.cWindLimit,
            amberBuffer:    sp.amberBuffer,
          };

          return (
            <div key={search.id} style={{ background: theme.bgSurface, border: `1px solid ${theme.border}`, borderRadius: "4px", overflow: "hidden" }}>

              {/* §8.4.3.1 — Card header */}

<div style={{ borderBottom: `1px solid ${theme.border}` }}>
{popout ? (
  popoutWidth < 400 ? (
    /* Dar: isim / seçenekler / view */
    <div style={{ padding: "6px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "11px", fontWeight: "bold", color: theme.textPrimary }}>
        {search.input.length > 30 ? search.input.substring(0, 30) + "..." : search.input}
      </span>
      <SearchBadges sp={sp} />
      <div style={{ display: "flex", border: `1px solid ${theme.border}`, borderRadius: "3px", overflow: "hidden", alignSelf: "flex-start" }}>
        {[[1,"● DOT"],[2,"▤ RWY"],[3,"▦ FULL"]].map(([l, lbl], i) => (
          <div key={l} onClick={() => updateSearchLevel(search.id, l)} style={{
            padding: "3px 8px", fontSize: "10px", fontWeight: "bold",
            letterSpacing: "1px", cursor: "pointer", whiteSpace: "nowrap",
            color: sp.level === l ? "#000" : theme.textDim,
            background: sp.level === l ? theme.green : "transparent",
            borderLeft: i > 0 ? `1px solid ${theme.border}` : "none",
          }}>{lbl}</div>
        ))}
      </div>
    </div>
  ) : (
    /* Geniş: isim + view yan yana, seçenekler altta */
    <div style={{ padding: "6px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", fontWeight: "bold", color: theme.textPrimary }}>
          {search.input.length > 30 ? search.input.substring(0, 30) + "..." : search.input}
        </span>
        <div style={{ display: "flex", border: `1px solid ${theme.border}`, borderRadius: "3px", overflow: "hidden", flexShrink: 0 }}>
          {[[1,"● DOT"],[2,"▤ RWY"],[3,"▦ FULL"]].map(([l, lbl], i) => (
            <div key={l} onClick={() => updateSearchLevel(search.id, l)} style={{
              padding: "3px 8px", fontSize: "10px", fontWeight: "bold",
              letterSpacing: "1px", cursor: "pointer", whiteSpace: "nowrap",
              color: sp.level === l ? "#000" : theme.textDim,
              background: sp.level === l ? theme.green : "transparent",
              borderLeft: i > 0 ? `1px solid ${theme.border}` : "none",
            }}>{lbl}</div>
          ))}
        </div>
      </div>
      <SearchBadges sp={sp} />
    </div>
  )
) : (
    /* List ekranı: tek satır — isim ... seçenekler */
    <div style={{ display: "flex", alignItems: "center", padding: "6px 12px", gap: "8px", flexWrap: "wrap" }}>

      {/* İsim */}
      <span style={{ fontSize: "11px", fontWeight: "bold", color: theme.textPrimary, flexShrink: 0 }}>
        {search.input.length > 30 ? search.input.substring(0, 30) + "..." : search.input}
      </span>

      {/* Badges */}
      <SearchBadges sp={sp} />

      {/* Boşluk doldurucu */}
      <div style={{ flex: 1 }} />

      {/* View seçenekleri */}
      <div style={{ display: "flex", border: `1px solid ${theme.border}`, borderRadius: "3px", overflow: "hidden", flexShrink: 0, height: "24px" }}>
        {[[1,"● DOT"],[2,"▤ RWY"],[3,"▦ FULL"]].map(([l, lbl], i) => (
          <div key={l} onClick={() => updateSearchLevel(search.id, l)} style={{
            padding: "0 8px", fontSize: "10px", fontWeight: "bold",
            letterSpacing: "1px", cursor: "pointer", whiteSpace: "nowrap",
            display: "flex", alignItems: "center",
            color: sp.level === l ? "#000" : theme.textDim,
            background: sp.level === l ? theme.green : "transparent",
            borderLeft: i > 0 ? `1px solid ${theme.border}` : "none",
          }}>{lbl}</div>
        ))}
      </div>

      {/* 20px boşluk */}
      <div style={{ width: "20px" }} />

      {/* List Name + butonlar */}
      <div style={{ display: "flex", gap: "4px", alignItems: "center", flexShrink: 0 }}>
        <input
          placeholder="List Name..."
          value={search.listName || ""}
          onChange={(e) => updateSearchListName(search.id, e.target.value)}
          style={{ width: "90px", background: theme.bgPage, border: `1px solid ${theme.border}`, borderRadius: "3px", color: theme.textPrimary, fontFamily: "'Courier New', monospace", fontSize: "10px", padding: "0 6px", outline: "none", height: "24px", boxSizing: "border-box" }}
        />
        <button onClick={() => handleSaveSearch(search)} style={{ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "3px", color: theme.textDim, fontFamily: "'Courier New', monospace", fontSize: "10px", padding: "0 8px", cursor: "pointer", height: "24px", whiteSpace: "nowrap" }}>SAVE LIST</button>
        <button onClick={() => handlePopOutSearch(search)} style={{ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "3px", color: theme.textDim, fontFamily: "'Courier New', monospace", fontSize: "10px", padding: "0 8px", cursor: "pointer", height: "24px", whiteSpace: "nowrap" }}>POP-OUT ⬡</button>
        <button onClick={() => handleRemoveSearch(search.id)} style={{ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: "3px", color: theme.textDim, fontFamily: "'Courier New', monospace", fontSize: "10px", padding: "0 8px", cursor: "pointer", height: "24px" }}>✕</button>
      </div>
    </div>
  )}
</div>





              {/* §8.4.3.2 — Airport rows */}
              <div style={{
                padding: "8px 10px",
                display: sp.level === 1 ? "flex" : "block",
                flexWrap: sp.level === 1 ? "wrap" : undefined,
                gap: sp.level === 1 ? "6px" : undefined,
                alignContent: sp.level === 1 ? "flex-start" : undefined,
              }}>
                {search.icaos.map((icao) => (
                  <AirportRow
                    key={icao} icao={icao} onAptClick={onAptClick}
                    level={sp.level} theme={theme}
                    onUpdated={() => setLastUpdated(Math.floor(Date.now() / 1000))}
                    prefs={mergedPrefs}
                  />
                ))}
              </div>

            </div>
          );
        })}
      </div>

      {/* §8.4.4 — Last updated badge */}
      {lastUpdated && (() => {
        const ageSec = Math.floor(Date.now() / 1000) - lastUpdated;
        const color = ageSec < 300 ? theme.green : ageSec < 600 ? theme.amber : theme.red;
        return (
          <div style={{
            position: "fixed", bottom: "0px", right: "0px", zIndex: 1000,
            background: theme.bgPage, border: `1px solid ${theme.border}`,
            borderRadius: "4px", padding: "8px 20px", fontSize: "10px",
            fontFamily: "'Courier New', monospace", letterSpacing: "1px",
            pointerEvents: "none", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span>
              <span style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontStyle: "italic", color: theme.green }}>Ops</span>
              <span style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontStyle: "italic", color: theme.textPrimary }}>Radar</span>
            </span>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ color }}>
              UPDATED {new Date(lastUpdated * 1000).getUTCHours().toString().padStart(2, "0")}{new Date(lastUpdated * 1000).getUTCMinutes().toString().padStart(2, "0")}Z
            </span>
          </div>
        );
      })()}

    </div>
  );
}

export default ListView;