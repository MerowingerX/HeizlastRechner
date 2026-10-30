# Projektdatei: Kurzreferenz

Vollständiges Schema: `npm run -s heizlast -- schema`. Maßgeblich ist `src/core/model.ts`.

```jsonc
{
  "version": 1,
  "meta": { "name", "bauherr", "strasse", "plz", "ort", "bearbeiter", "datum": "YYYY-MM-DD", "notiz" },
  "klima": {
    "thetaE": -14,            // Norm-Außentemperatur °C (null = unbekannt)
    "thetaEQuelle": "plz",    // "plz" | "manuell"
    "referenzort": "Dresden",
    "thetaMe": 9.0            // Jahresmittel °C, für Erdreich
  },
  "gebaeude": {
    "typ": "EFH",             // EFH | DHH | RH_mitte | RH_ende | MFH
    "baujahr": 1972,
    "baualter": "vor1977",    // vor1977 | wschvo1977 | wschvo1995 | enev | geg | passivhaus
    "n50": 6, "n50Gemessen": false,
    "abschirmung": "mittel",  // keine | mittel | gut
    "lueftungsanlage": false, "wrgEta": null
  },
  "anlage": {
    "erzeuger": "Vaillant ecoTEC plus 206", "erzeugerLeistung": 20,   // kW
    "systemart": "zweirohr",  // zweirohr | einrohr
    "vorlauf": 65, "ruecklauf": 50,     // Ist bei Norm-Außentemperatur, °C
    "heizkurve": { "steilheit": 1.4, "niveau": 0, "raumsoll": 20, "maxVorlauf": 75, "heizgrenze": 16 },
    "messungen": [ { "id", "datum", "aussen": -5, "vorlauf": 58, "ruecklauf": 46, "raeumeWarm": true, "notiz": "" } ],
    "pumpe": "intern", "pumpenDruck": null,   // mbar
    "differenzdruckregler": false, "notiz": ""
  },
  "bauteile": [
    { "id": "bt-aw", "kategorie": "AW", "name": "Außenwand 30 cm Ziegel", "u": 1.4, "deltaUTb": 0.1, "notiz": "Schätzwert" }
    // kategorie: AW Außenwand, IW Innenwand, HTW Haustrennwand, FE Fenster, DF Dachfenster,
    //            AT Außentür, IT Innentür, DA Dach/Schräge, DE Decke, FB Fußboden
  ],
  "geschosse": [
    {
      "id": "g-eg", "name": "EG",
      "geschosshoehe": 2.75,  // Rohdecke–Rohdecke, m (Wandhöhe für Außenflächen)
      "lichteHoehe": 2.5,     // Fußboden–Decke, m (Raumvolumen)
      "unten": { "art": "unbeheizt", "bezeichnung": "Keller unbeheizt", "theta": 3 },
      "oben":  { "art": "beheizt", "bezeichnung": "OG", "theta": 20 }
    }
  ],
  "raeume": [
    {
      "id": "r-eg-wohnen", "geschossId": "g-eg", "nummer": "0.01", "name": "Wohnzimmer",
      "nutzung": "wohnen",    // wohnen schlafen kind arbeiten essen kueche bad wc flur treppenhaus abstellraum hobby sonstig
      "thetaInt": 20, "nMin": 0.5,
      "grundflaeche": 24.5,   // m², innen
      "lichteHoehe": null,    // null = vom Geschoss
      "flaechen": [
        {
          "id": "f-eg-wohnen-aw-s", "bauteilId": "bt-aw", "orientierung": "S",  // N NO O SO S SW W NW H
          "laenge": 5.4,        // m, Außenmaß
          "hoehe": null,        // null = Geschosshöhe
          "flaecheDirekt": null,// m², überschreibt laenge×hoehe (für Boden/Decke/Schrägen)
          "angrenzung": { "art": "aussen" },
          "oeffnungen": [
            { "id": "o-eg-wohnen-fe-s1", "bauteilId": "bt-fe", "bezeichnung": "Terrassentür", "breite": 1.76, "hoehe": 2.135, "anzahl": 1 }
          ]
        }
      ],
      "heizkoerper": [
        {
          "id": "hk-eg-wohnen-1", "bezeichnung": "unter Fenster S", "typ": "platte", // platte glieder roehren konvektor fussbodenheizung sonstig
          "bauart": "22", "bauhoehe": 600, "baulaenge": 1400, "bautiefe": 100,      // mm
          "phiN": 2380,         // W bei 75/65/20 (null = unbekannt)
          "exponent": 1.3, "anzahl": 1,
          "ventil": { "hersteller": "Heimeier", "modell": "V-exact II", "voreinstellbar": true, "aktuelleEinstellung": "N", "nennweite": "DN15" },
          "leitungslaenge": 8   // m bis Therme, grob
        }
      ]
    }
  ],
  "verbrauch": [
    { "id": "v-2024", "zeitraum": "2024", "traeger": "erdgas", "menge": 18500, "einheit": "kWh",
      "inklWarmwasser": true, "nutzungsgrad": 0.9, "notiz": "" }
    // traeger: erdgas heizoel fluessiggas pellets fernwaerme strom_wp strom_direkt; einheit: kWh m3 l kg
  ]
}
```

