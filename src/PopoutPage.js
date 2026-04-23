// ============================================================
// PopoutPage.js
// §1  Imports
// §2  PopoutPage component
//   §2.1  URL parametrelerini oku
//   §2.2  Theme state
//   §2.3  Render
// ============================================================

// §1 — Imports
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ListView from "./components/ListView";
import { getTheme } from "./theme";

// §2 — PopoutPage component
function PopoutPage() {

  // §2.1 — URL parametrelerini oku
  const [searchParams] = useSearchParams();
  const icaos     = searchParams.get("icaos") || "";
  const level     = parseInt(searchParams.get("level") || "2");
  const themeMode = searchParams.get("theme") || "dark";

  // §2.2 — Theme
  const theme = getTheme(themeMode);

  // §2.3 — Render
  return (
    <div style={{ background: theme.bgPage, minHeight: "100vh" }}>
      <ListView
        onAptClick={() => {}}
        theme={theme}
        initialIcaos={icaos.split(",").filter(Boolean)}
        initialLevel={level}
        popout={true}
      />
    </div>
  );
}

export default PopoutPage;