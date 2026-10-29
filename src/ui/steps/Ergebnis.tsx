import { Fragment, useMemo, useState } from 'react'
import { berechne, BerechnungsFehler, type GebaeudeErgebnis } from '../../core/berechnung'
import { legeAus, type Auslegung } from '../../core/heizkoerper'
import { KATEGORIE_LABEL } from '../../core/kataloge'
import { werteMessungAus } from '../../core/messung'
import type { Projekt } from '../../core/model'
import { bewerteVerhaeltnis, werteVerbrauchAus } from '../../core/verbrauch'
import { berechneVoreinstellungen, type Voreinstellung } from '../../core/ventile'
import { useProjekt } from '../../store'
import { Diagramm } from '../Diagramm'
import { Abschnitt, fmt, Zahl } from '../felder'

export interface Gesamtergebnis {
  g: GebaeudeErgebnis
  a: Auslegung
  v: Voreinstellung[]
}

export function rechneAlles(p: Projekt): Gesamtergebnis | { fehler: string } {
  try {
    const g = berechne(p)
    const a = legeAus(p, g)
    return { g, a, v: berechneVoreinstellungen(p, a) }
  } catch (e) {
    if (e instanceof BerechnungsFehler) return { fehler: e.message }
    throw e
  }
}

const STATUS_TEXT: Record<string, string> = {
  ok: 'ok',
  kein_hk: 'kein Heizkörper',
  phiN_fehlt: 'Φ_N fehlt',
  kein_bedarf: 'kein Bedarf',
  unterversorgt: 'unterversorgt',
}

