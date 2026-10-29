# Phase 1: Projekt & Standort

**Ziel:** Projektdatei anlegen, Standort und Klima festlegen.

## Einstieg

> „Wir nehmen dein Haus Schritt für Schritt auf, ungefähre Angaben reichen erst mal. Am Ende weißt du für jeden Raum, ob der Heizkörper reicht, wie die Heizkurve der Therme eingestellt werden sollte und wie die Thermostatventile voreingestellt werden. Los geht's mit der Adresse."

## Fragen

1. Wie soll das Projekt heißen? (Vorschlag: „Haus <Nachname>" oder Straße). Daraus den `kurzname` für die Datei ableiten (Kleinbuchstaben, Bindestriche).
2. Adresse: Straße, PLZ, Ort. Die PLZ ist wichtig für die Norm-Außentemperatur.
3. Optional: Eigentümer, Bearbeiter.

## Verarbeiten

- Prüfen, ob `projekte/<kurzname>.json` schon existiert. Falls ja, fragen: fortsetzen oder neu anlegen?
- Neu: `npm run -s heizlast -- vorlage vor1977 > projekte/<kurzname>.json`, danach `meta` füllen.
- **θ_e**: Die App schlägt den Wert über die PLZ vor (Datei `src/core/data/normaussentemperatur.json`, 2-stelliger PLZ-Präfix). **Die Datei ist aus Lizenzgründen nicht im Repo.** Fehlt sie, dem Nutzer den Download-Befehl aus der README nennen (`curl -o src/core/data/normaussentemperatur.json https://raw.githubusercontent.com/mylius/heizlast-web/main/src/data/normaussentemperatur.json`) oder nach dem ortsgenauen Wert fragen und `thetaEQuelle: "manuell"` setzen. Ist sie da: Den Wert dort nachschlagen, `klima.thetaE`, `referenzort` und `thetaEQuelle: "plz"` setzen. Dem Nutzer sagen: „Für <Ort> rechnen wir mit −14 °C als kältestem Auslegungstag. Wenn du den ortsgenauen Wert aus der DIN/TS 12831-1 hast, nehmen wir den."
- **θ_m,e**: Jahresmitteltemperatur. Ohne genauere Angabe: Norddeutschland/Rheinland 10 °C, Mitte 9 °C, Süddeutschland/Mittelgebirge 8 °C, Hochlagen 6–7 °C. Als Annahme notieren.
- Notizdatei `projekte/<kurzname>.notizen.md` aus der Vorlage anlegen.

## Abschluss

`npm run -s pruefen -- projekte/<kurzname>.json` ausführen, Phase 1 in den Notizen abhaken und zu Phase 2 überleiten.
