# 🔥 Heizlastberechnung für Bestandsgebäude

**Wie warm muss das Heizwasser wirklich sein?** Diese Web-App rechnet die Heizlast eines bestehenden Hauses raumweise nach **DIN EN 12831-1 / DIN/TS 12831-1** und beantwortet damit die Fragen, die im Alltag zählen:

- Reicht der vorhandene Heizkörper in jedem Raum?
- Welche **Vorlauftemperatur** braucht das Haus am kältesten Tag, und welche **Heizkurve** gehört deshalb an die Therme?
- Auf welche Stufe gehören die **Thermostatventile** (hydraulischer Abgleich)?
- Passt das Haus zu einer **Wärmepumpe**, und wenn ja, welcher Heizkörper muss eventuell getauscht werden?
- Stimmt die Rechnung mit dem **Gasverbrauch** und mit **Messungen** im Raum überein?

Die Daten nimmst du nicht in endlosen Formularen auf, sondern **im Gespräch mit Claude Code**: mit ungefähren Angaben („so 4 mal 5“), Fotos vom Grundriss oder vom Typenschild. Die App zeigt alles an, prüft es und lässt dich korrigieren.

> ⚠️ Privates Werkzeug. Das Ergebnis ersetzt keine Fachplanung. Für Fördernachweise (z. B. Abgleich nach Verfahren B) muss ein Fachbetrieb oder ein Energieeffizienz-Experte unterschreiben.

---

## ✨ Was implementiert ist

| Bereich | Inhalt |
|---|---|
| **Rechenkern** (`src/core/`) | Transmission inkl. Erdreich (EN ISO 13370), Lüftung mit Infiltration aus n50, Raum- und Gebäudeheizlast, U-Werte aus Schichtaufbau (EN ISO 6946) |
| **Heizkörper** | EN 442-Kennlinie, nötiger Vorlauf je Raum, maßgebender Raum, Systemvorlauf, Rücklauf, Volumenströme, linearisierte Heizkurve |
| **Ventile** | Ventilkatalog (Heimeier, Danfoss, Oventrop, …) mit k<sub>v</sub>-Richtwerten → Voreinstellstufe je Heizkörper |
| **Plausibilität** | Verbrauchsabgleich über Gradtagzahlen, Auswertung von Auskühlmessungen (Temperaturlogger-CSV) |
| **Wärmepumpen-Check** | Ziel-Vorlauf und Spreizung vorgeben → welche Räume unterversorgt sind und welches Φ<sub>N</sub> nötig wäre |
| **App** (`src/ui/`) | Ein Schritt je Aufnahmephase, Prüfseite, Ergebnis mit Druck/PDF und CSV, SVG-Grundriss-Editor, 3D-Ansicht (three.js) mit glb-Export |
| **CLI** (`scripts/heizlast.ts`) | Prüfen, Berechnen, Vorlage erzeugen, Messreihen importieren, JSON-Schema |
| **Aufnahme-Skill** (`.claude/skills/heizlast-aufnahme/`) | Geführter Dialog in 11 Phasen mit Schätzwerten für unscharfe Angaben |
| **Extras** | Berechnungsprotokoll als HTML (`projekte/werkzeuge/protokoll.mts`), Blender-Außenmodell mit Renderansichten (`projekte/3d/*-modell.py`) |

Das **Datenmodell** ist ein zod-Schema in `src/core/model.ts` und gilt als einzige Wahrheit. Ein Projekt ist **eine JSON-Datei** in `projekte/`. CLI, App und Skill lesen und schreiben dieselbe Datei.

---

## 🚀 Schnellstart

