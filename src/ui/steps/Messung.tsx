import { useMemo, useState } from 'react'
import { berechne } from '../../core/berechnung'
import { C_SPEZ, fuehreZusammen, parseZeitreihe, werteMessungAus, type ZeitWert } from '../../core/messung'
import { neueId, type Messreihe } from '../../core/model'
import { useProjekt } from '../../store'
import { Diagramm } from '../Diagramm'
import { Abschnitt, Auswahl, fmt, Text, Zahl } from '../felder'

type Quelle = 'innen' | 'aussen' | 'vl' | 'rl'

export function MessungSchritt() {
  const p = useProjekt((s) => s.projekt)
  const aendern = useProjekt((s) => s.aendern)
  const [neu, setNeu] = useState(false)
  return (
    <>
      <Abschnitt titel="So geht der Auskühlversuch">
        <ol className="anleitung">
          <li>Raum wählen, Heizkörper aus, Türen und Fenster zu, möglichst nachts (keine Sonne) und bei kalter Witterung (θ_innen − θ_außen ≥ 10 K).</li>
          <li>Temperatursensor (z. B. Tuya/Zigbee) in Raummitte auf ca. 1 m Höhe, nicht an der Außenwand. Außentemperatur mit zweitem Sensor (Nordseite, Schatten) oder Wetterdaten.</li>
          <li>
            <b>Besser mit Heizphase:</b> vorher einige Stunden mit konstantem Vorlauf heizen und zwei Rohranlegefühler an Vor- und Rücklauf des Heizkörpers
            setzen. Dann rechnet die App die Heizleistung aus den Heizkörperdaten und bestimmt H <i>und</i> Speicherkapazität C ohne Schätzung.
          </li>
          <li>Mindestens 6–12 h aufzeichnen, Daten als CSV exportieren (Smart-Life-App, Home Assistant „History → Download") und hier importieren.</li>
          <li>Nachbarräume sollten normal beheizt sein; die Messung erfasst dann Außen- und Innenverluste so, wie der Raum sie tatsächlich hat.</li>
        </ol>
      </Abschnitt>
      {p.messreihen.map((m) => (
        <MessreiheKarte key={m.id} m={m} />
      ))}
      {neu ? (
        <NeueMessung fertig={() => setNeu(false)} />
      ) : (
        <button onClick={() => setNeu(true)} disabled={p.raeume.length === 0}>
          + Messreihe importieren
        </button>
      )}
      {p.messreihen.length === 0 && !neu && <p className="leer">Noch keine Messungen.</p>}
      <p className="klein">
        Bauweise für die Schätzung von C: {p.gebaeude.bauweise} ({fmt(C_SPEZ[p.gebaeude.bauweise], 1)} Wh/(m²K)).{' '}
        <Auswahl
          wert={p.gebaeude.bauweise}
          optionen={['leicht', 'mittel', 'schwer'] as const}
          beschriftung={{ leicht: 'leicht (Holz, Trockenbau)', mittel: 'mittel (Mauerwerk, Holzbalkendecken)', schwer: 'schwer (Beton, massiv)' }}
          onChange={(b) => aendern((q) => void (q.gebaeude.bauweise = b))}
        />
      </p>
    </>
  )
}

function NeueMessung({ fertig }: { fertig: () => void }) {
  const p = useProjekt((s) => s.projekt)
  const aendern = useProjekt((s) => s.aendern)
  const [name, setName] = useState(`Messung ${new Date().toLocaleDateString('de-DE')}`)
  const [raumId, setRaumId] = useState(p.raeume[0]?.id ?? '')
  const [reihen, setReihen] = useState<Partial<Record<Quelle, ZeitWert[]>>>({})
  const [aussenKonstant, setAussenKonstant] = useState<number | null>(null)
  const [meldung, setMeldung] = useState('')

  const datei = (q: Quelle) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = parseZeitreihe(await f.text())
    setReihen((x) => ({ ...x, [q]: r }))
    setMeldung(r.length ? `${f.name}: ${r.length} Werte` : `${f.name}: keine Zeit/Wert-Spalten erkannt`)
  }

  const uebernehmen = () => {
    const innen = reihen.innen ?? []
    const aussen = reihen.aussen ?? (aussenKonstant !== null && innen.length ? [{ t: innen[0].t, wert: aussenKonstant }, { t: innen[innen.length - 1].t, wert: aussenKonstant }] : [])
    const punkte = fuehreZusammen(innen, aussen, reihen.vl, reihen.rl)
    if (punkte.length < 6) {
      setMeldung('Zu wenige gemeinsame Messpunkte (Zeiträume von innen und außen müssen sich überlappen).')
      return
    }
    aendern((q) => void q.messreihen.push({ id: neueId(), raumId, name, punkte, von: null, bis: null, notiz: '' }))
    fertig()
  }

  return (
    <Abschnitt titel="Messreihe importieren">
      <div className="raster">
        <Text label="Name" wert={name} onChange={setName} />
        <Auswahl label="Raum" wert={raumId} optionen={p.raeume.map((r) => ({ wert: r.id, text: r.name }))} onChange={setRaumId} />
      </div>
      <div className="raster">
        {(
          [
            ['innen', 'Innentemperatur (CSV, Pflicht)'],
            ['aussen', 'Außentemperatur (CSV)'],
            ['vl', 'Heizkörper-Vorlauf (CSV, optional)'],
            ['rl', 'Heizkörper-Rücklauf (CSV, optional)'],
          ] as [Quelle, string][]
        ).map(([q, t]) => (
          <div className="feld" key={q}>
            <label>{t}</label>
            <input type="file" accept=".csv,text/csv,text/plain" onChange={datei(q)} />
            {reihen[q] && <small className="hilfe">{reihen[q]?.length} Werte</small>}
          </div>
        ))}
        {!reihen.aussen && <Zahl label="… oder Außentemperatur konstant" einheit="°C" optional wert={aussenKonstant} onChange={setAussenKonstant} />}
      </div>
      {meldung && <p className="klein">{meldung}</p>}
      <span className="knopfleiste">
        <button className="primaer" disabled={!reihen.innen || (!reihen.aussen && aussenKonstant === null)} onClick={uebernehmen}>
          Übernehmen
        </button>
        <button onClick={fertig}>Abbrechen</button>
      </span>
    </Abschnitt>
  )
}

