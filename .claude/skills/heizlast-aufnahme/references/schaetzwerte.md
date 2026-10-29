# Schätzwerte für unscharfe Angaben

Jede Übernahme in den Notizen unter „Annahmen" festhalten.

## Maße

| Angabe des Nutzers | Annahme |
|---|---|
| „normales Fenster" | 1,20 × 1,40 m (Wohnraum), 0,90 × 1,20 m (Schlafzimmer) |
| „kleines Fenster" (Bad, WC, Keller) | 0,60 × 0,80 m |
| „großes Fenster" | 2,00 × 1,40 m |
| „bodentief" / „Fenstertür" | 1,00 × 2,10 m (einflügelig), 1,80 × 2,10 m (zweiflügelig) |
| „Terrassentür" / „Schiebetür" | 2,00 × 2,10 m |
| „Haustür" | 1,10 × 2,10 m (mit Seitenteil 1,60 × 2,10 m) |
| „Dachfenster" | 0,78 × 1,40 m (gängigstes Maß) |
| „so 4 mal 5" | Grundfläche 20 m². Bei Außenwänden die Länge um die Wanddicke (~0,35 m je Außenecke) auf Außenmaß ergänzen |
| Raumhöhe Altbau vor 1950 | lichte Höhe 2,80–3,00 m, Geschosshöhe +0,30 m |
| Raumhöhe ab 1950 | lichte Höhe 2,50 m, Geschosshöhe 2,75 m |
| Dachgeschoss mit Schrägen | Kniestock 1,0 m, Dachneigung 40–45°, Fläche der Schräge = Raumlänge × Sparrenlänge |

## Unbeheizte Nachbarbereiche (b-Faktor)

θ_u = θ_int − b · (θ_int − θ_e), mit θ_int = 20 °C

| Bereich | b |
|---|---|
| Keller unbeheizt, Fenster dicht | 0,5 |
| Keller mit offenen/undichten Fenstern | 0,7 |
| Dachboden unbeheizt, Dach ungedämmt | 0,9 |
| Dachboden unbeheizt, Dach gedämmt | 0,7 |
| Garage angebaut | 0,8 |
| Treppenhaus unbeheizt (MFH) | 0,5 |

## Bauteile nach Baualter

Vorschläge liefert `npm run -s heizlast -- vorlage <baualter>`. Abweichungen erfragen:

| Hinweis vom Nutzer | U-Wert-Anpassung |
|---|---|
| „Fassade gedämmt", „WDVS", „Styropor drauf" + Jahr | AW: bis 1995 ca. 0,5, 1995–2010 ca. 0,35, danach 0,24 |
| „neue Fenster" + Jahr | vor 1995: 2,8 (Isolierglas), 1995–2010: 1,6, danach 1,1 (2-fach), 3-fach: 0,9 |
| „Einfachverglasung" | 5,0 |
| „Kastenfenster / Verbundfenster" | 2,5 |
| „oberste Decke gedämmt" (Dachboden) | DE ca. 0,3 (10–15 cm), 0,2 (> 20 cm) |
| „Kellerdecke gedämmt" | FB ca. 0,4 |
| Holzbalkendecke ungedämmt | ca. 0,8–1,0 |
| Bodenplatte ungedämmt (vor 1977) | FB gegen Erdreich ca. 1,2 |

## Heizkörper (Φ_N bei 75/65/20, Plattenheizkörper je Meter Baulänge)

| Bauhöhe | Typ 10 | Typ 11 | Typ 21 | Typ 22 | Typ 33 |
|---|---|---|---|---|---|
| 300 mm | 260 | 470 | 640 | 820 | 1150 |
| 400 mm | 340 | 610 | 820 | 1060 | 1490 |
| 500 mm | 410 | 740 | 990 | 1280 | 1800 |
| 600 mm | 480 | 860 | 1150 | 1490 | 2100 |
| 900 mm | 680 | 1210 | 1600 | 2100 | 2950 |

Grobe Mittelwerte. Herstellerdaten sind genauer und gehen vor. Typ = Anzahl Platten und Konvektorlagen (22 = 2 Platten, 2 Lamellen), ablesbar von oben oder an der Bautiefe (10: ~50 mm, 11: ~65 mm, 21: ~80 mm, 22: ~100 mm, 33: ~155 mm).

Gliederheizkörper (Guss/Stahl), Φ_N je Glied: Bauhöhe 600 / Bautiefe 160 mm ≈ 120 W, 900/160 ≈ 170 W, 600/220 ≈ 160 W. Glieder zählen lassen.

Exponent n: Platte/Glieder 1,3. Konvektor 1,4. Fußbodenheizung 1,1.

## Luftdichtheit n50 ohne Messung

| Zustand | n50 [1/h] |
|---|---|
| Altbau unsaniert, alte Fenster | 6–8 |
| Altbau, neue Fenster | 4 |
| 1980–2000 | 3–4 |
| EnEV ohne Test | 2–3 |
| mit Blower-Door-Test bestanden (EnEV) | ≤ 3 bzw. ≤ 1,5 mit Lüftungsanlage |
| Passivhaus | ≤ 0,6 |
