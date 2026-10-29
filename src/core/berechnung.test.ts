import { describe, expect, it } from 'vitest'
import { abschirmKoeffizient, berechne, uEquivBodenplatte } from './berechnung'
import { dtLog, hkLeistung, legeAus, noetigesDtLog, ruecklaufAusVorlauf, vorlaufAusDt } from './heizkoerper'
import { C_SPEZ, parseZeitreihe, werteMessungAus } from './messung'
import { leeresProjekt, type Heizkoerper, type Projekt } from './model'
import { uAusSchichten } from './uwert'
import { werteVerbrauchAus } from './verbrauch'
import { berechneVoreinstellungen, findeVentil } from './ventile'

const hk = (phiN: number, extra: Partial<Heizkoerper> = {}): Heizkoerper => ({
  id: 'hk1',
  bezeichnung: 'HK',
  typ: 'platte',
  bauart: '22',
  bauhoehe: 600,
  baulaenge: 1000,
  bautiefe: 100,
  phiN,
  exponent: 1.3,
  anzahl: 1,
  ventil: { hersteller: 'Danfoss', modell: 'RA-N 15', voreinstellbar: true, aktuelleEinstellung: 'N', nennweite: 'DN15' },
  leitungslaenge: 10,
  ...extra,
})

/** Ein Raum, handgerechnet: θi 20, θe −10, AW 12 m² brutto U 1,0 + 0,1, Fenster 2 m² U 2,0 + 0,1 */
function einRaum(): Projekt {
  const p = leeresProjekt()
  p.klima.thetaE = -10
  p.klima.thetaMe = 9
  p.gebaeude.n50 = 4
  p.gebaeude.abschirmung = 'mittel'
  p.anlage.zielSpreizung = 10
  p.anlage.pumpenDruck = 150
  p.bauteile = [
    { id: 'aw', kategorie: 'AW', name: 'AW', u: 1.0, deltaUTb: 0.1, notiz: '', schichten: [] },
    { id: 'fe', kategorie: 'FE', name: 'FE', u: 2.0, deltaUTb: 0.1, notiz: '', schichten: [] },
    { id: 'fb', kategorie: 'FB', name: 'FB', u: 1.0, deltaUTb: 0, notiz: '', schichten: [] },
  ]
  p.geschosse = [
    { id: 'g', name: 'EG', geschosshoehe: 3, lichteHoehe: 2.5, unten: { art: 'erdreich' }, oben: { art: 'aussen' } },
  ]
  p.raeume = [
    {
      id: 'r',
      geschossId: 'g',
      nummer: '1',
      name: 'Wohnen',
      nutzung: 'wohnen',
      thetaInt: 20,
      nMin: 0.5,
      grundflaeche: 20,
      lichteHoehe: null,
      lage: null,
      flaechen: [
        {
          id: 'f1',
          bauteilId: 'aw',
          orientierung: 'S',
          laenge: 4,
          hoehe: null,
          flaecheDirekt: null,
          angrenzung: { art: 'aussen' },
          oeffnungen: [{ id: 'o1', bauteilId: 'fe', bezeichnung: '', breite: 1, hoehe: 2, anzahl: 1 }],
        },
      ],
      heizkoerper: [hk(1000)],
    },
  ]
  return p
}

