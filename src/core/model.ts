/**
 * Datenmodell der Heizlastberechnung (DIN EN 12831-1 / DIN/TS 12831-1).
 *
 * Alles ist reine, serialisierbare Daten. Verweise laufen über IDs
 * (Raum → Geschoss, Fläche → Bauteil, Angrenzung → Raum).
 * Das zod-Schema prüft Projektdateien beim Import.
 */
import { z } from 'zod'

export const SCHEMA_VERSION = 1

// ---------------------------------------------------------------------------
// Aufzählungen

export const BAUALTER = ['vor1977', 'wschvo1977', 'wschvo1995', 'enev', 'geg', 'passivhaus'] as const
export type Baualter = (typeof BAUALTER)[number]

export const GEBAEUDETYPEN = ['EFH', 'DHH', 'RH_mitte', 'RH_ende', 'MFH'] as const
export type Gebaeudetyp = (typeof GEBAEUDETYPEN)[number]

/** Bauteilkategorien. Fenster/Türen sind Öffnungen in Flächen. */
export const KATEGORIEN = [
  'AW', // Außenwand
  'IW', // Innenwand
  'HTW', // Haustrennwand / Wand zum Nachbargebäude
  'FE', // Fenster
  'DF', // Dachfenster
  'AT', // Außentür
  'IT', // Innentür
  'DA', // Dach / Dachschräge
  'DE', // Decke (oberste Geschossdecke oder Geschossdecke)
  'FB', // Fußboden / Bodenplatte / Kellerdecke
] as const
export type Kategorie = (typeof KATEGORIEN)[number]

export const OEFFNUNGS_KATEGORIEN: readonly Kategorie[] = ['FE', 'DF', 'AT', 'IT']

export const ORIENTIERUNGEN = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW', 'H'] as const
export type Orientierung = (typeof ORIENTIERUNGEN)[number]

export const NUTZUNGEN = [
  'wohnen',
  'schlafen',
  'kind',
  'arbeiten',
  'essen',
  'kueche',
  'bad',
  'wc',
  'flur',
  'treppenhaus',
  'abstellraum',
  'hobby',
  'sonstig',
] as const
export type Nutzung = (typeof NUTZUNGEN)[number]

export const ENERGIETRAEGER = ['erdgas', 'heizoel', 'fluessiggas', 'pellets', 'fernwaerme', 'strom_wp', 'strom_direkt'] as const
export type Energietraeger = (typeof ENERGIETRAEGER)[number]

export const EINHEITEN = ['kWh', 'm3', 'l', 'kg'] as const
export type Einheit = (typeof EINHEITEN)[number]

export const HEIZKOERPER_TYPEN = ['platte', 'glieder', 'roehren', 'konvektor', 'fussbodenheizung', 'sonstig'] as const
export type HeizkoerperTyp = (typeof HEIZKOERPER_TYPEN)[number]

export const SYSTEMARTEN = ['zweirohr', 'einrohr'] as const
export type Systemart = (typeof SYSTEMARTEN)[number]

export const ABSCHIRMUNG = ['keine', 'mittel', 'gut'] as const
export type Abschirmung = (typeof ABSCHIRMUNG)[number]

// ---------------------------------------------------------------------------
// Angrenzung: wohin geht der Wärmestrom einer Fläche?

export const AngrenzungSchema = z.discriminatedUnion('art', [
  z.object({ art: z.literal('aussen') }),
  z.object({ art: z.literal('erdreich') }),
  /** Unbeheizter Bereich (Keller, Dachboden, Garage) – Temperatur über b-Faktor oder direkt. */
  z.object({ art: z.literal('unbeheizt'), bezeichnung: z.string(), theta: z.number() }),
  /** Beheizter Raum dieses Projekts – Temperatur kommt aus dem Raum. */
  z.object({ art: z.literal('raum'), raumId: z.string() }),
  /** Beheizter Bereich ohne eigenen Raum im Projekt (z. B. Nachbarwohnung). */
  z.object({ art: z.literal('beheizt'), bezeichnung: z.string(), theta: z.number() }),
])
export type Angrenzung = z.infer<typeof AngrenzungSchema>

// ---------------------------------------------------------------------------
// Bausteine

