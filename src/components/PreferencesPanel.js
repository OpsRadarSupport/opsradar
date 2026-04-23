// ============================================================
// PreferencesPanel.js
// §1  Imports
// §2  Sub-components (dışarıda — re-render'da focus kaybı önlenir)
//   §2.1  DurationGroup
//   §2.2  TafHoursGroup
//   §2.3  WindInput
// §3  PreferencesPanel component
//   §3.1  State
//   §3.2  Handlers
//   §3.3  Styles
//   §3.4  Render
//     §3.4.1  Container
//     §3.4.2  Header
//     §3.4.3  Map settings
//     §3.4.4  Operational settings
//     §3.4.5  Amber buffer
//     §3.4.6  Notification settings
//     §3.4.7  Save / Reset
// ============================================================

// §1 — Imports
import { useState } from "react";
import { DEFAULT_PREFS, savePrefs } from "../services/userPrefs";

// §2.1 — DurationGroup
function DurationGroup({ valueKey, manualKey, local, set, btnGroup, numInputStyle, theme }) {  const val = local[valueKey];
  const isManual = val === "manual";
  return (
    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
<button onClick={() => set(valueKey, "off")} style={{
  ...btnGroup(val === "off"),
  background: val === "off" ? theme.red : "transparent",
  color: val === "off" ? "#fff" : theme.textDim,
  border: `1px solid ${val === "off" ? theme.red : theme.border}`,
}}>OFF</button>


      {[5, 10, 15].map((m) => (
        <button key={m} onClick={() => set(valueKey, m)} style={btnGroup(val === m)}>{m}M</button>
      ))}
      {isManual ? (
<div style={{ ...btnGroup(true), padding: "0", display: "flex", alignItems: "center", width: "38px", overflow: "hidden" }}>    <input
            type="number" min="1" max="120"
            value={local[manualKey] || 15}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => set(manualKey, e.target.value === "" ? "" : parseInt(e.target.value))}
            style={{ ...numInputStyle, background: "transparent", border: "none", color: "#000", width: "32px", textAlign: "center", padding: "3px 4px" }}
          />
          <span style={{ fontSize: "9px", color: "#000", paddingRight: "4px" }}>M</span>
        </div>
      ) : (
        <button onClick={() => set(valueKey, "manual")} style={btnGroup(false)}>MAN</button>
      )}
    </div>
  );
}

// §2.2 — TafHoursGroup
function TafHoursGroup({ local, set, btnGroup, numInputStyle }) {
  const val = local.tafHours;
  const isManual = val === "manual";
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {[3, 6, 9].map((h) => (
        <button key={h} onClick={() => set("tafHours", h)} style={btnGroup(val === h)}>+{h}H</button>
      ))}
      {isManual ? (
<div style={{ ...btnGroup(true), padding: "0", display: "flex", alignItems: "center", width: "38px", overflow: "hidden" }}>          <input
            type="number" min="1" max="24"
            value={local.tafHoursManual || 6}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => set("tafHoursManual", e.target.value === "" ? "" : parseInt(e.target.value))}
            style={{ ...numInputStyle, background: "transparent", border: "none", color: "#000", width: "28px", textAlign: "center", padding: "3px 4px" }}
          />
          <span style={{ fontSize: "9px", color: "#000", paddingRight: "4px" }}>H</span>
        </div>
      ) : (
        <button onClick={() => set("tafHours", "manual")} style={btnGroup(false)}>MAN</button>
      )}
    </div>
  );
}

// §2.3 — WindInput
function WindInput({ valueKey, label, local, set, theme, numInputStyle }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: theme.textDim, letterSpacing: "1px", marginBottom: "4px" }}>{label}</div>
      <div style={{
        background: theme.bgPage, border: `1px solid ${theme.border}`,
        borderRadius: "3px", padding: "3px 5px",
        display: "flex", alignItems: "center", gap: "2px",
        width: "58px", boxSizing: "border-box",
      }}>
        <input
          type="number" min="1" max="99"
          value={local[valueKey]}
          onChange={(e) => set(valueKey, e.target.value === "" ? "" : parseInt(e.target.value))}
          style={{
            ...numInputStyle, background: "transparent", border: "none",
            flex: 1, padding: 0, textAlign: "right",
            fontSize: "11px", fontWeight: "bold",
          }}
        />
        <span style={{ fontSize: "9px", color: theme.textDim, flexShrink: 0 }}>kt</span>
      </div>
    </div>
  );
}