function csvHerunterladen(name: string, zeilen: (string | number)[][]) {
  const text = zeilen.map((z) => z.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function ErgebnisSchritt({ befundFehler }: { befundFehler: number }) {
  const p = useProjekt((s) => s.projekt)
  const aendern = useProjekt((s) => s.aendern)
  const ergebnis = useMemo(() => rechneAlles(p), [p])
  const [offen, setOffen] = useState<string | null>(null)

  if (befundFehler > 0) return <p className="warnung">Es gibt noch {befundFehler} Fehler in den Eingaben – siehe „Prüfung".</p>
  if ('fehler' in ergebnis) return <p className="warnung">Berechnung nicht möglich: {ergebnis.fehler}</p>
  const { g, a, v } = ergebnis
  const thetaE = g.thetaE

  const exportieren = () =>
    csvHerunterladen(`${p.meta.name}-abgleich.csv`, [
      ['Geschoss', 'Raum', 'θ_int °C', 'Φ_HL W', 'Heizkörper', 'Φ_N W', 'Leistung W', 'Volumenstrom l/h', 'Ventil', 'Einstellung alt', 'Einstellung neu', 'k_v erf', 'Hinweis'],
      ...a.raeume.flatMap((r) => {
        const zeilen = v.filter((x) => x.raumId === r.raumId)
        if (zeilen.length === 0) return [[r.geschoss, r.name, r.thetaInt, Math.round(r.phiHL), '–', '', '', '', '', '', '', '', STATUS_TEXT[r.status]]]
        return zeilen.map((x) => {
          const b = r.heizkoerper.find((h) => h.heizkoerperId === x.heizkoerperId)
          return [r.geschoss, r.name, r.thetaInt, Math.round(r.phiHL), x.heizkoerper, '', Math.round(b?.phi ?? 0), Math.round(x.volumenstrom), x.ventil, x.aktuell, x.einstellung ?? '', fmt(x.kvErforderlich, 3), x.hinweis]
        })
      }),
    ])

  // Heizkurve: neu vs. Ist (Ist als Gerade zwischen (θ_e, VL_ist) und (20 °C, 20 °C))
  const ist = [thetaE, 20].map((ta) => ({ x: ta, y: ta === 20 ? 20 : p.anlage.vorlauf }))
  const erzeuger = p.anlage.erzeugerLeistung

  return (
    <>
      <Abschnitt
        titel="Auslegung"
        aktion={
          <span className="knopfleiste nicht-drucken">
            <button onClick={exportieren}>CSV</button>
            <button onClick={() => window.print()}>Bericht drucken / PDF</button>
          </span>
        }
      >
        <div className="raster nicht-drucken">
          <Zahl
            label="Ziel-Spreizung im ungünstigsten Raum"
            einheit="K"
            wert={p.anlage.zielSpreizung}
            hilfe="Gas-Therme 10–15 K, Wärmepumpe 5–7 K"
            onChange={(x) => aendern((q) => void (q.anlage.zielSpreizung = x ?? 10))}
          />
          <Zahl
            label="Systemvorlauf bei θ_e vorgeben"
            einheit="°C"
            optional
            platzhalter="automatisch"
            wert={p.anlage.zielVorlauf}
            hilfe="leer = vom ungünstigsten Raum bestimmt"
            onChange={(x) => aendern((q) => void (q.anlage.zielVorlauf = x))}
          />
          <Zahl
            label="Max. Vorlauftemperatur"
            einheit="°C"
            optional
            platzhalter="75"
            wert={p.anlage.heizkurve.maxVorlauf}
            onChange={(x) => aendern((q) => void (q.anlage.heizkurve.maxVorlauf = x))}
          />
        </div>
        <dl className="kennzahlen">
          <div>
            <dt>Gebäudeheizlast</dt>
            <dd>{fmt(g.phiHL / 1000, 2)} kW</dd>
          </div>
          <div>
            <dt>spezifisch</dt>
            <dd>{fmt(g.wProM2, 0)} W/m²</dd>
          </div>
          <div>
            <dt>Systemvorlauf bei {thetaE} °C</dt>
            <dd>{a.vorlauf === null ? '–' : `${fmt(a.vorlauf, 1)} °C`}</dd>
          </div>
          <div>
            <dt>Mischrücklauf</dt>
            <dd>{a.ruecklaufMisch === null ? '–' : `${fmt(a.ruecklaufMisch, 1)} °C`}</dd>
          </div>
          <div>
            <dt>Volumenstrom</dt>
            <dd>{fmt(a.volumenstromGesamt, 0)} l/h</dd>
          </div>
          <div>
            <dt>Heizkurve (linear)</dt>
            <dd>{a.steilheit === null ? '–' : `S ${fmt(a.steilheit, 2)} / N ${fmt(a.niveau ?? 0, 1)}`}</dd>
          </div>
          {erzeuger !== null && (
            <div>
              <dt>Erzeuger / Heizlast</dt>
              <dd>{fmt((erzeuger * 1000) / g.phiHL, 1)}×</dd>
            </div>
          )}
        </dl>
        {a.warnungen.length > 0 && (
          <ul className="befunde">
            {a.warnungen.map((w) => (
              <li key={w} className="hinweis">
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}
      </Abschnitt>

      <Abschnitt titel="Ergebnis: Räume, Heizkörper, Ventil-Voreinstellung">
        <table>
          <thead>
            <tr>
              <th>Raum</th>
              <th>θ_int</th>
              <th>Φ_HL [W]</th>
              <th>VL nötig</th>
              <th>Ist-Deckung</th>
              <th>Heizkörper</th>
              <th>Leistung [W]</th>
              <th>V̇ [l/h]</th>
              <th>Ventil</th>
              <th>Einstellung</th>
              <th>Hinweis</th>
            </tr>
          </thead>
          <tbody>
            {a.raeume.map((r) => {
              const zeilen = v.filter((x) => x.raumId === r.raumId)
              const n = Math.max(zeilen.length, 1)
              const raumZellen = (
                <>
                  <td rowSpan={n}>
                    <b>{r.name}</b>
                    <br />
                    <small className="klein">{r.geschoss}</small>
                  </td>
                  <td rowSpan={n} className="zahlzelle">
                    {r.thetaInt} °C
                  </td>
                  <td rowSpan={n} className="zahlzelle">
                    {fmt(r.phiHL, 0)}
                  </td>
                  <td rowSpan={n} className={`zahlzelle ${r.status === 'unterversorgt' ? 'text-fehler' : ''}`}>
                    {r.vlNoetig === null ? '–' : `${fmt(r.vlNoetig, 1)} °C`}
                  </td>
                  <td rowSpan={n} className={`zahlzelle ${r.deckungIst !== null && r.deckungIst < 100 ? 'text-hinweis' : ''}`}>
                    {r.deckungIst === null ? '–' : `${fmt(r.deckungIst, 0)} %`}
                  </td>
                </>
              )
              if (zeilen.length === 0)
                return (
                  <tr key={r.raumId} className={`status-${r.status}`}>
                    {raumZellen}
                    <td colSpan={6}>{STATUS_TEXT[r.status]}</td>
                  </tr>
                )
              return zeilen.map((x, i) => {
                const b = r.heizkoerper.find((h) => h.heizkoerperId === x.heizkoerperId)
                return (
                  <tr key={x.heizkoerperId} className={`status-${r.status}`}>
                    {i === 0 && raumZellen}
                    <td>{x.heizkoerper}</td>
                    <td className="zahlzelle">{fmt(b?.phi ?? 0, 0)}</td>
                    <td className="zahlzelle">{fmt(x.volumenstrom, 0)}</td>
                    <td>{x.ventil}</td>
                    <td className="einstellung">
                      <span className="alt">{x.aktuell || '?'}</span> → <b>{x.einstellung ?? '?'}</b>
                      <br />
                      <small className="klein">k_v {fmt(x.kvErforderlich, 3)} · Δp {fmt(x.dpVentil, 0)} mbar</small>
                    </td>
                    <td className="klein">
                      {r.status === 'unterversorgt' && <b className="text-fehler">Φ_N ≥ {fmt(r.phiNNoetig ?? 0, 0)} W nötig. </b>}
                      {x.hinweis}
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
        <p className="klein">
          k_v-Werte der Ventile sind Richtwerte – Einstellung vor Ort mit dem Herstellerdiagramm gegenprüfen. Δp am Ventil geschätzt aus Pumpendruck
          ({p.anlage.pumpenDruck ?? 150} mbar) abzüglich Rohrleitung (1 mbar/m · 2 · Länge · 1,3).
        </p>
      </Abschnitt>

      <Abschnitt titel="Heizkurve">
        <div className="zweiteilig">
          <Diagramm
            xTitel="Außentemperatur [°C]"
            yTitel="Temperatur [°C]"
            serien={[
              { name: 'Vorlauf neu', farbe: 'var(--akzent)', punkte: a.heizkurve.map((q) => ({ x: q.aussen, y: q.vorlauf })) },
              { name: 'Rücklauf neu', farbe: '#2563eb', punkte: a.heizkurve.map((q) => ({ x: q.aussen, y: q.ruecklauf })) },
              { name: 'Vorlauf Ist (Gerade)', farbe: '#888', gestrichelt: true, punkte: ist },
              ...(p.anlage.messungen.length
                ? [{ name: 'Messpunkte Ist', farbe: '#16a34a', gestrichelt: true, punkte: [...p.anlage.messungen].sort((x, y) => x.aussen - y.aussen).map((m) => ({ x: m.aussen, y: m.vorlauf })) }]
                : []),
            ]}
          />
          <table className="schmal">
            <thead>
              <tr>
                <th>Außen</th>
                <th>Vorlauf</th>
                <th>Rücklauf</th>
              </tr>
            </thead>
            <tbody>
              {a.heizkurve
                .filter((q) => q.aussen % 5 === 0 || q.aussen === a.heizkurve[0]?.aussen)
                .map((q) => (
                  <tr key={q.aussen}>
                    <td className="zahlzelle">{q.aussen} °C</td>
                    <td className="zahlzelle">{fmt(q.vorlauf, 1)} °C</td>
                    <td className="zahlzelle">{fmt(q.ruecklauf, 1)} °C</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="klein">
          Am Regler: Kurve so wählen, dass sie durch diese Punkte läuft. Hersteller definieren „Steilheit" unterschiedlich – die lineare Näherung
          (VL = 20 + Niveau + S · (20 − θ_a)) ist ein Startwert. Ist-Einstellung: Steilheit {p.anlage.heizkurve.steilheit ?? '?'}, Niveau{' '}
          {p.anlage.heizkurve.niveau ?? '?'}. Nach dem Umstellen einige kalte Tage beobachten und ggf. um 0,1 Steilheit nachjustieren.
        </p>
      </Abschnitt>

      <Abschnitt titel="Raumheizlast im Detail">
        <table>
          <thead>
            <tr>
              <th>Raum</th>
              <th>Fläche</th>
              <th>θ_int</th>
              <th>Φ_T [W]</th>
              <th>V̇ [m³/h]</th>
              <th>Φ_V [W]</th>
              <th>Φ_HL [W]</th>
              <th>W/m²</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {g.raeume.map((e) => (
              <Fragment key={e.raumId}>
                <tr>
                  <td>
                    {e.geschoss} · {e.nummer} {e.name}
                  </td>
                  <td className="zahlzelle">{fmt(e.grundflaeche, 1)} m²</td>
                  <td className="zahlzelle">{e.thetaInt} °C</td>
                  <td className="zahlzelle">{fmt(e.phiT, 0)}</td>
                  <td className="zahlzelle" title={`n_min·V = ${fmt(e.vMin, 1)}, Infiltration = ${fmt(e.vInf, 1)}`}>
                    {fmt(e.vWirksam, 1)}
                  </td>
                  <td className="zahlzelle">{fmt(e.phiV, 0)}</td>
                  <td className="zahlzelle">
                    <b>{fmt(e.phiHL, 0)}</b>
                  </td>
                  <td className="zahlzelle">{fmt(e.wProM2, 0)}</td>
                  <td className="nicht-drucken">
                    <button className="mini" onClick={() => setOffen(offen === e.raumId ? null : e.raumId)}>
                      {offen === e.raumId ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>
                {offen === e.raumId && (
                  <tr className="unterzeile">
                    <td colSpan={9}>
                      <table>
                        <thead>
                          <tr>
                            <th>Bauteil</th>
                            <th>Ausr.</th>
                            <th>grenzt an</th>
                            <th>A [m²]</th>
                            <th>U_korr</th>
                            <th>θ_adj</th>
                            <th>Φ [W]</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.posten.map((x) => (
                            <tr key={x.flaecheId + (x.oeffnungId ?? '')}>
                              <td>
                                {x.oeffnungId ? '↳ ' : ''}
                                {KATEGORIE_LABEL[x.kategorie]} – {x.bezeichnung}
                              </td>
                              <td>{x.orientierung}</td>
                              <td>{x.art}</td>
                              <td className="zahlzelle">{fmt(x.flaeche)}</td>
                              <td className="zahlzelle">{fmt(x.uKorr, 3)}</td>
                              <td className="zahlzelle">{fmt(x.thetaAdj, 1)}</td>
                              <td className="zahlzelle">{fmt(x.phi, 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            <tr className="summe">
              <td>Gebäude (Innenbauteile saldiert, Infiltration ½)</td>
              <td className="zahlzelle">{fmt(g.wohnflaeche, 1)} m²</td>
              <td />
              <td className="zahlzelle">{fmt(g.phiT, 0)}</td>
              <td />
              <td className="zahlzelle">{fmt(g.phiV, 0)}</td>
              <td className="zahlzelle">
                <b>{fmt(g.phiHL, 0)}</b>
              </td>
              <td className="zahlzelle">{fmt(g.wProM2, 0)}</td>
              <td />
            </tr>
          </tbody>
        </table>
        <p className="klein">
          Verfahren: DIN EN 12831-1 Standardverfahren mit Vereinfachungen (Erdreich nach EN ISO 13370 mit geschätztem B′ = {g.bStrich === null ? '–' : fmt(g.bStrich, 1)} m;
          Infiltration 2·V·n50·e; keine Aufheizleistung). Ohne Gewähr – für verbindliche Planung Fachplaner hinzuziehen.
        </p>
      </Abschnitt>

      {p.verbrauch.length > 0 && (
        <Abschnitt titel="Abgleich mit dem Verbrauch">
          <table>
            <thead>
              <tr>
                <th>Zeitraum</th>
                <th>Endenergie</th>
                <th>Heizwärme</th>
                <th>G20/15</th>
                <th>H [W/K]</th>
                <th>Φ aus Verbrauch</th>
                <th>Norm / Verbrauch</th>
                <th>Bewertung</th>
              </tr>
            </thead>
            <tbody>
              {p.verbrauch.map((ve) => {
                const r = werteVerbrauchAus(p, ve, g.wohnflaeche, g.phiHL)
                return (
                  <tr key={ve.id}>
                    <td>{ve.zeitraum}</td>
                    <td className="zahlzelle">{fmt(r.endenergie, 0)} kWh</td>
                    <td className="zahlzelle">{fmt(r.heizwaerme, 0)} kWh</td>
                    <td className="zahlzelle">
                      {fmt(r.gradtagzahl, 0)}
                      {r.gradtagzahlGeschaetzt ? '*' : ''}
                    </td>
                    <td className="zahlzelle">{fmt(r.h, 0)}</td>
                    <td className="zahlzelle">{fmt(r.phi / 1000, 2)} kW</td>
                    <td className="zahlzelle">{r.verhaeltnis === null ? '–' : fmt(r.verhaeltnis, 2)}</td>
                    <td className="klein">
                      {bewerteVerhaeltnis(r.verhaeltnis)} {r.warnung}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="klein">
            Norm-H: {fmt(g.h, 0)} W/K. * Gradtagzahl nicht eingetragen – langjähriges Mittel angesetzt; genauer mit dem Wert des Abrechnungszeitraums
            (DWD/IWU-Gradtagzahlen nach PLZ). Interne und solare Gewinne mindern den Verbrauch, daher liegt die Norm typisch 10–50 % höher.
          </p>
        </Abschnitt>
      )}

      {p.messreihen.length > 0 && (
        <Abschnitt titel="Abgleich mit Messungen">
          <table>
            <thead>
              <tr>
                <th>Messung</th>
                <th>Raum</th>
                <th>τ [h]</th>
                <th>H gemessen</th>
                <th>H Norm</th>
                <th>Φ gemessen</th>
                <th>Φ Norm</th>
              </tr>
            </thead>
            <tbody>
              {p.messreihen.map((m) => {
                const r = werteMessungAus(p, m)
                const e = g.raeume.find((x) => x.raumId === m.raumId)
                return (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{e?.name ?? '?'}</td>
                    <td className="zahlzelle">{r ? fmt(r.tau, 1) : '–'}</td>
                    <td className="zahlzelle">{r ? `${fmt(r.h, 1)} W/K` : '–'}</td>
                    <td className="zahlzelle">{e ? `${fmt(e.h, 1)} W/K` : '–'}</td>
                    <td className="zahlzelle">{r ? `${fmt(r.phi, 0)} W` : '–'}</td>
                    <td className="zahlzelle">{e ? `${fmt(e.phiHL, 0)} W` : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Abschnitt>
      )}
    </>
  )
}
