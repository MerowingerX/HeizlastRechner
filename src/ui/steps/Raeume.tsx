import { useState } from 'react'
import { bruttoFlaeche, nettoFlaeche, oeffnungenSumme, raumVolumen } from '../../core/geometrie'
import { KATEGORIE_LABEL, NUTZUNG_INFO, ORIENTIERUNG_LABEL } from '../../core/kataloge'
import {
  neueId,
  NUTZUNGEN,
  OEFFNUNGS_KATEGORIEN,
  ORIENTIERUNGEN,
  type Angrenzung,
  type Flaeche,
  type Kategorie,
  type Projekt,
  type Raum,
} from '../../core/model'
import { useProjekt } from '../../store'
import { AngrenzungFeld } from '../AngrenzungFeld'
import { Abschnitt, Auswahl, fmt, Text, Zahl } from '../felder'

const ersteVon = (p: Projekt, k: Kategorie): string => p.bauteile.find((t) => t.kategorie === k)?.id ?? p.bauteile[0]?.id ?? ''

export function RaeumeSchritt({ raumId, setRaumId }: { raumId: string | null; setRaumId: (id: string | null) => void }) {
  const projekt = useProjekt((s) => s.projekt)
  const aendern = useProjekt((s) => s.aendern)
  const raum = projekt.raeume.find((r) => r.id === raumId) ?? null

  if (projekt.geschosse.length === 0) return <p className="leer">Zuerst ein Geschoss anlegen.</p>

  const neuerRaum = (geschossId: string) => {
    const id = neueId()
    aendern((p) => {
      const nr = p.raeume.filter((r) => r.geschossId === geschossId).length + 1
      p.raeume.push({
        id,
        geschossId,
        nummer: String(nr).padStart(2, '0'),
        name: 'Neuer Raum',
        nutzung: 'wohnen',
        thetaInt: NUTZUNG_INFO.wohnen.thetaInt,
        nMin: NUTZUNG_INFO.wohnen.nMin,
        grundflaeche: 0,
        lichteHoehe: null,
        flaechen: [],
        heizkoerper: [],
        lage: null,
      })
    })
    setRaumId(id)
  }

  const kopieren = (r: Raum) => {
    const id = neueId()
    aendern((p) => {
      const k = structuredClone(r)
      k.id = id
      k.name = `${r.name} (Kopie)`
      for (const f of k.flaechen) {
        f.id = neueId()
        for (const o of f.oeffnungen) o.id = neueId()
      }
      for (const h of k.heizkoerper) h.id = neueId()
      p.raeume.push(k)
    })
    setRaumId(id)
  }

  return (
    <div className="zweispaltig">
      <nav className="raumliste">
        {projekt.geschosse.map((g) => (
          <div key={g.id}>
            <h4>
              {g.name}
              <button className="mini" onClick={() => neuerRaum(g.id)}>
                + Raum
              </button>
            </h4>
            <ul>
              {projekt.raeume
                .filter((r) => r.geschossId === g.id)
                .map((r) => (
                  <li key={r.id}>
                    <button className={r.id === raumId ? 'aktiv' : ''} onClick={() => setRaumId(r.id)}>
                      <span>
                        {r.nummer} {r.name}
                      </span>
                      <small>
                        {fmt(r.grundflaeche, 1)} m² · {r.thetaInt} °C
                      </small>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      <div>
        {raum ? (
          <RaumEditor
            raum={raum}
            projekt={projekt}
            onKopieren={() => kopieren(raum)}
            onLoeschen={() => {
              if (!confirm(`Raum „${raum.name}" löschen?`)) return
              aendern((p) => {
                p.raeume = p.raeume.filter((r) => r.id !== raum.id)
                // Verweise anderer Räume auf diesen Raum lösen
                for (const r of p.raeume)
                  for (const f of r.flaechen)
                    if (f.angrenzung.art === 'raum' && f.angrenzung.raumId === raum.id)
                      f.angrenzung = { art: 'beheizt', bezeichnung: `${raum.name} (gelöscht)`, theta: raum.thetaInt }
              })
              setRaumId(null)
            }}
          />
        ) : (
          <p className="leer">Raum links auswählen oder anlegen.</p>
        )}
      </div>
    </div>
  )
}

function RaumEditor({ raum, projekt, onKopieren, onLoeschen }: { raum: Raum; projekt: Projekt; onKopieren: () => void; onLoeschen: () => void }) {
  const aendern = useProjekt((s) => s.aendern)
  const [offen, setOffen] = useState<string | null>(null)
  const g = projekt.geschosse.find((x) => x.id === raum.geschossId)
  const upd = (rez: (r: Raum) => void) =>
    aendern((p) => {
      const r = p.raeume.find((x) => x.id === raum.id)
      if (r) rez(r)
    })
  const neueFlaeche = (k: Kategorie, angrenzung: Angrenzung, flaecheDirekt: number | null) => {
    const id = neueId()
    upd((r) =>
      r.flaechen.push({
        id,
        bauteilId: ersteVon(projekt, k),
        orientierung: flaecheDirekt !== null ? 'H' : 'N',
        laenge: 0,
        hoehe: null,
        flaecheDirekt,
        angrenzung,
        oeffnungen: [],
      }),
    )
  }
  const flaechenBauteile = projekt.bauteile.filter((t) => !OEFFNUNGS_KATEGORIEN.includes(t.kategorie))
  const oeffnungsBauteile = projekt.bauteile.filter((t) => OEFFNUNGS_KATEGORIEN.includes(t.kategorie))
  const anderer = projekt.raeume.find((r) => r.id !== raum.id)

  return (
    <>
      <Abschnitt
        titel={`Raum ${raum.nummer} ${raum.name}`}
        aktion={
          <span className="knopfleiste">
            <button onClick={onKopieren}>Kopieren</button>
            <button className="gefahr" onClick={onLoeschen}>
              Löschen
            </button>
          </span>
        }
      >
        <div className="raster">
          <Text label="Nr." wert={raum.nummer} onChange={(v) => upd((r) => void (r.nummer = v))} />
          <Text label="Name" wert={raum.name} onChange={(v) => upd((r) => void (r.name = v))} />
          <Auswahl
            label="Geschoss"
            wert={raum.geschossId}
            optionen={projekt.geschosse.map((x) => ({ wert: x.id, text: x.name }))}
            onChange={(v) => upd((r) => void (r.geschossId = v))}
          />
          <Auswahl
            label="Nutzung"
            wert={raum.nutzung}
            optionen={NUTZUNGEN}
            beschriftung={Object.fromEntries(NUTZUNGEN.map((n) => [n, NUTZUNG_INFO[n].label])) as Record<(typeof NUTZUNGEN)[number], string>}
            hilfe="Setzt θ_int und n_min auf Vorschlagswerte."
            onChange={(v) =>
              upd((r) => {
                r.nutzung = v
                r.thetaInt = NUTZUNG_INFO[v].thetaInt
                r.nMin = NUTZUNG_INFO[v].nMin
              })
            }
          />
          <Zahl label="Norm-Innentemperatur θ_int" einheit="°C" wert={raum.thetaInt} onChange={(x) => upd((r) => void (r.thetaInt = x ?? 0))} />
          <Zahl label="Mindestluftwechsel n_min" einheit="1/h" wert={raum.nMin} onChange={(x) => upd((r) => void (r.nMin = x ?? 0))} />
          <Zahl label="Grundfläche (innen)" einheit="m²" wert={raum.grundflaeche} onChange={(x) => upd((r) => void (r.grundflaeche = x ?? 0))} />
          <Zahl
            label="Lichte Höhe"
            einheit="m"
            optional
            platzhalter={g ? `${String(g.lichteHoehe).replace('.', ',')} (Geschoss)` : ''}
            wert={raum.lichteHoehe}
            onChange={(x) => upd((r) => void (r.lichteHoehe = x))}
          />
        </div>
        <p className="klein">Raumvolumen: {fmt(raumVolumen(raum, g), 1)} m³</p>
      </Abschnitt>

      <Abschnitt
        titel="Umschließungsflächen"
        aktion={
          <span className="knopfleiste">
            <button onClick={() => neueFlaeche('AW', { art: 'aussen' }, null)}>+ Außenwand</button>
            <button
              disabled={!anderer}
              title={anderer ? '' : 'Erst weiteren Raum anlegen'}
              onClick={() => neueFlaeche('IW', { art: 'raum', raumId: anderer?.id ?? '' }, null)}
            >
              + Innenwand
            </button>
            <button onClick={() => neueFlaeche('FB', g?.unten ?? { art: 'erdreich' }, raum.grundflaeche)}>+ Fußboden</button>
            <button onClick={() => neueFlaeche(g?.oben.art === 'aussen' ? 'DA' : 'DE', g?.oben ?? { art: 'aussen' }, raum.grundflaeche)}>
              + Decke
            </button>
            <button onClick={() => neueFlaeche('DA', { art: 'aussen' }, null)}>+ Dachschräge</button>
          </span>
        }
      >
        <p className="klein">
          Wände: Länge (Außenmaß) × Höhe; Höhe leer = Geschosshöhe. Boden/Decke: Fläche direkt. Innenwände nur nötig, wenn der Nachbar eine
          andere Temperatur hat. Fenster/Türen über „Öffnungen" in der jeweiligen Wand.
        </p>
        {projekt.bauteile.length === 0 && <p className="warnung">Bauteilkatalog ist leer – erst Bauteile anlegen.</p>}
        {raum.flaechen.length === 0 ? (
          <p className="leer">Noch keine Flächen.</p>
        ) : (
          <table className="flaechen">
            <thead>
              <tr>
                <th>Bauteil</th>
                <th>Ausr.</th>
                <th>Länge [m]</th>
                <th>Höhe [m]</th>
                <th>Fläche direkt [m²]</th>
                <th>grenzt an</th>
                <th>brutto / netto</th>
                <th>Öffnungen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {raum.flaechen.map((f) => (
                <FlaechenZeilen
                  key={f.id}
                  f={f}
                  raum={raum}
                  projekt={projekt}
                  offen={offen === f.id}
                  umschalten={() => setOffen(offen === f.id ? null : f.id)}
                  flaechenBauteile={flaechenBauteile}
                  oeffnungsBauteile={oeffnungsBauteile}
                />
              ))}
            </tbody>
          </table>
        )}
      </Abschnitt>
    </>
  )
}

interface ZeilenProps {
  f: Flaeche
  raum: Raum
  projekt: Projekt
  offen: boolean
  umschalten: () => void
  flaechenBauteile: Projekt['bauteile']
  oeffnungsBauteile: Projekt['bauteile']
}

function FlaechenZeilen({ f, raum, projekt, offen, umschalten, flaechenBauteile, oeffnungsBauteile }: ZeilenProps) {
  const aendern = useProjekt((s) => s.aendern)
  const g = projekt.geschosse.find((x) => x.id === raum.geschossId)
  const upd = (rez: (x: Flaeche) => void) =>
    aendern((p) => {
      const z = p.raeume.find((r) => r.id === raum.id)?.flaechen.find((y) => y.id === f.id)
      if (z) rez(z)
    })
  const bauteilOptionen = flaechenBauteile.map((t) => ({ wert: t.id, text: `${t.kategorie} · ${t.name}` }))
  if (!flaechenBauteile.some((t) => t.id === f.bauteilId)) bauteilOptionen.unshift({ wert: f.bauteilId, text: '– bitte wählen –' })

  return (
    <>
      <tr>
        <td>
          <Auswahl wert={f.bauteilId} optionen={bauteilOptionen} onChange={(v) => upd((z) => void (z.bauteilId = v))} />
        </td>
        <td>
          <Auswahl wert={f.orientierung} optionen={ORIENTIERUNGEN} onChange={(v) => upd((z) => void (z.orientierung = v))} />
        </td>
        <td>
          <Zahl klein wert={f.laenge} onChange={(x) => upd((z) => void (z.laenge = x ?? 0))} />
        </td>
        <td>
          <Zahl
            klein
            optional
            platzhalter={g ? String(g.geschosshoehe).replace('.', ',') : ''}
            wert={f.hoehe}
            onChange={(x) => upd((z) => void (z.hoehe = x))}
          />
        </td>
        <td>
          <Zahl klein optional wert={f.flaecheDirekt} onChange={(x) => upd((z) => void (z.flaecheDirekt = x))} />
        </td>
        <td>
          <AngrenzungFeld wert={f.angrenzung} raeume={projekt.raeume} eigenerRaumId={raum.id} onChange={(a) => upd((z) => void (z.angrenzung = a))} />
        </td>
        <td className="zahlzelle">
          {fmt(bruttoFlaeche(f, g))} / {fmt(nettoFlaeche(f, g))}
        </td>
        <td>
          <button onClick={umschalten} title={ORIENTIERUNG_LABEL[f.orientierung]}>
            {f.oeffnungen.length} {offen ? '▲' : '▼'}
          </button>
        </td>
        <td>
          <button
            className="loeschen"
            title="Fläche löschen"
            onClick={() =>
              aendern((p) => {
                const r = p.raeume.find((x) => x.id === raum.id)
                if (r) r.flaechen = r.flaechen.filter((y) => y.id !== f.id)
              })
            }
          >
            ✕
          </button>
        </td>
      </tr>
      {offen && (
        <tr className="unterzeile">
          <td colSpan={9}>
            <div className="oeffnungen">
              <div className="knopfleiste">
                {(['FE', 'AT', 'IT', 'DF'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() =>
                      upd((z) =>
                        z.oeffnungen.push({
                          id: neueId(),
                          bauteilId: ersteVon(projekt, k),
                          bezeichnung: '',
                          breite: k === 'FE' || k === 'DF' ? 1.2 : 1.0,
                          hoehe: k === 'FE' || k === 'DF' ? 1.4 : 2.1,
                          anzahl: 1,
                        }),
                      )
                    }
                  >
                    + {KATEGORIE_LABEL[k]}
                  </button>
                ))}
                <span className="klein">Summe Öffnungen: {fmt(oeffnungenSumme(f))} m²</span>
              </div>
              {f.oeffnungen.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Bauteil</th>
                      <th>Bezeichnung</th>
                      <th>Breite [m]</th>
                      <th>Höhe [m]</th>
                      <th>Anzahl</th>
                      <th>Fläche</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {f.oeffnungen.map((o) => {
                      const updO = (rez: (x: typeof o) => void) =>
                        upd((z) => {
                          const y = z.oeffnungen.find((q) => q.id === o.id)
                          if (y) rez(y)
                        })
                      const opt = oeffnungsBauteile.map((t) => ({ wert: t.id, text: `${t.kategorie} · ${t.name}` }))
                      if (!oeffnungsBauteile.some((t) => t.id === o.bauteilId)) opt.unshift({ wert: o.bauteilId, text: '– bitte wählen –' })
                      return (
                        <tr key={o.id}>
                          <td>
                            <Auswahl wert={o.bauteilId} optionen={opt} onChange={(v) => updO((y) => void (y.bauteilId = v))} />
                          </td>
                          <td>
                            <Text wert={o.bezeichnung} onChange={(v) => updO((y) => void (y.bezeichnung = v))} />
                          </td>
                          <td>
                            <Zahl klein wert={o.breite} onChange={(x) => updO((y) => void (y.breite = x ?? 0))} />
                          </td>
                          <td>
                            <Zahl klein wert={o.hoehe} onChange={(x) => updO((y) => void (y.hoehe = x ?? 0))} />
                          </td>
                          <td>
                            <Zahl klein wert={o.anzahl} onChange={(x) => updO((y) => void (y.anzahl = Math.max(1, Math.round(x ?? 1))))} />
                          </td>
                          <td className="zahlzelle">{fmt(o.breite * o.hoehe * o.anzahl)} m²</td>
                          <td>
                            <button className="loeschen" onClick={() => upd((z) => void (z.oeffnungen = z.oeffnungen.filter((q) => q.id !== o.id)))}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
