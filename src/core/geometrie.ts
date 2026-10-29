/**
 * Geometrie-Hilfen: Flächen und Volumen aus den erfassten Maßen.
 */
import type { Flaeche, Geschoss, Oeffnung, Projekt, Raum } from './model'

export const oeffnungsFlaeche = (o: Oeffnung): number => o.breite * o.hoehe * o.anzahl

/** Wirksame Höhe einer Fläche: eigene Höhe oder Geschosshöhe. */
export function flaechenHoehe(f: Flaeche, geschoss: Geschoss | undefined): number {
  return f.hoehe ?? geschoss?.geschosshoehe ?? 0
}

/** Bruttofläche (inkl. Öffnungen) [m²]. */
export function bruttoFlaeche(f: Flaeche, geschoss: Geschoss | undefined): number {
  if (f.flaecheDirekt !== null) return f.flaecheDirekt
  return f.laenge * flaechenHoehe(f, geschoss)
}

/** Summe der Öffnungsflächen [m²]. */
export const oeffnungenSumme = (f: Flaeche): number => f.oeffnungen.reduce((s, o) => s + oeffnungsFlaeche(o), 0)

/** Nettofläche (abzüglich Öffnungen) [m²]. */
export function nettoFlaeche(f: Flaeche, geschoss: Geschoss | undefined): number {
  return bruttoFlaeche(f, geschoss) - oeffnungenSumme(f)
}

export function geschossVon(p: Projekt, r: Raum): Geschoss | undefined {
  return p.geschosse.find((g) => g.id === r.geschossId)
}

/** Lichte Höhe des Raums [m]. */
export function raumHoehe(r: Raum, geschoss: Geschoss | undefined): number {
  return r.lichteHoehe ?? geschoss?.lichteHoehe ?? 0
}

/** Raumvolumen (Innenmaße) [m³]. */
export function raumVolumen(r: Raum, geschoss: Geschoss | undefined): number {
  return r.grundflaeche * raumHoehe(r, geschoss)
}

/** Norm-Wärmeleistung aller Heizkörper eines Raums bei 75/65/20 [W]; null wenn unbekannt. */
export function heizkoerperLeistungN(r: Raum): number | null {
  if (r.heizkoerper.length === 0) return 0
  let summe = 0
  for (const h of r.heizkoerper) {
    if (h.phiN === null) return null
    summe += h.phiN * h.anzahl
  }
  return summe
}

export const runde = (x: number, stellen = 2): number => {
  const f = 10 ** stellen
  return Math.round(x * f) / f
}
