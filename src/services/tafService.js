export async function fetchTaf(icao) {
  try {
    const response = await fetch(`/avwx/taf?ids=${icao}&format=json`);
    if (!response.ok) return null;
    const text = await response.text();
    if (!text || text.trim() === "") return null;
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data.length === 1 ? data[0] : data;
    return null;
  } catch (e) {
    return null;
  }
}

export async function fetchMetar(icao) {
  try {
   const response = await fetch(`/avwx/metar?ids=${icao}&format=json`);
    if (!response.ok) return null;
    const text = await response.text();
    if (!text || text.trim() === "") return null;
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data.length === 1 ? data[0] : data;
    return null;
  } catch (e) {
    return null;
  }
}

function parseWdir(wdir) {
  if (wdir === null || wdir === undefined) return null;
  if (wdir === "VRB" || wdir === "vrb") return "VRB";
  const val = parseFloat(wdir);
  return isNaN(val) ? null : val;
}

export function parseTaf(taf) {
  if (!taf || !taf.fcsts || taf.fcsts.length === 0) return null;

  const baseFcsts = taf.fcsts.filter((f) => f.fcstChange !== "TEMPO" && f.fcstChange !== "PROB");

  // Parse with inheritance: if visib/clouds empty, inherit from previous
  let lastRvr = 9999;
  let lastDh = 9999;

  const fcsts = baseFcsts.map((f) => {
    const rawRvr = f.visib === "6+" ? 9999 : (!f.visib || f.visib === "") ? null : parseFloat(f.visib) * 1000;
    const rawDh = f.clouds?.[0]?.base ?? null;

    if (rawRvr !== null) lastRvr = rawRvr;
    if (rawDh !== null) lastDh = rawDh;

    return {
      timeFrom: f.timeFrom,
      timeTo:   f.timeTo,
      fcstChange: f.fcstChange, 
      rvr:      lastRvr,
      dh:       lastDh,
      wdir:     parseWdir(f.wdir),
      wspd:     f.wspd ?? 0,
    };
  });

  const fcst = fcsts[0];
return {
  rvr:       fcst.rvr,
  dh:        fcst.dh,
  wdir:      fcst.wdir,
  wspd:      fcst.wspd,
  rawTaf:    taf.rawTAF ?? null,
  issueTime: taf.issueTime ?? null,
  fcsts,
};
}

export function parseMetar(metar) {
  if (!metar) return null;

  const rvr = metar.visib === "6+" ? 9999 : parseFloat(metar.visib) * 1000;
  const cloudBase = metar.clouds?.[0]?.base;
  const dh = cloudBase != null ? cloudBase : 9999;
  const wdir = parseWdir(metar.wdir);
  const wspd = metar.wspd ?? 0;

  return {
    rvr,
    dh,
    wdir,
    wspd,
    rawMetar: metar.rawOb ?? null,
    obsTime: metar.obsTime ?? null,
  };
}