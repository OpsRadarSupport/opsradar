// ============================================================
// theme.js
// §1  Dark theme tokens
// §2  Light theme tokens
// §3  getTheme helper
// ============================================================

// §1 — Dark theme
export const darkTheme = {
  // Backgrounds
  bgPage:    "#080c0a",
  bgSurface: "#0c1410",
  bgActive:  "#0f1f16",

  // Borders
  border:    "#1a3a2a",

  // Text
  textPrimary: "#b8d4c2",
  textDim:     "#4a7a5e",

  // Status colors
  green:   "#00e87a",
  amber:   "#ffb020",
  red:     "#ff3d55",
  unknown: "#6c6c6c",

  // Group backgrounds
  groupBgGreen:   "#0a1f0f",
  groupBgAmber:   "#1a1000",
  groupBgRed:     "#1f0a0a",
  groupBgUnknown: "#0c1410",

  // Group borders
  groupBorderGreen:   "#00e87a44",
  groupBorderAmber:   "#ffb02044",
  groupBorderRed:     "#ff3d5544",
  groupBorderUnknown: "#1a3a2a",

  // Special
  metar: "#5b9bd5",
  taf:   "#89fafc",

  // Map
  mapTile: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  tooltipBg:    "#bec7c3",
  tooltipColor: "#000000",
  tooltipBorder:"#fdffff",
};

// §2 — Light theme
export const lightTheme = {
  // Backgrounds
  bgPage:    "#f6f6f6",
  bgSurface: "#dcdbdb",
  bgActive:  "#bab9b9",

  // Borders
  border:    "#c0d8c8",

  // Text
  textPrimary: "#062312",
  textDim:     "#2d8257",

  // Status colors
  green:   "#1a7a40",
  amber:   "#c07000",
  red:     "#c02030",
  unknown: "#6c6c6c",

  // Group backgrounds
  groupBgGreen:   "#d3f1dd",
  groupBgAmber:   "#fdf0d8",
  groupBgRed:     "#fdebeb",
  groupBgUnknown: "#fcfefd",

  // Group borders
  groupBorderGreen:   "#1a7a4044",
  groupBorderAmber:   "#c0700044",
  groupBorderRed:     "#c0203044",
  groupBorderUnknown: "#c0d8c8",

  // Special
  metar: "#156ada",
  taf:   "#1f7480",

  // Map
  mapTile: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  tooltipBg:    "#1a2e22",
  tooltipColor: "#ffffff",
  tooltipBorder:"#c0d8c8",
};

// §3 — getTheme helper
export function getTheme(mode) {
  return mode === "light" ? lightTheme : darkTheme;
}