# Phase 9: Abschluss & Kontrolle

**Ziel:** Datei fehlerfrei, Annahmen transparent, offene Punkte klar.

## Schritte

1. `npm run -s pruefen -- projekte/<kurzname>.json`. **0 Fehler** ist Pflicht. Hinweise einzeln durchgehen: beheben oder bewusst akzeptieren (in den Notizen begründen).
2. Plausibilität grob:
   - Summe der Raumflächen ≈ Wohnfläche laut Nutzer?
   - Fensteranteil je Fassade realistisch (Süd meist am größten)?
   - Jeder Raum mit Außenwand hat mindestens ein Fenster (außer Abstellraum/WC innen)?
   - Σ Φ_N der Heizkörper im Verhältnis zur Wohnfläche: Altbau typisch 80–150 W/m², Neubau 40–70 W/m² (bei 75/65/20).
3. Notizen aktualisieren: alle Phasen abgehakt, Annahmen vollständig, offene Punkte nach Wirkung sortiert (was die Heizlast am stärksten ändert, steht oben).
4. Dem Nutzer zum Schluss sagen:
   - Die Daten sind bereit. In der App (`npm run dev`, dann im Kopf die Datei wählen) kann er alles kontrollieren und korrigieren.
   - Die 3 wichtigsten offenen Punkte, mit denen das Ergebnis genauer wird.
   - Nächster Schritt ist die Berechnung (App, Meilenstein M2).
