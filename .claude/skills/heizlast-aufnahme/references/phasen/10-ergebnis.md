# Phase 10: Ergebnis erklären & umsetzen

**Ziel:** Der Nutzer versteht das Ergebnis und kann es an Therme und Ventilen umsetzen.

## Rechnen

`npm run -s berechnen -- projekte/<kurzname>.json`. Bei Fehlern zurück zur passenden Phase. In der App: Schritt „Ergebnis & Abgleich" (`?schritt=ergebnis`), dort auch Bericht drucken/PDF und CSV.

## Erklären (in dieser Reihenfolge, kurz)

1. **Gebäudeheizlast** in kW und W/m². Einordnen: unsaniert 100–180 W/m², teilsaniert 60–100, gut gedämmt 30–60. Vergleich mit der Erzeugerleistung: Ist die Therme stark überdimensioniert (mehr als 2×), Taktbetrieb erwähnen.
2. **Plausibilität**: Abgleich mit dem Verbrauch (Norm/Verbrauch 1,0–1,5 ist plausibel) und mit Messungen. Liegt das außerhalb, gemeinsam die größten Hebel prüfen: U-Werte, n50, fehlende Räume oder Flächen, Gradtagzahl.
3. **Systemvorlauf**: welcher Raum ihn bestimmt („maßgebend") und warum, meist ein kleiner Heizkörper bei großer Heizlast (Bad 24 °C, Eckraum).
4. **Unterversorgte Räume**: Tausch- oder Ergänzungsempfehlung mit Φ_N. Alternativ: Ziel-Vorlauf höher, falls die Therme das kann.
5. **Wärmepumpen-Check** (falls gefragt): `zielVorlauf` auf 55 (oder 50) und `zielSpreizung` auf 7 setzen, neu rechnen. Räume mit „unterversorgt" brauchen dann größere Heizkörper. Die Spalte Φ_N ≥ … zeigt, welche Leistung nötig ist.

## Umsetzen: Heizkurve

- Die Tabelle Außentemperatur → Vorlauf aus dem Ergebnis ist das Ziel. Am Regler die Kurve so wählen, dass sie diese Punkte trifft. Steilheit und Niveau aus der linearen Näherung sind ein Startwert, denn Hersteller definieren die Steilheit unterschiedlich (Vaillant/Viessmann/Buderus: Kennlinien im Handbuch ansehen und den nächstliegenden Wert wählen).
- Vorgehen: neue Steilheit einstellen, an kalten Tagen beobachten. Ist ein Raum zu kalt, erst seinen Ventileinsatz prüfen, dann die Steilheit +0,1. Ist alles zu warm, Niveau −1 K.
- Raumsollwert am Regler auf 20 °C, Thermostatköpfe auf „3" (≈ 20 °C) bzw. „4" im Bad.

## Umsetzen: Ventil-Voreinstellung

- Liste aus dem Ergebnis: Raum → Heizkörper → Ventil → Einstellung (alt → neu).
- Anleitung: Thermostatkopf abnehmen, Einstellring mit dem Schlüssel des Herstellers bzw. von Hand auf den Wert drehen (Markierung zur Ventilachse/zum Index), Kopf wieder aufsetzen.
- **Richtwerte**: Die k_v-Tabelle der App sind gerundete Herstellerwerte. Bei abweichendem Modell den k_v,erf mit dem Herstellerdiagramm in eine Stufe übersetzen.
- Nicht voreinstellbare Ventile: Rücklaufverschraubung drosseln (Umdrehungen nach Herstellerdiagramm) oder Ventilunterteil/Einsatz tauschen (in die Notizen als Maßnahme).
- Danach die Pumpe auf die angesetzte Förderhöhe stellen (`pumpenDruck`, Standard 150 mbar ≈ 1,5 m), bei Δp-konstant-Regelung genau diesen Wert.

## Abschluss

Wichtigste Maßnahmen in die Notizen schreiben (Ventile, Heizkurve, HK-Tausch) und sagen, dass ein Kontrollgang an einem kalten Tag folgt (Messpunkte in Phase 7 eintragen).
