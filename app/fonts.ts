import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";

/**
 * Fraunces — display. An old-style humanist serif with soft, slightly wonky
 * terminals: warmth and character without cosplaying a luxury brand.
 *
 * `axes` is deliberately omitted. That serves the wght-only variable file with
 * `opsz` pinned at its default of 14 — the *text* cut, lower contrast and
 * sturdier. Since the design bans big headline sentences, our headings live at
 * 17-22px, which is exactly where the text cut belongs and where the display
 * cut would go wispy. It is also the smallest Fraunces Google will serve.
 */
export const fontDisplay = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  weight: "variable",
  preload: true,
  adjustFontFallback: true,
  fallback: ["Georgia", "Times New Roman", "serif"],
});

/**
 * Instrument Sans — UI. Neutral without being the face every generated
 * interface reaches for. The `wdth` axis is a systemic asset, not decoration:
 * a narrowed cut buys real horizontal room in compact console table headers
 * and long identifier columns without shipping a second font file.
 */
export const fontSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
  weight: "variable",
  axes: ["wdth"],
  preload: true,
  adjustFontFallback: true,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

/**
 * JetBrains Mono — money, batch numbers, order references, telemetry.
 * Chosen for glyph disambiguation: dotted zero, distinct 1/l/I, 5/S, 8/B.
 * Mis-reading a character in NK-SB-2407 is an operational failure, not a
 * typographic one. Not preloaded: it is below the fold, inside tables.
 */
export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  weight: "variable",
  preload: false,
  adjustFontFallback: true,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const fontVariables = `${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable}`;
