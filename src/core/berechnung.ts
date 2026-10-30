/**
 * Heizlastberechnung nach DIN EN 12831-1 (Standardverfahren, vereinfacht
 * wo im Kommentar vermerkt) mit Ansätzen der DIN/TS 12831-1.
 *
 *   Φ_HL,i = Φ_T,i + Φ_V,i
 *   Φ_T,i  = Σ_k A_k · (U_k + ΔU_TB) · (θ_int,i − θ_adj,k)      (Erdreich: Sonderfall)
 *   Φ_V,i  = 0,34 · V̇_i · (θ_int,i − θ_e)                        [W, V̇ in m³/h]
 */
import { bruttoFlaeche, geschossVon, nettoFlaeche, oeffnungsFlaeche, raumVolumen } from './geometrie'
import type { Abschirmung, Angrenzung, Bauteil, Kategorie, Orientierung, Projekt, Raum } from './model'

/** ρ·c_p der Luft [Wh/(m³K)] */
export const RHO_CP_LUFT = 0.34
/** Jahrestemperaturschwankung Erdreich f_g1 */
export const F_G1 = 1.45
/** Grundwasserfaktor G_w (Grundwasser > 1 m unter Bodenplatte) */
export const G_W = 1.0
/** Wärmeleitfähigkeit Erdreich λ_g [W/(mK)] (Lehm/Ton) */
export const LAMBDA_ERDREICH = 2.0

export interface FlaechenPosten {
  flaecheId: string
  /** gesetzt, wenn der Posten eine Öffnung ist */
  oeffnungId: string | null
  bezeichnung: string
  kategorie: Kategorie
  orientierung: Orientierung
  art: Angrenzung['art']
  /** wirksame Fläche [m²] (Wände netto, Öffnungen einzeln) */
  flaeche: number
  u: number
  /** U + ΔU_TB bzw. U_equiv (Erdreich) */
  uKorr: number
  /** Temperatur auf der anderen Seite [°C] (Erdreich: θ_m,e) */
  thetaAdj: number
  /** Wärmeverlustkoeffizient bezogen auf (θ_int − θ_e) [W/K] */
  h: number
  /** Wärmestrom [W]; negativ = Wärmegewinn vom Nachbarn */
  phi: number
}

export interface RaumErgebnis {
  raumId: string
  name: string
  nummer: string
  geschoss: string
  thetaInt: number
  grundflaeche: number
  volumen: number
  posten: FlaechenPosten[]
  phiT: number
  /** Mindestvolumenstrom n_min · V [m³/h] */
  vMin: number
  /** Infiltration [m³/h] */
  vInf: number
  /** wirksamer Volumenstrom für Φ_V [m³/h] */
  vWirksam: number
  phiV: number
  phiHL: number
  wProM2: number
  /** H_T + H_V [W/K], bezogen auf θ_int − θ_e */
  h: number
}

export interface GebaeudeErgebnis {
  thetaE: number
  raeume: RaumErgebnis[]
  /** Transmission nur über die Gebäudehülle (ohne Innenbauteile zwischen Räumen) */
  phiT: number
  phiV: number
  phiHL: number
  /** Summe der Raumheizlasten (≥ Gebäudeheizlast) */
  summeRaeume: number
  wohnflaeche: number
  wProM2: number
  /** Gebäude-Wärmeverlustkoeffizient H [W/K] = Φ_HL / (20 − θ_e) */
  h: number
  /** B' der Bodenplatte [m] */
  bStrich: number | null
}

export class BerechnungsFehler extends Error {}

// ---------------------------------------------------------------------------
// Erdreich (EN ISO 13370, vereinfacht)

/**
 * Äquivalenter U-Wert einer Bodenplatte auf Erdreich nach EN ISO 13370
 * aus dem Bauteil-U-Wert (R_f = 1/U − R_si − R_se) und dem charakteristischen Maß B'.
 */
export function uEquivBodenplatte(u: number, bStrich: number): number {
  const w = 0.3 // Wanddicke [m]
  const rf = Math.max(1 / u - 0.17 - 0.04, 0)
  const dt = w + LAMBDA_ERDREICH * (0.17 + rf + 0.04)
  if (dt < bStrich) return ((2 * LAMBDA_ERDREICH) / (Math.PI * bStrich + dt)) * Math.log((Math.PI * bStrich) / dt + 1)
  return LAMBDA_ERDREICH / (0.457 * bStrich + dt)
}

