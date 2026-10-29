# Plan

Ziel ist die Erstellung einer Software zur normgerechten Heizlastberechnung
- Aufnahme der notwendigen Gebäudedaten
- Darstellung des Grundriss
- Aufnahme Fenster und Türen
- Blender-Image des Gebäudes (→ 3D-Ansicht in der App, glTF-Export für Blender)
- Heizkörperaufnahme
- Berechnung der Heizlast pro Raum
- Abgleich mit realen Verbrauchsdaten

---

## 1. Rahmen

| Thema | Entscheidung |
|---|---|
| Norm | DIN EN 12831-1:2017 + DIN/TS 12831-1:2020 (nationales Verfahren DE) |
| Plattform | Web-App, läuft lokal im Browser (offline-fähig) |
| Sprache | TypeScript (strict) |
| UI | React + Vite |
| State | Zustand (ein Projekt-Store, Undo/Redo via Patches) |
| Grundriss 2D | SVG (eigener Editor) |
| 3D | three.js via @react-three/fiber, Export glTF (.glb) |
| Speicherung | Projekt als JSON-Datei (Import/Export) + Autosave in IndexedDB |
| Bericht | PDF-Export (Raumblätter + Gebäudesumme) |
| Tests | Vitest (Rechenkern), Playwright (UI-Smoke) |

Normtabellen (DIN) sind urheberrechtlich geschützt → Software liefert nur Struktur + frei verfügbare/eigene Werte; Normwerte vom Nutzer pflegbar (Katalog-Dateien).

## 2. Architektur

```
heizlast/
├─ packages/
│  ├─ core/        # Rechenkern, reine Funktionen, keine UI-Abhängigkeit
│  │  ├─ model/    # Typen: Projekt, Geschoss, Raum, Bauteil, Öffnung, Heizkörper
│  │  ├─ geometry/ # Polygon-Flächen, Nachbarschaft, Bauteilflächen aus Grundriss
│  │  ├─ uvalue/   # U-Wert aus Schichtaufbau (DIN EN ISO 6946)
│  │  ├─ heatload/ # Transmission, Lüftung, Aufheizung, Raum- & Gebäudeheizlast
│  │  ├─ radiator/ # Heizkörperleistung bei Systemtemperaturen
│  │  └─ consumption/ # Verbrauchsabgleich
│  └─ catalogs/    # JSON: Klimadaten, Raumtemperaturen, Materialien, Bauteile, Heizkörper
└─ apps/
   └─ web/         # React-App: Editor, Formulare, 3D, Berichte
```

Prinzip: Datenmodell = einzige Wahrheit. Grundriss-Geometrie erzeugt Bauteilflächen automatisch; Rechenkern rechnet nur auf Modell, UI zeigt nur an.

## 3. Datenmodell (Kern)

- **Projekt**: Name, Adresse/PLZ, Klimadaten (θ_e Norm-Außentemp., θ_m,e Jahresmittel), Gebäudetyp, Lage (Windschutz), Luftdichtheit (n50 bzw. q50), Lüftungsanlage ja/nein (+ WRG-Grad)
- **Geschoss**: Höhe OK FFB, lichte Höhe, Deckenstärke
- **Wand**: Polylinie im Grundriss, Dicke, Bauteiltyp (→ U-Wert), außen/innen/gegen unbeheizt/Erdreich
- **Raum**: Polygon (aus Wänden), Geschoss, Nutzung → θ_int, Volumen, Mindestluftwechsel
- **Öffnung** (Fenster/Tür): Wand-Referenz, Position, Breite, Höhe, Brüstung, U_w / U_d
- **Bauteiltyp**: Schichtaufbau oder direkter U-Wert, Kategorie (AW, IW, FB, DE, DA, FE, TÜ)
- **Angrenzende Zone**: beheizt (θ bekannt), unbeheizt (b-Faktor / Temperatur), Erdreich, Nachbargebäude
- **Heizkörper**: Raum, Typ/Hersteller, Φ_50 bzw. Normleistung 75/65/20, Exponent n
- **Verbrauch**: Zeiträume, Energieträger, Menge, Einheit, Warmwasser-Anteil, Kesselwirkungsgrad