> [!IMPORTANT]
> ### 📥 Klimadaten selbst holen – sonst kein θ<sub>e</sub>-Vorschlag aus der PLZ
>
> Die Tabelle der Norm-Außentemperaturen (`src/core/data/normaussentemperatur.json`) ist **aus Lizenzgründen nicht im Repo** (siehe [Lizenz- und Datenhinweis](#️-lizenz--und-datenhinweis)). Hol sie dir einmalig selbst aus [mylius/heizlast-web](https://github.com/mylius/heizlast-web):
>
> ```sh
> curl -o src/core/data/normaussentemperatur.json \
>   https://raw.githubusercontent.com/mylius/heizlast-web/main/src/data/normaussentemperatur.json
> ```
>
> Danach `npm run dev` neu starten. **Ohne die Datei läuft alles**: Neue Projekte starten mit dem Standardwert **θ<sub>e</sub> = −14 °C** (Region Braunschweig). Andere Orte tragen ihren Wert im Schritt „Klima“ von Hand ein. Die App zeigt dort denselben Hinweis.

```sh
npm install
npm run dev          # App unter http://localhost:5173, liest/schreibt Dateien in projekte/
npm test             # Vitest: Rechenkern + Render-Rauchtest
npm run typecheck
```

Ein Projekt direkt öffnen:

```
http://localhost:5173/?datei=<name>.json&schritt=raeume
```

Mögliche Schritte: `projekt`, `klima`, `gebaeude`, `anlage`, `bauteile`, `geschosse`, `raeume`, `heizkoerper`, `verbrauch`, `pruefung`, `ergebnis`, `messung`, `grundriss`, `dreid`.

---

## 🏠 Dein eigenes Haus aufnehmen

### Weg 1: Im Dialog mit Claude Code (empfohlen)

Öffne das Repo in Claude Code und schreib einfach:

```
mein Haus aufnehmen
```

Der Skill `heizlast-aufnahme` führt dich durch die Phasen:

| # | Phase | Was gefragt wird |
|---|---|---|
| 1 | Projekt & Standort | Name, Adresse. Die PLZ bestimmt die Norm-Außentemperatur |
| 2 | Gebäude | Typ, Baujahr, Sanierungen, Luftdichtheit, Lage |
| 3 | Grundriss & Geschosse | Außenmaße, Ausrichtung, Keller, EG, OG, Dach |
| 4 | Bauteile | Wandaufbau, Dämmung, Fenster → U-Werte |
| 5 | Räume | Raum für Raum: Maße, Außenwände, Fenster, Boden/Decke |
| 6 | Heizkörper & Ventile | Typ, Maße, Thermostatventil |
| 7 | Anlage | Therme, aktuelle Heizkurve, Pumpe |
| 8 | Verbrauch | Zählerstände oder Abrechnungen (optional) |
| 9–10 | Abschluss & Ergebnis | Kontrolle, Heizkurve und Ventilwerte erklärt |
| 11 | Messung | Auskühlversuch mit Temperatursensor (optional) |

So läuft das Gespräch:

- **Unscharf ist erlaubt.** „Großes Fenster“ wird zu einem typischen Maß, jede Schätzung landet als Annahme in den Notizen.
- **Nachgefragt wird nur, wo es zählt.** Außenflächen und Fenster sind wichtiger als Innenwände.
- **Du kannst springen** („mach erst die Heizkörper“). Was offen bleibt, steht in den Notizen.
- Ergebnis: `projekte/<name>.json` plus `projekte/<name>.notizen.md` mit Fortschritt, Grundriss-Skizze, Annahmen und offenen Punkten.

Während des Gesprächs läuft am besten `npm run dev` im Hintergrund. Die App lädt die Datei bei jeder Änderung neu.

### Weg 2: Mit Grundrissfoto oder Bauzeichnung

Fotografiere die Bauzeichnung (Grundriss je Geschoss, Schnitt) und leg die Bilder z. B. unter `projekte/Grundriss/` ab. Dann im Dialog:

```
Hier ist die Bauzeichnung zur Kontrolle: projekte/Grundriss/
```

Claude liest Maßketten, Raumnamen, Fenstermaße (Breite/Höhe) und Dachneigung aus dem Bild. Daraus entsteht ein Abgleich mit deinen Angaben, z. B.:

| Punkt | Aufnahme | Bauplan |
|---|---|---|
| Haustiefe innen | 9,50 m | 9,26 m |
| Dachneigung | 42° | 40° |

Du entscheidest je Zeile, was gilt. Oft wurde anders gebaut als geplant („der Zimmermann hat höher gebaut“). Das Foto beschleunigt die Aufnahme stark, ersetzt aber nicht das Nachfragen: Ob ein Anbau beheizt ist, steht in keinem Plan.

Typenschilder (Therme, Heizkörper) und Ventilunterteile kannst du genauso als Foto geben.

### Weg 3: Direkt in der App

```sh
npm run -s heizlast -- vorlage enev > projekte/meinhaus.json   # Baualter: vor1977 | wschvo1977 | wschvo1995 | enev | geg | passivhaus
npm run dev
```

Dann oben rechts die Datei wählen und die Schritte durchgehen. Im **Grundriss-Editor** zeichnest du die Räume als Rechtecke. In der **3D-Ansicht** prüfst du die Lage und exportierst bei Bedarf eine `.glb` für Blender.

### Prüfen und rechnen

```sh
npm run -s pruefen   -- projekte/meinhaus.json   # Schema + Plausibilität, Exit 1 bei Fehlern
npm run -s berechnen -- projekte/meinhaus.json   # Heizlast, Vorlauf, Heizkurve, Ventile, Abgleiche
npm run -s heizlast  -- messung projekte/meinhaus.json <raumId> innen.csv aussen.csv [vl.csv rl.csv]
```

---

## 📐 Berechnungsvorschrift

Bezeichnungen: θ in °C, A in m², U in W/(m²K), V̇ in m³/h, Φ in W.

### 1. Raumheizlast

```
Φ_HL,i = Φ_T,i + Φ_V,i
```

Eine Aufheizleistung Φ_hu für Nachtabsenkung wird nicht angesetzt (Φ_hu = 0).

### 2. Transmission

Für jede Fläche k des Raums (Wände netto ohne Öffnungen, Fenster und Türen einzeln):

```
Φ_T,i = Σ_k  A_k · (U_k + ΔU_TB) · (θ_int,i − θ_adj,k)
```

| Angrenzung | θ_adj |
|---|---|
| Außenluft | θ_e (Norm-Außentemperatur, über den 2-stelligen PLZ-Präfix vorgeschlagen) |
| unbeheizt (Keller, Dachboden, Garage) | θ_u = θ_int − b · (θ_int − θ_e), b aus Tabelle (z. B. Spitzboden 0,9, Keller 0,5) |
| anderer Raum | dessen θ_int (z. B. Bad 24 °C ↔ Flur 20 °C) |
| beheizt ohne eigenen Raum | angegebene Temperatur (Nachbarwohnung) |

- **Wärmebrücken:** pauschal ΔU_TB = 0,10 W/(m²K) auf Außenbauteile, 0 innen.
- **Maßbezug:** Wandlängen als Außenmaß, Höhe = Geschosshöhe. Boden und Decke mit Grundfläche.
- **U-Wert aus Schichten** (EN ISO 6946): `U = 1 / (R_si + Σ d/λ + R_se)` mit R_si 0,13 (horizontal) / 0,10 (aufwärts) / 0,17 (abwärts), R_se 0,04.

### 3. Erdreich (EN ISO 13370, vereinfacht)

Bodenplatte auf Erdreich über den äquivalenten U-Wert:

```
B'  = A_g / (0,5 · P)                         charakteristisches Bodenplattenmaß
d_t = w + λ_g · (R_si + R_f + R_se)           wirksame Dicke, w = 0,3 m, λ_g = 2,0 W/(mK)

d_t < B':  U_equiv = 2λ_g / (π·B' + d_t) · ln(π·B'/d_t + 1)
d_t ≥ B':  U_equiv = λ_g / (0,457·B' + d_t)

Φ_T,Erdreich = A · U_equiv · f_g1 · G_w · (θ_int − θ_m,e)
```

Dabei ist f_g1 = 1,45 (Jahresschwankung), G_w = 1,0 (Grundwasser tiefer als 1 m) und θ_m,e die Jahresmitteltemperatur. Den Umfang P schätzt die App für einen quadratischen Grundriss.

### 4. Lüftung

```
Φ_V,i   = 0,34 · V̇_i · (θ_int,i − θ_e)
V̇_min   = n_min · V_i                          (n_min meist 0,5 1/h)
V̇_inf   = 2 · V_i · n_50 · e_i · ε             (ε = 1 für Gebäude < 10 m)
V̇_i     = max(V̇_inf, V̇_min)                    ohne Lüftungsanlage
V̇_i     = V̇_inf + V̇_min · (1 − η_WRG)          mit Lüftungsanlage (vereinfacht)
```

e_i ist der Abschirmkoeffizient je nach Windschutz (keine / mittel / gut) und Anzahl exponierter Fassaden (eine / mehrere): 0,03 / 0,05 · 0,02 / 0,03 · 0,01 / 0,02.

### 5. Gebäudeheizlast

Die Gebäudeheizlast ist **nicht** die Summe der Raumheizlasten:

- Innenbauteile zwischen Räumen heben sich auf (nur die Hülle zählt).
- Infiltration wirkt nur zur Hälfte gleichzeitig (Wind kommt von einer Seite): `V̇ = max(0,5 · V̇_inf, V̇_min)` je Raum.

```
Φ_HL,Gebäude = Φ_T,Hülle + Φ_V,Gebäude          H = Φ_HL / (20 − θ_e)
```

### 6. Heizkörper und Vorlauf (EN 442)

```
Φ = Φ_N · (ΔT_log / 49,83 K)^n
ΔT_log = (VL − RL) / ln((VL − θ_i) / (RL − θ_i))
```

Φ_N ist die Normleistung bei 75/65/20 °C. Der Exponent n beträgt 1,3 für Platten- und Gliederheizkörper, 1,25 für Badheizkörper, 1,1 für Fußbodenheizung. Die Rechnung läuft in vier Schritten:

1. **Je Raum** das nötige ΔT_log aus Φ_HL und den Heizkörpern bestimmen, daraus mit der Ziel-Spreizung σ den nötigen Vorlauf.
2. **Systemvorlauf** = Maximum aller Räume, auf 0,5 K aufgerundet und durch die max. Vorlauftemperatur begrenzt. Der Raum mit dem Maximum ist **maßgebend**.
3. **Je Raum** beim Systemvorlauf den Rücklauf so bestimmen, dass genau Φ_HL geliefert wird. Daraus folgt der Volumenstrom `V̇ = Φ / (1,163 · (VL − RL))` in l/h.
4. **Heizkurve:** Last proportional zu (20 − θ_a), konstanter Volumenstrom. Die Punkte VL(θ_a) werden zusätzlich als lineare Näherung ausgegeben: `VL = 20 + Niveau + Steilheit · (20 − θ_a)`.

Liefert ein Heizkörper beim gewählten Vorlauf zu wenig, meldet die App „unterversorgt“ und das nötige Φ_N (Grundlage für den Wärmepumpen-Check).

### 7. Ventil-Voreinstellung

```
Δp_Rohr   = 2 · L · 1 mbar/m · 1,3              (L = Leitungslänge, unbekannt → 10 m)
Δp_Ventil = max(Δp_Pumpe − Δp_Rohr, 30 mbar)    (Δp_Pumpe Standard 150 mbar)
k_v,erf   = V̇[m³/h] / √(Δp_Ventil[bar])
```

Gewählt wird die kleinste Ventilstufe mit k_v ≥ k_v,erf (Herstellerrichtwerte aus `src/core/ventile.ts`). Bei durchflussgeregelten Ventilen (z. B. Danfoss RA-DV) gibt die App direkt den Wert in l/h aus.

### 8. Plausibilität

**Verbrauch:** Aus dem Jahresverbrauch und der Gradtagzahl G20/15 folgt die Heizlast laut Verbrauch:

```
Q_H = Menge · Heizwert · η − Q_WW        (Q_WW = 12,5 kWh/m² · Wohnfläche)
H   = Q_H · 1000 / (G20/15 · 24 h)       Φ = H · (20 − θ_e)
```

Interne und solare Gewinne stecken im Verbrauch. Deshalb liegt die Norm typischerweise **1,0–1,5-fach** über diesem Wert.

**Messung:** Ein Auskühlversuch wird als Ein-Knoten-Modell ausgewertet:

```
C · dθ_i/dt = −H · (θ_i − θ_a) + P
```

Die Regression liefert die Zeitkonstante τ = C/H. Die Speicherkapazität C kommt aus der Bauweise (EN ISO 13790). Sind Vor- und Rücklauf mitgemessen, liefert die Regression H direkt.

---

## 🗂️ Aufbau

```
src/core/            Rechenkern ohne UI (model, berechnung, heizkoerper, ventile, uwert, verbrauch, messung, …)
src/core/data/       Klimadaten (Norm-Außentemperatur je PLZ-Präfix)
src/ui/steps/        ein Formular je Aufnahmeschritt + Ergebnis, Messung, Grundriss, 3D
src/store.ts         zustand-Store
scripts/heizlast.ts  CLI
vite.config.ts       Mini-API /api/projekte für Dateien in projekte/
.claude/skills/      Aufnahme-Skill mit Phasen-Leitfäden, Schätzwerten und Schema
projekte/            deine Projektdateien, Notizen, Berichte (privat)
```

Bei Änderungen am Datenmodell auch `.claude/skills/heizlast-aufnahme/references/schema.md` anpassen.

---

## ⚖️ Lizenz- und Datenhinweis

**`src/core/data/normaussentemperatur.json` ist nicht Teil dieses Repos** (steht in `.gitignore`). Die Tabelle stammt aus [mylius/heizlast-web](https://github.com/mylius/heizlast-web), das ohne Lizenz veröffentlicht ist. Ohne Lizenz gilt „alle Rechte vorbehalten“, deshalb wird sie hier nicht weiterverteilt. Jeder lädt sie selbst herunter (Befehl oben im [Schnellstart](#-schnellstart)) und nutzt sie privat.

Die Werte selbst gehen auf die DIN/TS 12831-1 zurück. Normtexte und -tabellen sind urheberrechtlich geschützt. Für verbindliche Berechnungen den ortsgenauen Wert aus der Norm eintragen, das Feld ist immer von Hand überschreibbar.
