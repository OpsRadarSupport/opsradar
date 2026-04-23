// ============================================================
// LoginModal.js
// §1  Imports
// §2  LoginModal component
//   §2.1  State
//   §2.2  Handlers
//   §2.3  Render
// ============================================================

// §1 — Imports
import { useState } from "react";
import { loginWithGoogle, loginWithEmail, registerWithEmail } from "../services/firebase";

// §2 — LoginModal component
function LoginModal({ onClose, theme }) {

  // §2.1 — State
  const [mode, setMode] = useState("login"); // "login" | "register" | "verify"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // §2.2 — Handlers
  async function handleGoogle() {
    try {
      await loginWithGoogle();
      onClose();
    } catch (e) {
      setError("Google sign-in failed. Please try again.");
    }
  }

  async function handleEmailSubmit() {
    setError("");
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
        onClose();
      } else {
        await registerWithEmail(email, password);
        setMode("verify");
      }
    } catch (e) {
      if (e.code === "auth/user-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
} else if (e.code === "auth/email-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
  setError("Invalid email or password.");
} else if (e.code === "auth/email-already-in-use") {
  setError("This email is already registered.");
} else if (e.code === "auth/weak-password") {
  setError("Password must be at least 6 characters.");
} else if (e.code === "auth/invalid-email") {
  setError("Invalid email address.");
} else if (e.code === "auth/email-not-verified") {
  setError("Please verify your email before signing in.");
} else {
  setError("Something went wrong. Please try again.");
}
    }
  }

  // §2.3 — Render

  // Verify screen
  if (mode === "verify") {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: theme.bgSurface,
          border: `1px solid ${theme.border}`,
          borderRadius: "8px",
          padding: "32px",
          width: "320px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
        }}>
          <span style={{ fontSize: "32px" }}>✉</span>
          <span style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "13px",
            fontWeight: "bold",
            letterSpacing: "2px",
            color: theme.textPrimary,
            textAlign: "center",
          }}>
            VERIFY YOUR EMAIL
          </span>
          <span style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "11px",
            color: theme.textDim,
            textAlign: "center",
            lineHeight: "1.6",
          }}>
            A verification link has been sent to<br />
            <span style={{ color: theme.textPrimary }}>{email}</span><br />
            Please check your inbox and verify before signing in.
          </span>
          <button onClick={onClose} style={{
            background: theme.green,
            border: "none",
            borderRadius: "4px",
            color: "#000",
            fontFamily: "'Courier New', monospace",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "2px",
            padding: "10px 24px",
            cursor: "pointer",
            width: "100%",
          }}>
            OK
          </button>
        </div>
      </div>
    );
  }

  // Login / Register screen
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: theme.bgSurface,
        border: `1px solid ${theme.border}`,
        borderRadius: "8px",
        padding: "32px",
        width: "320px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "14px",
            fontWeight: "bold",
            letterSpacing: "2px",
            color: theme.textPrimary,
          }}>
            {mode === "login" ? "LOGIN" : "REGISTER"}
          </span>
          <button onClick={onClose} style={{
            background: "transparent",
            border: "none",
            color: theme.textDim,
            fontSize: "18px",
            cursor: "pointer",
          }}>✕</button>
        </div>

{/* Google button */}
<button onClick={handleGoogle} style={{
  background: "#ffffff",
  border: "1px solid #dadce0",
  borderRadius: "4px",
  color: "#3c4043",
  fontFamily: "Arial, sans-serif",
  fontSize: "14px",
  fontWeight: "500",
  padding: "10px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
}}>
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
  Continue with Google
</button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ flex: 1, height: "1px", background: theme.border }} />
          <span style={{ color: theme.textDim, fontSize: "11px", fontFamily: "'Courier New', monospace" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: theme.border }} />
        </div>

        {/* Email input */}
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            background: theme.bgPage,
            border: `1px solid ${theme.border}`,
            borderRadius: "4px",
            color: theme.textPrimary,
            fontFamily: "'Courier New', monospace",
            fontSize: "12px",
            padding: "10px",
            outline: "none",
          }}
        />

        {/* Password input */}
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
          style={{
            background: theme.bgPage,
            border: `1px solid ${theme.border}`,
            borderRadius: "4px",
            color: theme.textPrimary,
            fontFamily: "'Courier New', monospace",
            fontSize: "12px",
            padding: "10px",
            outline: "none",
          }}
        />

        {/* Error message */}
        {error && (
          <span style={{ color: theme.red, fontSize: "11px", fontFamily: "'Courier New', monospace" }}>
            {error}
          </span>
        )}
        

        {/* Submit button */}
        <button onClick={handleEmailSubmit} style={{
          background: theme.green,
          border: "none",
          borderRadius: "4px",
          color: "#000",
          fontFamily: "'Courier New', monospace",
          fontSize: "12px",
          fontWeight: "bold",
          letterSpacing: "2px",
          padding: "10px",
          cursor: "pointer",
        }}>
          {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>

        {/* Mode switch */}
        <span
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          style={{
            color: theme.textDim,
            fontSize: "11px",
            fontFamily: "'Courier New', monospace",
            textAlign: "center",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {mode === "login" ? "Don't have an account? Register" : "Already have an account? Sign in"}
        </span>

      </div>
    </div>
  );
}

export default LoginModal;