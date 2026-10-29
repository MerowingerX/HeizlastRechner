import { neueId } from '../../core/model'
import { useProjekt } from '../../store'
import { AngrenzungFeld } from '../AngrenzungFeld'
import { Abschnitt, Text, Zahl } from '../felder'

export function GeschosseSchritt() {
  const geschosse = useProjekt((s) => s.projekt.geschosse)
  const raeume = useProjekt((s) => s.projekt.raeume)
  const aendern = useProjekt((s) => s.aendern)

  const neu = () =>
    aendern((p) => {
      const vorher = p.geschosse.at(-1)
      p.geschosse.push({
        id: neueId(),
        name: vorher ? `${p.geschosse.length}. OG` : 'EG',
        geschosshoehe: 2.75,
        lichteHoehe: 2.5,
        unten: vorher ? { art: 'beheizt', bezeichnung: vorher.name, theta: 20 } : { art: 'unbeheizt', bezeichnung: 'Keller unbeheizt', theta: 4 },
        oben: { art: 'unbeheizt', bezeichnung: 'Dachboden unbeheizt', theta: -10.6 },
      })
      // darunterliegendes Geschoss ist jetzt nach oben beheizt
      if (vorher) vorher.oben = { art: 'beheizt', bezeichnung: 'Geschoss darüber', theta: 20 }
    })

  return (
    <Abschnitt titel="Geschosse" aktion={<button onClick={neu}>+ Geschoss</button>}>
      <p className="klein">
        Geschosshöhe = Rohdecke bis Rohdecke (Wandhöhe bei Außenmaßen). Lichte Höhe = Fußboden bis Decke (Raumvolumen). „Unten/Oben" sind
        Vorschläge für Fußboden- und Deckenflächen der Räume.
      </p>
      {geschosse.length === 0 ? (
        <p className="leer">Noch kein Geschoss. Von unten nach oben anlegen.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Geschosshöhe [m]</th>
              <th>lichte Höhe [m]</th>
              <th>darunter</th>
              <th>darüber</th>
              <th>Räume</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {geschosse.map((g) => {
              const upd = (rez: (x: typeof g) => void) =>
                aendern((p) => {
                  const z = p.geschosse.find((y) => y.id === g.id)
                  if (z) rez(z)
                })
              const n = raeume.filter((r) => r.geschossId === g.id).length
              return (
                <tr key={g.id}>
                  <td>
                    <Text wert={g.name} onChange={(v) => upd((z) => void (z.name = v))} />
                  </td>
                  <td>
                    <Zahl klein wert={g.geschosshoehe} onChange={(x) => upd((z) => void (z.geschosshoehe = x ?? 0))} />
                  </td>
                  <td>
                    <Zahl klein wert={g.lichteHoehe} onChange={(x) => upd((z) => void (z.lichteHoehe = x ?? 0))} />
                  </td>
                  <td>
                    <AngrenzungFeld wert={g.unten} onChange={(a) => upd((z) => void (z.unten = a))} />
                  </td>
                  <td>
                    <AngrenzungFeld wert={g.oben} onChange={(a) => upd((z) => void (z.oben = a))} />
                  </td>
                  <td className="zahlzelle">{n}</td>
                  <td>
                    <button
                      className="loeschen"
                      disabled={n > 0}
                      title={n > 0 ? 'Enthält noch Räume' : 'Löschen'}
                      onClick={() => aendern((p) => void (p.geschosse = p.geschosse.filter((y) => y.id !== g.id)))}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Abschnitt>
  )
}