/**
 * B' = A_g / (0,5 · P). Die Bodenfläche ist die Summe aller erdberührten
 * Bodenflächen; der Umfang wird für einen quadratischen Grundriss geschätzt.
 */
export function bStrichSchaetzen(p: Projekt): number | null {
  let a = 0
  for (const r of p.raeume)
    for (const f of r.flaechen) {
      const t = p.bauteile.find((b) => b.id === f.bauteilId)
      if (f.angrenzung.art === 'erdreich' && t?.kategorie === 'FB') a += bruttoFlaeche(f, geschossVon(p, r))
    }
  if (a <= 0) return null
  const umfang = 4 * Math.sqrt(a)
  return a / (0.5 * umfang)
}

// ---------------------------------------------------------------------------
// Lüftung

/** Abschirmkoeffizient e nach Anzahl windexponierter Fassaden (DIN EN 12831:2003, Tab. D.7). */
export function abschirmKoeffizient(abschirmung: Abschirmung, fassaden: number): number {
  if (fassaden <= 0) return 0
  const tab: Record<Abschirmung, [number, number]> = { keine: [0.03, 0.05], mittel: [0.02, 0.03], gut: [0.01, 0.02] }
  return tab[abschirmung][fassaden === 1 ? 0 : 1]
}

const FASSADEN_KATEGORIEN = new Set<Kategorie>(['AW', 'DA'])

/** Anzahl der Himmelsrichtungen, in die der Raum Außenflächen hat. */
export function exponierteFassaden(r: Raum, bauteile: Map<string, Bauteil>): number {
  const richtungen = new Set<string>()
  for (const f of r.flaechen) {
    const t = bauteile.get(f.bauteilId)
    if (f.angrenzung.art === 'aussen' && f.orientierung !== 'H' && t && FASSADEN_KATEGORIEN.has(t.kategorie)) richtungen.add(f.orientierung)
  }
  return richtungen.size
}

// ---------------------------------------------------------------------------
// Raum

function thetaAdjazent(p: Projekt, a: Angrenzung, thetaE: number): number {
  switch (a.art) {
    case 'aussen':
      return thetaE
    case 'erdreich':
      // Modus 'bfaktor' (heizlast-web): Erdreich wie unbeheizter Nachbarbereich, θ = 20 − b · (20 − θ_e)
      if (p.optionen.erdreich === 'bfaktor') return 20 - p.optionen.erdreichB * (20 - thetaE)
      return p.klima.thetaMe ?? 9
    case 'unbeheizt':
    case 'beheizt':
      return a.theta
    case 'raum': {
      const r = p.raeume.find((x) => x.id === a.raumId)
      if (!r) throw new BerechnungsFehler(`Angrenzender Raum ${a.raumId} fehlt`)
      return r.thetaInt
    }
  }
}

