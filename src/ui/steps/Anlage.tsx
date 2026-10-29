import { neueId, SYSTEMARTEN } from '../../core/model'
import { useProjekt } from '../../store'
import { Abschnitt, Auswahl, Haken, Text, Zahl } from '../felder'

export function AnlageSchritt() {
  const a = useProjekt((s) => s.projekt.anlage)
  const aendern = useProjekt((s) => s.aendern)
  const set = <K extends keyof typeof a>(k: K, v: (typeof a)[K]) => aendern((p) => void (p.anlage[k] = v))
  const setHk = <K extends keyof typeof a.heizkurve>(k: K, v: (typeof a.heizkurve)[K]) =>
    aendern((p) => void (p.anlage.heizkurve[k] = v))

  return (
    <>
      <Abschnitt titel="Wärmeerzeuger & Verteilung">
        <div className="raster">
          <Text label="Wärmeerzeuger (Therme)" platzhalter="z. B. Vaillant ecoTEC plus VC 206" wert={a.erzeuger} onChange={(v) => set('erzeuger', v)} />
          <Zahl label="Nennleistung" einheit="kW" optional wert={a.erzeugerLeistung} onChange={(x) => set('erzeugerLeistung', x)} />
          <Auswahl
            label="Rohrsystem"
            wert={a.systemart}
            optionen={SYSTEMARTEN}
            beschriftung={{ zweirohr: 'Zweirohrsystem', einrohr: 'Einrohrsystem' }}
            onChange={(v) => set('systemart', v)}
          />
          <Text label="Umwälzpumpe" platzhalter="Hersteller / Typ" wert={a.pumpe} onChange={(v) => set('pumpe', v)} />
          <Zahl
            label="Förderhöhe / Δp-Sollwert"
            einheit="mbar"
            optional
            wert={a.pumpenDruck}
            hilfe="1 m Förderhöhe ≈ 100 mbar"
            onChange={(x) => set('pumpenDruck', x)}
          />
          <Haken label="Differenzdruckregler in Strängen" wert={a.differenzdruckregler} onChange={(b) => set('differenzdruckregler', b)} />
        </div>
      </Abschnitt>

      <Abschnitt titel="Heizkurve (Ist-Einstellung am Regler)">
        <p className="klein">
          Heizkörper sind vorhanden. Die Berechnung ermittelt später die nötige Vorlauftemperatur und schlägt eine neue Heizkurve vor.
          Hier steht der Ist-Zustand für den Vergleich.
        </p>
        <div className="raster">
          <Zahl label="Vorlauf bei θ_e (Ist)" einheit="°C" wert={a.vorlauf} onChange={(x) => set('vorlauf', x ?? 0)} />
          <Zahl label="Rücklauf bei θ_e (Ist)" einheit="°C" wert={a.ruecklauf} onChange={(x) => set('ruecklauf', x ?? 0)} />
          <Zahl label="Steilheit / Neigung" optional wert={a.heizkurve.steilheit} onChange={(x) => setHk('steilheit', x)} />
          <Zahl label="Niveau / Parallelverschiebung" einheit="K" optional wert={a.heizkurve.niveau} onChange={(x) => setHk('niveau', x)} />
          <Zahl label="Raumsollwert am Regler" einheit="°C" optional wert={a.heizkurve.raumsoll} onChange={(x) => setHk('raumsoll', x)} />
          <Zahl label="Max. Vorlauftemperatur" einheit="°C" optional wert={a.heizkurve.maxVorlauf} onChange={(x) => setHk('maxVorlauf', x)} />
          <Zahl label="Heizgrenze" einheit="°C" optional wert={a.heizkurve.heizgrenze} onChange={(x) => setHk('heizgrenze', x)} />
        </div>
      </Abschnitt>

      <Abschnitt
        titel="Messpunkte (optional)"
        aktion={
          <button
            onClick={() =>
              aendern((p) =>
                p.anlage.messungen.push({
                  id: neueId(),
                  datum: new Date().toISOString().slice(0, 10),
                  aussen: 0,
                  vorlauf: 50,
                  ruecklauf: null,
                  raeumeWarm: true,
                  notiz: '',
                }),
              )
            }
          >
            + Messpunkt
          </button>
        }
      >
        <p className="klein">Abgelesene Werte an kalten Tagen: Außentemperatur → Vorlauf. Zeigt, ob die Ist-Kurve reicht.</p>
        {a.messungen.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Außen °C</th>
                <th>Vorlauf °C</th>
                <th>Rücklauf °C</th>
                <th>alle Räume warm</th>
                <th>Notiz</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {a.messungen.map((m) => {
                const upd = (rez: (x: typeof m) => void) =>
                  aendern((p) => {
                    const z = p.anlage.messungen.find((y) => y.id === m.id)
                    if (z) rez(z)
                  })
                return (
                  <tr key={m.id}>
                    <td>
                      <Text wert={m.datum} onChange={(v) => upd((z) => void (z.datum = v))} />
                    </td>
                    <td>
                      <Zahl klein wert={m.aussen} onChange={(x) => upd((z) => void (z.aussen = x ?? 0))} />
                    </td>
                    <td>
                      <Zahl klein wert={m.vorlauf} onChange={(x) => upd((z) => void (z.vorlauf = x ?? 0))} />
                    </td>
                    <td>
                      <Zahl klein optional wert={m.ruecklauf} onChange={(x) => upd((z) => void (z.ruecklauf = x))} />
                    </td>
                    <td>
                      <input type="checkbox" checked={m.raeumeWarm} onChange={(e) => upd((z) => void (z.raeumeWarm = e.target.checked))} />
                    </td>
                    <td>
                      <Text wert={m.notiz} onChange={(v) => upd((z) => void (z.notiz = v))} />
                    </td>
                    <td>
                      <button className="loeschen" title="Löschen" onClick={() => aendern((p) => void (p.anlage.messungen = p.anlage.messungen.filter((y) => y.id !== m.id)))}>
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
    </>
  )
}
