# Phase 11: Messung – Auskühlversuch mit Sensor (optional)

**Ziel:** Die Heizlast eines Raums empirisch bestimmen und mit der Normrechnung vergleichen, besonders bei Räumen, deren Ergebnis unsicher ist.

## Prinzip (dem Nutzer kurz erklären)

Ein Raum kühlt umso schneller aus, je mehr Wärme er verliert (H) und je weniger er speichert (C). Die Auskühlkurve liefert die Zeitkonstante τ = C/H. Für H braucht es noch C:
- **ohne Zusatzgerät**: C aus der Bauweise geschätzt (leicht/mittel/schwer), Unsicherheit etwa ±30 %
- **besser**: vorher einige Stunden mit konstantem Vorlauf heizen und **zwei Rohranlegefühler** (Tuya/Zigbee, z. B. Typ mit Kabelsonde) an Vor- und Rücklauf des Heizkörpers anbringen. Dann rechnet die App die Heizleistung aus den erfassten Heizkörperdaten (Φ_N, n), und H und C ergeben sich ohne Schätzung, etwa ±15 %.

## Anleitung für den Nutzer

1. Kalte, möglichst windstille Nacht wählen, Innen minus außen ≥ 10 K, keine Sonne.
2. Optionale Heizphase (3–6 h): Thermostatkopf auf voll oder abnehmen, Vorlauf konstant, Fühler an VL/RL.
3. Auskühlphase (≥ 6–12 h): Heizkörperventil zu (Kopf auf ✱ bzw. Ventil schließen), Tür und Fenster zu, Nachbarräume normal geheizt, niemand im Raum.
4. Raumsensor in Raummitte auf ca. 1 m Höhe. Außensensor im Schatten an der Nordseite, oder die Außentemperatur als Konstante bzw. aus Wetterdaten.
5. Export: Smart-Life/Tuya-App → Gerät → Verlauf → Exportieren (CSV per E-Mail), oder Home Assistant → Verlauf → Download.

## Übernehmen

- CSV-Pfade erfragen, dann `npm run -s heizlast -- messung projekte/<kurzname>.json <raumId> <innen.csv> <aussen.csv|°C> [vl.csv rl.csv]`.
- Die Ausgabe zeigt τ, H, Φ und R². Nur die Auskühlphase (und ggf. die Heizphase) auswerten. Störungen wie Lüften, Sonne oder Anwesenheit im Fenster ausschließen: in der App unter „Messung" das Auswertefenster von/bis setzen oder `von`/`bis` (ISO-Zeit) in der Messreihe eintragen.
- `gebaeude.bauweise` passend setzen (leicht: Holz/Trockenbau, mittel: Mauerwerk mit Holzbalkendecken, schwer: Beton/massiv).

## Bewerten

- R² ≥ 0,9: gut. 0,6–0,9: brauchbar. < 0,6: Störungen, Messung wiederholen.
- Gemessenes H gegen das H der Normrechnung (`berechnen` zeigt beide). Abweichung bis ±30 % ohne Heizphase ist normal.
- Liegt die Messung deutlich unter der Norm: U-Werte oder n50 dieses Raums vermutlich zu pessimistisch. Liegt sie deutlich darüber: Undichtigkeiten, fehlende Flächen (Rollladenkasten, Heizkörpernische), Wärmebrücken. Mit dem Nutzer besprechen und Annahmen ggf. anpassen. Die Normrechnung bleibt Grundlage, die Messung dient der Kalibrierung.
