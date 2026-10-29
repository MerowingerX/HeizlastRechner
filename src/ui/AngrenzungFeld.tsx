/**
 * Auswahl, woran eine Fläche grenzt: außen, Erdreich, unbeheizt, Raum, beheizt.
 */
import { thetaAusB, UNBEHEIZT_VORLAGEN } from '../core/kataloge'
import type { Angrenzung, Raum } from '../core/model'
import { useProjekt } from '../store'
import { Text, Zahl } from './felder'

type Art = Angrenzung['art']

const ART_LABEL: Record<Art, string> = {
  aussen: 'Außenluft',
  erdreich: 'Erdreich',
  unbeheizt: 'unbeheizt',
  raum: 'Raum im Projekt',
  beheizt: 'beheizt (fremd)',
}

interface Props {
  wert: Angrenzung
  onChange: (a: Angrenzung) => void
  /** Räume zur Auswahl; ohne Liste ist „Raum im Projekt" nicht wählbar */
  raeume?: Raum[]
  eigenerRaumId?: string
}

export function AngrenzungFeld({ wert, onChange, raeume, eigenerRaumId }: Props) {
  const thetaE = useProjekt((s) => s.projekt.klima.thetaE) ?? -12
  const arten: Art[] = raeume ? ['aussen', 'erdreich', 'unbeheizt', 'raum', 'beheizt'] : ['aussen', 'erdreich', 'unbeheizt', 'beheizt']
  const andere = (raeume ?? []).filter((r) => r.id !== eigenerRaumId)

  const wechsel = (art: Art) => {
    switch (art) {
      case 'aussen':
      case 'erdreich':
        return onChange({ art })
      case 'unbeheizt': {
        const v = UNBEHEIZT_VORLAGEN[0]
        return onChange({ art, bezeichnung: v.bezeichnung, theta: thetaAusB(v.b, thetaE) })
      }
      case 'raum':
        return onChange({ art, raumId: andere[0]?.id ?? '' })
      case 'beheizt':
        return onChange({ art, bezeichnung: 'Nachbarwohnung', theta: 20 })
    }
  }

  return (
    <div className="angrenzung">
      <select value={wert.art} onChange={(e) => wechsel(e.target.value as Art)} aria-label="Angrenzung">
        {arten.map((a) => (
          <option key={a} value={a}>
            {ART_LABEL[a]}
          </option>
        ))}
      </select>
      {wert.art === 'raum' && (
        <select value={wert.raumId} onChange={(e) => onChange({ art: 'raum', raumId: e.target.value })} aria-label="Nachbarraum">
          {andere.length === 0 && <option value="">– kein anderer Raum –</option>}
          {andere.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nummer ? `${r.nummer} ` : ''}
              {r.name} ({r.thetaInt} °C)
            </option>
          ))}
        </select>
      )}
      {wert.art === 'unbeheizt' && (
        <>
          <select
            value=""
            aria-label="Vorlage"
            onChange={(e) => {
              const v = UNBEHEIZT_VORLAGEN.find((x) => x.bezeichnung === e.target.value)
              if (v) onChange({ art: 'unbeheizt', bezeichnung: v.bezeichnung, theta: thetaAusB(v.b, thetaE) })
            }}
          >
            <option value="">Vorlage…</option>
            {UNBEHEIZT_VORLAGEN.map((v) => (
              <option key={v.bezeichnung} value={v.bezeichnung}>
                {v.bezeichnung} (b = {String(v.b).replace('.', ',')})
              </option>
            ))}
          </select>
          <Text wert={wert.bezeichnung} onChange={(s) => onChange({ ...wert, bezeichnung: s })} />
          <Zahl klein wert={wert.theta} einheit="°C" onChange={(x) => onChange({ ...wert, theta: x ?? 0 })} />
        </>
      )}
      {wert.art === 'beheizt' && (
        <>
          <Text wert={wert.bezeichnung} onChange={(s) => onChange({ ...wert, bezeichnung: s })} />
          <Zahl klein wert={wert.theta} einheit="°C" onChange={(x) => onChange({ ...wert, theta: x ?? 0 })} />
        </>
      )}
    </div>
  )
}
