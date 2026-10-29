import { describe, expect, it } from 'vitest'
import { bruttoFlaeche, nettoFlaeche, raumVolumen } from './geometrie'
import { standardBauteile, thetaAusB } from './kataloge'
import { klimaDatenVorhanden, thetaEAusPlz } from './klima'
import { leeresProjekt, neueId, ProjektSchema, type Flaeche, type Geschoss, type Projekt } from './model'
import { pruefeProjekt } from './validierung'
import { projektAusJson, projektAlsJson } from './datei'

const geschoss: Geschoss = {
  id: 'g1',
  name: 'EG',
  geschosshoehe: 2.75,
  lichteHoehe: 2.5,
  unten: { art: 'erdreich' },
  oben: { art: 'beheizt', bezeichnung: 'OG', theta: 20 },
}

function beispielProjekt(): Projekt {
  const p = leeresProjekt()
  p.meta.plz = '38100'
  p.klima.thetaE = -14
  p.klima.thetaMe = 9
  p.gebaeude.n50 = 4
  p.anlage.pumpenDruck = 200
  p.anlage.heizkurve.steilheit = 1.4
  p.bauteile = standardBauteile('wschvo1977')
  p.geschosse = [geschoss]
  const aw = p.bauteile.find((t) => t.kategorie === 'AW')!
  const fe = p.bauteile.find((t) => t.kategorie === 'FE')!
  p.raeume = [
    {
      id: 'r1',
      geschossId: 'g1',
      nummer: '0.01',
      name: 'Wohnen',
      nutzung: 'wohnen',
      thetaInt: 20,
      nMin: 0.5,
      grundflaeche: 20,
      lichteHoehe: null,
      flaechen: [
        {
          id: neueId(),
          bauteilId: aw.id,
          orientierung: 'S',
          laenge: 5,
          hoehe: null,
          flaecheDirekt: null,
          angrenzung: { art: 'aussen' },
          oeffnungen: [{ id: neueId(), bauteilId: fe.id, bezeichnung: '', breite: 1.2, hoehe: 1.4, anzahl: 2 }],
        },
      ],
      heizkoerper: [
        {
          id: neueId(),
          bezeichnung: 'HK 1',
          typ: 'platte',
          bauart: '22',
          bauhoehe: 600,
          baulaenge: 1200,
          bautiefe: 100,
          phiN: 2000,
          exponent: 1.3,
          anzahl: 1,
          ventil: { hersteller: 'Heimeier', modell: 'V-exact II', voreinstellbar: true, aktuelleEinstellung: 'N', nennweite: 'DN15' },
          leitungslaenge: 10,
        },
      ],
    },
  ]
  return p
}

describe('Geometrie', () => {
  const f: Flaeche = {
    id: 'f',
    bauteilId: 'x',
    orientierung: 'S',
    laenge: 5,
    hoehe: null,
    flaecheDirekt: null,
    angrenzung: { art: 'aussen' },
    oeffnungen: [{ id: 'o', bauteilId: 'y', bezeichnung: '', breite: 1, hoehe: 1.5, anzahl: 2 }],
  }
  it('nutzt Geschosshöhe, wenn keine Höhe angegeben', () => {
    expect(bruttoFlaeche(f, geschoss)).toBeCloseTo(13.75)
  })
  it('zieht Öffnungen ab', () => {
    expect(nettoFlaeche(f, geschoss)).toBeCloseTo(10.75)
  })
  it('direkte Fläche hat Vorrang', () => {
    expect(bruttoFlaeche({ ...f, flaecheDirekt: 20 }, geschoss)).toBe(20)
  })
  it('Raumvolumen aus lichter Geschosshöhe', () => {
    const p = beispielProjekt()
    expect(raumVolumen(p.raeume[0], geschoss)).toBeCloseTo(50)
  })
})

describe('Kataloge', () => {
  it.skipIf(!klimaDatenVorhanden())('PLZ → θ_e (braucht src/core/data/normaussentemperatur.json)', () => {
    expect(thetaEAusPlz('01069')?.thetaE).toBe(-14)
    expect(thetaEAusPlz('abc')).toBeNull()
  })
  it('b-Faktor → Temperatur', () => {
    expect(thetaAusB(0.5, -14)).toBe(3)
  })
  it('Standardbauteile vollständig und gültig', () => {
    const t = standardBauteile('vor1977')
    expect(t.length).toBeGreaterThanOrEqual(10)
    expect(t.every((x) => x.u > 0)).toBe(true)
  })
})

describe('Validierung', () => {
  it('leeres Projekt hat Fehler', () => {
    const b = pruefeProjekt(leeresProjekt())
    expect(b.some((x) => x.ebene === 'fehler')).toBe(true)
  })
  it('Beispielprojekt ist fehlerfrei', () => {
    const fehler = pruefeProjekt(beispielProjekt()).filter((x) => x.ebene === 'fehler')
    expect(fehler).toEqual([])
  })
  it('erkennt zu große Öffnungen', () => {
    const p = beispielProjekt()
    p.raeume[0].flaechen[0].oeffnungen[0].anzahl = 20
    expect(pruefeProjekt(p).some((x) => x.text.includes('Öffnungen größer'))).toBe(true)
  })
  it('erkennt Fenster als Fläche', () => {
    const p = beispielProjekt()
    p.raeume[0].flaechen[0].bauteilId = p.bauteile.find((t) => t.kategorie === 'FE')!.id
    expect(pruefeProjekt(p).some((x) => x.text.includes('als Öffnung'))).toBe(true)
  })
  it('erkennt Selbstbezug', () => {
    const p = beispielProjekt()
    p.raeume[0].flaechen[0].angrenzung = { art: 'raum', raumId: 'r1' }
    expect(pruefeProjekt(p).some((x) => x.text.includes('sich selbst'))).toBe(true)
  })
})

describe('Projektdatei', () => {
  it('Round-Trip über JSON', () => {
    const p = beispielProjekt()
    expect(projektAusJson(projektAlsJson(p))).toEqual(ProjektSchema.parse(p))
  })
  it('lehnt kaputte Dateien ab', () => {
    expect(() => projektAusJson('{')).toThrow(/kein gültiges JSON/)
    expect(() => projektAusJson('{"version":1}')).toThrow(/ungültig/)
  })
  it('Schema akzeptiert leeres Projekt', () => {
    expect(ProjektSchema.safeParse(leeresProjekt()).success).toBe(true)
  })
})
