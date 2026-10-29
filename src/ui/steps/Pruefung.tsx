import { geschossVon, heizkoerperLeistungN, raumVolumen } from '../../core/geometrie'
import type { Befund, SchrittId } from '../../core/validierung'
import { useProjekt } from '../../store'
import { Abschnitt, fmt } from '../felder'

export function PruefungSchritt({ befunde, springe }: { befunde: Befund[]; springe: (s: SchrittId, raumId?: string) => void }) {
  const p = useProjekt((s) => s.projekt)
  const fehler = befunde.filter((b) => b.ebene === 'fehler')
  const hinweise = befunde.filter((b) => b.ebene === 'hinweis')
  const flaeche = p.raeume.reduce((s, r) => s + r.grundflaeche, 0)
  const volumen = p.raeume.reduce((s, r) => s + raumVolumen(r, geschossVon(p, r)), 0)
  const hk = p.raeume.reduce((s, r) => s + r.heizkoerper.length, 0)
  const phiN = p.raeume.reduce((s, r) => s + (heizkoerperLeistungN(r) ?? 0), 0)

  return (
    <>
      <Abschnitt titel="Übersicht">
        <dl className="kennzahlen">
          <div>
            <dt>Räume</dt>
            <dd>{p.raeume.length}</dd>
          </div>
          <div>
            <dt>beheizte Fläche</dt>
            <dd>{fmt(flaeche, 1)} m²</dd>
          </div>
          <div>
            <dt>Raumvolumen</dt>
            <dd>{fmt(volumen, 0)} m³</dd>
          </div>
          <div>
            <dt>Heizkörper</dt>
            <dd>{hk}</dd>
          </div>
          <div>
            <dt>Σ Φ_N (75/65/20)</dt>
            <dd>{fmt(phiN / 1000, 1)} kW</dd>
          </div>
          <div>
            <dt>θ_e</dt>
            <dd>{p.klima.thetaE ?? '–'} °C</dd>
          </div>
        </dl>
        <p className={fehler.length === 0 ? 'ok' : 'warnung'}>
          {fehler.length === 0
            ? 'Keine Fehler – Daten sind bereit für die Berechnung (Meilenstein M2).'
            : `${fehler.length} Fehler müssen vor der Berechnung behoben werden.`}
        </p>
      </Abschnitt>
      <BefundListe titel={`Fehler (${fehler.length})`} liste={fehler} springe={springe} />
      <BefundListe titel={`Hinweise (${hinweise.length})`} liste={hinweise} springe={springe} />
    </>
  )
}

function BefundListe({ titel, liste, springe }: { titel: string; liste: Befund[]; springe: (s: SchrittId, raumId?: string) => void }) {
  if (liste.length === 0) return null
  return (
    <Abschnitt titel={titel}>
      <ul className="befunde">
        {liste.map((b, i) => (
          <li key={i} className={b.ebene}>
            <button onClick={() => springe(b.schritt, b.raumId)}>{b.text}</button>
          </li>
        ))}
      </ul>
    </Abschnitt>
  )
}