export function berechneRaum(p: Projekt, r: Raum, thetaE: number, bStrich: number | null): RaumErgebnis {
  const bauteile = new Map(p.bauteile.map((t) => [t.id, t]))
  const g = geschossVon(p, r)
  const ti = r.thetaInt
  const dTe = ti - thetaE
  const posten: FlaechenPosten[] = []

  const posten_ = (
    flaecheId: string,
    oeffnungId: string | null,
    bezeichnung: string,
    t: Bauteil,
    orientierung: Orientierung,
    a: Angrenzung,
    flaeche: number,
  ) => {
    const thetaAdj = thetaAdjazent(p, a, thetaE)
    let uKorr: number
    let phi: number
    if (a.art === 'erdreich' && p.optionen.erdreich === 'iso13370') {
      // Φ = A · U_equiv · f_g1 · G_w · (θ_int − θ_m,e)   (= … · f_g2 · (θ_int − θ_e))
      uKorr = t.kategorie === 'FB' && bStrich !== null ? uEquivBodenplatte(t.u, bStrich) : t.u
      phi = flaeche * uKorr * F_G1 * G_W * (ti - thetaAdj)
    } else {
      uKorr = t.u + t.deltaUTb
      phi = flaeche * uKorr * (ti - thetaAdj)
    }
    posten.push({
      flaecheId,
      oeffnungId,
      bezeichnung,
      kategorie: t.kategorie,
      orientierung,
      art: a.art,
      flaeche,
      u: t.u,
      uKorr,
      thetaAdj,
      h: dTe !== 0 ? phi / dTe : 0,
      phi,
    })
  }

  for (const f of r.flaechen) {
    const t = bauteile.get(f.bauteilId)
    if (!t) throw new BerechnungsFehler(`Raum „${r.name}": Bauteil ${f.bauteilId} fehlt`)
    posten_(f.id, null, t.name, t, f.orientierung, f.angrenzung, nettoFlaeche(f, g))
    for (const o of f.oeffnungen) {
      const ot = bauteile.get(o.bauteilId)
      if (!ot) throw new BerechnungsFehler(`Raum „${r.name}": Bauteil ${o.bauteilId} fehlt`)
      posten_(f.id, o.id, o.bezeichnung || ot.name, ot, f.orientierung, f.angrenzung, oeffnungsFlaeche(o))
    }
  }

  const phiT = posten.reduce((s, x) => s + x.phi, 0)

  // Lüftung
  const v = raumVolumen(r, g)
  const vMin = r.nMin * v
  const n50 = p.gebaeude.n50 ?? 0
  const e = abschirmKoeffizient(p.gebaeude.abschirmung, exponierteFassaden(r, bauteile))
  const vInf = 2 * v * n50 * e // ε = 1 (Gebäudehöhe < 10 m)
  let vWirksam: number
  if (p.gebaeude.lueftungsanlage) {
    // Zuluft mit WRG: nur (1 − η) des Mindestvolumenstroms wirkt als Verlust (vereinfacht)
    const eta = p.gebaeude.wrgEta ?? 0
    vWirksam = vInf + vMin * (1 - eta)
  } else {
    vWirksam = Math.max(vInf, vMin)
  }
  const phiV = RHO_CP_LUFT * vWirksam * dTe
  const phiHL = phiT + phiV

  return {
    raumId: r.id,
    name: r.name,
    nummer: r.nummer,
    geschoss: g?.name ?? '?',
    thetaInt: ti,
    grundflaeche: r.grundflaeche,
    volumen: v,
    posten,
    phiT,
    vMin,
    vInf,
    vWirksam,
    phiV,
    phiHL,
    wProM2: r.grundflaeche > 0 ? phiHL / r.grundflaeche : 0,
    h: dTe !== 0 ? phiHL / dTe : 0,
  }
}

// ---------------------------------------------------------------------------
// Gebäude

export function berechne(p: Projekt): GebaeudeErgebnis {
  const thetaE = p.klima.thetaE
  if (thetaE === null) throw new BerechnungsFehler('Norm-Außentemperatur θ_e fehlt')
  const bStrich = bStrichSchaetzen(p)
  const reihenfolge = new Map(p.geschosse.map((g, i) => [g.id, i]))
  const raeume = [...p.raeume]
    .sort((a, b) => (reihenfolge.get(a.geschossId) ?? 99) - (reihenfolge.get(b.geschossId) ?? 99))
    .map((r) => berechneRaum(p, r, thetaE, bStrich))

  // Gebäude: Innenbauteile zwischen Räumen heben sich auf; Infiltration nur zur Hälfte
  // gleichzeitig wirksam (Wind nur auf einer Seite), Mindestluftwechsel voll.
  let phiT = 0
  let phiV = 0
  const summeRaeume = p.optionen.gebaeudeheizlast === 'summeRaeume'
  for (const e of raeume) {
    if (summeRaeume) {
      // Modus 'summeRaeume' (heizlast-web): Gebäudeheizlast = Σ Φ_T,i + Σ Φ_V,i
      phiT += e.phiT
      phiV += e.phiV
      continue
    }
    phiT += e.posten.filter((x) => x.art !== 'raum').reduce((s, x) => s + x.phi, 0)
    const dTe = e.thetaInt - thetaE
    const v = p.gebaeude.lueftungsanlage
      ? 0.5 * e.vInf + e.vMin * (1 - (p.gebaeude.wrgEta ?? 0))
      : Math.max(0.5 * e.vInf, e.vMin)
    phiV += RHO_CP_LUFT * v * dTe
  }
  const phiHL = phiT + phiV
  const wohnflaeche = p.gebaeude.wohnflaeche ?? p.raeume.reduce((s, r) => s + r.grundflaeche, 0)
  return {
    thetaE,
    raeume,
    phiT,
    phiV,
    phiHL,
    summeRaeume: raeume.reduce((s, r) => s + r.phiHL, 0),
    wohnflaeche,
    wProM2: wohnflaeche > 0 ? phiHL / wohnflaeche : 0,
    h: phiHL / (20 - thetaE),
    bStrich,
  }
}
