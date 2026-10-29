/**
 * Thermostatventile: Voreinstellung für den hydraulischen Abgleich.
 *
 *   k_v,erf = V̇ [m³/h] / √(Δp_Ventil [bar])
 *   Δp_Ventil = Δp_Pumpe − Δp_Rohr,  Δp_Rohr ≈ 2 · L · R · 1,3 (R = 1 mbar/m, 30 % Formteile)
 *
 * k_v-Werte sind RICHTWERTE (P-Abweichung 2 K) aus Herstellerunterlagen,
 * gerundet. Vor dem Einstellen mit dem aktuellen Herstellerdiagramm abgleichen.
 */
import type { Auslegung } from './heizkoerper'
import type { Heizkoerper, Projekt } from './model'

export interface VentilTyp {
  id: string
  hersteller: string
  /** Suchbegriffe für das Modell (Kleinbuchstaben) */
  modelle: string[]
  bezeichnung: string
  /** 'kv': Stufen mit k_v-Wert; 'durchfluss': Einstellung = Volumenstrom in l/h (dynamische Ventile) */
  art: 'kv' | 'durchfluss'
  stufen: { stufe: string; kv: number }[]
  /** bei art 'durchfluss': Einstellbereich [l/h] und Raster */
  bereich?: { min: number; max: number; raster: number }
}

export const VENTILE: VentilTyp[] = [
  {
    id: 'heimeier-vexact2',
    hersteller: 'heimeier',
    modelle: ['v-exact ii', 'v-exact 2', 'vexact ii', 'v-exact'],
    bezeichnung: 'Heimeier V-exact II',
    art: 'kv',
    stufen: [
      { stufe: '1', kv: 0.049 },
      { stufe: '2', kv: 0.09 },
      { stufe: '3', kv: 0.15 },
      { stufe: '4', kv: 0.22 },
      { stufe: '5', kv: 0.3 },
      { stufe: '6', kv: 0.42 },
      { stufe: 'N', kv: 0.67 },
    ],
  },
  {
    id: 'heimeier-eclipse',
    hersteller: 'heimeier',
    modelle: ['eclipse'],
    bezeichnung: 'Heimeier Eclipse (Durchflussbegrenzung)',
    art: 'durchfluss',
    stufen: [],
    bereich: { min: 10, max: 150, raster: 5 },
  },
  {
    id: 'danfoss-ran15',
    hersteller: 'danfoss',
    modelle: ['ra-n 15', 'ra-n15', 'ra-n'],
    bezeichnung: 'Danfoss RA-N 15',
    art: 'kv',
    stufen: [
      { stufe: '1', kv: 0.04 },
      { stufe: '2', kv: 0.08 },
      { stufe: '3', kv: 0.12 },
      { stufe: '4', kv: 0.2 },
      { stufe: '5', kv: 0.3 },
      { stufe: '6', kv: 0.4 },
      { stufe: '7', kv: 0.51 },
      { stufe: 'N', kv: 0.73 },
    ],
  },
  {
    id: 'danfoss-ran10',
    hersteller: 'danfoss',
    modelle: ['ra-n 10', 'ra-n10'],
    bezeichnung: 'Danfoss RA-N 10',
    art: 'kv',
    stufen: [
      { stufe: '1', kv: 0.04 },
      { stufe: '2', kv: 0.08 },
      { stufe: '3', kv: 0.12 },
      { stufe: '4', kv: 0.19 },
      { stufe: '5', kv: 0.25 },
      { stufe: '6', kv: 0.33 },
      { stufe: '7', kv: 0.4 },
      { stufe: 'N', kv: 0.56 },
    ],
  },
  {
    id: 'danfoss-radv',
    hersteller: 'danfoss',
    modelle: ['ra-dv', 'dynamic'],
    bezeichnung: 'Danfoss RA-DV Dynamic Valve',
    art: 'durchfluss',
    stufen: [],
    bereich: { min: 25, max: 135, raster: 5 },
  },
  {
    id: 'oventrop-av9',
    hersteller: 'oventrop',
    modelle: ['av9', 'av 9'],
    bezeichnung: 'Oventrop AV9',
    art: 'kv',
    stufen: [
      { stufe: '1', kv: 0.05 },
      { stufe: '2', kv: 0.09 },
      { stufe: '3', kv: 0.14 },
      { stufe: '4', kv: 0.22 },
      { stufe: '5', kv: 0.32 },
      { stufe: '6', kv: 0.45 },
    ],
  },
  {
    id: 'oventrop-av6',
    hersteller: 'oventrop',
    modelle: ['av6', 'av 6'],
    bezeichnung: 'Oventrop AV6',
    art: 'kv',
    stufen: [
      { stufe: '1', kv: 0.045 },
      { stufe: '2', kv: 0.075 },
      { stufe: '3', kv: 0.12 },
      { stufe: '4', kv: 0.17 },
      { stufe: '5', kv: 0.25 },
      { stufe: '6', kv: 0.36 },
    ],
  },
]