describe('Raumheizlast', () => {
  it('Transmission und Lüftung wie Handrechnung', () => {
    const e = berechne(einRaum()).raeume[0]
    // AW netto 10 m² · 1,1 · 30 = 330; FE 2 · 2,1 · 30 = 126
    expect(e.phiT).toBeCloseTo(456, 6)
    // V = 50 m³, V̇_min = 25, V̇_inf = 2·50·4·0,02 = 8 → 25; Φ_V = 0,34·25·30 = 255
    expect(e.vMin).toBeCloseTo(25)
    expect(e.vInf).toBeCloseTo(8)
    expect(e.phiV).toBeCloseTo(255)
    expect(e.phiHL).toBeCloseTo(711)
  })

  it('Innenwand zu kälterem Raum zählt im Raum, nicht im Gebäude', () => {
    const p = einRaum()
    p.raeume[0].flaechen.push({
      id: 'f2', bauteilId: 'aw', orientierung: 'N', laenge: 0, hoehe: null, flaecheDirekt: 10,
      angrenzung: { art: 'beheizt', bezeichnung: 'Flur', theta: 15 }, oeffnungen: [],
    })
    const p2 = structuredClone(p)
    p2.raeume[0].flaechen[1].angrenzung = { art: 'raum', raumId: 'r2' }
    p2.raeume.push({ ...structuredClone(p.raeume[0]), id: 'r2', name: 'Flur', thetaInt: 15, flaechen: [], heizkoerper: [] })
    const a = berechne(p).raeume[0]
    expect(a.phiT).toBeCloseTo(456 + 10 * 1.1 * 5)
    const b = berechne(p2)
    expect(b.raeume.find((x) => x.raumId === 'r')!.phiT).toBeCloseTo(456 + 55)
    // im Gebäude hebt sich die Innenwand auf
    expect(b.phiT).toBeCloseTo(456)
  })

  it('Erdreich mit U_equiv und f_g1', () => {
    const p = einRaum()
    p.raeume[0].flaechen.push({
      id: 'f3', bauteilId: 'fb', orientierung: 'H', laenge: 0, hoehe: null, flaecheDirekt: 16,
      angrenzung: { art: 'erdreich' }, oeffnungen: [],
    })
    const g = berechne(p)
    expect(g.bStrich).toBeCloseTo(2) // √16 / 2
    const ue = uEquivBodenplatte(1.0, 2)
    const posten = g.raeume[0].posten.find((x) => x.flaecheId === 'f3')!
    expect(posten.phi).toBeCloseTo(16 * ue * 1.45 * (20 - 9))
    expect(ue).toBeLessThan(1)
  })

  it('U_equiv EN ISO 13370 Referenzwert', () => {
    // U 1,0 → d_t = 0,3 + 2·(0,17 + 0,79 + 0,04) = 2,3; B' 4 → 0,502
    expect(uEquivBodenplatte(1.0, 4)).toBeCloseTo(0.502, 3)
  })

  it('Abschirmkoeffizient', () => {
    expect(abschirmKoeffizient('mittel', 0)).toBe(0)
    expect(abschirmKoeffizient('keine', 2)).toBe(0.05)
  })

  it('Lüftungsanlage mit WRG reduziert Φ_V', () => {
    const p = einRaum()
    p.gebaeude.lueftungsanlage = true
    p.gebaeude.wrgEta = 0.8
    const e = berechne(p).raeume[0]
    expect(e.vWirksam).toBeCloseTo(8 + 25 * 0.2)
  })
})

describe('Heizkörper', () => {
  it('Norm-Übertemperatur 75/65/20', () => {
    expect(dtLog(75, 65, 20)).toBeCloseTo(49.83, 2)
    expect(hkLeistung(hk(1000), 75, 65, 20)).toBeCloseTo(1000, 0)
  })
  it('Umkehrung ΔT_log → Vorlauf/Rücklauf', () => {
    const dt = noetigesDtLog([hk(1000)], 1000)!
    expect(dt).toBeCloseTo(49.83, 2)
    expect(vorlaufAusDt(dt, 10, 20)).toBeCloseTo(75, 1)
    expect(ruecklaufAusVorlauf(75, dt, 20)).toBeCloseTo(65, 1)
    expect(ruecklaufAusVorlauf(40, 30, 20)).toBeNull()
  })
  it('halbe Leistung braucht deutlich weniger Vorlauf', () => {
    const dt = noetigesDtLog([hk(1000)], 500)!
    expect(vorlaufAusDt(dt, 10, 20)).toBeLessThan(60)
  })
  it('Auslegung: Systemvorlauf, Volumenstrom, Heizkurve', () => {
    const p = einRaum()
    const g = berechne(p)
    const a = legeAus(p, g)
    expect(a.vorlauf).not.toBeNull()
    const r = a.raeume[0]
    expect(r.status).toBe('ok')
    // Volumenstrom = Φ / (1,163 · σ)
    expect(r.volumenstrom!).toBeCloseTo(g.raeume[0].phiHL / (1.163 * r.spreizung!), 6)
    // Heizkurve beginnt bei θ_e mit dem Systemvorlauf (≈, da aufgerundet)
    expect(a.heizkurve[0].aussen).toBe(-10)
    expect(a.heizkurve[0].vorlauf).toBeLessThanOrEqual(a.vorlauf! + 0.01)
    expect(a.heizkurve.at(-1)!.vorlauf).toBeLessThan(a.heizkurve[0].vorlauf)
    expect(a.steilheit!).toBeGreaterThan(0)
  })
  it('Raum ohne Heizkörper wird gemeldet', () => {
    const p = einRaum()
    p.raeume[0].heizkoerper = []
    const a = legeAus(p, berechne(p))
    expect(a.raeume[0].status).toBe('kein_hk')
    expect(a.warnungen.join()).toMatch(/keinen Heizkörper/)
  })
})

