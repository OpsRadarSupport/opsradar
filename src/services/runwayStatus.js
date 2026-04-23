import minima from "../data/minima";
import runways from "../data/runways";

// §1 — Default değerler (prefs gelmezse kullanılır)
export const BUFFER = {
  rvr: 500,
  dh: 200,
};

export const WIND_LIMITS = {
  maxXW: 25,
  maxTW: 10,
};

const DEFAULT_MINIMA = { rvr: 550, dh: 200 };

function calcWindComponents(rwyHeading, wdir, wspd) {
  if (wdir === null || wdir === undefined) return { xw: 0, tw: 0 };
  const angle = ((wdir - rwyHeading + 360) % 360) * (Math.PI / 180);
  const xw = Math.abs(Math.sin(angle) * wspd);
  const tw = Math.cos(angle) * wspd;
  return { xw, tw };
}

// §2 — prefs'ten limit değerlerini hesapla
function getLimits(prefs) {
  const maxXW = prefs?.cWindLimit ?? WIND_LIMITS.maxXW;
  const maxTW = prefs?.tWindLimit ?? WIND_LIMITS.maxTW;

  let bufferRvr = BUFFER.rvr;
  let bufferDh  = BUFFER.dh;

  if (prefs?.amberBuffer === "low")    { bufferRvr = 200;  bufferDh = 100; }
  if (prefs?.amberBuffer === "medium") { bufferRvr = 500;  bufferDh = 200; }
  if (prefs?.amberBuffer === "high")   { bufferRvr = 1000; bufferDh = 500; }
  if (prefs?.amberBuffer === "manual") {
    bufferRvr = prefs.amberBufferRvr ?? 500;
    bufferDh  = prefs.amberBufferDh  ?? 200;
  }

  return { maxXW, maxTW, bufferRvr, bufferDh };
}

export function getBestApproach(aptId, rwyId, prefs) {
  const acCat = prefs?.acCat ?? "C";
  const rwyMinima = minima.filter(
    (m) => m.aptId === aptId && m.rwyId === rwyId && m.rwyId !== "ALL" && m.acCat === acCat
  );
  const approachMinima = rwyMinima.filter((m) => m.appTyp !== "TO" && m.appTyp !== "ETOPS");
  if (approachMinima.length === 0) return { ...DEFAULT_MINIMA, appTyp: "DEFAULT" };
  return approachMinima.reduce((prev, curr) =>
    curr.rvr < prev.rvr ? curr : prev
  );
}

export function getRunwayStatus(aptId, rwyId, currentRvr, currentDh, wdir, wspd, prefs) {
  const acCat = prefs?.acCat ?? "C";
  const { maxXW, maxTW, bufferRvr, bufferDh } = getLimits(prefs);

  const rwyMinima = minima.filter(
    (m) => m.aptId === aptId && m.rwyId === rwyId && m.rwyId !== "ALL" && m.acCat === acCat
  );

  const approachMinima = rwyMinima.filter((m) => m.appTyp !== "TO" && m.appTyp !== "ETOPS");

  const bestApproach = approachMinima.length > 0
    ? approachMinima.reduce((prev, curr) => curr.rvr < prev.rvr ? curr : prev)
    : DEFAULT_MINIMA;

  // Rüzgar kontrolü
  if (wdir !== null && wdir !== undefined && wspd !== undefined && wspd > 0) {
    const aptData = runways[aptId];
    if (aptData) {
      const rwyData = aptData.runways.find((r) => r.id === rwyId);
      if (rwyData) {
        const { xw, tw } = calcWindComponents(rwyData.heading, wdir, wspd);
        if (xw > maxXW || tw > maxTW) return "red";
const amberXW = prefs?.amberBuffer === "manual" ? (prefs?.amberBufferCw ?? 5) : 
                prefs?.amberBuffer === "low"    ? 1 :
                prefs?.amberBuffer === "medium" ? 5 :
                prefs?.amberBuffer === "high"   ? 4 : 5;

const amberTW = prefs?.amberBuffer === "manual" ? (prefs?.amberBufferTw ?? 2) :
                prefs?.amberBuffer === "low"    ? 1 :
                prefs?.amberBuffer === "medium" ? 2 :
                prefs?.amberBuffer === "high"   ? 4 : 2;

if (xw > maxXW - amberXW || tw > maxTW - amberTW) return "amber";      }
    }
  }

  // RVR / DH kontrolü
  if (currentRvr < bestApproach.rvr || currentDh < bestApproach.dh) {
    return "red";
  }

  if (
    currentRvr < bestApproach.rvr + bufferRvr ||
    currentDh  < bestApproach.dh  + bufferDh
  ) {
    return "amber";
  }

  return "green";
}