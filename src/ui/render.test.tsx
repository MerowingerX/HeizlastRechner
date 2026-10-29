// @vitest-environment happy-dom
/**
 * Rauchtest: jeder Schritt rendert mit dem Beispielprojekt ohne Fehler.
 */
import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { projektAusJson } from '../core/datei'
import { pruefeProjekt } from '../core/validierung'
import { useProjekt } from '../store'
import { AnlageSchritt } from './steps/Anlage'
import { GebaeudeSchritt, KlimaSchritt, ProjektSchritt } from './steps/Allgemein'
import { BauteileSchritt } from './steps/Bauteile'
import { GeschosseSchritt } from './steps/Geschosse'
import { HeizkoerperSchritt } from './steps/Heizkoerper'
import { PruefungSchritt } from './steps/Pruefung'
import { RaeumeSchritt } from './steps/Raeume'
import { VerbrauchSchritt } from './steps/Verbrauch'
import { ErgebnisSchritt } from './steps/Ergebnis'
import { GrundrissSchritt } from './steps/Grundriss'
import { MessungSchritt } from './steps/Messung'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const beispiel = projektAusJson(readFileSync('projekte/beispiel.json', 'utf8'))

describe('Schritte rendern', () => {
  useProjekt.getState().laden(beispiel, 'beispiel.json')
  const faelle: [string, () => React.ReactElement, string][] = [
    ['Projekt', () => <ProjektSchritt />, 'Beispielhaus'],
    ['Klima', () => <KlimaSchritt />, 'Braunschweig'],
    ['Gebäude', () => <GebaeudeSchritt />, 'Luftdichtheit'],
    ['Anlage', () => <AnlageSchritt />, 'Heizkurve'],
    ['Bauteile', () => <BauteileSchritt />, 'Außenwand'],
    ['Geschosse', () => <GeschosseSchritt />, 'Keller unbeheizt'],
    ['Räume', () => <RaeumeSchritt raumId="r-eg-wohnen" setRaumId={() => {}} />, 'Umschließungsflächen'],
    ['Heizkörper', () => <HeizkoerperSchritt />, 'V-exact II'],
    ['Verbrauch', () => <VerbrauchSchritt />, '2024'],
    ['Prüfung', () => <PruefungSchritt befunde={pruefeProjekt(beispiel)} springe={() => {}} />, 'Keine Fehler'],
    ['Ergebnis', () => <ErgebnisSchritt befundFehler={0} />, 'Ventil-Voreinstellung'],
    ['Ergebnis Heizkurve', () => <ErgebnisSchritt befundFehler={0} />, 'Heizkurve'],
    ['Ergebnis Verbrauch', () => <ErgebnisSchritt befundFehler={0} />, 'Abgleich mit dem Verbrauch'],
    ['Messung', () => <MessungSchritt />, 'Zeitkonstante'],
    ['Grundriss', () => <GrundrissSchritt />, 'Wohnzimmer'],
  ]
  for (const [name, el, erwartet] of faelle)
    it(name, () => {
      const div = document.createElement('div')
      const root = createRoot(div)
      act(() => root.render(el()))
      // Eingabefelder tragen Werte als value, nicht als Text
      const text = div.textContent + ' ' + [...div.querySelectorAll('input')].map((i) => i.value).join(' ')
      expect(text).toContain(erwartet)
      act(() => root.unmount())
    })
})
