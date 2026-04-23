// ============================================================
// ViewToggle.js
// §1  ViewToggle component
//   §1.1  Logo + name
//   §1.2  MAP / LIST toggle
//   §1.3  Theme toggle button
// ============================================================

// §1 — ViewToggle component
function ViewToggle({ view, onViewChange, themeMode, onThemeToggle, theme, user, onLogin, onLogout, onPrefsOpen }) {

  // §1.2 — MAP / LIST button style

//
  return (
    <>
      {/* §1.1 — Logo + OpsRadar name — centered */}
      <div style={{
        position: "absolute",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "4px",
      }}>
        <img
          src="/logo.png"
          alt="OpsRadar"
          style={{ height: "44px", width: "auto", opacity: 0.7 }}
        />
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "20px",
            fontWeight: "bold",
            fontStyle: "italic",
            color: theme.green,
          }}>Ops</span>
          <span style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "20px",
            fontWeight: "bold",
            fontStyle: "italic",
            color: theme.textPrimary,
          }}>Radar</span>
        </div>
      </div>

{/* §1.2 — MAP / LIST toggle — top left */}
<div
  onClick={() => onViewChange(view === "map" ? "list" : "map")}
  style={{
    position: "absolute", top: "12px", left: "12px",
    zIndex: 1000,
    display: "flex", alignItems: "center",
    width: "160px", height: "36px",
    borderRadius: "18px",
    background: theme.bgSurface ,
    border: `1px solid ${theme.green}`,
    cursor: "pointer",
    userSelect: "none",
    boxShadow: themeMode === "dark"
      ? "inset 0 1px 4px rgba(0,0,0,0.5)"
      : "inset 0 1px 4px rgba(0,0,0,0.1)",
  }}
>
  {/* Active side highlight */}
  <div style={{
    position: "absolute",
    width: "78px", height: "28px",
    borderRadius: "14px",
    background: themeMode === "dark" ? "#1a3a2a" : "#e8f5ee",
    top: "3px",
    left: view === "map" ? "4px" : "78px",
    transition: "left 0.25s ease",
  }} />

  {/* MAP label */}
  <div style={{
    position: "absolute", left: 0, width: "80px",
    textAlign: "center", fontSize: "11px",
     fontFamily: "'Courier New', monospace", fontWeight: "bold", letterSpacing: "1px",
    color: view === "map" ? theme.green : theme.textDim,
    zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
  }}>
    MAP
  </div>

  {/* LIST label */}
  <div style={{
    position: "absolute", right: 0, width: "80px",
    textAlign: "center", fontSize: "11px",
    fontFamily: "'Courier New', monospace", fontWeight: "bold", letterSpacing: "1px",
    color: view === "list" ? theme.green : theme.textDim,
    zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
  }}>
    LIST
  </div>
</div>
    {/* §1.2.1 — Preferences button */}
<button
  onClick={onPrefsOpen}
  style={{
    position: "absolute", top: "12px", right: "12px",
    zIndex: 1000,
    background: theme.bgPage,
    border: `1px solid ${theme.green}`,
    borderRadius: "50%",
    color: theme.green,
    fontFamily: "'Courier New', monospace",
    fontSize: "14px",
    width: "36px", height: "36px",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  }}
>
  ⚙
</button>




{/* §1.4 — User login button */}
<div style={{
  position: "absolute", top: "12px", right: "60px",
  zIndex: 1000, width: "80px",
}}>
  {user ? (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "8px", padding: "4px 10px 4px 4px",
      height: "36px", boxSizing: "border-box", width: "100%",
      borderRadius: "18px", border: `1px solid ${theme.border}`,
      background: theme.bgSurface,
    }}>
      <div
        style={{ position: "relative" }}
        onMouseEnter={(e) => e.currentTarget.querySelector(".email-tooltip").style.display = "block"}
        onMouseLeave={(e) => e.currentTarget.querySelector(".email-tooltip").style.display = "none"}
      >
        <div style={{
          width: "26px", height: "26px", borderRadius: "50%",
          background: theme.bgActive, border: `1px solid ${theme.green}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", fontWeight: "bold", color: theme.green,
          cursor: "default", flexShrink: 0,
        }}>
          {(user.displayName || user.email || "?")[0].toUpperCase()}
        </div>
        <div className="email-tooltip" style={{
          display: "none", position: "absolute",
          top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: theme.bgSurface, border: `1px solid ${theme.border}`,
          borderRadius: "4px", padding: "4px 10px",
          fontSize: "10px", color: theme.textDim,
          fontFamily: "'Courier New', monospace",
          whiteSpace: "nowrap", zIndex: 2000, letterSpacing: "0.5px",
        }}>
          {user.email}
        </div>
      </div>

      <div style={{ width: "1px", height: "16px", background: theme.border }} />

      <svg
        onClick={onLogout}
        width="13" height="13" viewBox="0 0 24 24"
        fill="none" stroke={theme.textDim} strokeWidth="2.5"
        style={{ cursor: "pointer", flexShrink: 0 }}
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </div>
  ) : (
    <div
      onClick={onLogin}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "36px", width: "100%", boxSizing: "border-box",
        borderRadius: "18px", border: `1px solid ${theme.green}`,
        background: theme.bgSurface,
        color: theme.green, fontFamily: "'Courier New', monospace",
        fontSize: "11px", fontWeight: "bold", letterSpacing: "1px",
        cursor: "pointer",
      }}
    >
      LOGIN
    </div>
  )}
</div>





{/* §1.3 — Theme toggle — top right */}
      <div style={{
        position: "absolute",
        top: "12px",
        right: "152px",
        zIndex: 1000,
      }}>
        <div
          onClick={onThemeToggle}
          style={{
            display: "flex",
            alignItems: "center",
            width: "160px",
            height: "36px",
            borderRadius: "18px",
            background: themeMode === "dark" ? "#0c1410" : theme.bgSurface,
            border: `1px solid ${theme.green}`,
            cursor: "pointer",
            position: "relative",
            userSelect: "none",
            boxShadow: themeMode === "dark"
              ? "inset 0 1px 4px rgba(0,0,0,0.5)"
              : "inset 0 1px 4px rgba(0,0,0,0.1)",
          }}
        >
          {/* Active side highlight */}
          <div style={{
            position: "absolute",
            width: "78px",
            height: "28px",
            borderRadius: "14px",
            background: themeMode === "dark" ? "#1a3a2a" : "#e8f5ee",
            top: "3px",
            left: themeMode === "light" ? "4px" : "78px",
            transition: "left 0.25s ease",
          }} />

          {/* LIGHT label */}
          <div style={{
            position: "absolute",
            left: 0,
            width: "80px",
            textAlign: "center",
            fontSize: "11px",
            fontFamily: "'Courier New', monospace",
            fontWeight: "bold",
            letterSpacing: "1px",
            color: themeMode === "light" ? theme.green : theme.textDim,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
          }}>
            <span style={{ fontSize: "13px" }}>☀</span> LIGHT
          </div>

          {/* DARK label */}
          <div style={{
            position: "absolute",
            right: 0,
            width: "80px",
            textAlign: "center",
            fontSize: "11px",
            fontFamily: "'Courier New', monospace",
            fontWeight: "bold",
            letterSpacing: "1px",
            color: themeMode === "dark" ? theme.green : theme.textDim,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
          }}>
            <span style={{ fontSize: "13px" }}>☾</span> DARK
          </div>

        </div>
      </div>
    </>
  );
}

export default ViewToggle;