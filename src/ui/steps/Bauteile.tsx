import { Fragment, useState } from 'react'
import { BAUALTER_INFO, KATEGORIE_LABEL, standardBauteile } from '../../core/kataloge'
import { KATEGORIEN, neueId, type Bauteil, type Projekt } from '../../core/model'
import { MATERIALIEN, uAusSchichten, uebergang } from '../../core/uwert'
import { useProjekt } from '../../store'
import { Abschnitt, Auswahl, fmt, Text, Zahl } from '../felder'

/** Wie oft wird ein Bauteil in Flächen und Öffnungen verwendet? */
function verwendungen(p: Projekt, id: string): number {
  let n = 0
  for (const r of p.raeume)
    for (const f of r.flaechen) {
      if (f.bauteilId === id) n++
      for (const o of f.oeffnungen) if (o.bauteilId === id) n++
    }
  return n
}

export function BauteileSchritt() {
  const projekt = useProjekt((s) => s.projekt)
  const aendern = useProjekt((s) => s.aendern)
  const baualter = projekt.gebaeude.baualter
  const [offen, setOffen] = useState<string | null>(null)

  return (
    <Abschnitt
      titel="Bauteilkatalog"
      aktion={
        <span className="knopfleiste">
          <button
            onClick={() => {
              if (projekt.bauteile.length > 0 && !confirm('Vorschlagskatalog zusätzlich zu den vorhandenen Bauteilen anlegen?')) return
              aendern((p) => void p.bauteile.push(...standardBauteile(baualter)))
            }}
          >
            Vorschläge für „{BAUALTER_INFO[baualter].label}" laden
          </button>
          <button
            onClick={() =>
              aendern((p) => void p.bauteile.push({ id: neueId(), kategorie: 'AW', name: 'Neues Bauteil', u: 1, deltaUTb: 0.1, notiz: '', schichten: [] }))
            }
          >
            + Bauteil
          </button>
        </span>
      }
    >
      <p className="klein">
        Jedes Bauteil mit U-Wert und Wärmebrückenzuschlag ΔU_TB. Außenbauteile ohne Nachweis: ΔU_TB = 0,10 W/(m²K). Innenbauteile: 0.
      </p>
      {projekt.bauteile.length === 0 ? (
        <p className="leer">Noch keine Bauteile. Am schnellsten: Vorschläge für das Baualter laden und dann anpassen.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Kategorie</th>
              <th>Bezeichnung</th>
              <th>U [W/(m²K)]</th>
              <th>ΔU_TB</th>
              <th>Notiz</th>
              <th>verwendet</th>
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {projekt.bauteile.map((t) => {
              const upd = (rez: (x: typeof t) => void) =>
                aendern((p) => {
                  const z = p.bauteile.find((y) => y.id === t.id)
                  if (z) rez(z)
                })
              const n = verwendungen(projekt, t.id)
              return (
                <Fragment key={t.id}>
                <tr>
                  <td>
                    <Auswahl wert={t.kategorie} optionen={KATEGORIEN} beschriftung={KATEGORIE_LABEL} onChange={(v) => upd((z) => void (z.kategorie = v))} />
                  </td>
                  <td>
                    <Text wert={t.name} onChange={(v) => upd((z) => void (z.name = v))} />
                  </td>
                  <td>
                    <Zahl klein wert={t.u} onChange={(x) => upd((z) => void (z.u = x ?? 0))} />
                  </td>
                  <td>
                    <Zahl klein wert={t.deltaUTb} onChange={(x) => upd((z) => void (z.deltaUTb = x ?? 0))} />
                  </td>
                  <td>
                    <Text wert={t.notiz} onChange={(v) => upd((z) => void (z.notiz = v))} />
                  </td>
                  <td className="zahlzelle">{n}×</td>
                  <td>
                    <button className="mini" title="U-Wert aus Schichtaufbau" onClick={() => setOffen(offen === t.id ? null : t.id)}>
                      Aufbau{t.schichten.length ? ` (${t.schichten.length})` : ''}
                    </button>
                  </td>
                  <td>
                    <button
                      className="loeschen"
                      title={n > 0 ? 'Wird noch verwendet' : 'Löschen'}
                      disabled={n > 0}
                      onClick={() => aendern((p) => void (p.bauteile = p.bauteile.filter((y) => y.id !== t.id)))}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                {offen === t.id && (
                  <tr className="unterzeile">
                    <td colSpan={8}>
                      <Schichtaufbau t={t} upd={upd} />
                    </td>
                  </tr>
                )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </Abschnitt>
  )
}

function Schichtaufbau({ t, upd }: { t: Bauteil; upd: (rez: (x: Bauteil) => void) => void }) {
  const u = uAusSchichten(t)
  const { rsi, rse } = uebergang(t.kategorie)
  return (
    <div className="oeffnungen">
      <p className="klein">
        Schichten von innen nach außen (DIN EN ISO 6946). R_si = {fmt(rsi)} · R_se = {fmt(rse)} m²K/W. Hinterlüftete Schichten (Dachziegel,
        Vorhangfassade) weglassen.
      </p>
      {t.schichten.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Dicke [cm]</th>
              <th>λ [W/(mK)]</th>
              <th>R [m²K/W]</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {t.schichten.map((s, i) => (
              <tr key={i}>
                <td>
                  <select
                    value={MATERIALIEN.some((m) => m.name === s.material) ? s.material : ''}
                    onChange={(e) => {
                      const m = MATERIALIEN.find((x) => x.name === e.target.value)
                      if (m) upd((z) => void (z.schichten[i] = { ...z.schichten[i], material: m.name, lambda: m.lambda }))
                    }}
                  >
                    <option value="">{s.material || 'Material wählen…'}</option>
                    {MATERIALIEN.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} (λ {String(m.lambda).replace('.', ',')})
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <Zahl klein wert={Math.round(s.dicke * 1000) / 10} onChange={(x) => upd((z) => void (z.schichten[i].dicke = (x ?? 0) / 100))} />
                </td>
                <td>
                  <Zahl klein wert={s.lambda} onChange={(x) => upd((z) => void (z.schichten[i].lambda = x ?? 0))} />
                </td>
                <td className="zahlzelle">{s.lambda > 0 ? fmt(s.dicke / s.lambda, 3) : '–'}</td>
                <td>
                  <button className="loeschen" onClick={() => upd((z) => void z.schichten.splice(i, 1))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="knopfleiste">
        <button onClick={() => upd((z) => void z.schichten.push({ material: '', dicke: 0.1, lambda: 0.04 }))}>+ Schicht</button>
        {u !== null && (
          <>
            <span>
              U = <b>{fmt(u, 3)}</b> W/(m²K)
            </span>
            <button
              className="primaer"
              onClick={() =>
                upd((z) => {
                  z.u = Math.round(u * 1000) / 1000
                  z.notiz = 'aus Schichtaufbau'
                })
              }
            >
              U-Wert übernehmen
            </button>
          </>
        )}
      </div>
    </div>
  )
}
