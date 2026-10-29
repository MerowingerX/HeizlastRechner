# Phase 4: Bauteile

**Ziel:** Für jede Bauteilart ein U-Wert, der zum Haus passt. Ausgangspunkt ist der Vorschlagskatalog nach Baualter, die Sanierungen aus Phase 2 werden eingearbeitet.

## Vorgehen

1. Den Katalog in der Datei zeigen, als kurze Tabelle: Bauteil, U-Wert, Quelle.
2. Sanierungen aus den Notizen in U-Werte übersetzen (Tabelle „Bauteile nach Baualter" in schaetzwerte.md). Beispiel: „Fenster 2005 getauscht" → FE U = 1,6 (statt 2,8).
3. Nur nachfragen, wo es **Unterschiede im Haus** gibt:
   - Verschiedene Fensterarten (alte Kellerfenster, neue Wohnraumfenster)? → zusätzliche FE-Bauteile, z. B. `bt-fe-alt`, `bt-fe-neu`.
   - Anbau mit anderem Baujahr? → eigene AW/DA-Bauteile.
   - Erdberührte Kellerwand (bei beheiztem Keller) → zusätzliches AW-Bauteil `bt-aw-erd`, Angrenzung später `erdreich`.
   - Bodenplatte gegen Erdreich vs. Kellerdecke gegen unbeheizten Keller → zwei FB-Bauteile.
   - Dachschräge vs. oberste Geschossdecke (Kehlbalkenlage) → DA und DE.
4. **Wandaufbau** bei Unsicherheit: „Wie dick sind die Außenwände ungefähr, z. B. an der Fensterlaibung gemessen? Woraus sind sie: Ziegel, Kalksandstein, Bims, Fachwerk?" Grobe U-Werte ungedämmt: 24 cm Kalksandstein ~2,0 · 30 cm Hochlochziegel ~1,2 · 36,5 cm Leichtziegel/Bims ~0,8 · Fachwerk ~1,5. Mit Dämmung siehe schaetzwerte.md.
5. **ΔU_TB**: Außenbauteile 0,10 (pauschal), Innenbauteile 0. Innengedämmte Altbauwand: 0,15.

## Verarbeiten

- Bauteile mit sprechenden IDs anlegen oder anpassen. Herkunft im Feld `notiz` festhalten („Schätzwert Baualter", „Nutzer: Fenster 2005", „Datenblatt").
- Nicht benötigte Bauteile dürfen bleiben. Die App zeigt, wie oft jedes verwendet wird.

## Abschluss

Tabelle der finalen U-Werte zeigen. Prüfen, abhaken.
