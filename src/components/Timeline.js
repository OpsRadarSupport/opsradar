// ============================================================
// Timeline.js
// §1    Imports
// §2    Helper functions
//   §2.1  getHourLabel — day rollover support
//   §2.2  getObsLabel — METAR observation time
//   §2.3  getDotsCount — hidden slot count → dot count
//   §2.4  getVisibleItems — build [first, {dots}, last] pattern
// §3    Timeline component
//   §3.1  Scroll handlers
//   §3.2  Slot calculation (24h)
//   §3.3  Group calculation
//   §3.4  METAR column render
//   §3.5  TAF groups render
//     §3.5.1  Group container
//     §3.5.2  Dots separator column
//     §3.5.3  Slot column
// ============================================================

// §1 — Imports
import { useRef, useEffect, useMemo } from "react";
import { getRunwayStatus } from "../services/runwayStatus";

// §2.1 — Hour label with day rollover
function getHourLabel(ts) {
  const nowTs = Math.floor(Date.now() / 1000);
  const nowDay = Math.floor(nowTs / 86400);
  const slotDay = Math.floor(ts / 86400);
  const hour = new Date(ts * 1000).getUTCHours().toString().padStart(2, "0");
  return slotDay > nowDay ? `+${hour}Z` : `${hour}Z`;
}

// §2.2 — METAR observation time HHmm
function getObsLabel(obsTime) {
  const d = new Date(obsTime * 1000);
  return d.getUTCHours().toString().padStart(2, "0") +
         d.getUTCMinutes().toString().padStart(2, "0");
}

// §2.3 — Dot count between first and last slot
function getDotsCount(slotCount) {
  const hidden = slotCount - 2;
  if (hidden <= 0) return 0;
  if (hidden === 1) return 1;
  if (hidden === 2) return 2;
  return 3;
}

// §2.4 — Build visible items for a group
function getVisibleItems(slots) {
  if (slots.length === 1) return [slots[0]];
  if (slots.length === 2) return [slots[0], slots[1]];
  return [slots[0], { dots: getDotsCount(slots.length) }, slots[slots.length - 1]];
}

