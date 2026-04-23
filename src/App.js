// ============================================================
// App.js
// §1  Imports
// §2  App component
//   §2.1  State: selectedApt, parsed, sidebarOpen, view, themeMode
//   §2.2  Data fetch effect
//   §2.3  Handlers
//   §2.4  Render
// ============================================================

// §1 — Imports
import { useState, useEffect, useRef } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import ViewToggle from "./components/ViewToggle";
import ListView from "./components/ListView";
import { fetchTaf, parseTaf, fetchMetar, parseMetar } from "./services/tafService";
import { getTheme } from "./theme";
import { auth, logout } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import LoginModal from "./components/LoginModal";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PopoutPage from "./PopoutPage";
import PreferencesPanel from "./components/PreferencesPanel";
import { loadPrefs, savePrefs } from "./services/userPrefs";

// §2 — App component
function App() {

  // §2.1 — State
  const [selectedApt, setSelectedApt] = useState("LTFM");
  const [parsed, setParsed] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState("map");
  const [themeMode, setThemeMode] = useState("dark");
  const [user, setUser] = useState(null); 
  const theme = getTheme(themeMode);
const [loginModalOpen, setLoginModalOpen] = useState(false);
const prevRawTaf = useRef(null);
const prevMetarObsTime = useRef(null);
const [prefsOpen, setPrefsOpen] = useState(false);
const [prefs, setPrefs] = useState(() => loadPrefs());

  // §2.2 — Auth state listener
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => setUser(u));
  return () => unsub();
}, []);

  // §2.2 — Data fetch
  async function updateData(icao) {
    const [taf, metar] = await Promise.all([
      fetchTaf(icao),
      fetchMetar(icao),
    ]);
    const parsedTaf = parseTaf(taf);
    const parsedMetar = parseMetar(metar);
    if (parsedTaf) {
      setParsed({ ...parsedTaf, metar: parsedMetar });
    }
  }

  useEffect(() => {
    updateData(selectedApt);
    const interval = setInterval(() => updateData(selectedApt), 60000);
    return () => clearInterval(interval);
  }, [selectedApt]);

  // §2.3 — Handlers
function handleAptClick(icao) {
  setParsed(null);        // ← bunu hızldandırmak için kaldır
  setSelectedApt(icao);
  if (view !== "list") setSidebarOpen(true);
}
function handlePrefsChange(newPrefs) {
  setPrefs(newPrefs);
  savePrefs(newPrefs);
}

  function handleViewChange(newView) {
    setView(newView);
    if (newView === "list") setSidebarOpen(false);
  }

  function handleThemeToggle() {
    setThemeMode((prev) => prev === "dark" ? "light" : "dark");
  }
function handleLogin() {
  setLoginModalOpen(true);
}

function handleLogout() {
  logout();
}

// §2.4 — Render
return (
  <BrowserRouter>
    <Routes>
      <Route path="/popout" element={<PopoutPage />} />
      <Route path="/" element={
        <div style={{ position: "relative", height: "100vh", width: "100%", background: theme.bgPage }}>

          {/* ViewToggle */}
          <ViewToggle
            view={view}
            onViewChange={handleViewChange}
            themeMode={themeMode}
            onThemeToggle={handleThemeToggle}
            theme={theme}
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onPrefsOpen={() => setPrefsOpen(true)}
          />

          {/* Map veya List */}
{view === "map" && <Map onAptClick={handleAptClick} theme={theme} prefs={prefs} />}
{view === "list" && <ListView onAptClick={handleAptClick} theme={theme} prefs={prefs} onPrefsOpen={() => setPrefsOpen(true)} />}          {/* Meydan Sidebar */}
          {sidebarOpen && (
<Sidebar
  icao={selectedApt}
  parsed={parsed}
  onClose={() => setSidebarOpen(false)}
  theme={theme}
  prevRawTaf={prevRawTaf}
  prevMetarObsTime={prevMetarObsTime}
  prefs={prefs}
/>
          )}

          {/* Preferences Panel */}
          {prefsOpen && (
            <PreferencesPanel
              prefs={prefs}
              onPrefsChange={handlePrefsChange}
                onPrefsPreview={(newPrefs) => setPrefs(newPrefs)}
              onClose={() => setPrefsOpen(false)}
              theme={theme}
              user={user}
              view={view}
            />
          )}

          {/* Login Modal */}
          {loginModalOpen && (
            <LoginModal
              onClose={() => setLoginModalOpen(false)}
              theme={theme}
            />
          )}

        </div>
      } />
    </Routes>
  </BrowserRouter>
);



}

export default App;