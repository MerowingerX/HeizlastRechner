/**
 * Norm-Außentemperatur θ_e nach PLZ-Region.
 *
 * Die Datentabelle src/core/data/normaussentemperatur.json stammt aus
 * mylius/heizlast-web (ohne Lizenz veröffentlicht) und ist deshalb NICHT im Repo
 * (.gitignore). Jeder holt sie sich selbst, siehe KLIMA_DATEI_HINWEIS / README.
 * Fehlt die Datei, liefert thetaEAusPlz() null und θ_e wird von Hand eingetragen.
 * Für verbindliche Werte ohnehin den ortsgenauen Wert der DIN/TS 12831-1 eintragen.
 */

export interface KlimaTreffer {
  thetaE: number
  referenzort: string
  plzPrefix: string
}

type Region = { plz: string; ort: string; thetaE: number }

/** Standard-θ_e ohne PLZ-Treffer (Region Braunschweig), wird in neuen Projekten vorbelegt. */
export const STANDARD_THETA_E = -14

export const KLIMA_DATEI = 'src/core/data/normaussentemperatur.json'
export const KLIMA_DATEI_URL = 'https://raw.githubusercontent.com/mylius/heizlast-web/main/src/data/normaussentemperatur.json'
export const KLIMA_DATEI_HINWEIS = `curl -o ${KLIMA_DATEI} ${KLIMA_DATEI_URL}`

// import.meta.glob wird von Vite/Vitest zur Build-Zeit aufgelöst; fehlt die Datei, ist das Ergebnis leer.
// Unter tsx/Node gibt es import.meta.glob nicht → keine Daten (die CLI braucht den PLZ-Vorschlag nicht).
let regionen: Region[] = []
try {
  const gefunden = import.meta.glob<{ regions: Region[] }>('./data/normaussentemperatur.json', { eager: true, import: 'default' })
  regionen = Object.values(gefunden)[0]?.regions ?? []
} catch {
  regionen = []
}

export const klimaDatenVorhanden = (): boolean => regionen.length > 0

export function thetaEAusPlz(plz: string): KlimaTreffer | null {
  const ziffern = plz.trim().match(/^\d{2,5}/)?.[0]
  if (!ziffern) return null
  const prefix = ziffern.slice(0, 2)
  const r = regionen.find((x) => x.plz === prefix)
  return r ? { thetaE: r.thetaE, referenzort: r.ort, plzPrefix: r.plz } : null
}
