# Phase 3: Grundriss & Geschosse

**Ziel:** Gebäudeform, Ausrichtung und alle Geschosse von unten nach oben: Keller, EG, OG(s), Dach. Für jedes Geschoss: beheizt ja/nein, Höhen, was liegt darunter und darüber, grobe Raumaufteilung.

## Einstieg

> „Jetzt der Grundriss. Hast du einen Plan oder eine Skizze, auch ein Handyfoto reicht? Sonst machen wir es im Gespräch."

Liegt ein Bild vor: mit Read ansehen und Maße, Räume und Nordpfeil ablesen. Unklare Stellen nachfragen.

## Fragen: Gebäude als Ganzes

1. **Grundform und Außenmaße**: „Wie groß ist das Haus ungefähr von außen, Länge mal Breite?" Bei Anbauten oder L-Form getrennt erfassen.
2. **Ausrichtung**: „In welche Himmelsrichtung zeigt die Haustür bzw. die Straßenseite? Wo ist der Garten?" Daraus die Orientierung aller Fassaden ableiten.
3. **Angebaut** (bei DHH/RH): An welcher Seite ist das Nachbarhaus? Ist es bewohnt bzw. beheizt?

## Fragen: Geschoss für Geschoss (von unten nach oben)

Jedes Geschoss einzeln durchgehen, immer in derselben Reihenfolge:

### Keller
- Gibt es einen Keller? Ganz oder teilweise unter dem Haus?
- **Beheizt?** Gibt es dort Heizkörper und Räume, die warm sein sollen (Hobbyraum, Büro)?
  - **unbeheizt** → kein Geschoss anlegen. Beim EG `unten` auf `unbeheizt` „Keller unbeheizt" setzen, b = 0,5 (Kellerfenster undicht: 0,7). Temperatur θ = 20 − b·(20 − θ_e).
  - **teilweise beheizt** → Geschoss „KG" anlegen, nur die beheizten Räume erfassen. Unbeheizte Kellerräume sind dann Angrenzung `unbeheizt`.
  - **beheizt** → Geschoss „KG" mit `unten: { art: "erdreich" }`.
- Ohne Keller: EG `unten` = `erdreich` (Bodenplatte).

### Erdgeschoss
- Raumhöhe: „Wie hoch sind die Räume ungefähr?" Schätzwerte siehe schaetzwerte.md. `lichteHoehe` setzen, `geschosshoehe` = lichte Höhe + Deckenstärke (Massivdecke ~0,25 m, Holzbalken ~0,30 m).
- Welche Räume gibt es? Nur eine **Liste mit grober Lage** (z. B. „Küche NO, Wohnzimmer S/W, Bad innen"), die Details kommen in Phase 5.

### Obergeschoss(e)
- Wie EG. Gibt es ein Vollgeschoss oder schon Dachschrägen (dann eher „Dachgeschoss")?

### Dach
Per AskUserQuestion klären, was oben ist:
- **Ausgebautes Dachgeschoss (beheizt)** → Geschoss „DG". Kniestockhöhe, Dachneigung und Spitzboden darüber (unbeheizt oder Teil des Raums) erfragen. `oben` = `unbeheizt` „Spitzboden" (b 0,9) oder `aussen`, wenn bis unter den First ausgebaut.
- **Unbeheizter Dachboden** → kein Geschoss. Beim obersten Geschoss `oben` = `unbeheizt` „Dachboden unbeheizt" (b 0,9 bei ungedämmtem Dach). Fragen, ob die **Bodenfläche des Dachbodens (oberste Geschossdecke) gedämmt** ist, das gilt für Phase 4.
- **Flachdach** → `oben` = `aussen`, Bauteil DA.

## Verarbeiten

- Geschosse mit sprechenden IDs anlegen (`g-kg`, `g-eg`, `g-og`, `g-dg`), sortiert von unten nach oben.
- Zwischen zwei beheizten Geschossen: `oben`/`unten` = `{ art: "beheizt", bezeichnung: "<Nachbargeschoss>", theta: 20 }`.
- **Grundriss-Skizze** als Text in die Notizen schreiben (siehe Vorlage), mit Außenmaßen, Nordrichtung und Raumlage. Diese Skizze ist die Grundlage für Phase 5.
- Geplante Raumliste je Geschoss in die Notizen unter „Fortschritt" eintragen.
- Lage der Räume (`raeume[].lage`, Innenmaße) aus der Skizze ableiten, sobald die Räume in Phase 5 angelegt werden: x von der Westwand, y von der Nordwand, Innenwände ~0,12–0,25 m dazwischen. Das erlaubt Grundriss- und 3D-Ansicht und eine Konsistenzkontrolle der Außenwände.

## Abschluss

Skizze und Geschossliste zeigen und bestätigen lassen. Prüfen, abhaken.
