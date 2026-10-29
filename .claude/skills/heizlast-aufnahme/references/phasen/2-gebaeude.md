# Phase 2: Gebäude

**Ziel:** Gebäudetyp, Baualter, bisherige Sanierungen und Luftdichtheit. Daraus folgt der Bauteilkatalog (Phase 4).

## Fragen

1. **Gebäudetyp** (AskUserQuestion): freistehendes EFH, Doppelhaushälfte, Reihenmittelhaus, Reihenendhaus, Mehrfamilienhaus.
2. **Baujahr**, ungefähr reicht („70er"). Baualtersklasse ableiten:
   - vor 1977 → `vor1977` · 1977–1994 → `wschvo1977` · 1995–2001 → `wschvo1995` · 2002–2019 → `enev` · ab 2020 → `geg`
3. **Was wurde schon saniert?** Offen fragen, dann gezielt nachhaken:
   - Fenster getauscht? Wann? 2- oder 3-fach?
   - Fassade gedämmt? Wann, wie dick?
   - Dach oder oberste Geschossdecke gedämmt?
   - Kellerdecke gedämmt?
   - Haustür neu?
4. **Lage und Wind** (AskUserQuestion): frei und windig / ländlich mit Bäumen oder Nachbarn / dichte Stadtlage → `abschirmung` keine/mittel/gut.
5. **Luftdichtheit**: „Gab es mal einen Blower-Door-Test?" Falls ja: Messwert n50 übernehmen, `n50Gemessen: true`. Falls nein: Wert aus der Tabelle in schaetzwerte.md je nach Baualter und Fensterzustand, danach fragen: „Zieht es irgendwo merklich, z. B. an Fenstern, Rollladenkästen oder der Bodenluke?" Bei ja den Wert eine Stufe höher ansetzen.
6. **Lüftungsanlage** mit Wärmerückgewinnung? Selten im Bestand. Bei ja: WRG-Grad aus dem Datenblatt, sonst 0,75.

## Verarbeiten

- `gebaeude.*` setzen.
- Hat sich das Baualter gegenüber der Vorlage geändert und der Bauteilkatalog wird noch nirgends verwendet: Katalog neu erzeugen (`npm run -s heizlast -- vorlage <baualter>`, nur `bauteile` übernehmen).
- **Sanierungen merken** (Notizen), sie werden in Phase 4 in U-Werte übersetzt.

## Abschluss

Kurz zusammenfassen („EFH, Baujahr ca. 1972, Fenster 2005 getauscht, Dach 2010 gedämmt, Fassade ungedämmt, n50 geschätzt 5"). Prüfen, abhaken, weiter zu Phase 3.