export const BauteilSchema = z.object({
  id: z.string(),
  kategorie: z.enum(KATEGORIEN),
  name: z.string(),
  /** U-Wert [W/(m²K)] */
  u: z.number(),
  /** Wärmebrückenzuschlag ΔU_TB [W/(m²K)] */
  deltaUTb: z.number(),
  notiz: z.string().default(''),
  /** Optionaler Schichtaufbau (innen → außen) für den U-Wert-Rechner */
  schichten: z
    .array(z.object({ material: z.string(), dicke: z.number(), lambda: z.number() }))
    .default([]),
})
export type Bauteil = z.infer<typeof BauteilSchema>

export const OeffnungSchema = z.object({
  id: z.string(),
  bauteilId: z.string(),
  bezeichnung: z.string().default(''),
  breite: z.number(),
  hoehe: z.number(),
  anzahl: z.number().int(),
})
export type Oeffnung = z.infer<typeof OeffnungSchema>

export const FlaecheSchema = z.object({
  id: z.string(),
  bauteilId: z.string(),
  orientierung: z.enum(ORIENTIERUNGEN),
  /** Länge bzw. Breite [m] */
  laenge: z.number(),
  /** Höhe bzw. Tiefe [m]; null = Geschosshöhe (für Wände) */
  hoehe: z.number().nullable(),
  /** Fläche direkt [m²]; überschreibt Länge × Höhe, wenn gesetzt */
  flaecheDirekt: z.number().nullable(),
  angrenzung: AngrenzungSchema,
  oeffnungen: z.array(OeffnungSchema),
})
export type Flaeche = z.infer<typeof FlaecheSchema>

/** Thermostatventil am Heizkörper – Grundlage für den Voreinstellwert. */
export const VentilSchema = z.object({
  hersteller: z.string(),
  modell: z.string(),
  /** Ventil voreinstellbar? (sonst: Rücklaufverschraubung oder Tausch nötig) */
  voreinstellbar: z.boolean(),
  /** Aktuell eingestellter Wert (falls ablesbar), z. B. "N", "4", "6" */
  aktuelleEinstellung: z.string(),
  /** Nennweite, z. B. "DN10", "DN15" */
  nennweite: z.string(),
})
export type Ventil = z.infer<typeof VentilSchema>

export const HeizkoerperSchema = z.object({
  id: z.string(),
  bezeichnung: z.string(),
  typ: z.enum(HEIZKOERPER_TYPEN),
  /** z. B. "22" für Typ 22 Plattenheizkörper */
  bauart: z.string().default(''),
  /** Bauhöhe [mm] */
  bauhoehe: z.number().nullable(),
  /** Baulänge [mm] */
  baulaenge: z.number().nullable(),
  /** Bautiefe [mm] */
  bautiefe: z.number().nullable(),
  /** Normwärmeleistung bei 75/65/20 °C [W] */
  phiN: z.number().nullable(),
  /** Heizkörperexponent n */
  exponent: z.number(),
  anzahl: z.number().int(),
  ventil: VentilSchema,
  /** Ungefähre Leitungslänge bis zum Wärmeerzeuger (einfache Strecke) [m] */
  leitungslaenge: z.number().nullable(),
})
export type Heizkoerper = z.infer<typeof HeizkoerperSchema>

export const RaumSchema = z.object({
  id: z.string(),
  geschossId: z.string(),
  nummer: z.string().default(''),
  name: z.string(),
  nutzung: z.enum(NUTZUNGEN),
  /** Norm-Innentemperatur θ_int [°C] */
  thetaInt: z.number(),
  /** Mindestluftwechsel n_min [1/h] */
  nMin: z.number(),
  /** Grundfläche [m²] */
  grundflaeche: z.number(),
  /** Lichte Raumhöhe [m]; null = lichte Höhe des Geschosses */
  lichteHoehe: z.number().nullable(),
  flaechen: z.array(FlaecheSchema),
  heizkoerper: z.array(HeizkoerperSchema),
  /** Lage im Grundriss als Rechteck [m], Ursprung Nord-West-Ecke, x nach Osten, y nach Süden */
  lage: z.object({ x: z.number(), y: z.number(), breite: z.number(), tiefe: z.number() }).nullable().default(null),
})
export type Raum = z.infer<typeof RaumSchema>