// §3 — Timeline component
function Timeline({ icao, rwyId, fcsts, metar, onSlotSelect, onFirstSlot, selectedTs, theme }) {
  const scrollRef = useRef(null);

  // Derive color maps from theme
  const STATUS_COLOR = {
    green:   theme.green,
    amber:   theme.amber,
    red:     theme.red,
    unknown: theme.unknown,
  };

  const GROUP_BG = {
    green:   theme.groupBgGreen,
    amber:   theme.groupBgAmber,
    red:     theme.groupBgRed,
    unknown: theme.groupBgUnknown,
  };

  const GROUP_BORDER = {
    green:   theme.groupBorderGreen,
    amber:   theme.groupBorderAmber,
    red:     theme.groupBorderRed,
    unknown: theme.groupBorderUnknown,
  };

  // §3.1 — Scroll handlers
  function scrollLeft()  { if (scrollRef.current) scrollRef.current.scrollLeft -= 120; }
  function scrollRight() { if (scrollRef.current) scrollRef.current.scrollLeft += 120; }

  // §3.2 — Slot calculation: 24 hourly slots from now
  const slots = useMemo(() => {
    const nowTs = Math.floor(Date.now() / 1000);
    const result = [];
    for (let i = 0; i < 24; i++) {
      const slotTs = nowTs + i * 3600;
      const fcst = fcsts.find((f) => slotTs >= f.timeFrom && slotTs < f.timeTo)
        || fcsts[fcsts.length - 1];
      const durum = getRunwayStatus(icao, rwyId, fcst.rvr, fcst.dh, fcst.wdir, fcst.wspd);
      result.push({ ts: slotTs, label: getHourLabel(slotTs), durum, fcst });
    }
    return result;
  }, [icao, rwyId, fcsts]);

  useEffect(() => {
    if (slots.length > 0 && onFirstSlot) {
      onFirstSlot(slots[0].ts, slots[0].fcst);
    }
  }, [slots,onFirstSlot]);

  // §3.3 — Group calculation
  const groups = useMemo(() => {
    const result = [];
    let i = 0;
    while (i < slots.length) {
      const timeFrom = slots[i].fcst.timeFrom;
      const grp = [];
      while (i < slots.length && slots[i].fcst.timeFrom === timeFrom) { grp.push(slots[i]); i++; }
      result.push({ durum: grp[0].durum, slots: grp });
    }
    return result;
  }, [slots]);

  const metarDurum = metar
    ? getRunwayStatus(icao, rwyId, metar.rvr, metar.dh, metar.wdir, metar.wspd)
    : "unknown";

  if (!icao || !rwyId || !fcsts || fcsts.length === 0) return null;

  const arrowStyle = {
    background: "none", border: "none", color: theme.textDim,
    fontSize: "13px", cursor: "pointer", padding: "0 2px",
    flexShrink: 0, alignSelf: "center",
  };

  const SLOT_W = 46;
  const DOTS_W = 0;
  const SLOT_H = 46;

  return (
    <div style={{ marginTop: "10px", marginBottom: "16px" }}>
      <div style={{ fontSize: "11px", color: theme.textDim, marginBottom: "8px" }}>
        HOURLY STATUS — {rwyId}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>

        <button style={arrowStyle} onClick={scrollLeft}>◀</button>

        {/* Scroll container */}
        <div
          ref={scrollRef}
          style={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "visible", scrollbarWidth: "none", msOverflowStyle: "none", paddingTop: "3px", paddingBottom: "3px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "3px", width: "max-content" }}>

            {/* §3.4 — METAR label + column */}
            {metar && (
              <div style={{ display: "flex", alignItems: "center", gap: "1px", marginRight: "3px" }}>

                {/* METAR vertical label */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  height: `${SLOT_H}px`, width: "12px", flexShrink: 0, gap: "1px", marginRight: "1px",
                }}>
                  {"METAR".split("").map((c, i) => (
                    <span key={i} style={{ fontSize: "8px", color: theme.metar, fontWeight: "bold", lineHeight: 1, fontFamily: "Arial, sans-serif" }}>{c}</span>
                  ))}
                </div>

                {/* METAR slot box */}
                <div
                  onClick={() => onSlotSelect && onSlotSelect(metar, "metar")}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    width: `${SLOT_W}px`, height: `${SLOT_H}px`, boxSizing: "border-box",
                    background: GROUP_BG[metarDurum],
                    borderRadius: "3px",
                    border: `1px solid ${GROUP_BORDER[metarDurum]}`,
                    boxShadow: selectedTs === "metar" ? `0 0 0 2px ${STATUS_COLOR[metarDurum]}` : "none",
                    cursor: "pointer", flexShrink: 0, paddingTop: "4px",
                  }}
                >
                  <span style={{ fontSize: "9px", color: theme.metar, fontWeight: "bold", lineHeight: 1, flexShrink: 0, fontFamily: "'Courier New', monospace" }}>
                    {metar.obsTime ? getObsLabel(metar.obsTime) : "—"}
                  </span>
                  <div style={{ flex: 1, minHeight: 0 }} />
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: STATUS_COLOR[metarDurum],
                    outline: selectedTs === "metar" ? `2px solid ${STATUS_COLOR[metarDurum]}` : "none",
                    outlineOffset: "2px", flexShrink: 0, marginBottom: "10px",
                  }} />
                </div>
              </div>
            )}

            {/* §3.5 — TAF label + groups */}
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>

              {/* TAF vertical label */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                height: `${SLOT_H}px`, width: "12px", flexShrink: 0, gap: "1px", marginRight: "1px",
              }}>
                {"TAF".split("").map((c, i) => (
                  <span key={i} style={{ fontSize: "8px", color: theme.taf, fontWeight: "bold", lineHeight: 1, fontFamily: "Arial, sans-serif" }}>{c}</span>
                ))}
              </div>

              {groups.map((group, gi) => {
                const color = STATUS_COLOR[group.durum];
                const visible = getVisibleItems(group.slots);
                const isGroupSelected = group.slots.some((s) =>
                  selectedTs !== null && selectedTs !== "metar" &&
                  Math.floor(selectedTs / 3600) === Math.floor(s.ts / 3600)
                );

                // §3.5.1 — Group container
                return (
                  <div key={gi} style={{
                    display: "flex", alignItems: "stretch",
                    background: GROUP_BG[group.durum],
                    border: `1px solid ${GROUP_BORDER[group.durum]}`,
                    boxShadow: isGroupSelected ? `0 0 0 2px ${color}` : "none",
                    borderRadius: "3px", flexShrink: 0,
                  }}>
                    {visible.map((item, vi) => {

                      // §3.5.2 — Dots separator
                      if (item.dots !== undefined) {
                        return (
                          <div key="dots" style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            width: `${DOTS_W}px`, height: `${SLOT_H}px`, boxSizing: "border-box",
                          }}>
                            <div style={{ flex: 1 }} />
                            <div style={{ display: "flex", gap: "2px", marginBottom: "13px" }}>
                              {Array.from({ length: item.dots }).map((_, j) => (
                                <div key={j} style={{ width: "3px", height: "3px", borderRadius: "50%", background: color, opacity: 0.6 }} />
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // §3.5.3 — Slot column
                      const isSelected = selectedTs !== null && selectedTs !== "metar" &&
                        Math.floor(selectedTs / 3600) === Math.floor(item.ts / 3600);
                      const dotOutline = isSelected || isGroupSelected;

                      return (
                        <div
                          key={item.ts}
                          onClick={() => onSlotSelect && onSlotSelect(item.fcst, item.ts)}
                          style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            width: `${SLOT_W}px`, height: `${SLOT_H}px`, boxSizing: "border-box",
                            background: "transparent", borderRadius: "2px", cursor: "pointer",
                            paddingTop: "4px",
                          }}
                        >
                          <span style={{ fontSize: "9px", color: theme.taf, fontWeight: "bold", fontFamily: "'Courier New', monospace", lineHeight: 1, flexShrink: 0 }}>                            {item.label}
                          </span>
                          <div style={{ flex: 1, minHeight: 0 }} />
                          <div style={{
                            width: "8px", height: "8px", borderRadius: "50%",
                            background: color,
                            outline: dotOutline ? `2px solid ${color}` : "none",
                            outlineOffset: "2px", flexShrink: 0, marginBottom: "10px",
                          }} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        <button style={arrowStyle} onClick={scrollRight}>▶</button>

      </div>
    </div>
  );
}

export default Timeline;