// §3 — PreferencesPanel component
function PreferencesPanel({ prefs, onPrefsChange, onPrefsPreview, onClose, theme, user, view }) {const [local, setLocal] = useState(() => {
  const p = { ...prefs };
  const presets = { low: { rvr:200,dh:100,tw:1,cw:1 }, medium: { rvr:500,dh:200,tw:2,cw:2 }, high: { rvr:1000,dh:500,tw:4,cw:4 } };
  if (p.amberBuffer !== "manual") {
    const preset = presets[p.amberBuffer] || presets.medium;
    p.amberBufferRvr = preset.rvr;
    p.amberBufferDh  = preset.dh;
    p.amberBufferTw  = preset.tw;
    p.amberBufferCw  = preset.cw;
  }
  return p;
});
 function set(key, value) {
  setLocal((prev) => {
    const updated = { ...prev, [key]: value };
    if (onPrefsPreview) onPrefsPreview(updated);
    return updated;
  });
}

  // §3.2 — Handlers
  function handleSave() {
    const cleaned = {
      ...local,
      tWindLimit:    parseInt(local.tWindLimit)    || DEFAULT_PREFS.tWindLimit,
      cWindLimit:    parseInt(local.cWindLimit)    || DEFAULT_PREFS.cWindLimit,
      tafHoursManual: parseInt(local.tafHoursManual) || DEFAULT_PREFS.tafHoursManual,
    };
    savePrefs(cleaned);
    onPrefsChange(cleaned);
    onClose();
  }

  function handleSaveAsDefault() {
  const cleaned = {
    ...local,
    tWindLimit:     parseInt(local.tWindLimit)     || DEFAULT_PREFS.tWindLimit,
    cWindLimit:     parseInt(local.cWindLimit)     || DEFAULT_PREFS.cWindLimit,
    tafHoursManual: parseInt(local.tafHoursManual) || DEFAULT_PREFS.tafHoursManual,
  };
  savePrefs(cleaned);
  onPrefsChange(cleaned);
  // Firebase'e kayıt — sonraki adımda eklenecek
  onClose();
}

function handleReset() {
  setLocal({ ...DEFAULT_PREFS });
  if (onPrefsPreview) onPrefsPreview({ ...DEFAULT_PREFS });
}

  // §3.3 — Styles
  const sectionTitle = (color) => ({
    fontSize: "11px", fontWeight: "bold",
    color: color || theme.textPrimary,
    letterSpacing: "2px", marginBottom: "8px", marginTop: "14px",
    borderBottom: `1px solid ${theme.border}`, paddingBottom: "4px",
  });

  const label = {
    fontSize: "10px", color: theme.textDim,
    letterSpacing: "1px", marginBottom: "4px",
  };

  const btnGroup = (active) => ({
    padding: "3px 8px", fontSize: "11px",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold", letterSpacing: "1px", cursor: "pointer",
    background: active ? theme.green : "transparent",
    color: active ? "#000" : theme.textDim,
    border: `1px solid ${active ? theme.green : theme.border}`,
    borderRadius: "3px", whiteSpace: "nowrap",
  });

  const numInputStyle = {
    fontFamily: "'Courier New', monospace", fontSize: "11px",
    outline: "none", color: theme.textPrimary,
    MozAppearance: "textfield", WebkitAppearance: "none", appearance: "none",
  };

// §3.3.1 — Amber buffer presets
const amberPresets = {
  low:    { rvr: 200,  dh: 100, tw: 1, cw: 1 },
  medium: { rvr: 500,  dh: 200, tw: 3, cw: 3 },
  high:   { rvr: 1000, dh: 500, tw: 5, cw: 5 },
};

 
function setAmberBuffer(val) {
  const presets = { low: { rvr:200,dh:100,tw:1,cw:1 }, medium: { rvr:500,dh:200,tw:3,cw:3 }, high: { rvr:1000,dh:500,tw:5,cw:5 } };
  if (val === "manual") {
    setLocal((prev) => ({
      ...prev,
      amberBuffer:    "manual",
      amberBufferRvr: amberPresets[prev.amberBuffer]?.rvr ?? 500,
      amberBufferDh:  amberPresets[prev.amberBuffer]?.dh  ?? 200,
      amberBufferTw:  amberPresets[prev.amberBuffer]?.tw  ?? 3,
      amberBufferCw:  amberPresets[prev.amberBuffer]?.cw  ?? 3,
    }));
  } else {
    const preset = presets[val] || presets.medium;
    setLocal((prev) => ({
      ...prev,
      amberBuffer:    val,
      amberBufferRvr: preset.rvr,
      amberBufferDh:  preset.dh,
      amberBufferTw:  preset.tw,
      amberBufferCw:  preset.cw,
    }));
  }
}
  // §3.4 — Render
  return (
    <>
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* §3.4.1 — Container */}
      <div style={{
        position: "fixed", top: 0, right: 0,
        width: "280px", height: "100vh",
        background: theme.bgSurface,
        borderLeft: `1px solid ${theme.border}`,
        zIndex: 1100,
        display: "flex", flexDirection: "column",
        fontFamily: "'Courier New', monospace",
        boxSizing: "border-box",
      }}>

        {/* §3.4.2 — Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", borderBottom: `1px solid ${theme.border}`,
          minHeight: "56px", boxSizing: "border-box", flexShrink: 0,
        }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: theme.textPrimary, letterSpacing: "2px" }}>
            PREFERENCES
          </span>
          <button onClick={onClose} style={{
            background: "transparent", border: `1px solid ${theme.border}`,
            color: theme.textDim, cursor: "pointer",
            fontSize: "14px", borderRadius: "3px", padding: "2px 8px",
          }}>✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>

          {/* §3.4.3 — MAP settings — list view'de gizlenir */}
          {view !== "list" && (
            <>
              <div style={sectionTitle()}>MAP</div>

              <div style={{ marginBottom: "12px" }}>
                <div style={label}>DEFAULT ZOOM</div>
                <div style={{ display: "flex", gap: "5px" }}>
                  {[3, 4, 5, 6, 7].map((z) => (
                    <button key={z} onClick={() => set("defaultZoom", z)} style={btnGroup(local.defaultZoom === z)}>
                      {z}x
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div style={label}>DOT SCALE</div>
                <div style={{ display: "flex", gap: "5px" }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => set("dotScale", s)} style={btnGroup(local.dotScale === s)}>
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* HOVER CONTENT */}
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "6px 0", borderTop: `1px solid ${theme.border}`, marginTop: "4px" }}
                onClick={() => set("_hoverOpen", !local._hoverOpen)}
              >
                <div style={{ fontSize: "10px", color: local._hoverOpen ? theme.textPrimary : theme.textDim, letterSpacing: "1px", fontWeight: "bold" }}>HOVER CONTENT</div>
                <span style={{ fontSize: "10px", color: theme.textDim }}>{local._hoverOpen ? "▲" : "▼"}</span>
              </div>

              {local._hoverOpen && (
                <div style={{ display: "flex", gap: "0px" }}>
                  {/* Preview kutusu */}
                  <div style={{
                    position: "absolute", right: "280px", top: "auto",
                    width: local.hoverRawTaf || local.hoverRawMetar ? "240px" : "180px",
                    background: theme.bgSurface, border: `1px solid ${theme.border}`,
                    borderRight: "none", borderRadius: "4px 0 0 4px",
                    padding: "10px", display: "flex", flexDirection: "column", gap: "6px",
                  }}>
                    <div style={{ fontSize: "9px", color: theme.textDim, letterSpacing: "1px", marginBottom: "4px", borderBottom: `1px solid ${theme.border}`, paddingBottom: "4px" }}>PREVIEW</div>

                    {(local.hoverIcao || local.hoverAptName) && (
                      <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "6px" }}>
                        {local.hoverIcao && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: theme.green, flexShrink: 0 }} />
                            <span style={{ fontSize: "12px", fontWeight: "bold", color: theme.green }}>LTFM / IST</span>
                          </div>
                        )}
                        {local.hoverAptName && (
                          <div style={{ fontSize: "10px", color: theme.textDim, marginTop: "2px", paddingLeft: local.hoverIcao ? "14px" : "0" }}>Istanbul Airport</div>
                        )}
                      </div>
                    )}

                    {local.hoverRunways && (
                      <div style={{ display: "flex", gap: "6px", borderBottom: `1px solid ${theme.border}`, paddingBottom: "6px" }}>
                        <span style={{ fontSize: "10px", color: theme.green, fontWeight: "bold" }}>35L</span>
                        <span style={{ fontSize: "10px", color: theme.green, fontWeight: "bold" }}>35R</span>
                        <span style={{ fontSize: "10px", color: theme.amber, fontWeight: "bold" }}>17L</span>
                        <span style={{ fontSize: "10px", color: theme.red, fontWeight: "bold" }}>17R</span>
                      </div>
                    )}

                    {local.hoverTafSummary && (
                      <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "6px" }}>
                        <div style={{ fontSize: "9px", color: theme.taf, marginBottom: "3px" }}>TAF 19Z-22Z</div>
                        <div style={{ fontSize: "9px", color: theme.textPrimary }}>RVR 9999m  DH 1400ft  06014KT</div>
                      </div>
                    )}

                    {local.hoverMetarSummary && (
                      <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: "6px" }}>
                        <div style={{ fontSize: "9px", color: theme.metar, marginBottom: "3px" }}>METAR 1920Z</div>
                        <div style={{ fontSize: "9px", color: theme.textPrimary }}>RVR 9999m  DH 1400ft  06014KT</div>
                      </div>
                    )}

                    {local.hoverLastTime && (
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: (local.hoverRawTaf || local.hoverRawMetar) ? `1px solid ${theme.border}` : "none", paddingBottom: (local.hoverRawTaf || local.hoverRawMetar) ? "6px" : "0" }}>
                        <span style={{ fontSize: "8px", color: theme.taf }}>Last TAF 1900Z</span>
                        <span style={{ fontSize: "8px", color: theme.metar, fontWeight: "bold" }}>NEW MET 1950Z</span>
                      </div>
                    )}

                    {local.hoverRawTaf && (
                      <div style={{ borderBottom: local.hoverRawMetar ? `1px solid ${theme.border}` : "none", paddingBottom: local.hoverRawMetar ? "6px" : "0" }}>
                        <div style={{ fontSize: "9px", color: theme.taf, marginBottom: "3px" }}>RAW TAF</div>
                        <div style={{ fontSize: "8px", color: theme.textDim, wordBreak: "break-all", lineHeight: 1.5 }}>
                          TAF LTFM 211650Z 2118/2224 06014KT 9999 FEW030 BKN080 TX18/2213Z TN08/2203Z BECMG 2120/2122 09018KT
                        </div>
                      </div>
                    )}

                    {local.hoverRawMetar && (
                      <div>
                        <div style={{ fontSize: "9px", color: theme.metar, marginBottom: "3px" }}>RAW METAR</div>
                        <div style={{ fontSize: "8px", color: theme.textDim, wordBreak: "break-all", lineHeight: 1.5 }}>
                          METAR LTFM 211920Z 06014KT 9999 FEW030 BKN080 18/06 Q1018 NOSIG
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Toggle listesi */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0", width: "100%" }}>
                    {[
                      { key: "hoverIcao",         label: "ICAO / IATA",      color: theme.textPrimary },
                      { key: "hoverAptName",      label: "Airport Name",     color: theme.textPrimary },
                      { key: "hoverRunways",      label: "Runway Status",    color: theme.textPrimary },
                      { key: "hoverTafSummary",   label: "TAF Summary",      color: theme.taf         },
                      { key: "hoverMetarSummary", label: "METAR Summary",    color: theme.metar       },
                      { key: "hoverLastTime",     label: "Last TAF / METAR", color: theme.textPrimary },
                      { key: "hoverRawTaf",       label: "RAW TAF",          color: theme.taf         },
                      { key: "hoverRawMetar",     label: "RAW METAR",        color: theme.metar       },
                    ].map(({ key, label, color }) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "10px", color: local[key] ? color : theme.textDim }}>{label}</span>
                        <div
                          onClick={() => set(key, !local[key])}
                          style={{
                            width: "32px", height: "18px", borderRadius: "9px",
                            background: local[key] ? theme.green : theme.bgPage,
                            border: `1px solid ${local[key] ? theme.green : theme.border}`,
                            position: "relative", cursor: "pointer", flexShrink: 0,
                          }}
                        >
                          <div style={{
                            position: "absolute",
                            left: local[key] ? "16px" : "2px",
                            top: "2px", width: "12px", height: "12px",
                            borderRadius: "50%",
                            background: local[key] ? "#000" : theme.textDim,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* §3.4.4 — TAF / METAR Window */}

<div style={sectionTitle()}>TAF / METAR WINDOW</div>

<div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
  <button onClick={() => set("tafWindowMode", "from_now")} style={btnGroup(local.tafWindowMode !== "time_range")}>FROM NOW</button>
  <button onClick={() => set("tafWindowMode", "time_range")} style={btnGroup(local.tafWindowMode === "time_range")}>TIME RANGE</button>
</div>

{local.tafWindowMode !== "time_range" ? (
  <div style={{ marginBottom: "12px" }}>
    <TafHoursGroup local={local} set={set} btnGroup={btnGroup} numInputStyle={numInputStyle} />
  </div>
) : (
<div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
  <span style={{ fontSize: "10px", color: theme.textDim, letterSpacing: "1px" }}>FROM</span>
  <div style={{ display: "flex", alignItems: "center", background: theme.bgPage, border: `1px solid ${theme.border}`, borderRadius: "3px", padding: "3px 5px", width: "58px", boxSizing: "border-box" }}>
    <input
      type="number" min="0" max="23"
      value={local.tafWindowFrom ?? 0}
      onChange={(e) => set("tafWindowFrom", parseInt(e.target.value) || 0)}
      style={{ ...numInputStyle, background: "transparent", border: "none", flex: 1, padding: 0, textAlign: "right", fontSize: "11px", fontWeight: "bold" }}
    />
    <span style={{ fontSize: "9px", color: theme.textDim, marginLeft: "2px" }}>Z</span>
  </div>
  <span style={{ fontSize: "10px", color: theme.textDim, letterSpacing: "1px" }}>TO</span>
  <div style={{ display: "flex", alignItems: "center", background: theme.bgPage, border: `1px solid ${theme.border}`, borderRadius: "3px", padding: "3px 5px", width: "58px", boxSizing: "border-box" }}>
    <input
      type="number" min="0" max="23"
      value={local.tafWindowTo ?? 23}
      onChange={(e) => set("tafWindowTo", parseInt(e.target.value) || 0)}
      style={{ ...numInputStyle, background: "transparent", border: "none", flex: 1, padding: 0, textAlign: "right", fontSize: "11px", fontWeight: "bold" }}
    />
    <span style={{ fontSize: "9px", color: theme.textDim, marginLeft: "2px" }}>Z</span>
  </div>
</div>
)}

{/* §3.4.5 — MINIMA SETTINGS */}
<div style={sectionTitle()}>MINIMA SETTINGS</div>

{/* AC Cat + T.Wind + C.Wind */}
<div style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "12px" }}>
  <div>
    <div style={label}>AC CAT</div>
    <div style={{ display: "flex", gap: "4px" }}>
      {["C", "D"].map((cat) => (
        <button key={cat} onClick={() => set("acCat", cat)} style={{ ...btnGroup(local.acCat === cat), padding: "3px 5px", width: "30px" }}>
          {cat}
        </button>
      ))}
    </div>
  </div>
  <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "flex-end" }}>
    <WindInput valueKey="tWindLimit" label="T.Wind" local={local} set={set} theme={theme} numInputStyle={numInputStyle} />
    <WindInput valueKey="cWindLimit" label="C.Wind" local={local} set={set} theme={theme} numInputStyle={numInputStyle} />
  </div>
