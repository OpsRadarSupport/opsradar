// ============================================================
// Map.js
// §1    Imports and constants
// §2    Helper functions
// §3    MapEvents component
// §4    Map component
//   §4.1  State
//   §4.2  Status update (TAF + METAR polling)
//   §4.3  Render
// ============================================================

// §1 — Imports and constants
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from "react-leaflet";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchTaf, parseTaf, fetchMetar, parseMetar } from "../services/tafService";
import { getRunwayStatus } from "../services/runwayStatus";
import { getAirportSize } from "../data/airportSizes";
import runwaysData from "../data/runways";
import { getDurationMs } from "../services/userPrefs";

const BASE_SIZE_PX = { large: 20, medium: 15, small: 10 };
const DOT_SCALE    = { 1: 0.5, 2: 0.75, 3: 1, 4: 1.5, 5: 2 };

// §2.1
function getScaledSize(baseSize, zoom) {
  if (zoom >= 12) return baseSize;
  return Math.max(Math.round(baseSize * (zoom / 12)), 2);
}

// §2.2
function createDotIcon(color, sizePx, label = null, labelColor = "#fff", bgColor = "transparent", borderColor = "transparent") {
  const labelHtml = label ? `
    <div style="
      position:absolute;
      top:${sizePx + 2}px;
      left:50%;
      transform:translateX(-50%);
      white-space:nowrap;
      font-size:9px;
      font-family:'Courier New',monospace;
      font-weight:bold;
      color:${labelColor};
      background:${bgColor};
      padding:1px 6px;
      border-radius:8px;
      border:1px solid ${borderColor};
      pointer-events:auto;
      cursor:pointer;
    ">${label}</div>
  ` : "";
  const totalH = label ? sizePx + 20 : sizePx;
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:${sizePx}px;height:${totalH}px;">
        <div style="width:${sizePx}px;height:${sizePx}px;background:${color};border-radius:50%;"></div>
        ${labelHtml}
      </div>
    `,
    iconSize: [sizePx, totalH],
    iconAnchor: [sizePx / 2, sizePx / 2],
  });
}
// §2.3
function createBlinkingDotIcon(color, sizePx) {
  return L.divIcon({
    className: "",
    html: `<style>@keyframes map-blink{0%{opacity:1}50%{opacity:0.2}100%{opacity:1}}</style><div style="width:${sizePx}px;height:${sizePx}px;background:${color};border-radius:50%;animation:map-blink 1s ease-in-out infinite;"></div>`,
    iconSize: [sizePx, sizePx], iconAnchor: [sizePx / 2, sizePx / 2],
  });
}

// §2.4
function createRingDotIcon(color, sizePx, ringColor) {
  const ring = sizePx + 4;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${ring}px;height:${ring}px;"><div style="position:absolute;top:2px;left:2px;width:${sizePx}px;height:${sizePx}px;background:${color};border-radius:50%;"></div><div style="position:absolute;top:0;left:0;width:${ring}px;height:${ring}px;border-radius:50%;border:1.5px solid ${ringColor};box-sizing:border-box;"></div></div>`,
    iconSize: [ring, ring], iconAnchor: [ring / 2, ring / 2],
  });
}

// §2.5
function createDoubleRingDotIcon(color, sizePx, tafColor, metarColor) {
  const inner = sizePx + 4, outer = sizePx + 8;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${outer}px;height:${outer}px;"><div style="position:absolute;top:4px;left:4px;width:${sizePx}px;height:${sizePx}px;background:${color};border-radius:50%;"></div><div style="position:absolute;top:2px;left:2px;width:${inner}px;height:${inner}px;border-radius:50%;border:1.5px solid ${tafColor};box-sizing:border-box;"></div><div style="position:absolute;top:0;left:0;width:${outer}px;height:${outer}px;border-radius:50%;border:1.5px solid ${metarColor};box-sizing:border-box;"></div></div>`,
    iconSize: [outer, outer], iconAnchor: [outer / 2, outer / 2],
  });
}