export const GeschossSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Geschosshöhe OK Rohdecke bis OK Rohdecke [m] (Wandhöhe für Außenmaße) */
  geschosshoehe: z.number(),
  /** Lichte Raumhöhe [m] (für Raumvolumen) */
  lichteHoehe: z.number(),
  /** Was liegt unter dem Geschoss? (Vorschlag für Fußböden) */
  unten: AngrenzungSchema,
  /** Was liegt über dem Geschoss? (Vorschlag für Decken) */
  oben: AngrenzungSchema,
})
export type Geschoss = z.infer<typeof GeschossSchema>

export const VerbrauchSchema = z.object({
  id: z.string(),
  /** Abrechnungszeitraum, z. B. "2024" oder "07/2023–06/2024" */
  zeitraum: z.string(),
  traeger: z.enum(ENERGIETRAEGER),
  menge: z.number(),
  einheit: z.enum(EINHEITEN),
  /** Warmwasser im Verbrauch enthalten? */
  inklWarmwasser: z.boolean(),
  /** Anlagennutzungsgrad bzw. Jahresarbeitszahl */
  nutzungsgrad: z.number(),
  /** Gradtagzahl G20/15 des Zeitraums [Kd] (DWD/IWU); null = langjähriges Mittel */
  gradtagzahl: z.number().nullable().default(null),
  notiz: z.string().default(''),
})
export type Verbrauch = z.infer<typeof VerbrauchSchema>

/** Messreihe eines Raums: Innen- und Außentemperatur, optional Heizkörper-Vor-/Rücklauf. */
export const MessreiheSchema = z.object({
  id: z.string(),
  raumId: z.string(),
  name: z.string(),
  punkte: z.array(
    z.object({
      /** Zeit (ISO-8601) */
      t: z.string(),
      innen: z.number(),
      aussen: z.number(),
      vl: z.number().nullable().default(null),
      rl: z.number().nullable().default(null),
    }),
  ),
  /** Auswertungsfenster (ISO-Zeiten); null = alles */
  von: z.string().nullable().default(null),
  bis: z.string().nullable().default(null),
  notiz: z.string().default(''),
})
export type Messreihe = z.infer<typeof MessreiheSchema>

