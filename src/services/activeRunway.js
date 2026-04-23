import runways from "../data/runways";

// Rüzgar açısına göre XW ve TW hesapla
function calcWindComponents(rwyHeading, wdir, wspd) {
  if (wdir === null) return { xw: 0, tw: 0 };
  const angle = ((wdir - rwyHeading + 360) % 360) * (Math.PI / 180);
  const xw = Math.abs(Math.sin(angle) * wspd);
  const tw = Math.cos(angle) * wspd; // pozitif = tailwind, negatif = headwind
  return { xw, tw };
}

// Aktif pisti seç
export function selectActiveRunway(icao, wdir, wspd, adminPriority = null) {
  const apt = runways[icao];
  if (!apt) return null;

  // Admin önceliği varsa kontrol et
  if (adminPriority) {
    const priorityRwy = apt.runways.find((r) => r.id === adminPriority.rwyId);
    if (priorityRwy) {
      const { xw, tw } = calcWindComponents(priorityRwy.heading, wdir, wspd);
      if (xw <= adminPriority.maxXW && tw <= adminPriority.maxTW) {
        return priorityRwy.id;
      }
    }
  }

  // En uzun pisti seç
  const longest = apt.runways.reduce((prev, curr) =>
    curr.length > prev.length ? curr : prev
  );

  return longest.id;
}