const zuLokal = (iso: string | null) => (iso ? new Date(iso).toLocaleString('sv-SE').slice(0, 16).replace(' ', 'T') : '')

function MessreiheKarte({ m }: { m: Messreihe }) {
  const p = useProjekt((s) => s.projekt)
  const aendern = useProjekt((s) => s.aendern)
  const raum = p.raeume.find((r) => r.id === m.raumId)
  const auswertung = useMemo(() => werteMessungAus(p, m), [p, m])
  const norm = useMemo(() => {
    try {
      return berechne(p).raeume.find((r) => r.raumId === m.raumId) ?? null
    } catch {
      return null
    }
  }, [p, m.raumId])
  const upd = (rez: (x: Messreihe) => void) =>
    aendern((q) => {
      const z = q.messreihen.find((y) => y.id === m.id)
      if (z) rez(z)
    })
  const pkt = m.punkte.map((x) => ({ ...x, ms: Date.parse(x.t) }))
  const serien = [
    { name: 'innen', farbe: 'var(--akzent)', punkte: pkt.map((x) => ({ x: x.ms, y: x.innen })) },
    { name: 'außen', farbe: '#2563eb', punkte: pkt.map((x) => ({ x: x.ms, y: x.aussen })) },
  ]
  if (pkt.some((x) => x.vl !== null)) serien.push({ name: 'HK-Vorlauf', farbe: '#dc2626', punkte: pkt.filter((x) => x.vl !== null).map((x) => ({ x: x.ms, y: x.vl as number })) })
  if (pkt.some((x) => x.rl !== null)) serien.push({ name: 'HK-Rücklauf', farbe: '#9333ea', punkte: pkt.filter((x) => x.rl !== null).map((x) => ({ x: x.ms, y: x.rl as number })) })

  return (
    <Abschnitt
      titel={`${m.name} – ${raum?.name ?? '?'}`}
      aktion={
        <button className="gefahr" onClick={() => confirm('Messreihe löschen?') && aendern((q) => void (q.messreihen = q.messreihen.filter((y) => y.id !== m.id)))}>
          Löschen
        </button>
      }
    >
      <Diagramm
        zeitachse
        xTitel="Zeit"
        yTitel="°C"
        serien={serien}
        bereich={m.von || m.bis ? { von: m.von ? Date.parse(m.von) : -Infinity, bis: m.bis ? Date.parse(m.bis) : Infinity } : null}
      />
      <div className="raster">
        <div className="feld">
          <label>Auswertung von</label>
          <input type="datetime-local" value={zuLokal(m.von)} onChange={(e) => upd((z) => void (z.von = e.target.value ? new Date(e.target.value).toISOString() : null))} />
        </div>
        <div className="feld">
          <label>bis</label>
          <input type="datetime-local" value={zuLokal(m.bis)} onChange={(e) => upd((z) => void (z.bis = e.target.value ? new Date(e.target.value).toISOString() : null))} />
        </div>
        <Text label="Notiz" wert={m.notiz} onChange={(v) => upd((z) => void (z.notiz = v))} />
      </div>
      {auswertung ? (
        <>
          <dl className="kennzahlen">
            <div>
              <dt>Zeitkonstante τ</dt>
              <dd>{fmt(auswertung.tau, 1)} h</dd>
            </div>
            <div>
              <dt>Speicherkapazität C</dt>
              <dd>
                {fmt(auswertung.c, 0)} Wh/K{auswertung.cAusBauweise ? '*' : ''}
              </dd>
            </div>
            <div>
              <dt>H gemessen</dt>
              <dd>{fmt(auswertung.h, 1)} W/K</dd>
            </div>
            <div>
              <dt>H Norm</dt>
              <dd>{norm ? `${fmt(norm.h, 1)} W/K` : '–'}</dd>
            </div>
            <div>
              <dt>Φ bei θ_e gemessen</dt>
              <dd>{fmt(auswertung.phi, 0)} W</dd>
            </div>
            <div>
              <dt>Φ_HL Norm</dt>
              <dd>{norm ? `${fmt(norm.phiHL, 0)} W` : '–'}</dd>
            </div>
            <div>
              <dt>R²</dt>
              <dd>{fmt(auswertung.r2, 2)}</dd>
            </div>
          </dl>
          <p className="klein">
            {auswertung.punkte} Punkte über {fmt(auswertung.dauerH, 1)} h. {auswertung.cAusBauweise ? '* C aus Bauweise geschätzt. ' : ''}
            {auswertung.hinweis}
          </p>
        </>
      ) : (
        <p className="warnung">Nicht auswertbar – zu wenige Punkte im Fenster oder kein Abkühlen erkennbar.</p>
      )}
    </Abschnitt>
  )
}