## Weitere Felder (optional, mit Standardwerten)

| Feld | Bedeutung |
|---|---|
| `gebaeude.wohnflaeche` | beheizte Wohnfläche m² (null = Summe der Räume) |
| `gebaeude.bauweise` | `leicht` / `mittel` / `schwer` – Speicherkapazität für die Messauswertung |
| `anlage.zielSpreizung` | Spreizung im ungünstigsten Raum bei θ_e, K (Therme 10–15, Wärmepumpe 5–7), Standard 10 |
| `anlage.zielVorlauf` | gewünschter Systemvorlauf bei θ_e °C (null = automatisch, begrenzt durch `heizkurve.maxVorlauf`) |
| `bauteile[].schichten` | `[{ material, dicke (m), lambda }]` innen → außen, für den U-Wert-Rechner |
| `raeume[].lage` | `{ x, y, breite, tiefe }` in m, Innenmaße. Ursprung NW-Ecke des Geschosses, x nach Osten, y nach Süden. Für Grundriss und 3D |
| `verbrauch[].gradtagzahl` | G20/15 des Abrechnungszeitraums (Kd), null = 3500 |
| `messreihen[]` | `{ id, raumId, name, punkte: [{ t (ISO), innen, aussen, vl, rl }], von, bis, notiz }`. Am besten per CLI `messung` importieren |
| `optionen.erdreich` | `iso13370` (Standard: U_equiv nach EN ISO 13370, f_g1, θ_m,e) oder `bfaktor` (wie heizlast-web: θ = 20 − b·(20 − θ_e)) |
| `optionen.erdreichB` | b-Faktor für `bfaktor`, Standard 0,33 |
| `optionen.gebaeudeheizlast` | `huelle` (Standard: Außenhülle, Infiltration 50 % gleichzeitig) oder `summeRaeume` (Summe der Raumheizlasten, wie heizlast-web) |

## Angrenzung (`angrenzung`, auch `unten`/`oben` im Geschoss)

| art | Felder | Wann |
|---|---|---|
| `aussen` | – | Außenluft |
| `erdreich` | – | Bodenplatte, erdberührte Kellerwand |
| `unbeheizt` | `bezeichnung`, `theta` | Keller, Dachboden, Garage. θ = θ_int − b·(θ_int − θ_e), b siehe schaetzwerte.md |
| `raum` | `raumId` | anderer erfasster Raum, der **anders warm** ist |
| `beheizt` | `bezeichnung`, `theta` | beheizter Bereich ohne eigenen Raum (Nachbarwohnung, Geschoss darüber pauschal) |

## Konventionen

- Wandlängen als **Außenmaß** (an der Ecke bis zur Außenkante), Höhe = Geschosshöhe. Dann passen die Flächen ohne Abzüge der Deckenränder.
- Fenster und Türen sind **Öffnungen in der Wand**, keine eigenen Flächen.
- Fußboden und Decke als Fläche mit `orientierung: "H"` und `flaecheDirekt` = Grundfläche.
- Innenwand oder Decke zu einem gleich warmen Raum **weglassen**, sie verursacht keinen Verlust.
- Ein Bad mit 24 °C neben einem Flur mit 15 °C: Innenwand mit `angrenzung.art = "raum"` erfassen.
