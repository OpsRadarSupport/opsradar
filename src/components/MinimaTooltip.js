import { useState } from "react";
import minima from "../data/minima";
import { BUFFER } from "../services/runwayStatus";

function getAppStatus(app, rvr, dh) {
  if (rvr < app.rvr || dh < app.dh) return "red";
  if (rvr < app.rvr + BUFFER.rvr || dh < app.dh + BUFFER.dh) return "amber";
  return "green";
}

const STATUS_COLOR = {
  green:  "#00e87a",
  amber:  "#ffb020",
  red:    "#ff3d55",
};

function MinimaTooltip({ aptId, rwyId, rvr, dh }) {
  const [open, setOpen] = useState(false);

const apps = minima
  .filter((m) => m.aptId === aptId && m.rwyId === rwyId && m.acCat === "C" && m.appTyp !== "TO")
  .sort((a, b) => a.rvr !== b.rvr ? a.rvr - b.rvr : a.dh - b.dh);

  return (
    <div
      style={{ position: "relative", marginLeft: "auto" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span style={{
        fontSize: "11px",
        color: "#4a7a5e",
        cursor: "pointer",
        border: "1px solid #1a3a2a",
        borderRadius: "3px",
        padding: "2px 8px",
        letterSpacing: "1px",
      }}>
        MINIMA
      </span>

      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: "4px",
          background: "#0c1410",
          border: "1px solid #1a3a2a",
          borderRadius: "4px",
          padding: "8px",
          zIndex: 2000,
          minWidth: "240px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "80px 70px 70px",
            gap: "2px",
            marginBottom: "6px",
          }}>
            <span style={{ fontSize: "9px", color: "#4a7a5e" }}>TİP</span>
            <span style={{ fontSize: "9px", color: "#4a7a5e" }}>RVR (m)</span>
            <span style={{ fontSize: "9px", color: "#4a7a5e" }}>DH (ft)</span>
          </div>
          {apps.map((app, i) => {
            const durum = getAppStatus(app, rvr, dh);
            const renk = STATUS_COLOR[durum];
            return (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "80px 70px 70px",
                gap: "2px",
                padding: "3px 0",
                borderTop: "1px solid #1a3a2a",
              }}>
                <span style={{ fontSize: "11px", fontWeight: "bold", color: renk }}>{app.appTyp}</span>
                <span style={{ fontSize: "11px", color: renk }}>{app.rvr}</span>
                <span style={{ fontSize: "11px", color: renk }}>{app.dh === 0 ? "—" : app.dh}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MinimaTooltip;