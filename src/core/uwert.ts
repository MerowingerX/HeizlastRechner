/**
 * U-Wert aus Schichtaufbau nach DIN EN ISO 6946 (homogene Schichten).
 *   U = 1 / (R_si + Σ d/λ + R_se)
 */
import type { Bauteil, Kategorie } from './model'

/** Wärmeübergangswiderstände [m²K/W] je Bauteilkategorie (Richtung des Wärmestroms). */
export function uebergang(k: Kategorie, aussenErdreich = false): { rsi: number; rse: number } {
  const rse = aussenErdreich ? 0 : 0.04
  switch (k) {
    case 'DA':
    case 'DE':
    case 'DF':
      return { rsi: 0.1, rse } // nach oben
    case 'FB':
      return { rsi: 0.17, rse } // nach unten
    case 'IW':
    case 'IT':
    case 'HTW':
      return { rsi: 0.13, rse: 0.13 } // beidseitig innen
    default:
      return { rsi: 0.13, rse } // horizontal
  }
}

export function uAusSchichten(b: Pick<Bauteil, 'kategorie' | 'schichten'>, aussenErdreich = false): number | null {
  if (b.schichten.length === 0) return null
  const { rsi, rse } = uebergang(b.kategorie, aussenErdreich)
  let r = rsi + rse
  for (const s of b.schichten) {
    if (!(s.lambda > 0) || !(s.dicke >= 0)) return null
    r += s.dicke / s.lambda
  }
  return 1 / r
}

/** Bemessungswerte der Wärmeleitfähigkeit λ [W/(mK)], gerundete Richtwerte (DIN 4108-4). */
export const MATERIALIEN: { name: string; lambda: number }[] = [
  { name: 'Innenputz (Kalkgips)', lambda: 0.7 },
  { name: 'Außenputz (Kalkzement)', lambda: 1.0 },
  { name: 'Vollziegel', lambda: 0.68 },
  { name: 'Hochlochziegel (alt)', lambda: 0.45 },
  { name: 'Leichthochlochziegel', lambda: 0.16 },
  { name: 'Porenbeton', lambda: 0.12 },
  { name: 'Kalksandstein', lambda: 0.99 },
  { name: 'Bimsstein / Leichtbeton', lambda: 0.32 },
  { name: 'Stahlbeton', lambda: 2.3 },
  { name: 'Naturstein (Sandstein)', lambda: 2.3 },
  { name: 'Holz (Nadelholz)', lambda: 0.13 },
  { name: 'Fachwerk-Ausfachung Lehm', lambda: 0.8 },
  { name: 'Estrich (Zement)', lambda: 1.4 },
  { name: 'Mineralwolle WLG 035', lambda: 0.035 },
  { name: 'Mineralwolle WLG 040', lambda: 0.04 },
  { name: 'EPS WLG 035', lambda: 0.035 },
  { name: 'EPS WLG 040 (alt)', lambda: 0.04 },
  { name: 'XPS / Perimeterdämmung', lambda: 0.035 },
  { name: 'PUR/PIR', lambda: 0.024 },
  { name: 'Holzfaser', lambda: 0.045 },
  { name: 'Zellulose', lambda: 0.04 },
  { name: 'Ruhende Luftschicht 4 cm (R≈0,18)', lambda: 0.22 },
  { name: 'Gipskarton', lambda: 0.25 },
  { name: 'Dachziegel belüftet (nicht ansetzen)', lambda: 1.0 },
]
