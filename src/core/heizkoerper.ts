/**
 * Bestandsheizkörper: Leistung bei realen Temperaturen (EN 442),
 * nötige Vorlauftemperatur, Volumenströme und Heizkurve.
 *
 *   Φ = Φ_N · (ΔT_log / ΔT_log,N)^n,   ΔT_log = (θ_VL − θ_RL) / ln((θ_VL − θ_i)/(θ_RL − θ_i))
 *   ΔT_log,N = 49,83 K (75/65/20)
 */
import type { GebaeudeErgebnis, RaumErgebnis } from './berechnung'
import type { Heizkoerper, Projekt, Raum } from './model'

export const DT_LOG_N = 49.83
/** spez. Wärmekapazität Wasser [Wh/(kg·K)] */
export const C_WASSER = 1.163

export function dtLog(vl: number, rl: number, ti: number): number {
  const a = vl - ti
  const b = rl - ti
  if (a <= 0 || b <= 0) return 0
  if (Math.abs(a - b) < 1e-9) return a
  return (a - b) / Math.log(a / b)
}

export function hkLeistung(h: Heizkoerper, vl: number, rl: number, ti: number): number {
  if (h.phiN === null) return 0
  return h.phiN * h.anzahl * Math.pow(dtLog(vl, rl, ti) / DT_LOG_N, h.exponent)
}

/** Leistung aller Heizkörper eines Raums bei gegebener mittlerer Übertemperatur ΔT_log. */
export function raumLeistungBeiDt(hks: Heizkoerper[], dt: number): number {
  return hks.reduce((s, h) => s + (h.phiN ?? 0) * h.anzahl * Math.pow(Math.max(dt, 0) / DT_LOG_N, h.exponent), 0)
}

/** Bisektion für monoton steigende Funktion f auf [a, b]: f(x) = ziel. */
function bisektion(f: (x: number) => number, ziel: number, a: number, b: number): number {
  for (let i = 0; i < 100; i++) {
    const m = (a + b) / 2
    if (f(m) < ziel) a = m
    else b = m
  }
  return (a + b) / 2
}

/** Nötige Übertemperatur ΔT_log, damit die Heizkörper Φ liefern. null = keine Leistung bekannt. */
export function noetigesDtLog(hks: Heizkoerper[], phi: number): number | null {
  if (phi <= 0) return 0
  if (raumLeistungBeiDt(hks, DT_LOG_N) <= 0) return null
  return bisektion((dt) => raumLeistungBeiDt(hks, dt), phi, 0, 400)
}

/** Vorlauf bei gegebener Spreizung σ, sodass ΔT_log erreicht wird. */
export function vorlaufAusDt(dt: number, sigma: number, ti: number): number {
  if (dt <= 0) return ti
  return bisektion((vl) => dtLog(vl, vl - sigma, ti), dt, ti + sigma + 1e-6, ti + sigma + 400)
}

/** Rücklauf bei festem Vorlauf, sodass ΔT_log erreicht wird; null wenn unmöglich. */
export function ruecklaufAusVorlauf(vl: number, dt: number, ti: number): number | null {
  if (dt <= 0) return ti
  if (dt > vl - ti) return null
  // dtLog(vl, rl, ti) steigt mit rl
  return bisektion((rl) => dtLog(vl, rl, ti), dt, ti + 1e-6, vl)
}

// ---------------------------------------------------------------------------

export interface HkBetrieb {
  heizkoerperId: string
  bezeichnung: string
  /** Leistung im Auslegungsfall [W] */
  phi: number
  /** Massenstrom [kg/h] ≈ Volumenstrom [l/h] */
  volumenstrom: number
}

export interface RaumAuslegung {
  raumId: string
  name: string
  geschoss: string
  thetaInt: number
  phiHL: number
  /** Σ Φ_N der Heizkörper [W]; null = unvollständig */
  phiN: number | null
  /** Status für den Raum */
  status: 'ok' | 'kein_hk' | 'phiN_fehlt' | 'kein_bedarf' | 'unterversorgt'
  /** Nötiger Vorlauf, wenn dieser Raum allein mit Ziel-Spreizung ausgelegt würde */
  vlNoetig: number | null
  /** Rücklauf bei Systemvorlauf */
  rl: number | null
  spreizung: number | null
  volumenstrom: number | null
  heizkoerper: HkBetrieb[]
  /** Deckung im Ist-Zustand (Ist-Vorlauf/Rücklauf) [%] */
  deckungIst: number | null
  /** Leistung, die die Heizkörper beim Systemvorlauf liefern [W] */
  phiLiefer: number | null
  /** Beim Systemvorlauf und Ziel-Spreizung nötige Normleistung Φ_N [W] */
  phiNNoetig: number | null
  /** Für Systemvorlauf 55/45 nötige Normleistung [W] (Wärmepumpen-Check) */
  phiNFuer55: number | null
}

