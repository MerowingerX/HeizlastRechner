/**
 * Empirische Raumheizlast aus Auskühl-/Aufheizmessungen.
 *
 * Raummodell (ein Knoten):  C · dθ_i/dt = −H · (θ_i − θ_a) + P(t)
 *   → dθ_i/dt = −(1/τ) · (θ_i − θ_a) + P/C,   τ = C/H
 *
 * Nur Auskühlung (P = 0): Regression liefert τ; H = C/τ mit C aus der Bauweise
 * (EN ISO 13790, wirksame Speicherkapazität je m² Grundfläche).
 * Mit Heizkörper-Vor-/Rücklauf (P aus EN 442) liefert die Regression 1/τ und 1/C,
 * damit H direkt ohne Annahme zu C.
 */
import { hkLeistung } from './heizkoerper'
import type { Messreihe, Projekt, Raum } from './model'

/** wirksame Wärmespeicherfähigkeit [Wh/(m²K)] nach EN ISO 13790 (80/165/260 kJ/(m²K)) */
export const C_SPEZ: Record<'leicht' | 'mittel' | 'schwer', number> = { leicht: 22.2, mittel: 45.8, schwer: 72.2 }

export interface ZeitWert {
  t: number // ms
  wert: number
}

const ZAHL = /^-?\d+(?:[.,]\d+)?$/

/**
 * CSV einlesen (Tuya/Smart-Life-Export, Home-Assistant-History o. ä.).
 * Erste Spalte mit Datum/Zeit, erste Zahlenspalte als Wert – oder Spalte per Name.
 */
export function parseZeitreihe(text: string, spalte?: string): ZeitWert[] {
  const zeilen = text.split(/\r?\n/).filter((z) => z.trim() !== '')
  if (zeilen.length < 2) return []
  const trenner = (zeilen[0].match(/;/g)?.length ?? 0) >= (zeilen[0].match(/,/g)?.length ?? 0) ? ';' : zeilen[0].includes('\t') ? '\t' : ','
  const kopf = zeilen[0].split(trenner).map((s) => s.trim().replace(/^"|"$/g, '').toLowerCase())
  const zellen = zeilen.slice(1).map((z) => z.split(trenner).map((s) => s.trim().replace(/^"|"$/g, '')))
  const zeitSpalte = Math.max(
    kopf.findIndex((k) => /zeit|time|date|datum|last_changed/.test(k)),
    0,
  )
  let wertSpalte = spalte ? kopf.findIndex((k) => k.includes(spalte.toLowerCase())) : -1
  if (wertSpalte < 0) wertSpalte = zellen[0].findIndex((z, i) => i !== zeitSpalte && ZAHL.test(z))
  if (wertSpalte < 0) return []
  const ergebnis: ZeitWert[] = []
  for (const z of zellen) {
    const t = parseZeit(z[zeitSpalte] ?? '')
    const w = z[wertSpalte]
    if (t === null || w === undefined || !ZAHL.test(w)) continue
    ergebnis.push({ t, wert: Number(w.replace(',', '.')) })
  }
  return ergebnis.sort((a, b) => a.t - b.t)
}

export function parseZeit(s: string): number | null {
  const t = s.trim()
  if (/^\d{10,13}$/.test(t)) return t.length === 10 ? Number(t) * 1000 : Number(t)
  // 29.10.2026 18:30(:00)
  const de = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (de) return new Date(+de[3], +de[2] - 1, +de[1], +de[4], +de[5], +(de[6] ?? 0)).getTime()
  const x = Date.parse(t.replace(' ', 'T'))
  return Number.isNaN(x) ? null : x
}

/** Zeitreihe linear auf Zeitpunkt t interpolieren. */
export function interpoliere(reihe: ZeitWert[], t: number): number | null {
  if (reihe.length === 0 || t < reihe[0].t || t > reihe[reihe.length - 1].t) return null
  let lo = 0
  let hi = reihe.length - 1
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (reihe[m].t <= t) lo = m
    else hi = m
  }
  const a = reihe[lo]
  const b = reihe[hi]
  if (b.t === a.t) return a.wert
  return a.wert + ((b.wert - a.wert) * (t - a.t)) / (b.t - a.t)
}

/** Innen-, Außen- und optional VL/RL-Reihe zu Messpunkten zusammenführen (Zeitbasis: innen). */
export function fuehreZusammen(innen: ZeitWert[], aussen: ZeitWert[], vl?: ZeitWert[], rl?: ZeitWert[]): Messreihe['punkte'] {
  const punkte: Messreihe['punkte'] = []
  for (const p of innen) {
    const a = interpoliere(aussen, p.t)
    if (a === null) continue
    punkte.push({
      t: new Date(p.t).toISOString(),
      innen: p.wert,
      aussen: Math.round(a * 100) / 100,
      vl: vl ? interpoliere(vl, p.t) : null,
      rl: rl ? interpoliere(rl, p.t) : null,
    })
  }
  return punkte
}

