/**
 * Verbrauchsabgleich: aus Jahresverbrauch und Gradtagzahl einen
 * gemessenen Wärmeverlustkoeffizienten bestimmen.
 *
 *   Q_H   = Menge · Energiegehalt · Nutzungsgrad − Q_WW         [kWh]
 *   H     = Q_H · 1000 / (G20/15 · 24 h)                         [W/K]
 *   Φ     = H · (20 °C − θ_e)                                    [W]
 *
 * Interne und solare Gewinne stecken bereits im Verbrauch (und in der
 * Heizgrenze 15 °C der Gradtagzahl). Deshalb liegt die Normheizlast typisch
 * 10–40 % über diesem Wert.
 */
import { TRAEGER_INFO } from './kataloge'
import type { Projekt, Verbrauch } from './model'

/** Langjähriges Mittel G20/15 für Deutschland [Kd] (Richtwert, standortabhängig 3.200–4.500). */
export const GTZ_STANDARD = 3500
/** Trinkwarmwasser-Nutzwärme [kWh/(m²a)] (DIN V 4701-10) */
export const WW_KWH_M2 = 12.5

export interface VerbrauchAuswertung {
  id: string
  zeitraum: string
  endenergie: number
  nutzwaerme: number
  warmwasser: number
  heizwaerme: number
  gradtagzahl: number
  gradtagzahlGeschaetzt: boolean
  h: number
  phi: number
  /** Normheizlast / Verbrauchsheizlast */
  verhaeltnis: number | null
  warnung: string
}

export function werteVerbrauchAus(p: Projekt, v: Verbrauch, wohnflaeche: number, phiNorm: number | null): VerbrauchAuswertung {
  const info = TRAEGER_INFO[v.traeger]
  const faktor = info.kWhJeEinheit[v.einheit]
  const warnung: string[] = []
  if (faktor === undefined) warnung.push(`Einheit ${v.einheit} passt nicht zu ${info.label}`)
  const endenergie = v.menge * (faktor ?? 1)
  const nutzwaerme = endenergie * v.nutzungsgrad
  const warmwasser = v.inklWarmwasser ? WW_KWH_M2 * wohnflaeche : 0
  const heizwaerme = Math.max(nutzwaerme - warmwasser, 0)
  const gradtagzahl = v.gradtagzahl ?? GTZ_STANDARD
  const h = (heizwaerme * 1000) / (gradtagzahl * 24)
  const thetaE = p.klima.thetaE ?? -12
  const phi = h * (20 - thetaE)
  return {
    id: v.id,
    zeitraum: v.zeitraum,
    endenergie,
    nutzwaerme,
    warmwasser,
    heizwaerme,
    gradtagzahl,
    gradtagzahlGeschaetzt: v.gradtagzahl === null,
    h,
    phi,
    verhaeltnis: phiNorm !== null && phi > 0 ? phiNorm / phi : null,
    warnung: warnung.join('; '),
  }
}

export function bewerteVerhaeltnis(x: number | null): string {
  if (x === null) return '–'
  if (x < 0.9) return 'Norm unter Verbrauch – Eingaben prüfen (fehlende Flächen? zu gute U-Werte? Verbrauch inkl. anderer Nutzer?)'
  if (x <= 1.5) return 'plausibel (Norm liegt erwartungsgemäß über dem Verbrauch)'
  return 'Norm deutlich über Verbrauch – U-Werte/n50 evtl. zu pessimistisch oder Teile des Hauses wenig beheizt'
}
