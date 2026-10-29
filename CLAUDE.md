# Heizlastberechnung

Private Web-App zur Heizlastberechnung nach DIN EN 12831-1 / DIN/TS 12831-1 für ein **Bestandsgebäude mit vorhandenen Heizkörpern**. Endziel: je Raum Heizkörper-Bewertung, nötige Vorlauftemperatur → neue Heizkurve der Therme, Ventil-Voreinstellwerte. Plan und Meilensteine: `# Plan.md`.

## Arbeitsteilung

- **Datenaufnahme im Dialog in Claude Code**: Skill `heizlast-aufnahme` (`.claude/skills/heizlast-aufnahme/`). Schreibt `projekte/<name>.json` + `projekte/<name>.notizen.md`.
- **App** zeigt, prüft und korrigiert die Daten: `npm run dev`, Datei oben rechts wählen oder `http://localhost:5173/?datei=<name>.json&schritt=raeume`.

## Befehle

```sh
npm run dev                                   # App mit Dateischnittstelle zu projekte/
npm test                                      # Vitest (Kern + Render-Rauchtest)
npm run typecheck                             # tsc -b
npm run -s pruefen -- projekte/<datei>.json   # Schema + Plausibilität, Exit 1 bei Fehlern
npm run -s berechnen -- projekte/<datei>.json # Heizlast, Vorlauf, Heizkurve, Ventil-Voreinstellung, Abgleiche
npm run -s heizlast -- messung <datei> <raumId> <innen.csv> <aussen.csv|°C> [vl.csv rl.csv]
npm run -s heizlast -- vorlage <baualter>     # Startdatei mit Bauteilkatalog
npm run -s heizlast -- schema                 # JSON-Schema
```

## Code

- `src/core/`: reiner Kern ohne UI. `model.ts` (zod-Schema = einzige Wahrheit), `kataloge.ts` (Vorschlagswerte), `geometrie.ts`, `validierung.ts`, `klima.ts`, `datei.ts`.
  - `berechnung.ts`: DIN EN 12831-1 (Transmission inkl. Erdreich EN ISO 13370, Lüftung, Raum/Gebäude)
  - `heizkoerper.ts`: EN 442-Kennlinie, nötiger Vorlauf, Volumenströme, Heizkurve
  - `ventile.ts`: Ventilkatalog (k_v-Richtwerte!) und Voreinstellung
  - `uwert.ts` (EN ISO 6946), `verbrauch.ts` (Gradtagzahl-Abgleich), `messung.ts` (Auskühlkurve, Regression)
- `src/ui/steps/`: ein Formular je Aufnahmeschritt + Ergebnis, Messung, Grundriss (SVG-Editor), Ansicht3D (three.js, lazy, glb-Export). `src/store.ts`: zustand-Store.
- `vite.config.ts`: Mini-API `/api/projekte` (dev + preview) für Dateien in `projekte/`.
- Bei Änderungen am Datenmodell auch `.claude/skills/heizlast-aufnahme/references/schema.md` anpassen.
- `src/core/data/normaussentemperatur.json` stammt aus mylius/heizlast-web (ohne Lizenz) und ist per `.gitignore` aus dem Repo ausgeschlossen. Jeder lädt sie selbst (Befehl in README); ohne Datei läuft alles, nur der PLZ-Vorschlag für θ_e fehlt (`klimaDatenVorhanden()`).