/** Passenden Ventiltyp zu Hersteller/Modell finden. */
export function findeVentil(hersteller: string, modell: string): VentilTyp | null {
  const h = hersteller.trim().toLowerCase()
  const m = modell.trim().toLowerCase()
  if (!h && !m) return null
  const kandidaten = VENTILE.filter((v) => !h || v.hersteller.includes(h) || h.includes(v.hersteller))
  // längster passender Suchbegriff gewinnt (RA-N 10 vor RA-N)
  let bester: VentilTyp | null = null
  let laenge = 0
  for (const v of kandidaten)
    for (const s of v.modelle)
      if (m.includes(s) && s.length > laenge) {
        bester = v
        laenge = s.length
      }
  return bester
}

export const STANDARD_PUMPENDRUCK = 150 // mbar
const R_ROHR = 1.0 // mbar/m
const ZUSCHLAG_FORMTEILE = 1.3
const MIN_DP_VENTIL = 30 // mbar

export interface Voreinstellung {
  raumId: string
  raumName: string
  heizkoerperId: string
  heizkoerper: string
  ventil: string
  volumenstrom: number
  dpVentil: number
  kvErforderlich: number
  /** empfohlene Einstellung, z. B. "4" oder "35 l/h"; null = nicht bestimmbar */
  einstellung: string | null
  aktuell: string
  hinweis: string
}

export function berechneVoreinstellungen(p: Projekt, a: Auslegung): Voreinstellung[] {
  const pumpe = p.anlage.pumpenDruck ?? STANDARD_PUMPENDRUCK
  const ergebnis: Voreinstellung[] = []
  const hkMap = new Map<string, Heizkoerper>()
  for (const r of p.raeume) for (const h of r.heizkoerper) hkMap.set(h.id, h)

  for (const r of a.raeume)
    for (const b of r.heizkoerper) {
      const h = hkMap.get(b.heizkoerperId)
      if (!h) continue
      const laenge = h.leitungslaenge ?? 10
      const dpRohr = 2 * laenge * R_ROHR * ZUSCHLAG_FORMTEILE
      const dpVentil = Math.max(pumpe - dpRohr, MIN_DP_VENTIL)
      const vProHk = b.volumenstrom / h.anzahl
      const kv = vProHk / 1000 / Math.sqrt(dpVentil / 1000)
      const typ = findeVentil(h.ventil.hersteller, h.ventil.modell)
      let einstellung: string | null = null
      const hinweise: string[] = []
      if (pumpe - dpRohr < MIN_DP_VENTIL) hinweise.push('wenig Restdruck – Pumpe ggf. höher stellen')
      if (p.anlage.systemart === 'einrohr') hinweise.push('Einrohrsystem: Voreinstellung nach Herstellerangabe für Einrohr-Ventile')
      if (!h.ventil.voreinstellbar) hinweise.push('Ventil nicht voreinstellbar → Rücklaufverschraubung drosseln oder Ventilunterteil tauschen')
      else if (!typ) hinweise.push('Ventiltyp unbekannt → Einstellung aus Herstellerdiagramm mit k_v,erf bestimmen')
      else if (typ.art === 'durchfluss' && typ.bereich) {
        const { min, max, raster } = typ.bereich
        const w = Math.min(Math.max(Math.ceil(vProHk / raster) * raster, min), max)
        einstellung = `${w} l/h`
        if (vProHk > max) hinweise.push('Volumenstrom über Einstellbereich')
      } else {
        const passend = typ.stufen.find((s) => s.kv >= kv)
        if (passend) einstellung = passend.stufe
        else {
          einstellung = typ.stufen.at(-1)?.stufe ?? null
          hinweise.push('auch voll offen zu wenig Durchfluss → Pumpe höher oder größerer Heizkörper')
        }
      }
      if (h.anzahl > 1) hinweise.push(`gilt je Heizkörper (${h.anzahl} Stück)`)
      ergebnis.push({
        raumId: r.raumId,
        raumName: r.name,
        heizkoerperId: h.id,
        heizkoerper: h.bezeichnung,
        ventil: typ?.bezeichnung ?? (`${h.ventil.hersteller} ${h.ventil.modell}`.trim() || '–'),
        volumenstrom: vProHk,
        dpVentil,
        kvErforderlich: kv,
        einstellung,
        aktuell: h.ventil.aktuelleEinstellung,
        hinweis: hinweise.join('; '),
      })
    }
  return ergebnis
}