export interface MessAuswertung {
  punkte: number
  dauerH: number
  /** Zeitkonstante [h] */
  tau: number
  /** Wärmeverlustkoeffizient [W/K] */
  h: number
  /** Speicherkapazität [Wh/K] */
  c: number
  cAusBauweise: boolean
  /** Bestimmtheitsmaß der Regression */
  r2: number
  /** Raumheizlast bei θ_e aus der Messung [W] */
  phi: number
  hinweis: string
}

/** Kleinste Quadrate ohne Achsenabschnitt für 1 oder 2 Regressoren. */
function regression(x1: number[], x2: number[] | null, y: number[]): { b1: number; b2: number; r2: number } | null {
  const s = (a: number[], b: number[]) => a.reduce((acc, v, i) => acc + v * b[i], 0)
  let b1: number
  let b2 = 0
  if (!x2) {
    const sxx = s(x1, x1)
    if (sxx === 0) return null
    b1 = s(x1, y) / sxx
  } else {
    const a11 = s(x1, x1)
    const a12 = s(x1, x2)
    const a22 = s(x2, x2)
    const det = a11 * a22 - a12 * a12
    if (Math.abs(det) < 1e-12) return null
    const c1 = s(x1, y)
    const c2 = s(x2, y)
    b1 = (c1 * a22 - c2 * a12) / det
    b2 = (a11 * c2 - a12 * c1) / det
  }
  const yq = y.reduce((a, v) => a + v, 0) / y.length
  const ssTot = y.reduce((a, v) => a + (v - yq) ** 2, 0)
  const ssRes = y.reduce((a, v, i) => a + (v - b1 * x1[i] - b2 * (x2 ? x2[i] : 0)) ** 2, 0)
  return { b1, b2, r2: ssTot > 0 ? 1 - ssRes / ssTot : 0 }
}

export function werteMessungAus(p: Projekt, m: Messreihe): MessAuswertung | null {
  const raum = p.raeume.find((r) => r.id === m.raumId) as Raum | undefined
  if (!raum) return null
  const von = m.von ? Date.parse(m.von) : -Infinity
  const bis = m.bis ? Date.parse(m.bis) : Infinity
  const pkt = m.punkte
    .map((x) => ({ ...x, ms: Date.parse(x.t) }))
    .filter((x) => x.ms >= von && x.ms <= bis)
    .sort((a, b) => a.ms - b.ms)
  if (pkt.length < 8) return null

  const mitLeistung = raum.heizkoerper.length > 0 && raum.heizkoerper.every((h) => h.phiN !== null) && pkt.some((x) => x.vl !== null && x.rl !== null)

  const x1: number[] = []
  const x2: number[] = []
  const y: number[] = []
  // Ableitung über ±30 min statt Nachbarpunkte: glättet die 0,1-K-Auflösung typischer Sensoren
  const abstaende = pkt.slice(1).map((x, i) => x.ms - pkt[i].ms).sort((u, w) => u - w)
  const median = abstaende[Math.floor(abstaende.length / 2)] || 1
  const k = Math.max(1, Math.round(1.8e6 / median))
  for (let i = k; i < pkt.length - k; i++) {
    const a = pkt[i - k]
    const b = pkt[i + k]
    const dtH = (b.ms - a.ms) / 3.6e6
    if (dtH <= 0) continue
    const c = pkt[i]
    y.push((b.innen - a.innen) / dtH) // K/h
    x1.push(-(c.innen - c.aussen))
    if (mitLeistung) {
      const leistung = c.vl !== null && c.rl !== null ? raum.heizkoerper.reduce((s, h) => s + hkLeistung(h, c.vl as number, c.rl as number, c.innen), 0) : 0
      x2.push(leistung)
    }
  }
  const reg = regression(x1, mitLeistung ? x2 : null, y)
  if (!reg || reg.b1 <= 0) return null
  const tau = 1 / reg.b1
  let c: number
  let cAusBauweise = true
  const hinweise: string[] = []
  if (mitLeistung && reg.b2 > 0) {
    c = 1 / reg.b2
    cAusBauweise = false
  } else {
    c = C_SPEZ[p.gebaeude.bauweise] * raum.grundflaeche
    if (mitLeistung) hinweise.push('Heizleistung nicht auswertbar – C aus Bauweise angesetzt')
  }
  const h = c / tau
  const thetaE = p.klima.thetaE ?? -12
  const dauerH = (pkt[pkt.length - 1].ms - pkt[0].ms) / 3.6e6
  if (dauerH < 6) hinweise.push('Messung kürzer als 6 h – unsicher')
  if (reg.r2 < 0.6) hinweise.push('schwache Regression (R² < 0,6) – Störungen (Sonne, Türen, Nachbarräume)?')
  if (cAusBauweise) hinweise.push('H hängt direkt von der geschätzten Speicherkapazität ab (±30 %)')
  return {
    punkte: pkt.length,
    dauerH,
    tau,
    h,
    c,
    cAusBauweise,
    r2: reg.r2,
    phi: h * (raum.thetaInt - thetaE),
    hinweis: hinweise.join('; '),
  }
}