describe('Ventile', () => {
  it('findet Modell, längster Treffer zuerst', () => {
    expect(findeVentil('Danfoss', 'RA-N 10')?.id).toBe('danfoss-ran10')
    expect(findeVentil('danfoss', 'RA-N')?.id).toBe('danfoss-ran15')
    expect(findeVentil('Heimeier', 'V-exact II')?.id).toBe('heimeier-vexact2')
    expect(findeVentil('', '')).toBeNull()
  })
  it('k_v,erf und Stufe', () => {
    const p = einRaum()
    const a = legeAus(p, berechne(p))
    const v = berechneVoreinstellungen(p, a)[0]
    // Δp = 150 − 2·10·1·1,3 = 124 mbar
    expect(v.dpVentil).toBeCloseTo(124)
    expect(v.kvErforderlich).toBeCloseTo(v.volumenstrom / 1000 / Math.sqrt(0.124), 6)
    expect(v.einstellung).not.toBeNull()
  })
})

describe('U-Wert aus Schichten', () => {
  it('36,5 cm Vollziegel verputzt', () => {
    const u = uAusSchichten({
      kategorie: 'AW',
      schichten: [
        { material: 'Innenputz', dicke: 0.015, lambda: 0.7 },
        { material: 'Vollziegel', dicke: 0.365, lambda: 0.68 },
        { material: 'Außenputz', dicke: 0.02, lambda: 1.0 },
      ],
    })!
    // R = 0,13 + 0,0214 + 0,5368 + 0,02 + 0,04 = 0,7482 → U = 1,337
    expect(u).toBeCloseTo(1.337, 2)
  })
})

describe('Verbrauch', () => {
  it('H aus Gradtagzahl', () => {
    const p = einRaum()
    const a = werteVerbrauchAus(
      p,
      { id: 'v', zeitraum: '2024', traeger: 'erdgas', menge: 20000, einheit: 'kWh', inklWarmwasser: true, nutzungsgrad: 0.9, gradtagzahl: 3500, notiz: '' },
      100,
      null,
    )
    // 18000 − 1250 = 16750 kWh → H = 16 750 000 / 84 000 = 199,4 W/K
    expect(a.heizwaerme).toBeCloseTo(16750)
    expect(a.h).toBeCloseTo(199.4, 1)
    expect(a.phi).toBeCloseTo(199.4 * 30, 0)
  })
})

describe('Messung', () => {
  it('CSV mit Komma-Dezimal und deutschem Datum', () => {
    const r = parseZeitreihe('Zeit;Temperatur\n29.10.2026 18:00;20,5\n29.10.2026 18:10;20,3\n')
    expect(r).toHaveLength(2)
    expect(r[1].wert).toBe(20.3)
    expect(r[1].t - r[0].t).toBe(600000)
  })

  it('reine Auskühlung: τ exakt, H über Bauweise', () => {
    const p = einRaum()
    const tau = 20
    const punkte = Array.from({ length: 97 }, (_, i) => {
      const h = i * 0.25
      return { t: new Date(Date.UTC(2026, 0, 1) + h * 3.6e6).toISOString(), innen: 20 * Math.exp(-h / tau), aussen: 0, vl: null, rl: null }
    })
    const a = werteMessungAus(p, { id: 'm', raumId: 'r', name: 'Test', punkte, von: null, bis: null, notiz: '' })!
    expect(a.tau).toBeCloseTo(20, 0)
    expect(a.cAusBauweise).toBe(true)
    expect(a.h).toBeCloseTo((C_SPEZ.mittel * 20) / a.tau, 6)
  })

  it('Aufheizen + Auskühlen mit Heizkörper liefert H und C', () => {
    const p = einRaum()
    const raum = p.raeume[0]
    const H = 50
    const C = 1000
    let ti = 15
    const punkte: Projekt['messreihen'][number]['punkte'] = []
    for (let min = 0; min <= 36 * 60; min++) {
      const an = min < 12 * 60
      const vl = an ? 50 : ti
      const rl = an ? 40 : ti
      const P = an ? hkLeistung(raum.heizkoerper[0], vl, rl, ti) : 0
      if (min % 10 === 0) punkte.push({ t: new Date(Date.UTC(2026, 0, 1) + min * 60000).toISOString(), innen: ti, aussen: 0, vl, rl })
      ti += ((-H * (ti - 0) + P) / C) * (1 / 60)
    }
    const a = werteMessungAus(p, { id: 'm', raumId: 'r', name: 'Test', punkte, von: null, bis: null, notiz: '' })!
    expect(a.cAusBauweise).toBe(false)
    expect(a.h).toBeGreaterThan(45)
    expect(a.h).toBeLessThan(55)
    expect(a.c).toBeGreaterThan(900)
    expect(a.c).toBeLessThan(1100)
  })
})
