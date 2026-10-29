# Phase 6: Heizkörper & Ventile

**Ziel:** Für jeden Raum die **vorhandenen** Heizkörper mit Normleistung Φ_N (75/65/20) und das Thermostatventil. Daraus berechnet die App später die nötige Vorlauftemperatur und die Ventil-Voreinstellung.

Raum für Raum, am besten beim Rundgang. Fotos helfen sehr: Heizkörper ganz, Typenschild/Aufkleber (oft oben zwischen den Platten oder an der Seite), Ventil ohne Thermostatkopf.

## Ablauf je Raum

**A. Art und Anzahl**
> „Welche Heizkörper hat das Wohnzimmer: flache Platten, Rippen-/Gliederheizkörper, ein Handtuchheizkörper oder Fußbodenheizung?"

**B. Maße und Typ**
- **Plattenheizkörper**: Höhe und Länge (mm, grob reicht: „60 cm hoch, 1,40 m lang"). Typ über Anzahl der Platten und Lamellen oder die Bautiefe (siehe schaetzwerte.md). Steht der Typ auf dem Typenschild, den nehmen.
- **Gliederheizkörper**: Höhe, Tiefe, **Anzahl Glieder**.
- **Badheizkörper**: Höhe × Breite. Φ_N möglichst vom Typenschild bzw. Hersteller, sonst grob 400–700 W je m² Ansichtsfläche.
- **Fußbodenheizung**: Typ `fussbodenheizung`, beheizte Fläche in `notiz`/`bezeichnung`. Φ_N leer lassen und als offenen Punkt notieren.

**C. Leistung Φ_N**
- Steht ein Hersteller/Modell oder ein Wert drauf: übernehmen bzw. Datenblatt-Wert (Normwärmeleistung 75/65/20 nach EN 442).
- Sonst Schätzung aus der Tabelle in schaetzwerte.md: Φ_N = Wert je Meter × Länge in m. Als Annahme notieren.
- Exponent n: 1,3 (Platte/Glieder), 1,25 Bad, 1,4 Konvektor.

**D. Thermostatventil** (wichtig für den Voreinstellwert)
> „Schraub bitte den Thermostatkopf ab, das geht meist mit einer Überwurfmutter oder einem Clip. Was steht auf dem Ventilunterteil? Ein Foto ist am besten."
- Hersteller (Heimeier, Danfoss, Oventrop, Honeywell/MNG, Simplex, IMI …) und Modell (z. B. V-exact II, RA-N, AV9, Mikrotherm).
- **Voreinstellbar?** Erkennbar an einem Einstellring mit Zahlen 1–6 bzw. „N" oder einer Skala unter dem Kopf. Kein Ring = nicht voreinstellbar.
- Aktuelle Einstellung ablesen (oft „N" = voll offen, Werkseinstellung).
- Nennweite: Rohrdurchmesser am Ventil (DN10 ≈ 3/8", DN15 ≈ 1/2"). Bei Unsicherheit leer lassen.
- Bei integrierten Ventilen (Ventilheizkörper mit Anschluss unten mittig) gibt es einen Ventileinsatz im Heizkörper. Ventilhersteller oft Heimeier oder Danfoss, sonst als offenen Punkt notieren.

**E. Leitungslänge**
> „Wie weit ist der Heizkörper ungefähr von der Therme entfernt, als Rohrweg grob geschätzt (Stockwerke × 3 m + horizontaler Weg)?"

**F. Zusammenfassen und schreiben**
> „Wohnzimmer: 1 × Platte Typ 22, 600 × 1400, Φ_N ≈ 2090 W (Schätzung), Ventil Heimeier V-exact II DN15, Stellung N, ca. 8 m bis zur Therme."

## Nach allen Räumen

- Räume ohne Heizkörper auflisten. Gewollt (Abstellraum, Flur) oder nachgetragen?
- Hinweise des Prüfskripts zu fehlendem Φ_N oder Ventil durchgehen.
