import { lazy, Suspense, useMemo, useState } from 'react'
import { pruefeProjekt, type SchrittId } from './core/validierung'
import { useProjekt } from './store'
import { DateiLeiste } from './ui/DateiLeiste'
import { AnlageSchritt } from './ui/steps/Anlage'
import { GebaeudeSchritt, KlimaSchritt, ProjektSchritt } from './ui/steps/Allgemein'
import { BauteileSchritt } from './ui/steps/Bauteile'
import { GeschosseSchritt } from './ui/steps/Geschosse'
import { HeizkoerperSchritt } from './ui/steps/Heizkoerper'
import { PruefungSchritt } from './ui/steps/Pruefung'
import { RaeumeSchritt } from './ui/steps/Raeume'
import { VerbrauchSchritt } from './ui/steps/Verbrauch'
import { ErgebnisSchritt } from './ui/steps/Ergebnis'
import { GrundrissSchritt } from './ui/steps/Grundriss'
import { MessungSchritt } from './ui/steps/Messung'

const Ansicht3D = lazy(() => import('./ui/steps/Ansicht3D'))

type Ansicht = SchrittId | 'pruefung' | 'ergebnis' | 'messung' | 'grundriss' | 'dreid'

const SCHRITTE: { id: Ansicht; titel: string; gruppe?: string }[] = [
  { id: 'projekt', titel: 'Projekt' },
  { id: 'klima', titel: 'Standort & Klima' },
  { id: 'gebaeude', titel: 'Gebäude' },
  { id: 'anlage', titel: 'Heizungsanlage' },
  { id: 'bauteile', titel: 'Bauteile' },
  { id: 'geschosse', titel: 'Geschosse' },
  { id: 'raeume', titel: 'Räume & Flächen' },
  { id: 'heizkoerper', titel: 'Heizkörper' },
  { id: 'verbrauch', titel: 'Verbrauch' },
  { id: 'pruefung', titel: 'Prüfung' },
  { id: 'ergebnis', titel: 'Ergebnis & Abgleich', gruppe: 'Auswertung' },
  { id: 'messung', titel: 'Messung (Auskühlen)', gruppe: 'Auswertung' },
  { id: 'grundriss', titel: 'Grundriss', gruppe: 'Auswertung' },
  { id: 'dreid', titel: '3D-Ansicht', gruppe: 'Auswertung' },
]

export default function App() {
  const projekt = useProjekt((s) => s.projekt)
  const [ansicht, setAnsicht] = useState<Ansicht>(() => {
    const s = new URLSearchParams(location.search).get('schritt')
    return SCHRITTE.find((x) => x.id === s)?.id ?? 'projekt'
  })
  const [raumId, setRaumId] = useState<string | null>(null)
  const befunde = useMemo(() => pruefeProjekt(projekt), [projekt])

  const springe = (s: SchrittId, rId?: string) => {
    setAnsicht(s)
    if (rId) setRaumId(rId)
  }

  const zaehler = (id: Ansicht) => {
    const liste = id === 'pruefung' ? befunde : befunde.filter((b) => b.schritt === id)
    if (SCHRITTE.find((s) => s.id === id)?.gruppe) return { fehler: 0, hinweise: 0 }
    return { fehler: liste.filter((b) => b.ebene === 'fehler').length, hinweise: liste.filter((b) => b.ebene === 'hinweis').length }
  }

  const idx = SCHRITTE.findIndex((s) => s.id === ansicht)

  return (
    <div className="app">
      <header className="kopf nicht-drucken">
        <h1>Heizlast</h1>
        <span className="projektname">{projekt.meta.name}</span>
        <DateiLeiste />
      </header>
      <nav className="schritte nicht-drucken">
        <ol>
          {SCHRITTE.map((s, i) => {
            const z = zaehler(s.id)
            return (
              <li key={s.id} className={s.gruppe ? 'auswertung' : ''}>
                {s.gruppe && SCHRITTE[i - 1]?.gruppe !== s.gruppe && <div className="gruppe">{s.gruppe}</div>}
                <button className={s.id === ansicht ? 'aktiv' : ''} onClick={() => setAnsicht(s.id)}>
                  <span>{s.titel}</span>
                  {z.fehler > 0 && <span className="marke fehler">{z.fehler}</span>}
                  {z.fehler === 0 && z.hinweise > 0 && <span className="marke hinweis">{z.hinweise}</span>}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
      <main className="inhalt">
        <h2>
          {SCHRITTE[idx]?.titel}
          <span className="nur-drucken"> – {projekt.meta.name}, {projekt.meta.strasse} {projekt.meta.plz} {projekt.meta.ort}, Stand {projekt.meta.datum}</span>
        </h2>
        {ansicht === 'projekt' && <ProjektSchritt />}
        {ansicht === 'klima' && <KlimaSchritt />}
        {ansicht === 'gebaeude' && <GebaeudeSchritt />}
        {ansicht === 'anlage' && <AnlageSchritt />}
        {ansicht === 'bauteile' && <BauteileSchritt />}
        {ansicht === 'geschosse' && <GeschosseSchritt />}
        {ansicht === 'raeume' && <RaeumeSchritt raumId={raumId} setRaumId={setRaumId} />}
        {ansicht === 'heizkoerper' && <HeizkoerperSchritt />}
        {ansicht === 'verbrauch' && <VerbrauchSchritt />}
        {ansicht === 'pruefung' && <PruefungSchritt befunde={befunde} springe={springe} />}
        {ansicht === 'ergebnis' && <ErgebnisSchritt befundFehler={befunde.filter((b) => b.ebene === 'fehler').length} />}
        {ansicht === 'messung' && <MessungSchritt />}
        {ansicht === 'grundriss' && <GrundrissSchritt />}
        {ansicht === 'dreid' && (
          <Suspense fallback={<p className="leer">3D wird geladen…</p>}>
            <Ansicht3D />
          </Suspense>
        )}
        <footer className="blaettern nicht-drucken">
          <button disabled={idx <= 0} onClick={() => setAnsicht(SCHRITTE[idx - 1].id)}>
            ← zurück
          </button>
          <button disabled={idx >= SCHRITTE.length - 1} onClick={() => setAnsicht(SCHRITTE[idx + 1].id)}>
            weiter →
          </button>
        </footer>
      </main>
    </div>
  )
}
