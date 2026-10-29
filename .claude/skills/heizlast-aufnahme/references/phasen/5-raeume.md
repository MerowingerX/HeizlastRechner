# Phase 5: Räume (Raum für Raum)

**Ziel:** Jeder beheizte Raum mit Nutzung, Temperatur, Grundfläche und allen **wärmeübertragenden Flächen**: Außenwände mit Fenstern und Türen, Boden/Decke gegen kalt, Innenwände zu anders warmen Räumen.

Geschoss für Geschoss, Raum für Raum anhand der Raumliste aus Phase 3. Pro Raum immer derselbe Ablauf (Mini-Onboarding):

## Ablauf je Raum

**A. Basis**
> „Nächster Raum: **Küche** im EG. Wie groß ist sie ungefähr?"
- Grundfläche (Länge × Breite innen) → `grundflaeche`.
- Nutzung aus dem Namen ableiten → `nutzung`, `thetaInt`, `nMin` (Bad 24 °C, Flur 15 °C, sonst 20 °C).
- Fragen: „Soll der Raum normal warm sein (20 °C), oder ist er bewusst kühler bzw. wärmer?" Abweichungen übernehmen (z. B. Schlafzimmer 18 °C auf Wunsch).
- Abweichende Raumhöhe? Nur fragen, wenn es Hinweise gibt (Dachschräge, Galerie, Altbau).

Auch `lage` setzen (Rechteck aus Breite × Tiefe und Position aus der Skizze). Bei L-förmigen Räumen das größte Rechteck nehmen und `grundflaeche` trotzdem korrekt eintragen.

**B. Außenwände** (aus der Grundriss-Skizze ableiten, dann bestätigen lassen)
> „Laut Skizze hat die Küche eine Außenwand nach Norden (ca. 3,8 m) und eine nach Osten (ca. 3,2 m). Stimmt das?"
- Je Außenwand eine Fläche: Bauteil AW, Orientierung, `laenge` als **Außenmaß** (Innenmaß + Wanddicke an jeder Außenecke), `hoehe: null`.
- Erdberührte Wand im Keller: Bauteil `bt-aw-erd`, Angrenzung `erdreich`.
- Wand zum Nachbarhaus (DHH/RH): Bauteil HTW, Angrenzung `beheizt` „Nachbarhaus" θ 15 °C (bewohnt) oder `unbeheizt` (leer).

**C. Fenster und Türen** je Außenwand
> „Wie viele Fenster hat die Nordwand? Eher klein, normal oder groß?"
- Maße aus der Antwort oder Schätzwert (schaetzwerte.md). Bei mehreren gleichen Fenstern `anzahl`.
- Fenstertyp (`bauteilId`) passend zu Phase 4 (alt/neu).
- Außentüren (Haustür, Terrassentür) als Öffnung mit AT bzw. FE.
- **Rollladenkasten** mit erwähnen? Dann in den Notizen als Schwachstelle festhalten.

**D. Boden und Decke**
- Liegt unter dem Raum etwas Kaltes (unbeheizter Keller, Erdreich, Durchfahrt, Außenluft)? → Fläche FB, `orientierung: "H"`, `flaecheDirekt` = Grundfläche, Angrenzung wie Geschoss-`unten`.
- Liegt darüber etwas Kaltes (Dachboden, Spitzboden, Flachdach)? → Fläche DE bzw. DA.
- Zwischen beheizten Geschossen nichts erfassen, außer die Temperaturen unterscheiden sich deutlich.
- **Dachschrägen** (DG): Fläche DA, `flaecheDirekt` = Raumlänge × Länge der Schräge (Kniestock bis Kehlbalken). Kniestockwand als AW (Höhe = Kniestockhöhe). Abseiten hinter dem Kniestock unbeheizt? Dann Kniestockwand mit Angrenzung `unbeheizt` „Abseite" (b 0,9), und die Dachfläche der Abseite gehört nicht zum Raum.
- Dachfenster als Öffnung in der DA-Fläche.

**E. Innenwände zu anders warmen Räumen** (nur Δθ ≥ 4 K)
- Bad (24 °C) ↔ Flur (15 °C), Wohnraum ↔ unbeheizter Abstellraum/Treppenhaus, Wohnraum ↔ Garage.
- Fläche IW mit Angrenzung `raum` (wenn erfasst) bzw. `unbeheizt`. Innentür als Öffnung IT.
- Zwischen gleich warmen Räumen: **nichts** erfassen.

**F. Zusammenfassen und schreiben**
> „Küche: 12,2 m², 20 °C. Außenwand N 3,8 m mit 1 Fenster 1,2 × 1,4. Außenwand O 3,2 m mit 1 Fenster 0,9 × 1,2. Boden gegen unbeheizten Keller. Passt das?"
- Erst nach Bestätigung schreiben, dann prüfen.
- Heizkörper **hier noch nicht**, nur merken, ob einer da ist (Phase 6). Wenn der Nutzer gerade davor steht und es anbietet: direkt mit Phase 6 für diesen Raum weitermachen.

## Nach jedem Geschoss

- Summe der Raumflächen gegen die Geschoss-Grundfläche halten (innen ≈ außen × 0,8). Bei Abweichung über 15 % nachfragen, ob ein Raum fehlt.
- Wurden alle Fassaden des Geschosses auf Räume verteilt? Summe der Außenwandlängen ≈ Umfang.
- Fortschritt in den Notizen aktualisieren.

## Sonderfälle

- **Offene Küche/Wohnen**: als ein Raum erfassen.
- **Galerie / Luftraum**: ein Raum mit erhöhter `lichteHoehe`. Die Außenwandhöhe dann über `hoehe` setzen.
- **Erker**: Wandstücke einzeln mit eigener Orientierung. Boden gegen außen als FB mit Angrenzung `aussen`.
- **Wintergarten** unbeheizt: Angrenzung `unbeheizt` „Wintergarten" (b 0,6).
- **Treppe offen über mehrere Geschosse**: Treppenhaus als Raum im untersten Geschoss mit Gesamthöhe, oder je Geschoss als Flur. In den Notizen festhalten.