</div>

{/* §3.4.5.1 — Amber buffer */}
<div style={sectionTitle(theme.amber)}>AMBER BUFFER LIMITS</div>

<div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
  {[["low", "LOW"], ["medium", "MED"], ["high", "HIGH"], ["manual", "MAN"]].map(([val, lbl]) => (
    <button key={val} onClick={() => setAmberBuffer(val)} style={btnGroup(local.amberBuffer === val)}>
      {lbl}
    </button>
  ))}
</div>

<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 58px)", gap: "5px", marginBottom: "12px" }}>
  {[
    { fieldKey: "amberBufferRvr", lbl: "RVR",    suffix: "m"  },
    { fieldKey: "amberBufferDh",  lbl: "DH",     suffix: "ft" },
    { fieldKey: "amberBufferTw",  lbl: "T.Wind", suffix: "kt" },
    { fieldKey: "amberBufferCw",  lbl: "C.Wind", suffix: "kt" },
  ].map(({ fieldKey, lbl, suffix }) => (
    <div key={fieldKey}>
      <div style={{ fontSize: "10px", color: theme.textDim, letterSpacing: "1px", marginBottom: "4px" }}>{lbl}</div>
      <div style={{ background: theme.bgPage, border: `1px solid ${theme.border}`, borderRadius: "3px", padding: "3px 5px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "2px" }}>
        {local.amberBuffer === "manual" ? (
          <input
            type="number" min="0"
            value={local[fieldKey] ?? ""}
            onChange={(e) => { const n = parseInt(e.target.value); if (!isNaN(n)) set(fieldKey, n); }}
            style={{ ...numInputStyle, background: "transparent", border: "none", width: "34px", padding: 0, textAlign: "right", fontSize: "11px", fontWeight: "bold" }}
          />
        ) : (
          <span style={{ textAlign: "right", fontSize: "11px", fontWeight: "bold", color: theme.textPrimary }}>{local[fieldKey]}</span>
        )}
        <span style={{ fontSize: "9px", color: theme.textDim, flexShrink: 0 }}>{suffix}</span>
      </div>
    </div>
  ))}
</div>

          {/* §3.4.6 — Notification settings */}
          <div style={sectionTitle()}>NOTIFICATIONS</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
            {[
              { valueKey: "newTafDuration",   manualKey: "newTafDurationManual",   color: theme.taf,     lbl: "TAF"   },
              { valueKey: "newMetarDuration", manualKey: "newMetarDurationManual", color: theme.metar,   lbl: "METAR" },
              { valueKey: "blinkDuration",    manualKey: "blinkDurationManual",    color: theme.textDim, lbl: "Blink" },
            ].map(({ valueKey, manualKey, color, lbl }) => (
              <div key={valueKey} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "10px", color, width: "34px", flexShrink: 0, fontWeight: "bold" }}>{lbl}</span>
                <DurationGroup valueKey={valueKey} manualKey={manualKey} local={local} set={set} btnGroup={btnGroup} numInputStyle={numInputStyle} theme={theme} />
              </div>
            ))}
          </div>

          {/* §3.4.7 — Save / Default / Reset */}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button onClick={handleSave} style={{ flex: 1, padding: "8px", fontSize: "11px", fontWeight: "bold", letterSpacing: "2px", cursor: "pointer", borderRadius: "3px", background: "transparent", border: `1px solid ${theme.green}`, color: theme.green, fontFamily: "'Courier New', monospace" }}>
              Save
            </button>
            <button onClick={user ? handleSaveAsDefault : undefined} style={{ flex: 1, padding: "8px", fontSize: "11px", fontWeight: "bold", letterSpacing: "2px", cursor: user ? "pointer" : "not-allowed", borderRadius: "3px", background: "transparent", border: `1px solid ${user ? theme.green : theme.border}`, color: user ? theme.green : theme.border, fontFamily: "'Courier New', monospace", opacity: user ? 1 : 0.4 }}>
              Default
            </button>
            <button onClick={handleReset} style={{ flex: 1, padding: "8px", fontSize: "11px", fontWeight: "bold", letterSpacing: "2px", cursor: "pointer", borderRadius: "3px", background: "transparent", border: `1px solid ${theme.green}`, color: theme.green, fontFamily: "'Courier New', monospace" }}>
              Reset
            </button>
          </div>

          {!user && (
            <div style={{ marginTop: "8px", fontSize: "9px", color: theme.textDim, textAlign: "center", letterSpacing: "0.5px" }}>
              Login to sync preferences across devices
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default PreferencesPanel;