import { EINHEIT_LABEL, TRAEGER_INFO } from '../../core/kataloge'
import { EINHEITEN, ENERGIETRAEGER, neueId } from '../../core/model'
import { useProjekt } from '../../store'
import { Abschnitt, Auswahl, Text, Zahl } from '../felder'

export function VerbrauchSchritt() {
  const liste = useProjekt((s) => s.projekt.verbrauch)
  const aendern = useProjekt((s) => s.aendern)
  const neu = () =>
    aendern((p) =>
      p.verbrauch.push({
        id: neueId(),
        zeitraum: String(new Date().getFullYear() - 1),
        traeger: 'erdgas',
        menge: 0,
        einheit: TRAEGER_INFO.erdgas.einheit,
        inklWarmwasser: true,
        nutzungsgrad: TRAEGER_INFO.erdgas.nutzungsgrad,
        gradtagzahl: null,
        notiz: '',
      }),
    )
  return (
    <Abschnitt titel="Verbrauch (optional)" aktion={<button onClick={neu}>+ Abrechnungsjahr</button>}>
      <p className="klein">Jahresverbräuche aus Abrechnungen. Dient zum Abgleich mit der berechneten Heizlast (witterungsbereinigt über die Gradtagzahl G20/15 des Zeitraums, z. B. vom DWD oder IWU-Gradtagzahlrechner; leer = langjähriges Mittel 3.500 Kd).</p>
      {liste.length === 0 ? (
        <p className="leer">Keine Verbrauchsdaten.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Zeitraum</th>
              <th>Energieträger</th>
              <th>Menge</th>
              <th>Einheit</th>
              <th>inkl. Warmwasser</th>
              <th>Nutzungsgrad / JAZ</th>
              <th>Gradtagzahl G20/15</th>
              <th>Notiz</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {liste.map((v) => {
              const upd = (rez: (x: typeof v) => void) =>
                aendern((p) => {
                  const z = p.verbrauch.find((y) => y.id === v.id)
                  if (z) rez(z)
                })
              return (
                <tr key={v.id}>
                  <td>
                    <Text wert={v.zeitraum} onChange={(s) => upd((z) => void (z.zeitraum = s))} />
                  </td>
                  <td>
                    <Auswahl
                      wert={v.traeger}
                      optionen={ENERGIETRAEGER}
                      beschriftung={Object.fromEntries(ENERGIETRAEGER.map((t) => [t, TRAEGER_INFO[t].label])) as Record<(typeof ENERGIETRAEGER)[number], string>}
                      onChange={(t) =>
                        upd((z) => {
                          z.traeger = t
                          z.einheit = TRAEGER_INFO[t].einheit
                          z.nutzungsgrad = TRAEGER_INFO[t].nutzungsgrad
                        })
                      }
                    />
                  </td>
                  <td>
                    <Zahl klein wert={v.menge} onChange={(x) => upd((z) => void (z.menge = x ?? 0))} />
                  </td>
                  <td>
                    <Auswahl wert={v.einheit} optionen={EINHEITEN} beschriftung={EINHEIT_LABEL} onChange={(e) => upd((z) => void (z.einheit = e))} />
                  </td>
                  <td>
                    <input type="checkbox" checked={v.inklWarmwasser} onChange={(e) => upd((z) => void (z.inklWarmwasser = e.target.checked))} />
                  </td>
                  <td>
                    <Zahl klein wert={v.nutzungsgrad} onChange={(x) => upd((z) => void (z.nutzungsgrad = x ?? 1))} />
                  </td>
                  <td>
                    <Zahl klein optional platzhalter="3500" wert={v.gradtagzahl} onChange={(x) => upd((z) => void (z.gradtagzahl = x))} />
                  </td>
                  <td>
                    <Text wert={v.notiz} onChange={(s) => upd((z) => void (z.notiz = s))} />
                  </td>
                  <td>
                    <button className="loeschen" onClick={() => aendern((p) => void (p.verbrauch = p.verbrauch.filter((y) => y.id !== v.id)))}>
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