// §2.6
function createBlinkingRingDotIcon(color, sizePx, ringColor) {
  const ring = sizePx + 4;
  return L.divIcon({
    className: "",
    html: `<style>@keyframes map-blink{0%{opacity:1}50%{opacity:0.2}100%{opacity:1}}</style><div style="position:relative;width:${ring}px;height:${ring}px;animation:map-blink 1s ease-in-out infinite;"><div style="position:absolute;top:2px;left:2px;width:${sizePx}px;height:${sizePx}px;background:${color};border-radius:50%;"></div><div style="position:absolute;top:0;left:0;width:${ring}px;height:${ring}px;border-radius:50%;border:1.5px solid ${ringColor};box-sizing:border-box;"></div></div>`,
    iconSize: [ring, ring], iconAnchor: [ring / 2, ring / 2],
  });
}

// §3 — MapEvents
function MapEvents({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom(), map.getBounds()),
    moveend: () => onZoomChange(map.getZoom(), map.getBounds()),
  });
  useEffect(() => { onZoomChange(map.getZoom(), map.getBounds()); }, []);
  return null;
}

// // §4 — Map component
function Map({ onAptClick, theme, prefs }) {

  // §4.1 — State
  const [zoom, setZoom]                   = useState(prefs?.defaultZoom ?? 6);
  const [bounds, setBounds]               = useState(null);
  const [aptStatus, setAptStatus]         = useState({});
  const [rwyStatusMap, setRwyStatusMap]   = useState({});
  const [blinkingApts, setBlinkingApts]   = useState({});
  const [newTafApts, setNewTafApts]       = useState({});
  const [newMetarApts, setNewMetarApts]   = useState({});
  const [tafData, setTafData]             = useState({});
  const [metarData, setMetarData]         = useState({});
  const [lastUpdated, setLastUpdated]     = useState(null);
  const [blinkOn, setBlinkOn]             = useState(true);
  const [loadedCount, setLoadedCount]     = useState(0);
  const visibleCountRef                   = useRef(0);
  const lastVisibleCount = useRef(0);

  const prevAptStatus    = useRef({});
  const prevRawTaf       = useRef({});
  const prevMetarObsTime = useRef({});
  const prevTafIssueTime = useRef({});
  const mapRef           = useRef(null);
  const boundsTimer      = useRef(null);

  function handleZoomChange(newZoom, newBounds) {
    setZoom(newZoom);
    setBounds(newBounds);
  }

  // §4.1.1 — Visible airports (viewport + zoom filter)
  const airports = useMemo(() => {
    return Object.entries(runwaysData)
      .map(([icao, apt]) => ({ icao, lat: apt.lat, lng: apt.lng, name: apt.name, iata: apt.iata }))
      .filter((apt) => {
        if (bounds && !bounds.contains([apt.lat, apt.lng])) return false;
        return true;
      });
  }, [bounds, zoom]);

  const tooltipStyle = {
    fontSize: "12px", fontFamily: "'Courier New', monospace", fontWeight: "bold",
    color: theme.tooltipColor, background: theme.bgPage,
    padding: "8px 14px", border: `1px solid ${theme.green}`,
    borderRadius: "4px", letterSpacing: "1px", whiteSpace: "nowrap",
  };

  const STATUS_COLOR = { green: theme.green, amber: theme.amber, red: theme.red, unknown: theme.unknown };

  // §4.1.2 — Blink interval
  useEffect(() => {
    const interval = setInterval(() => setBlinkOn((v) => !v), 500);
    return () => clearInterval(interval);
  }, []);

  // §4.1.2b — Tooltip temizleme
useEffect(() => {
  const handleMouseMove = () => {
    document.querySelectorAll(".leaflet-tooltip").forEach((el) => {
      el.getBoundingClientRect();
      // tooltip görünür ama permanent değilse ve mouse dışındaysa gizle
      if (!el.classList.contains("leaflet-tooltip-permanent")) {
        el.style.display = "none";
        setTimeout(() => { el.style.display = ""; }, 50);
      }
    });
  };
  // sadece hızlı geçişlerde çalışsın — throttle
  let lastCall = 0;
  const throttled = (e) => {
    const now = Date.now();
    if (now - lastCall < 100) return;
    lastCall = now;
    // mouse hızını hesapla
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 20) {
      handleMouseMove();
    }
  };
  window.addEventListener("mousemove", throttled);
  return () => window.removeEventListener("mousemove", throttled);
}, []);

  // §4.1.3 — defaultZoom değişince haritayı güncelle
  useEffect(() => {
    if (mapRef.current) mapRef.current.setZoom(prefs?.defaultZoom ?? 6);
  }, [prefs?.defaultZoom]);

  // §4.2 — Status update
  const updateStatus = useCallback(async () => {
    try {
      const newStatus    = {};
      const newRwyStatus = {};
      const tafMap       = {};
      const metarMap     = {};
      const chunkSize    = 25;

      const currentAirports = Object.entries(runwaysData)
        .map(([icao, apt]) => ({ icao, lat: apt.lat, lng: apt.lng }))
        .filter((apt) => {
          if (mapRef.current) {
            const b = mapRef.current.getBounds();
            if (b && !b.contains([apt.lat, apt.lng])) return false;
          }
          const z = mapRef.current ? mapRef.current.getZoom() : 6;
          const size = getAirportSize(apt.icao);
          if (z < 4 && size !== "large") return false;
          if (z < 6 && size === "small") return false;
          return true;
        });

      visibleCountRef.current = currentAirports.length;
      if (lastVisibleCount.current !== currentAirports.length) {
      lastVisibleCount.current = currentAirports.length;
      setLastUpdated(null);
      }
      setLoadedCount(0);

      // §4.2.1 — Fetch TAFs
      for (let i = 0; i < currentAirports.length; i += chunkSize) {
        const chunk = currentAirports.slice(i, i + chunkSize);
        const icaoList = chunk.map((a) => a.icao).join(",");
        const result = await fetchTaf(icaoList);
        if (Array.isArray(result)) result.forEach((t) => { if (t?.icaoId) tafMap[t.icaoId] = t; });
        else if (result?.icaoId) tafMap[result.icaoId] = result;
      }

      // §4.2.2 — Fetch METARs
      for (let i = 0; i < currentAirports.length; i += chunkSize) {
        const chunk = currentAirports.slice(i, i + chunkSize);
        const icaoList = chunk.map((a) => a.icao).join(",");
        const result = await fetchMetar(icaoList);
        if (Array.isArray(result)) result.forEach((m) => { if (m?.icaoId) metarMap[m.icaoId] = m; });
        else if (result?.icaoId) metarMap[result.icaoId] = result;
      }

      // §4.2.3 — Calculate status
      const nowTs = Math.floor(Date.now() / 1000);
      for (const apt of currentAirports) {
        const taf         = tafMap[apt.icao];
        const parsed      = parseTaf(taf);
        const metar       = metarMap[apt.icao];
        const parsedMetar = parseMetar(metar);
        const aptData     = runwaysData[apt.icao];

        if (!parsed && !parsedMetar) { newStatus[apt.icao] = "unknown"; continue; }
        if (!aptData)                { newStatus[apt.icao] = "unknown"; continue; }

        // §4.2.4 — Per runway
        const tafCheckHours = (() => {
          if (!prefs) return 6;
          if (prefs.tafHours === "manual") return prefs.tafHoursManual ?? 6;
          return typeof prefs.tafHours === "number" ? prefs.tafHours : 6;
        })();

        const rwyStatuses = aptData.runways.map((rwy) => {
          const slots = [];
          if (parsedMetar) slots.push(getRunwayStatus(apt.icao, rwy.id, parsedMetar.rvr, parsedMetar.dh, parsedMetar.wdir, parsedMetar.wspd, prefs));
          if (parsed) {
            for (let i = 0; i < tafCheckHours; i++) {
              const slotTs = nowTs + i * 3600;
              const fcst = parsed.fcsts.find((f) => slotTs >= f.timeFrom && slotTs < f.timeTo) || parsed.fcsts[parsed.fcsts.length - 1];
              slots.push(getRunwayStatus(apt.icao, rwy.id, fcst.rvr, fcst.dh, fcst.wdir, fcst.wspd, prefs));
            }
          }
          if (slots.includes("red"))               return "red";
          if (slots.includes("amber"))             return "amber";
          if (slots.every((s) => s === "unknown")) return "unknown";
          return "green";
        });

        // §4.2.5 — Best runway wins
        newRwyStatus[apt.icao] = {};
        aptData.runways.forEach((rwy, i) => { newRwyStatus[apt.icao][rwy.id] = rwyStatuses[i]; });
        const nonUnknown = rwyStatuses.filter((s) => s !== "unknown");
        if (nonUnknown.length === 0)           newStatus[apt.icao] = "unknown";
        else if (nonUnknown.includes("green")) newStatus[apt.icao] = "green";
        else if (nonUnknown.includes("amber")) newStatus[apt.icao] = "amber";
        else                                   newStatus[apt.icao] = "red";
      }

      // §4.2.6 — Blink kontrolü
      Object.entries(newStatus).forEach(([aptIcao, newSt]) => {
        const oldSt = prevAptStatus.current[aptIcao];
        if (oldSt && oldSt !== newSt) {
          setBlinkingApts((prev) => {
            if (prev[aptIcao]) clearTimeout(prev[aptIcao]);
            const blinkMs = getDurationMs(prefs?.blinkDuration, prefs?.blinkDurationManual);
            if (blinkMs === null) return prev;
            const timerId = setTimeout(() => {
              setBlinkingApts((p) => { const copy = { ...p }; delete copy[aptIcao]; return copy; });
            }, blinkMs);
            return { ...prev, [aptIcao]: timerId };
          });
        }
        prevAptStatus.current[aptIcao] = newSt;
      });

      // §4.2.7 — Yeni TAF / METAR kontrolü
      for (const apt of currentAirports) {
        const taf     = tafMap[apt.icao];
        const metar   = metarMap[apt.icao];
        const aptSize = getAirportSize(apt.icao);
        const z       = mapRef.current ? mapRef.current.getZoom() : 6;
        const aptIsGray = (z < 6 && aptSize !== "large") || (z < 8 && aptSize === "small");
        if (aptIsGray) continue;

        if (taf?.rawTAF && taf.rawTAF !== prevRawTaf.current[apt.icao]) {
          if (prevRawTaf.current[apt.icao] !== undefined) {
            const tafMs = getDurationMs(prefs?.newTafDuration, prefs?.newTafDurationManual);
            if (tafMs !== null) {
              setNewTafApts((prev) => {
                const timerId = setTimeout(() => {
                  setNewTafApts((p) => { const copy = { ...p }; delete copy[apt.icao]; return copy; });
                }, tafMs);
                return { ...prev, [apt.icao]: timerId };
              });
            }
          }
          prevRawTaf.current[apt.icao] = taf.rawTAF;
          if (taf.issueTime) prevTafIssueTime.current[apt.icao] = taf.issueTime;
        }

        if (metar?.obsTime && metar.obsTime !== prevMetarObsTime.current[apt.icao]) {
          if (prevMetarObsTime.current[apt.icao] !== undefined) {
            setNewMetarApts((prev) => {
              if (prev[apt.icao]) clearTimeout(prev[apt.icao]);
              const metarMs = getDurationMs(prefs?.newMetarDuration, prefs?.newMetarDurationManual);
              if (metarMs === null) return prev;
              const timerId = setTimeout(() => {
                setNewMetarApts((p) => { const c = { ...p }; delete c[apt.icao]; return c; });
              }, metarMs);
              return { ...prev, [apt.icao]: timerId };
            });
          }
          prevMetarObsTime.current[apt.icao] = metar.obsTime;
        }
      }

      setLastUpdated(Math.floor(Date.now() / 1000));
      setTafData({ ...tafMap });
      setMetarData({ ...metarMap });
      setAptStatus(newStatus);
      setRwyStatusMap(newRwyStatus);
      setLoadedCount(Object.keys(newStatus).length);

    } catch (e) {
      console.error("updateStatus error:", e);
    }
  }, [prefs]);

  // §4.1.4 — Polling
  useEffect(() => {
    if (prefs?.newTafDuration === "off") { Object.values(newTafApts).forEach(clearTimeout); setNewTafApts({}); }
    if (prefs?.newMetarDuration === "off") { Object.values(newMetarApts).forEach(clearTimeout); setNewMetarApts({}); }
    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => {
      clearInterval(interval);
      setBlinkingApts((prev) => { Object.values(prev).forEach(clearTimeout); return {}; });
    };
  }, [prefs, updateStatus]);

  // §4.1.5 — bounds/zoom değişince yeniden çek
  useEffect(() => {
    if (!bounds) return;
    if (boundsTimer.current) clearTimeout(boundsTimer.current);
    boundsTimer.current = setTimeout(() => {
      Object.keys(prevRawTaf.current).forEach((icao) => {
        const apt = runwaysData[icao];
        if (apt && !bounds.contains([apt.lat, apt.lng])) {
          delete prevRawTaf.current[icao];
          delete prevMetarObsTime.current[icao];
          delete prevTafIssueTime.current[icao];
        }
      });
      updateStatus();
    }, 1000);
  }, [bounds]);

  // §4.3 — Render
  return (
    <MapContainer
      ref={mapRef}
      center={[39.0, 35.0]}
      zoom={prefs?.defaultZoom ?? 6}
      minZoom={2}
      maxBounds={[[-90, -180], [90, 180]]}
      maxBoundsViscosity={1.0}
      zoomControl={false}
      attributionControl={false}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer url={theme.mapTile} attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
      <MapEvents onZoomChange={handleZoomChange} />

      {/* §4.3.3 — Markers */}
      {airports.map((apt) => {
        const status      = aptStatus[apt.icao] || "unknown";
        const color       = STATUS_COLOR[status];
        const aptData     = runwaysData[apt.icao];
        const taf         = tafData[apt.icao];
        const metar       = metarData[apt.icao];
        const parsedTaf   = taf   ? parseTaf(taf)     : null;
        const parsedMetar = metar ? parseMetar(metar) : null;
        const size        = getAirportSize(apt.icao);
        const isGray      = (zoom < 4 && size !== "large") || (zoom < 6 && size === "small");
        const scale       = DOT_SCALE[prefs?.dotScale ?? 3] ?? 1;
        const baseSize    = Math.round(BASE_SIZE_PX[size] * scale);
        const sizePx      = getScaledSize(baseSize, zoom);
        const grayBase    = Math.round(BASE_SIZE_PX[size] * 0.61);
        const finalSizePx = isGray ? getScaledSize(grayBase, zoom) : sizePx;
        const isBlinking  = !!blinkingApts[apt.icao];
        const hasNewTaf   = !!newTafApts[apt.icao];
        const hasNewMetar = !!newMetarApts[apt.icao];
        const showLabel   = zoom >= 6 && !isGray;
        const label       = showLabel ? `${apt.icao}${aptData?.iata ? `/${aptData.iata}` : ""}` : null;

        const icon = (() => {
          if (isGray) return createDotIcon("#555", finalSizePx);
          if (isBlinking && (hasNewTaf || hasNewMetar)) return createBlinkingRingDotIcon(color, finalSizePx, hasNewTaf ? theme.taf : theme.metar);
          if (isBlinking)               return createBlinkingDotIcon(color, finalSizePx);
          if (hasNewTaf && hasNewMetar) return createDoubleRingDotIcon(color, finalSizePx, theme.taf, theme.metar);
          if (hasNewTaf)                return createRingDotIcon(color, finalSizePx, theme.taf);
          if (hasNewMetar)              return createRingDotIcon(color, finalSizePx, theme.metar);
          return createDotIcon(color, finalSizePx, label, color, theme.bgSurface, theme.bgPage);
        })();

        return (
          <Marker
            key={`${apt.icao}-${zoom}-${status}-${theme.mapTile}-${isBlinking}-${hasNewTaf}-${hasNewMetar}`}
            position={[apt.lat, apt.lng]}
            icon={icon}
            eventHandlers={{ click: () => {
              if (blinkingApts[apt.icao]) {
                setBlinkingApts((prev) => { if (prev[apt.icao]) clearTimeout(prev[apt.icao]); const copy = { ...prev }; delete copy[apt.icao]; return copy; });
              }
              if (newTafApts[apt.icao]) {
                setNewTafApts((prev) => { if (prev[apt.icao]) clearTimeout(prev[apt.icao]); const copy = { ...prev }; delete copy[apt.icao]; return copy; });
              }
              if (newMetarApts[apt.icao]) {
                setNewMetarApts((prev) => { if (prev[apt.icao]) clearTimeout(prev[apt.icao]); const copy = { ...prev }; delete copy[apt.icao]; return copy; });
              }
              onAptClick(apt.icao);
              const map = mapRef.current;
              if (map) {
                const sidebarWidth = 480;
                const targetPoint = map.latLngToContainerPoint([apt.lat, apt.lng]);
                const isHidden = targetPoint.x < sidebarWidth;
                if (isHidden) {
                  const overlap = sidebarWidth - targetPoint.x + 40;
                  const currentCenter = map.getCenter();
                  const centerPoint = map.latLngToContainerPoint(currentCenter);
                  const newCenter = map.containerPointToLatLng([centerPoint.x - overlap, centerPoint.y]);
                  map.panTo([currentCenter.lat, newCenter.lng], { animate: true, duration: 0.5 });
                }
              }
            }}}
          >
            {/* Hover tooltip */}
            {!isGray && (
              <Tooltip
                permanent={false}
                direction="right"
                offset={[sizePx / 2 + 4, 0]}
                interactive={false}
                sticky={false}
              >
                <div style={{ ...tooltipStyle, display: "flex", flexDirection: "column", gap: "4px", maxWidth: prefs?.hoverRawTaf || prefs?.hoverRawMetar ? "260px" : "180px" }}>

                  {prefs?.hoverIcao !== false && (
                    <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", fontWeight: "bold", color }}>
                          {apt.icao}{aptData?.iata ? ` / ${aptData.iata}` : ""}
                        </span>
                      </div>
                      {prefs?.hoverAptName && <div style={{ fontSize: "10px", color: theme.textDim, marginTop: "2px", paddingLeft: "13px" }}>{aptData?.name}</div>}
                    </div>
                  )}

                  {prefs?.hoverRunways !== false && aptData && (
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", borderBottom: `1px solid ${theme.border}`, paddingBottom: "4px" }}>
                      {aptData.runways.map((rwy) => {
                        const rwySt = rwyStatusMap[apt.icao]?.[rwy.id] ?? "unknown";
                        return <span key={rwy.id} style={{ fontSize: "10px", fontWeight: "bold", color: STATUS_COLOR[rwySt] ?? theme.textDim }}>{rwy.id}</span>;
                      })}
                    </div>
                  )}

                  {prefs?.hoverTafSummary !== false && parsedTaf && (() => {
                    const nowTs = Math.floor(Date.now() / 1000);
                    const fcst = parsedTaf.fcsts?.find((f) => nowTs >= f.timeFrom && nowTs < f.timeTo) || parsedTaf.fcsts?.[0];
                    if (!fcst) return null;
                    const fromH = new Date(fcst.timeFrom * 1000).getUTCHours().toString().padStart(2,"0");
                    const toH   = new Date(fcst.timeTo   * 1000).getUTCHours().toString().padStart(2,"0");
                    const wind  = fcst.wdir === "VRB" ? `VRB${fcst.wspd}KT` : fcst.wdir != null ? `${String(fcst.wdir).padStart(3,"0")}${String(fcst.wspd).padStart(2,"0")}KT` : "—";
                    return (
                      <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "4px" }}>
                        <div style={{ fontSize: "9px", color: theme.taf, marginBottom: "2px" }}>TAF {fromH}Z-{toH}Z</div>
                        <div style={{ fontSize: "9px", color: theme.textPrimary }}>RVR {fcst.rvr >= 9999 ? "9999m" : `${fcst.rvr}m`}  DH {fcst.dh >= 9999 ? "—" : `${fcst.dh}ft`}  {wind}</div>
                      </div>
                    );
                  })()}

                  {prefs?.hoverMetarSummary !== false && parsedMetar && (() => {
                    const obsH = parsedMetar.obsTime ? (() => { const d = new Date(parsedMetar.obsTime * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0"); })() : "—";
                    const wind = parsedMetar.wdir === "VRB" ? `VRB${parsedMetar.wspd}KT` : parsedMetar.wdir != null ? `${String(parsedMetar.wdir).padStart(3,"0")}${String(parsedMetar.wspd).padStart(2,"0")}KT` : "—";
                    return (
                      <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "4px" }}>
                        <div style={{ fontSize: "9px", color: theme.metar, marginBottom: "2px" }}>METAR {obsH}Z</div>
                        <div style={{ fontSize: "9px", color: theme.textPrimary }}>RVR {parsedMetar.rvr >= 9999 ? "9999m" : `${parsedMetar.rvr}m`}  DH {parsedMetar.dh >= 9999 ? "—" : `${parsedMetar.dh}ft`}  {wind}</div>
                      </div>
                    );
                  })()}

                  {prefs?.hoverLastTime !== false && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", borderBottom: (prefs?.hoverRawTaf || prefs?.hoverRawMetar) ? `1px solid ${theme.border}` : "none", paddingBottom: (prefs?.hoverRawTaf || prefs?.hoverRawMetar) ? "4px" : "0", whiteSpace: "nowrap" }}>
                      {parsedTaf?.issueTime && (
                        <span style={{ fontSize: "8px", color: theme.taf, fontWeight: "bold" }}>
                          {hasNewTaf ? <span style={{ opacity: blinkOn ? 1 : 0.15 }}>NEW</span> : "Last"} TAF {(() => { const d = new Date(parsedTaf.issueTime); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}
                        </span>
                      )}
                      {parsedMetar?.obsTime && (
                        <span style={{ fontSize: "8px", color: theme.metar, fontWeight: "bold" }}>
                          {hasNewMetar ? <span style={{ opacity: blinkOn ? 1 : 0.15 }}>NEW</span> : "Last"} MET {(() => { const d = new Date(parsedMetar.obsTime * 1000); return d.getUTCHours().toString().padStart(2,"0") + d.getUTCMinutes().toString().padStart(2,"0") + "Z"; })()}
                        </span>
                      )}
                    </div>
                  )}

                  {prefs?.hoverRawTaf && parsedTaf?.rawTaf && (
                    <div style={{ borderBottom: prefs?.hoverRawMetar ? `1px solid ${theme.border}` : "none", paddingBottom: prefs?.hoverRawMetar ? "4px" : "0" }}>
                      <div style={{ fontSize: "9px", color: theme.taf, marginBottom: "2px" }}>RAW TAF</div>
                      <div style={{ fontSize: "8px", color: theme.textDim, wordBreak: "break-all", lineHeight: 1.5, whiteSpace: "pre-wrap", maxWidth: "240px" }}>{parsedTaf.rawTaf}</div>
                    </div>
                  )}

                  {prefs?.hoverRawMetar && parsedMetar?.rawMetar && (
                    <div>
                      <div style={{ fontSize: "9px", color: theme.metar, marginBottom: "2px" }}>RAW METAR</div>
                      <div style={{ fontSize: "8px", color: theme.textDim, wordBreak: "break-all", lineHeight: 1.5, whiteSpace: "pre-wrap", maxWidth: "240px" }}>{parsedMetar.rawMetar}</div>
                    </div>
                  )}

                </div>
              </Tooltip>
            )}
          </Marker>
        );
      })}

      {/* §4.3.4 — Bottom right wrapper */}
      <div style={{ position: "absolute", bottom: "10px", right: "10px", zIndex: 1000, display: "flex", flexDirection: "column", gap: "4px", overflow: "visible" }}>

        {/* §4.3.4.1 — New TAF ACK bar */}
        {Object.keys(newTafApts).length > 0 && (
          <div style={{ background: theme.bgSurface, border: `1px solid ${theme.green}`, borderRadius: "4px", padding: "8px 20px", fontFamily: "'Courier New', monospace", fontSize: "10px", letterSpacing: "1px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <div style={{ position: "relative", width: "14px", height: "14px", flexShrink: 0 }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: theme.green, position: "absolute", top: "3px", left: "3px" }} />
                <div style={{ position: "absolute", top: 0, left: 0, width: "14px", height: "14px", borderRadius: "50%", border: `1.5px solid ${theme.taf}`, boxSizing: "border-box" }} />
              </div>
              <span style={{ color: theme.taf }}>{Object.keys(newTafApts).length} New TAF</span>
            </div>
            <button onClick={() => { Object.values(newTafApts).forEach(clearTimeout); setNewTafApts({}); }} style={{ background: "transparent", border: `1px solid ${theme.taf}`, borderRadius: "3px", color: theme.taf, fontFamily: "'Courier New', monospace", fontSize: "10px", fontWeight: "bold", padding: "2px 4px", cursor: "pointer", letterSpacing: "1px" }}>ACK ALL</button>
          </div>
        )}

        {/* §4.3.4.2 — New METAR ACK bar */}
        {Object.keys(newMetarApts).length > 0 && (
          <div style={{ background: theme.bgSurface, border: `1px solid ${theme.green}`, borderRadius: "4px", padding: "8px 20px", fontFamily: "'Courier New', monospace", fontSize: "10px", letterSpacing: "1px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <div style={{ position: "relative", width: "14px", height: "14px", flexShrink: 0 }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: theme.green, position: "absolute", top: "3px", left: "3px" }} />
                <div style={{ position: "absolute", top: 0, left: 0, width: "14px", height: "14px", borderRadius: "50%", border: `1.5px solid ${theme.metar}`, boxSizing: "border-box" }} />
              </div>
              <span style={{ color: theme.metar }}>{Object.keys(newMetarApts).length} New METAR</span>
            </div>
            <button onClick={() => { Object.values(newMetarApts).forEach(clearTimeout); setNewMetarApts({}); }} style={{ background: "transparent", border: `1px solid ${theme.metar}`, borderRadius: "3px", color: theme.metar, fontFamily: "'Courier New', monospace", fontSize: "10px", fontWeight: "bold", padding: "2px 4px", cursor: "pointer", letterSpacing: "1px" }}>ACK ALL</button>
          </div>
        )}

        {/* §4.3.4.3 — Updated bar */}
        <div
          style={{ background: theme.bgSurface, border: `1px solid ${theme.green}`, borderRadius: "4px", padding: "8px 20px", fontSize: "10px", fontFamily: "'Courier New', monospace", letterSpacing: "1px", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "8px", cursor: "default" }}
          title={`${loadedCount} / ${visibleCountRef.current}`}
        >
          <span>
            <span style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontStyle: "italic", color: theme.green }}>Ops</span>
            <span style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", fontStyle: "italic", color: theme.textPrimary }}>Radar</span>
          </span>
          {(() => {
            const allLoaded = loadedCount >= visibleCountRef.current && visibleCountRef.current > 0;
            const ageSec = lastUpdated ? Math.floor(Date.now() / 1000) - lastUpdated : 999;
            const color = !allLoaded ? theme.textDim : ageSec < 300 ? theme.green : ageSec < 600 ? theme.amber : theme.red;
            return (
              <>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                {lastUpdated ? (
                  <span style={{ color, letterSpacing: "1px" }}>
                    UPDATED {new Date(lastUpdated * 1000).getUTCHours().toString().padStart(2, "0")}{new Date(lastUpdated * 1000).getUTCMinutes().toString().padStart(2, "0")}Z
                  </span>
                ) : (
                  <span style={{ color: theme.textDim, letterSpacing: "1px" }}>
                    UPDATED —
                  </span>
                )}
              </>
            );
          })()}
        </div>

      </div>

      {/* §4.3.5 — CARTO attribution */}
      <div style={{ position: "absolute", bottom: "0px", left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "rgba(0,0,0,0.5)", padding: "2px 8px", borderRadius: "2px", fontSize: "9px", color: "rgba(150,150,150,0.7)", fontFamily: "Arial, sans-serif", pointerEvents: "none", whiteSpace: "nowrap" }}>
        © CARTO | © OpenStreetMap
      </div>

    </MapContainer>
  );
}

export default Map;