export const ProjektSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  meta: z.object({
    name: z.string(),
    bauherr: z.string(),
    strasse: z.string(),
    plz: z.string(),
    ort: z.string(),
    bearbeiter: z.string(),
    datum: z.string(),
    notiz: z.string(),
  }),
  klima: z.object({
    /** Norm-Außentemperatur θ_e [°C] */
    thetaE: z.number().nullable(),
    /** Herkunft von θ_e */
    thetaEQuelle: z.enum(['plz', 'manuell']),
    referenzort: z.string(),
    /** Jahresmittel der Außentemperatur θ_m,e [°C] (für Erdreich) */
    thetaMe: z.number().nullable(),
  }),
  gebaeude: z.object({
    typ: z.enum(GEBAEUDETYPEN),
    baujahr: z.number().int().nullable(),
    baualter: z.enum(BAUALTER),
    /** Luftwechsel bei 50 Pa n50 [1/h] */
    n50: z.number().nullable(),
    n50Gemessen: z.boolean(),
    abschirmung: z.enum(ABSCHIRMUNG),
    lueftungsanlage: z.boolean(),
    /** Wärmerückgewinnungsgrad 0…1 */
    wrgEta: z.number().nullable(),
    /** Beheizte Wohnfläche [m²]; null = Summe der Räume */
    wohnflaeche: z.number().nullable().default(null),
    /** Bauweise für die wirksame Speicherkapazität (Messauswertung) */
    bauweise: z.enum(['leicht', 'mittel', 'schwer']).default('mittel'),
  }),
  /**
   * Heizungsanlage (Bestand). Heizkörper sind vorhanden; Ergebnis der
   * Berechnung ist u. a. die nötige Vorlauftemperatur → neue Heizkurve.
   */
  anlage: z.object({
    erzeuger: z.string(),
    /** Nennleistung des Wärmeerzeugers [kW] */
    erzeugerLeistung: z.number().nullable(),
    systemart: z.enum(SYSTEMARTEN),
    /** Vorlauftemperatur bei Norm-Außentemperatur [°C] – Ist-Zustand bzw. Startwert */
    vorlauf: z.number(),
    /** Rücklauftemperatur bei Norm-Außentemperatur [°C] */
    ruecklauf: z.number(),
    /** Aktuelle Heizkurve am Regler der Therme */
    heizkurve: z.object({
      /** Steilheit / Neigung (Herstellerskala, z. B. 1,4) */
      steilheit: z.number().nullable(),
      /** Niveau / Parallelverschiebung [K] */
      niveau: z.number().nullable(),
      /** Raumsollwert am Regler [°C] */
      raumsoll: z.number().nullable(),
      /** Maximale Vorlauftemperatur [°C] */
      maxVorlauf: z.number().nullable(),
      /** Heizgrenze / Sommer-Winter-Umschaltung [°C] */
      heizgrenze: z.number().nullable(),
    }),
    /** Messpunkte am Bestand: Außentemp. → Vorlauf/Rücklauf, zur Kontrolle */
    messungen: z.array(
      z.object({
        id: z.string(),
        datum: z.string(),
        aussen: z.number(),
        vorlauf: z.number(),
        ruecklauf: z.number().nullable(),
        /** Alle Räume warm genug? */
        raeumeWarm: z.boolean(),
        notiz: z.string(),
      }),
    ),
    pumpe: z.string(),
    /** Pumpen-Förderhöhe bzw. Differenzdruck-Sollwert [mbar] */
    pumpenDruck: z.number().nullable(),
    /** Differenzdruckregler in Strängen vorhanden? */
    differenzdruckregler: z.boolean(),
    /** Ziel-Spreizung Vorlauf–Rücklauf im ungünstigsten Raum bei θ_e [K] */
    zielSpreizung: z.number().default(10),
    /** Gewünschter Systemvorlauf bei θ_e [°C]; null = automatisch (ungünstigster Raum, max. Vorlauf als Grenze) */
    zielVorlauf: z.number().nullable().default(null),
    notiz: z.string(),
  }),
  bauteile: z.array(BauteilSchema),
  geschosse: z.array(GeschossSchema),
  raeume: z.array(RaumSchema),
  verbrauch: z.array(VerbrauchSchema),
  /** Messreihen (Auskühl-/Aufheizversuche) */
  messreihen: z.array(MessreiheSchema).default([]),
})
export type Projekt = z.infer<typeof ProjektSchema>

// ---------------------------------------------------------------------------
// Fabriken

export const neueId = (): string => crypto.randomUUID()

export function leeresProjekt(): Projekt {
  return {
    version: SCHEMA_VERSION,
    meta: {
      name: 'Neues Projekt',
      bauherr: '',
      strasse: '',
      plz: '',
      ort: '',
      bearbeiter: '',
      datum: new Date().toISOString().slice(0, 10),
      notiz: '',
    },
    // Standard −14 °C (Raum Braunschweig), wenn keine PLZ-Klimadaten vorliegen; im Schritt „Klima“ überschreibbar
    klima: { thetaE: -14, thetaEQuelle: 'manuell', referenzort: 'Standardwert', thetaMe: null },
    gebaeude: {
      typ: 'EFH',
      baujahr: null,
      baualter: 'vor1977',
      n50: null,
      n50Gemessen: false,
      abschirmung: 'mittel',
      lueftungsanlage: false,
      wrgEta: null,
      wohnflaeche: null,
      bauweise: 'mittel',
    },
    anlage: {
      erzeuger: '',
      erzeugerLeistung: null,
      systemart: 'zweirohr',
      vorlauf: 55,
      ruecklauf: 45,
      heizkurve: { steilheit: null, niveau: null, raumsoll: null, maxVorlauf: null, heizgrenze: null },
      messungen: [],
      pumpe: '',
      pumpenDruck: null,
      differenzdruckregler: false,
      zielSpreizung: 10,
      zielVorlauf: null,
      notiz: '',
    },
    bauteile: [],
    geschosse: [],
    raeume: [],
    verbrauch: [],
    messreihen: [],
  }
}
