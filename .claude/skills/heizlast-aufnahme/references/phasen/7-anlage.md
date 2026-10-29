# Phase 7: Heizungsanlage & Heizkurve

**Ziel:** Ist-Zustand von Therme, Regelung und Pumpe. Ergebnis der späteren Berechnung ist eine **neue Heizkurve** (möglichst niedrige Vorlauftemperatur, bei der alle Räume warm werden) und die Ventil-Voreinstellung. Dafür braucht es den Ist-Stand als Vergleich.

Fotos von Typenschild und Regler-Display helfen.

## Fragen

1. **Wärmeerzeuger**: Hersteller, Modell, Baujahr, Nennleistung (kW, steht auf dem Typenschild). Gas, Öl, Wärmepumpe? → `erzeuger`, `erzeugerLeistung`.
2. **Rohrsystem** (AskUserQuestion): Zweirohr (Vor- und Rücklauf je Heizkörper getrennt, Standard ab ca. 1960) oder Einrohr (Heizkörper hintereinander an einer Ringleitung, oft 1960–1980). Merkmal Einrohr: Heizkörper-Anschlüsse dicht nebeneinander mit Bypass bzw. Spezialventil.
3. **Heizkurve am Regler** auslesen (Fachmann-/Installateursebene oder Bedienungsanleitung):
   - Steilheit/Neigung (z. B. 1,2 · 1,4 · 1,6)
   - Niveau/Parallelverschiebung (K)
   - Raumsollwert am Regler (oft 20 °C)
   - max. Vorlauftemperatur
   - Heizgrenze / Sommer-Winter-Umschaltung
   - Bei witterungsgeführten Thermen mit Außenfühler. Ohne Außenfühler (raumgeführt/konstant): in `notiz` vermerken.
4. **Vor- und Rücklauf an kalten Tagen**: „Welche Vorlauftemperatur zeigt die Therme an, wenn es draußen richtig kalt ist?" → `vorlauf`/`ruecklauf` (Ist bei θ_e, geschätzt). Wenn der Nutzer an mehreren Tagen ablesen kann: als `messungen` (Datum, Außentemp., Vorlauf, Rücklauf, alle Räume warm?).
5. **Welche Räume werden nicht richtig warm?** Sehr wertvoll: in `messungen[].notiz` bzw. in den Notizen festhalten.
6. **Pumpe**: intern in der Therme (meist) oder extern (Hersteller/Typ). Eingestellte Förderhöhe oder Δp-Stufe, falls bekannt. 1 m ≈ 100 mbar → `pumpenDruck`.
7. **Differenzdruckregler** in Strängen (bei größeren Anlagen/MFH)? Meist nein.
8. Gab es schon einen **hydraulischen Abgleich**? Wann? Gibt es ein Protokoll? → `notiz`.

## Verarbeiten

`anlage.*` setzen. Fehlende Werte bleiben `null`, als offenen Punkt mit Hinweis notieren, wo man sie findet (Reglermenü, Anleitung, Schornsteinfeger-Protokoll für die Leistung).

## Abschluss

Zusammenfassen, prüfen, abhaken.
