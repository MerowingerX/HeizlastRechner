/**
 * Kataloge und Vorschlagswerte.
 *
 * Alle Werte sind Vorschläge zum schnellen Start und in der Eingabe
 * überschreibbar. U-Werte nach Baualter sind typische Schätzwerte
 * (angelehnt an Gebäudetypologien), kein Ersatz für Bauteilaufnahme.
 */
import {
  neueId,
  type Abschirmung,
  type Baualter,
  type Bauteil,
  type Einheit,
  type Energietraeger,
  type Gebaeudetyp,
  type HeizkoerperTyp,
  type Kategorie,
  type Nutzung,
  type Orientierung,
} from './model'

export const KATEGORIE_LABEL: Record<Kategorie, string> = {
  AW: 'Außenwand',
  IW: 'Innenwand',
  HTW: 'Haustrennwand',
  FE: 'Fenster',
  DF: 'Dachfenster',
  AT: 'Außentür',
  IT: 'Innentür',
  DA: 'Dach / Dachschräge',
  DE: 'Decke',
  FB: 'Fußboden',
}

export const ORIENTIERUNG_LABEL: Record<Orientierung, string> = {
  N: 'Nord',
  NO: 'Nordost',
  O: 'Ost',
  SO: 'Südost',
  S: 'Süd',
  SW: 'Südwest',
  W: 'West',
  NW: 'Nordwest',
  H: 'Horizontal',
}

export const GEBAEUDETYP_LABEL: Record<Gebaeudetyp, string> = {
  EFH: 'Einfamilienhaus (freistehend)',
  DHH: 'Doppelhaushälfte',
  RH_mitte: 'Reihenmittelhaus',
  RH_ende: 'Reihenendhaus',
  MFH: 'Mehrfamilienhaus',
}

export const ABSCHIRMUNG_LABEL: Record<Abschirmung, string> = {
  keine: 'keine (freie Lage, Küste, Kuppe)',
  mittel: 'mittel (ländlich, Bäume / Nachbarhäuser)',
  gut: 'gut (Stadtzentrum, dichte Bebauung)',
}

// ---------------------------------------------------------------------------
// Raumnutzung → Norm-Innentemperatur und Mindestluftwechsel

export interface NutzungInfo {
  label: string
  thetaInt: number
  nMin: number
}

/** Übliche Auslegungswerte; n_min 0,5 1/h, Abstellraum 0. */
export const NUTZUNG_INFO: Record<Nutzung, NutzungInfo> = {
  wohnen: { label: 'Wohnzimmer', thetaInt: 20, nMin: 0.5 },
  schlafen: { label: 'Schlafzimmer', thetaInt: 20, nMin: 0.5 },
  kind: { label: 'Kinderzimmer', thetaInt: 20, nMin: 0.5 },
  arbeiten: { label: 'Arbeitszimmer / Büro', thetaInt: 20, nMin: 0.5 },
  essen: { label: 'Esszimmer', thetaInt: 20, nMin: 0.5 },
  kueche: { label: 'Küche', thetaInt: 20, nMin: 0.5 },
  bad: { label: 'Bad / Dusche', thetaInt: 24, nMin: 0.5 },
  wc: { label: 'WC', thetaInt: 20, nMin: 0.5 },
  flur: { label: 'Flur / Diele', thetaInt: 15, nMin: 0.5 },
  treppenhaus: { label: 'Treppenhaus (beheizt)', thetaInt: 15, nMin: 0.5 },
  abstellraum: { label: 'Abstellraum (beheizt)', thetaInt: 15, nMin: 0 },
  hobby: { label: 'Hobbyraum', thetaInt: 20, nMin: 0.5 },
  sonstig: { label: 'Sonstiger Raum', thetaInt: 20, nMin: 0.5 },
}

// ---------------------------------------------------------------------------
// Baualter → typische U-Werte und Luftdichtheit

export interface BaualterInfo {
  label: string
  /** Typischer n50-Wert ohne Messung [1/h] */
  n50: number
  /** Typische U-Werte [W/(m²K)] der Hüllbauteile */
  u: Partial<Record<Kategorie, number>>
}

export const BAUALTER_INFO: Record<Baualter, BaualterInfo> = {
  vor1977: {
    label: 'vor 1977 (unsaniert)',
    n50: 6,
    u: { AW: 1.4, FE: 2.8, DF: 2.5, AT: 2.8, DA: 0.9, DE: 0.9, FB: 1.0 },
  },
  wschvo1977: {
    label: '1977–1994 (WSchVO 77/84)',
    n50: 4,
    u: { AW: 0.8, FE: 2.6, DF: 2.3, AT: 2.5, DA: 0.45, DE: 0.5, FB: 0.8 },
  },
  wschvo1995: {
    label: '1995–2001 (WSchVO 95)',
    n50: 3,
    u: { AW: 0.5, FE: 1.6, DF: 1.6, AT: 1.8, DA: 0.3, DE: 0.3, FB: 0.5 },
  },
  enev: {
    label: '2002–2019 (EnEV)',
    n50: 2,
    u: { AW: 0.28, FE: 1.3, DF: 1.4, AT: 1.5, DA: 0.2, DE: 0.2, FB: 0.35 },
  },
  geg: {
    label: 'ab 2020 (GEG)',
    n50: 1.5,
    u: { AW: 0.22, FE: 0.95, DF: 1.0, AT: 1.2, DA: 0.16, DE: 0.16, FB: 0.3 },
  },
  passivhaus: {
    label: 'Passivhaus',
    n50: 0.6,
    u: { AW: 0.12, FE: 0.8, DF: 0.85, AT: 0.8, DA: 0.1, DE: 0.1, FB: 0.15 },
  },
}