export interface HeizkurvenPunkt {
  aussen: number
  vorlauf: number
  ruecklauf: number
}

export interface Auslegung {
  /** Systemvorlauf bei θ_e [°C] (vom ungünstigsten Raum bestimmt) */
  vorlauf: number | null
  ruecklaufMisch: number | null
  massgebenderRaum: string | null
  raeume: RaumAuslegung[]
  heizkurve: HeizkurvenPunkt[]
  /** Linearisierte Heizkurve: VL = θ_raum + niveau + steilheit · (θ_raum − θ_a) */
  steilheit: number | null
  niveau: number | null
  volumenstromGesamt: number
  warnungen: string[]
}

const aufHalbes = (x: number) => Math.ceil(x * 2) / 2

export function legeAus(p: Projekt, erg: GebaeudeErgebnis): Auslegung {
  const sigma = p.anlage.zielSpreizung > 0 ? p.anlage.zielSpreizung : 10
  const warnungen: string[] = []
  const raumMap = new Map(p.raeume.map((r) => [r.id, r]))

  // 1. nötiger Vorlauf je Raum
  const vor = erg.raeume.map((e) => {
    const r = raumMap.get(e.raumId) as Raum
    const hks = r.heizkoerper
    const unvollstaendig = hks.some((h) => h.phiN === null)
    const phiN = unvollstaendig ? null : hks.reduce((s, h) => s + (h.phiN ?? 0) * h.anzahl, 0)
    let status: RaumAuslegung['status'] = 'ok'
    let dt: number | null = null
    let vlNoetig: number | null = null
    if (e.phiHL <= 0) status = 'kein_bedarf'
    else if (hks.length === 0) status = 'kein_hk'
    else if (unvollstaendig) status = 'phiN_fehlt'
    else {
      dt = noetigesDtLog(hks, e.phiHL)
      if (dt !== null) vlNoetig = vorlaufAusDt(dt, sigma, e.thetaInt)
    }
    return { e, r, hks, phiN, status, dt, vlNoetig }
  })

  const kandidaten = vor.filter((x) => x.vlNoetig !== null)
  const grenze = p.anlage.heizkurve.maxVorlauf ?? 75
  let vorlauf: number | null = null
  let massgebend: string | null = null
  if (kandidaten.length > 0) {
    const max = kandidaten.reduce((a, b) => ((b.vlNoetig ?? 0) > (a.vlNoetig ?? 0) ? b : a))
    massgebend = max.e.raumId
    const automatisch = Math.min(aufHalbes(max.vlNoetig ?? 0), grenze)
    vorlauf = p.anlage.zielVorlauf ?? automatisch
    if (p.anlage.zielVorlauf === null && (max.vlNoetig ?? 0) > grenze)
      warnungen.push(`Raum „${max.e.name}" bräuchte ${Math.round(max.vlNoetig ?? 0)} °C Vorlauf – über der max. Vorlauftemperatur ${grenze} °C. Systemvorlauf auf ${grenze} °C begrenzt.`)
  }
  for (const x of vor) {
    if (x.status === 'kein_hk') warnungen.push(`Raum „${x.e.name}" hat ${Math.round(x.e.phiHL)} W Heizlast, aber keinen Heizkörper.`)
    if (x.status === 'phiN_fehlt') warnungen.push(`Raum „${x.e.name}": Normleistung eines Heizkörpers fehlt – Raum nicht ausgelegt.`)
  }

  // 2. Betriebspunkt je Raum beim Systemvorlauf
  let summeV = 0
  let summeVRl = 0
  const raeume: RaumAuslegung[] = vor.map((x) => {
    const ti = x.e.thetaInt
    const n = x.hks[0]?.exponent ?? 1.3
    const ist =
      x.phiN !== null && x.phiN > 0 && x.e.phiHL > 0
        ? (x.hks.reduce((s, h) => s + hkLeistung(h, p.anlage.vorlauf, p.anlage.ruecklauf, ti), 0) / x.e.phiHL) * 100
        : null
    const noetigBei = (vl: number) => {
      const d = dtLog(vl, vl - sigma, ti)
      return x.e.phiHL > 0 && d > 0 ? x.e.phiHL / Math.pow(d / DT_LOG_N, n) : null
    }
    const basis = {
      raumId: x.e.raumId,
      name: x.e.name,
      geschoss: x.e.geschoss,
      thetaInt: ti,
      phiHL: x.e.phiHL,
      phiN: x.phiN,
      vlNoetig: x.vlNoetig,
      deckungIst: ist,
      phiNNoetig: vorlauf !== null ? noetigBei(vorlauf) : null,
      phiNFuer55: noetigBei(55),
    }
    const leer = { rl: null, spreizung: null, volumenstrom: null, heizkoerper: [], phiLiefer: null }
    if (vorlauf === null || x.dt === null || x.status !== 'ok') return { ...basis, status: x.status, ...leer }

    let rl = ruecklaufAusVorlauf(vorlauf, x.dt, ti)
    let phi = x.e.phiHL
    let status: RaumAuslegung['status'] = 'ok'
    if (rl === null || vorlauf - rl > 0 && x.vlNoetig !== null && x.vlNoetig > vorlauf + 0.25) {
      // reicht nicht: Ventil voll offen, Heizkörper liefert bei Ziel-Spreizung, was er kann
      status = 'unterversorgt'
      rl = vorlauf - sigma
      phi = raumLeistungBeiDt(x.hks, dtLog(vorlauf, rl, ti))
      warnungen.push(`Raum „${x.e.name}": Heizkörper liefern bei ${vorlauf} °C nur ${Math.round(phi)} von ${Math.round(x.e.phiHL)} W – Φ_N ≥ ${Math.round(basis.phiNNoetig ?? 0)} W nötig (Tausch/Ergänzung).`)
    }
    const spreizung = vorlauf - rl
    const volumenstrom = phi / (C_WASSER * spreizung)
    summeV += volumenstrom
    summeVRl += volumenstrom * rl
    const dtBetrieb = dtLog(vorlauf, rl, ti)
    const gesamt = raumLeistungBeiDt(x.hks, dtBetrieb)
    const heizkoerper = x.hks.map((h) => {
      const anteil = gesamt > 0 ? raumLeistungBeiDt([h], dtBetrieb) / gesamt : 0
      return { heizkoerperId: h.id, bezeichnung: h.bezeichnung, phi: phi * anteil, volumenstrom: volumenstrom * anteil }
    })
    return { ...basis, status, rl, spreizung, volumenstrom, heizkoerper, phiLiefer: phi }
  })

  // 3. Heizkurve aus dem Systemauslegungspunkt (VL, Mischrücklauf) bei θ_e,
  //    konstanter Volumenstrom, Raum 20 °C, Heizkörperexponent 1,3
  const heizkurve: HeizkurvenPunkt[] = []
  let steilheit: number | null = null
  let niveau: number | null = null
  const rlMisch = summeV > 0 ? summeVRl / summeV : null
  if (vorlauf !== null && rlMisch !== null) {
    const ti = 20
    const dt0 = dtLog(vorlauf, rlMisch, ti)
    const s0 = vorlauf - rlMisch
    const grenzeA = p.anlage.heizkurve.heizgrenze ?? 15
    for (let ta = Math.floor(erg.thetaE); ta <= grenzeA; ta += 1) {
      const anteil = Math.max((ti - ta) / (ti - erg.thetaE), 0)
      const s = s0 * anteil
      const vl = s > 0 ? vorlaufAusDt(dt0 * Math.pow(anteil, 1 / 1.3), s, ti) : ti
      heizkurve.push({ aussen: ta, vorlauf: vl, ruecklauf: vl - s })
    }
    // lineare Näherung: VL − 20 = niveau + S · (20 − θ_a)
    const xs = heizkurve.map((q) => 20 - q.aussen)
    const ys = heizkurve.map((q) => q.vorlauf - 20)
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length
    const my = ys.reduce((a, b) => a + b, 0) / ys.length
    const sxy = xs.reduce((s, xv, i) => s + (xv - mx) * (ys[i] - my), 0)
    const sxx = xs.reduce((s, xv) => s + (xv - mx) ** 2, 0)
    if (sxx > 0) {
      steilheit = sxy / sxx
      niveau = my - steilheit * mx
    }
  }

  return {
    vorlauf,
    ruecklaufMisch: rlMisch,
    massgebenderRaum: massgebend,
    raeume,
    heizkurve,
    steilheit,
    niveau,
    volumenstromGesamt: summeV,
    warnungen,
  }
}

/** Kurzinfo für die UI: Raum-Ergebnis zu Auslegung. */
export const auslegungFuer = (a: Auslegung, e: RaumErgebnis) => a.raeume.find((r) => r.raumId === e.raumId)