## 4. Rechenverfahren (DIN EN 12831-1 / DIN/TS 12831-1)

Raumheizlast:  **Φ_HL,i = Φ_T,i + Φ_V,i + Φ_hu,i**

1. **Transmission** Φ_T,i = Σ H_T · (θ_int,i − θ_e)
   - nach außen: H_T,ie = Σ A_k · (U_k + ΔU_TB) · f_U
   - gegen unbeheizt: Temperaturkorrektur b_u bzw. Temperatur der Nachbarzone
   - gegen Erdreich: vereinfacht nach TS (f_g1, f_g2, G_w, U_equiv aus B' und z) – optional ISO 13370
   - gegen beheizte Nachbarräume mit anderer Temperatur: H_T,ij (wichtig für Bad 24 °C!)
   - Wärmebrückenzuschlag ΔU_TB pauschal lt. TS (Katalogwert, wählbar)
2. **Lüftung** Φ_V,i = 0,34 · V̇_i · (θ_int,i − θ_e)
   - V̇_i = max(V̇_min,i ; V̇_inf,i [+ V̇_mech,i Zuluft-Temperaturbezug])
   - V̇_min = n_min · V_i (Nutzungsabhängig)
   - V̇_inf aus n50, Abschirmung, Gebäudehöhe lt. TS
3. **Aufheizleistung** Φ_hu,i optional (Nachtabsenkung), Standard = 0
4. **Gebäudeheizlast**: Summe Transmission + Lüftung auf Gebäudeebene (Infiltration nicht doppelt, Gleichzeitigkeit) – nicht einfach Summe der Raumheizlasten

Geometrie-Regeln: Flächen aus Außenmaßen (TS-Konvention festlegen, einheitlich durchziehen), Fensterflächen von Wandfläche abziehen.

**Validierung**: Rechenkern gegen ein durchgerechnetes Referenzbeispiel (Beiblatt/Fachliteratur, z. B. Beispiel EFH) testen; Toleranz ±1 %.

## 5. Heizkörper

- Leistung bei realen Systemtemperaturen: Φ = Φ_N · (ΔT_log / ΔT_log,N)^n
  ΔT_log = (θ_VL − θ_RL) / ln((θ_VL − θ_i)/(θ_RL − θ_i)), ΔT_log,N = 49,8 K (75/65/20)
- Vergleich je Raum: Φ_HK vs Φ_HL → Über-/Unterdeckung in %
- Umkehrrechnung: minimal nötige Vorlauftemperatur je Raum + für das Gebäude (Wärmepumpen-Eignung!)
- Optional: Massenstrom / Volumenstrom je HK für hydraulischen Abgleich

## 6. Verbrauchsabgleich

- Jahresverbrauch → Nutzwärme: Q = Menge · Heizwert · η_Kessel − Q_WW
- Witterungsbereinigung über Gradtagzahl G20/15 (DWD-Daten nach PLZ/Station, als CSV importierbar)
- Abgeschätzte Heizlast aus Verbrauch: Φ_Verbr ≈ Q_H / (G_t · 24 h) · (θ_i − θ_e)
- Gegenüberstellung Φ_Verbr vs. Φ_HL (Norm liegt typ. höher: Sicherheiten, keine internen/solaren Gewinne) → Plausibilitätsband anzeigen, kein „richtig/falsch"
- Alternativ: Vollbenutzungsstunden-Methode als Zweitwert

## 7. UI / Arbeitsablauf

1. **Projekt anlegen**: Adresse/PLZ → Klimadaten vorschlagen, Gebäudeeigenschaften
2. **Bauteilkatalog**: Aufbauten anlegen (Schichten → U-Wert) oder Typ-U-Werte nach Baualter
3. **Grundriss-Editor** je Geschoss: Wände zeichnen (Raster/Fang, Maßeingabe), Räume automatisch aus geschlossenen Wandzügen, Nutzung zuweisen; optional Bild/PDF-Grundriss als Hintergrund hinterlegen + maßstäblich kalibrieren
4. **Öffnungen**: Fenster/Türen per Klick auf Wand setzen, Maße + U-Wert
5. **3D-Ansicht**: Extrusion aller Geschosse inkl. Öffnungen, Räume farbig nach W/m² Heizlast; Export .glb
6. **Heizkörper** je Raum erfassen
7. **Ergebnisse**: Raumtabelle (Φ_T, Φ_V, Φ_HL, W/m², HK-Deckung), Gebäudesumme, nötige Vorlauftemperatur
8. **Verbrauch**: Daten eingeben, Abgleich-Diagramm
9. **Bericht**: PDF

## Stand (29.10.2026)

Alle Meilensteine umgesetzt (erste Fassung):

| # | Umsetzung |
|---|---|
| M0 | Vite + React + TS, zod-Datenmodell, Store, Tests, Dateischnittstelle `projekte/` |
| M1 | Formulare für alle Aufnahmeschritte + Prüfung; Skill `heizlast-aufnahme` (11 Phasen); CLI |
| M2 | Rechenkern `src/core/berechnung.ts` (Transmission, Erdreich, Lüftung, Raum/Gebäude) |
| M3 | U-Wert-Rechner aus Schichtaufbau im Bauteilkatalog |
| M4/M6a | Heizkörper bei realen Temperaturen, nötiger Vorlauf, unterversorgte Räume, Heizkurve, Ventil-Voreinstellung (Katalog Heimeier/Danfoss/Oventrop, k_v-Richtwerte) |
| M5 | Verbrauchsabgleich mit Gradtagzahl |
| M6 | Bericht: Druckansicht/PDF und CSV aus „Ergebnis" |
| M6b | Messung: CSV-Import (Tuya/HA), Auskühl-/Aufheiz-Regression → H, C, τ |
| M7 | Grundriss-Editor (Räume als Rechtecke, Außenwand-Vorschläge) |
| M8 | 3D-Ansicht (three.js), Export .glb für Blender |

Vereinfachungen / offen:
- Ein Paket (`src/core`) statt Monorepo.
- Erdreich: B′ aus quadratischem Grundriss geschätzt, erdberührte Wände mit Bauteil-U.
- Infiltration nach 2·V·n50·e (EN 12831:2003-Ansatz), keine Aufheizleistung, keine Verteilverluste.
- k_v-Werte der Ventile sind gerundete Richtwerte → vor Ort mit Herstellerdiagramm prüfen.
- Grundriss nur Rechtecke (keine Wände/Polygone); 3D nicht im Browser getestet (nur Build/Typen).
- Validierung gegen ein offizielles Referenzbeispiel (Beiblatt) steht aus – Handrechnungs-Tests vorhanden.

## 8. Meilensteine – vom Einfachen zum Schweren

Leitlinie: **zuerst Datenaufnahme** (alles, was die Berechnung braucht, per Formular/Tabelle), dann Rechnen, dann Komfort (Grundriss, 3D).

| # | Inhalt | Ergebnis |
|---|---|---|
| M0 | Projektgerüst (Vite, React, TS, Vitest, ESLint), Datenmodell als zod-Schema | lauffähiges Gerüst, Projekt speichern/laden (JSON) |
| **M1** | **Datenaufnahme per Formular** (siehe 8.1) | alle Berechnungseingaben erfassbar + validiert, noch ohne Rechnung |
| M2 | Rechenkern Transmission + Lüftung, Raum- und Gebäudeheizlast | Heizlast pro Raum, Tests gegen Referenzbeispiel |
| M3 | U-Wert-Rechner (Schichtaufbau), Vorlagen nach Baualter | Bauteile bequem pflegbar |
| M4 | Heizkörper-Bewertung + nötige Vorlauftemperatur | HK-Deckung je Raum |
| M5 | Verbrauchsabgleich (Gradtagzahlen) | Plausibilisierung |
| M6 | Bericht (PDF/XLSX) | weitergebbares Ergebnis |
| M6a | **Endergebnis Bestand**: Heizkörper sind verbaut → je Raum nötige Vorlauftemperatur, Gebäude-Vorlauf = Maximum (ggf. ungünstigsten Raum per HK-Tausch verbessern), neue **Heizkurve** (Steilheit/Niveau) für die Therme, je Heizkörper Massenstrom + **Ventil-Voreinstellwert** (Herstellerdiagramm, Δp aus Pumpe/Leitungslänge) | Tabelle „Raum – Heizkörper – Volumenstrom – Einstellwert" + Heizkurve |
| M6b | **Messung vor Ort**: Raum verschließen, Tuya-Sensor (innen) + Außentemperatur aufzeichnen (CSV/Home Assistant/Tuya-API) → Auskühlkurve fitten: θ_i(t) = θ_e + (θ_0 − θ_e)·e^(−t/τ), τ = C/H. τ allein reicht nicht → Leistung nötig, ohne Elektroheizer: (1) **bevorzugt** Heizkörper als Messgerät: Tuya-Rohranlegefühler an VL/RL, Φ = Φ_N·(ΔT_log/49,8)^n aus erfassten HK-Daten (±15 %); (2) C aus Bauweise schätzen (EN ISO 13790: leicht/mittel/schwer), H = C/τ (±30 %); (3) Gaszähler bei stabiler Außentemp. → H_Gebäude, Aufteilung auf Räume über τ-Verhältnisse ⇒ H [W/K] und C [Wh/K] je Raum; Vergleich mit H aus Normrechnung | empirische Raumheizlast H·(θ_int − θ_e) |
| M7 | 2D-Grundriss-Editor: Wände, Räume, Fenster/Türen → Flächen + Nachbarschaft automatisch | Zeichnen statt Tabellen |
| M8 | 3D-Ansicht + glTF-Export | Visualisierung |

### 8.1 Datenaufnahme (M1) – Reihenfolge im Assistenten

1. **Projekt**: Name, Bauherr, Adresse, PLZ
2. **Standort/Klima**: θ_e (Vorschlag per PLZ, überschreibbar), θ_m,e, Windlage/Abschirmung
3. **Gebäude**: Baujahr/Baualtersklasse, Gebäudetyp (EFH/MFH/RH), Luftdichtheit n50 (gemessen oder Schätzwert), Lüftungsanlage + WRG
4. **Bauteilkatalog**: Außenwand, Innenwand, Fenster, Türen, Dach/oberste Decke, Bodenplatte/Kellerdecke – je U-Wert (direkt) + ΔU_TB
5. **Geschosse**: Name, Geschosshöhe, lichte Höhe, Deckendicke, was liegt darunter/darüber (Keller unbeheizt, Erdreich, Dachboden …)
6. **Räume** je Geschoss: Name, Nutzung → θ_int + n_min, Fläche (L×B oder direkt), Höhe, Dachschräge (Kniestock/First)
7. **Raumumschließungsflächen** je Raum (Tabelle): Bauteil, Orientierung, Länge×Höhe, angrenzend an (außen / Raum X / unbeheizt / Erdreich)
8. **Fenster/Türen** je Wand: Bauteiltyp, Breite×Höhe, Anzahl → wird von Wandfläche abgezogen
9. **Heizkörper** je Raum: Typ, Maße, Φ_N (75/65/20), Exponent n
10. **Verbrauch** (optional): Jahr, Energieträger, Menge, Warmwasser ja/nein

**KI-Dialog für die Aufnahme (M1b) – als Claude-Code-Skill:** Nutzer antwortet unscharf („Wohnzimmer so 5 × 4, zwei Fenster Süd, eins bodentief, darunter Keller"). Skill `.claude/skills/heizlast-aufnahme/` enthält Interview-Leitfaden, Schema-Erklärung und Regeln (fehlende Pflichtwerte gezielt nachfragen, Schätzwerte markieren, Plausibilität prüfen). Claude schreibt `projekte/<name>.json` und prüft mit `npm run pruefen -- <datei>` (nutzt denselben Validierungs-Kern). App importiert die Datei → Kontrolle/Korrektur in den Formularen. Kein API-Key in der App nötig. Später optional: Chat direkt in der App über Claude API.

Jeder Schritt validiert sofort (Plausibilität: Flächen > 0, Fensterfläche < Wandfläche, θ-Werte im Bereich …).

## 8.2 Bestehende Projekte als Grundlage (Recherche 29.10.2026)

| Projekt | Inhalt | Lizenz | Bewertung |
|---|---|---|---|
| [mylius/heizlast-web](https://github.com/mylius/heizlast-web) | DIN EN 12831 im Browser, Assistent + Profi-Modus, Vite/React/TS/zustand/zod, PLZ→θ_e, Paritätstests gegen Referenzwerte, PDF/XLSX | **keine** (= alle Rechte beim Autor) | fachlich + technisch fast deckungsgleich mit diesem Plan. Kein Grundriss/3D/Heizkörper/Verbrauch. Code nur nach Lizenz-Freigabe übernehmen → Autor anfragen |
| [JoSmuth/heizlast-12831](https://github.com/JoSmuth/heizlast-12831) | Python, DIN EN 12831-1 + DIN/TS, inkl. Erdreich, WRG, Aufheizzuschlag | keine | Referenz zum Gegenrechnen |
| [OpenHeatLoss](https://github.com/OpenHeatLoss/OpenHeatLoss) | UK-Verfahren (CIBSE), Heizkörper EN 442, Rohrnetz, SCOP | keine | Ideen für Heizkörper/Hydraulik, Verfahren nicht DE |
| [TrystanLea/heatlossjs](https://github.com/TrystanLea/heatlossjs) | einfacher Raum-für-Raum-Rechner (EN 12831:2003) | AGPL-3.0 | veraltet, nur Inspiration |
| [laanlabs/openPlan3D](https://github.com/laanlabs/openPlan3D) | 2D/3D-Grundriss-Editor, Raumerkennung aus Wänden, three.js, aktiv | MIT | gute Basis/Vorlage für M7/M8 (aber Svelte, nicht React) |
| [cvdlab/react-planner](https://github.com/cvdlab/react-planner) | React-Grundriss 2D + 3D | MIT | React, aber seit 2024 inaktiv |

Empfehlung: eigenes Repo, Architektur wie oben. heizlast-web als fachliche Referenz nutzen; Autor um Lizenz (z. B. MIT) bitten, dann Rechenkern + PLZ-Daten übernehmen. Für Grundriss/3D später openPlan3D (MIT) als Vorlage.

## 9. Offene Punkte

- Referenzbeispiel für Tests beschaffen (Beiblatt DIN/TS 12831-1 oder Fachbuch-Beispiel)
- Klimadaten: Norm-Außentemperaturen nach PLZ – Quelle/Lizenz klären, sonst manuelle Eingabe + kleiner eigener Katalog
- Erdreich: vereinfachtes TS-Verfahren reicht für v1?
- Mehrnutzer/Cloud nötig oder rein lokal? (Plan: rein lokal)
- Dachschrägen/Gauben: v1 nur einfache Satteldach-Räume mit Kniestock oder später?
- Typische U-Werte nach Baualtersklasse (z. B. TABULA/IWU-Gebäudetypologie) als Startkatalog