/** Pauschaler Wärmebrückenzuschlag für Außenbauteile ohne Nachweis (DIN/TS 12831-1). */
export const DELTA_U_TB_PAUSCHAL = 0.1

/** Innenbauteile: unabhängig vom Baualter (Schätzwerte). */
const INNEN_U: Partial<Record<Kategorie, number>> = { IW: 1.8, IT: 2.0, HTW: 1.0 }

/** Liefert einen kompletten Startkatalog an Bauteilen für ein Baualter. */
export function standardBauteile(baualter: Baualter): Bauteil[] {
  const info = BAUALTER_INFO[baualter]
  const aussen: Kategorie[] = ['AW', 'FE', 'DF', 'AT', 'DA', 'DE', 'FB']
  const liste: Bauteil[] = aussen.map((k) => ({
    id: neueId(),
    kategorie: k,
    name: `${KATEGORIE_LABEL[k]} (${info.label})`,
    u: info.u[k] ?? 1,
    deltaUTb: DELTA_U_TB_PAUSCHAL,
    notiz: 'Schätzwert nach Baualter',
    schichten: [],
  }))
  for (const k of ['IW', 'IT', 'HTW'] as const) {
    liste.push({
      id: neueId(),
      kategorie: k,
      name: KATEGORIE_LABEL[k],
      u: INNEN_U[k] ?? 1,
      deltaUTb: 0,
      notiz: 'Schätzwert',
      schichten: [],
    })
  }
  liste.push({
    id: neueId(),
    kategorie: 'DE',
    name: 'Geschossdecke (innen)',
    u: 1.0,
    deltaUTb: 0,
    notiz: 'Schätzwert',
    schichten: [],
  })
  return liste
}

// ---------------------------------------------------------------------------
// Unbeheizte Nachbarbereiche: Vorlagen mit Temperatur-Reduktionsfaktor b
// θ_u = θ_int − b · (θ_int − θ_e)

export interface UnbeheiztVorlage {
  bezeichnung: string
  b: number
}

export const UNBEHEIZT_VORLAGEN: UnbeheiztVorlage[] = [
  { bezeichnung: 'Keller unbeheizt', b: 0.5 },
  { bezeichnung: 'Dachboden unbeheizt', b: 0.9 },
  { bezeichnung: 'Garage', b: 0.8 },
  { bezeichnung: 'Treppenhaus unbeheizt', b: 0.5 },
  { bezeichnung: 'Wintergarten unbeheizt', b: 0.6 },
]

export function thetaAusB(b: number, thetaE: number, thetaInt = 20): number {
  return Math.round((thetaInt - b * (thetaInt - thetaE)) * 10) / 10
}

// ---------------------------------------------------------------------------
// Energieträger (für den Verbrauchsabgleich)

export interface TraegerInfo {
  label: string
  einheit: Einheit
  /** Energiegehalt je Einheit [kWh] (Heizwert Hi, gerundet) */
  kWhJeEinheit: Partial<Record<Einheit, number>>
  /** typischer Nutzungsgrad bzw. JAZ */
  nutzungsgrad: number
}

export const TRAEGER_INFO: Record<Energietraeger, TraegerInfo> = {
  erdgas: { label: 'Erdgas', einheit: 'kWh', kWhJeEinheit: { kWh: 1, m3: 10 }, nutzungsgrad: 0.9 },
  heizoel: { label: 'Heizöl', einheit: 'l', kWhJeEinheit: { l: 10, kWh: 1 }, nutzungsgrad: 0.85 },
  fluessiggas: { label: 'Flüssiggas', einheit: 'l', kWhJeEinheit: { l: 6.6, kg: 12.8, kWh: 1 }, nutzungsgrad: 0.9 },
  pellets: { label: 'Holzpellets', einheit: 'kg', kWhJeEinheit: { kg: 4.9, kWh: 1 }, nutzungsgrad: 0.85 },
  fernwaerme: { label: 'Fernwärme', einheit: 'kWh', kWhJeEinheit: { kWh: 1 }, nutzungsgrad: 0.98 },
  strom_wp: { label: 'Strom Wärmepumpe', einheit: 'kWh', kWhJeEinheit: { kWh: 1 }, nutzungsgrad: 3.0 },
  strom_direkt: { label: 'Strom direkt / Nachtspeicher', einheit: 'kWh', kWhJeEinheit: { kWh: 1 }, nutzungsgrad: 1.0 },
}

export const EINHEIT_LABEL: Record<Einheit, string> = { kWh: 'kWh', m3: 'm³', l: 'Liter', kg: 'kg' }

// ---------------------------------------------------------------------------
// Heizkörper

export const HEIZKOERPER_LABEL: Record<HeizkoerperTyp, string> = {
  platte: 'Plattenheizkörper',
  glieder: 'Gliederheizkörper',
  roehren: 'Röhrenradiator / Badheizkörper',
  konvektor: 'Konvektor',
  fussbodenheizung: 'Fußbodenheizung',
  sonstig: 'Sonstiges',
}

/** Typische Heizkörperexponenten n nach EN 442. */
export const HEIZKOERPER_EXPONENT: Record<HeizkoerperTyp, number> = {
  platte: 1.3,
  glieder: 1.3,
  roehren: 1.25,
  konvektor: 1.4,
  fussbodenheizung: 1.1,
  sonstig: 1.3,
}
