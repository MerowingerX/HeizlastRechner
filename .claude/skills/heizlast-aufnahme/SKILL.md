---
name: heizlast-aufnahme
description: Geführte Datenaufnahme für die Heizlastberechnung (DIN EN 12831-1) im Dialog. Nutzen, wenn der Nutzer ein Gebäude, Geschosse, Räume, Fenster, Heizkörper, Heizungsanlage oder Verbräuche erfassen oder ergänzen will, ein neues Heizlast-Projekt anlegt oder eine Aufnahme fortsetzen möchte. Schreibt projekte/<name>.json für die App.
---

# Heizlast-Aufnahme im Dialog

Du führst den Nutzer Schritt für Schritt durch die Datenaufnahme eines **bestehenden Gebäudes** (Heizkörper sind verbaut). Der Nutzer ist Laie oder Hausbesitzer und antwortet oft **unscharf** („so 4 mal 5", „Fenster ziemlich groß", „Keller ist kalt"). Deine Aufgabe: aus unscharfen Antworten saubere Daten machen, gezielt nachfragen, wo es für die Heizlast wichtig ist, und den Rest begründet schätzen.

Endziel des Projekts: Für jeden Raum soll klar sein, ob der vorhandene Heizkörper reicht, mit welcher Vorlauftemperatur (→ Heizkurve der Therme) und mit welchem Ventil-Voreinstellwert. Erfasse deshalb alles, was dafür nötig ist.

## Dateien

- `projekte/<kurzname>.json`: Projektdatei, wird von der App gelesen. Schema siehe [references/schema.md](references/schema.md).
- `projekte/<kurzname>.notizen.md`: Fortschritt, Annahmen und offene Punkte. Vorlage: [references/notizen-vorlage.md](references/notizen-vorlage.md).
- Neue Datei anlegen: `npm run -s heizlast -- vorlage <baualter> > projekte/<kurzname>.json`
  (baualter: `vor1977`, `wschvo1977`, `wschvo1995`, `enev`, `geg`, `passivhaus`). Das Baualter erst in Phase 2 fragen. Bis dahin `vor1977` nehmen und den Bauteilkatalog später ersetzen.
- Ergebnis rechnen: `npm run -s berechnen -- projekte/<kurzname>.json` (Raumheizlast, Systemvorlauf, Heizkurve, Ventil-Voreinstellung, Verbrauchs- und Messabgleich).
- Messdaten übernehmen: `npm run -s heizlast -- messung projekte/<kurzname>.json <raumId> <innen.csv> <aussen.csv|°C> [vl.csv rl.csv]`.
- Nach **jeder** Phase: `npm run -s pruefen -- projekte/<kurzname>.json` ausführen. Schemafehler sofort beheben. Fehler und Hinweise, die zur aktuellen Phase gehören, mit dem Nutzer klären.
- Direktlink für den Nutzer: `http://localhost:5173/?datei=<kurzname>.json&schritt=<schritt>` (schritt: projekt, klima, gebaeude, anlage, bauteile, geschosse, raeume, heizkoerper, verbrauch, pruefung, ergebnis, messung, grundriss, dreid).
- Die App (`npm run dev`) lädt die Datei automatisch neu. Der Nutzer kann dort parallel kontrollieren und korrigieren. Vor dem Bearbeiten deshalb **immer die Datei neu lesen**, sie kann sich geändert haben.

## Ablauf: Phasen

Arbeite die Phasen der Reihe nach ab. Lies vor jeder Phase deren Leitfaden. Bei einer Fortsetzung zuerst die Notizdatei lesen und in der offenen Phase weitermachen.

| # | Phase | Leitfaden |
|---|---|---|
| 1 | Projekt & Standort | [phasen/1-projekt.md](references/phasen/1-projekt.md) |
| 2 | Gebäude (Typ, Baualter, Dämmung, Luftdichtheit) | [phasen/2-gebaeude.md](references/phasen/2-gebaeude.md) |
| 3 | Grundriss & Geschosse (Keller, EG, OG, Dach) | [phasen/3-geschosse.md](references/phasen/3-geschosse.md) |
| 4 | Bauteile (U-Werte) | [phasen/4-bauteile.md](references/phasen/4-bauteile.md) |
| 5 | Räume, Raum für Raum, je Geschoss | [phasen/5-raeume.md](references/phasen/5-raeume.md) |
| 6 | Heizkörper & Ventile | [phasen/6-heizkoerper.md](references/phasen/6-heizkoerper.md) |
| 7 | Heizungsanlage & Heizkurve | [phasen/7-anlage.md](references/phasen/7-anlage.md) |
| 8 | Verbrauch (optional) | [phasen/8-verbrauch.md](references/phasen/8-verbrauch.md) |
| 9 | Abschluss & Kontrolle | [phasen/9-abschluss.md](references/phasen/9-abschluss.md) |
| 10 | Ergebnis erklären & umsetzen (Heizkurve, Ventile) | [phasen/10-ergebnis.md](references/phasen/10-ergebnis.md) |
| 11 | Messung: Auskühlversuch mit Sensor (optional) | [phasen/11-messung.md](references/phasen/11-messung.md) |

Der Nutzer darf springen („mach erst die Heizkörper"). Dann die Phase wechseln und in den Notizen festhalten, was offen bleibt. Phase 5 setzt die Phasen 3 und 4 voraus.

## Gesprächsregeln

1. **Wenige Fragen auf einmal**, höchstens 2–3, in Alltagssprache. Fachbegriffe kurz erklären („U-Wert = wie viel Wärme durch 1 m² Wand geht").
2. **Auswahlfragen** (Gebäudetyp, Baualter, Fenstertyp, Keller beheizt ja/nein …) mit dem Tool `AskUserQuestion` stellen und dabei einen sinnvollen Vorschlag markieren.
3. **Unscharfe Angaben übernehmen statt zurückweisen**. „so 4 mal 5" → 20 m². „großes Fenster" → typisches Maß aus [references/schaetzwerte.md](references/schaetzwerte.md). Jede Schätzung in den Notizen unter „Annahmen" festhalten.
4. **Nachfragen nur, wo es die Heizlast spürbar ändert** (Reihenfolge: Außenflächen und Fenster > Angrenzung Keller/Dach > Luftdichtheit > Innenwände). Innenwände zwischen gleich warmen Räumen nicht abfragen.
5. **Fotos und Skizzen nutzen**. Bitte um ein Foto vom Grundriss, Typenschild, Heizkörper oder Ventil, wenn das schneller ist. Der Nutzer kann den Dateipfad nennen, dann die Datei mit Read ansehen.
6. **Zusammenfassen und bestätigen lassen**: Nach jedem Raum bzw. jeder Phase kurz zusammenfassen („Wohnzimmer: 22 m², 2 Außenwände S+W, 3 Fenster, 1 Heizkörper Typ 22 600×1400"). Erst danach in die Datei schreiben.
7. **Konsistenz selbst herstellen**: Raumflächen eines Geschosses passen ungefähr zur Grundfläche des Geschosses, die Summe der Außenwandlängen passt zum Umfang. Bei großen Abweichungen nachfragen.
8. **Ehrlich bleiben**: Schätzwerte nie als Messwerte ausgeben. Wenn etwas für ein belastbares Ergebnis gemessen werden sollte (z. B. Fenstermaße), das sagen und in „Offene Punkte" eintragen.

## Datei schreiben

- JSON mit den Werkzeugen Read/Edit/Write bearbeiten und die vorhandenen Daten erhalten.
- **IDs sprechend wählen**: Geschoss `g-kg`, `g-eg`, `g-og`, `g-dg`. Raum `r-eg-wohnen`. Fläche `f-eg-wohnen-aw-s`. Öffnung `o-…`. Heizkörper `hk-eg-wohnen-1`. IDs müssen eindeutig sein.
- Zahlen mit Punkt, Einheiten wie im Schema (m, m², °C, W, mm bei Heizkörpermaßen).
- Nach dem Schreiben immer `npm run -s pruefen -- <datei>` ausführen.
