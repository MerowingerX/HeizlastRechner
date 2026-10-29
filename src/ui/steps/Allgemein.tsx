import { ABSCHIRMUNG_LABEL, BAUALTER_INFO, GEBAEUDETYP_LABEL } from '../../core/kataloge'
import { KLIMA_DATEI, KLIMA_DATEI_HINWEIS, klimaDatenVorhanden, STANDARD_THETA_E, thetaEAusPlz } from '../../core/klima'
import { ABSCHIRMUNG, BAUALTER, GEBAEUDETYPEN } from '../../core/model'
import { useProjekt } from '../../store'
import { Abschnitt, Auswahl, Haken, Text, Zahl } from '../felder'

export function ProjektSchritt() {
  const m = useProjekt((s) => s.projekt.meta)
  const aendern = useProjekt((s) => s.aendern)
  const set = <K extends keyof typeof m>(k: K, v: (typeof m)[K]) => aendern((p) => void (p.meta[k] = v))
  return (
    <Abschnitt titel="Projekt">
      <div className="raster">
        <Text label="Projektname" wert={m.name} onChange={(v) => set('name', v)} />
        <Text label="Bauherr / Eigentümer" wert={m.bauherr} onChange={(v) => set('bauherr', v)} />
        <Text label="Straße, Nr." wert={m.strasse} onChange={(v) => set('strasse', v)} />
        <Text label="PLZ" wert={m.plz} onChange={(v) => set('plz', v)} />
        <Text label="Ort" wert={m.ort} onChange={(v) => set('ort', v)} />
        <Text label="Bearbeiter" wert={m.bearbeiter} onChange={(v) => set('bearbeiter', v)} />
        <Text label="Datum" wert={m.datum} onChange={(v) => set('datum', v)} />
        <Text label="Notiz" breit mehrzeilig wert={m.notiz} onChange={(v) => set('notiz', v)} />
      </div>
    </Abschnitt>
  )
}

export function KlimaSchritt() {
  const k = useProjekt((s) => s.projekt.klima)
  const plz = useProjekt((s) => s.projekt.meta.plz)
  const aendern = useProjekt((s) => s.aendern)
  const treffer = thetaEAusPlz(plz)
  return (
    <Abschnitt titel="Standort & Klima">
      {!klimaDatenVorhanden() && (
        <div className="warnung">
          <p>
            <b>⚠️ Klimadaten fehlen – kein θ_e-Vorschlag aus der PLZ.</b>
          </p>
          <p>
            Die Tabelle <code>{KLIMA_DATEI}</code> ist aus Lizenzgründen nicht im Repo. Einmal im Projektordner ausführen und die App
            neu starten:
          </p>
          <pre>{KLIMA_DATEI_HINWEIS}</pre>
          <p>Ohne die Datei gilt der Standardwert θ_e = {STANDARD_THETA_E} °C (Region Braunschweig). Für andere Orte unten von Hand eintragen (ortsgenauer Wert aus DIN/TS 12831-1).</p>
        </div>
      )}
      <p className="info">
        PLZ aus Projekt: <b>{plz || '–'}</b>
        {treffer ? (
          <>
            {' '}
            → Klimaregion {treffer.referenzort}: θ_e = {treffer.thetaE} °C{' '}
            <button
              onClick={() =>
                aendern((p) => {
                  p.klima.thetaE = treffer.thetaE
                  p.klima.referenzort = treffer.referenzort
                  p.klima.thetaEQuelle = 'plz'
                })
              }
            >
              übernehmen
            </button>
          </>
        ) : (
          ' → keine Klimaregion gefunden, Wert bitte manuell eintragen.'
        )}
      </p>
      <div className="raster">
        <Zahl
          label="Norm-Außentemperatur θ_e"
          einheit="°C"
          optional
          wert={k.thetaE}
          hilfe="Ortsgenauer Wert laut DIN/TS 12831-1 ist genauer als der PLZ-Vorschlag."
          onChange={(x) =>
            aendern((p) => {
              p.klima.thetaE = x
              p.klima.thetaEQuelle = 'manuell'
            })
          }
        />
        <Text label="Referenzort" wert={k.referenzort} onChange={(v) => aendern((p) => void (p.klima.referenzort = v))} />
        <Zahl
          label="Jahresmitteltemperatur θ_m,e"
          einheit="°C"
          optional
          wert={k.thetaMe}
          hilfe="Für Bauteile gegen Erdreich. In Deutschland meist 8–10 °C (DWD)."
          onChange={(x) => aendern((p) => void (p.klima.thetaMe = x))}
        />
      </div>
      <p className="klein">Quelle θ_e: {k.thetaEQuelle === 'plz' ? 'PLZ-Klimaregion' : 'manuell'}</p>
    </Abschnitt>
  )
}

export function GebaeudeSchritt() {
  const g = useProjekt((s) => s.projekt.gebaeude)
  const aendern = useProjekt((s) => s.aendern)
  const set = <K extends keyof typeof g>(k: K, v: (typeof g)[K]) => aendern((p) => void (p.gebaeude[k] = v))
  const n50Vorschlag = BAUALTER_INFO[g.baualter].n50
  return (
    <Abschnitt titel="Gebäude">
      <div className="raster">
        <Auswahl label="Gebäudetyp" wert={g.typ} optionen={GEBAEUDETYPEN} beschriftung={GEBAEUDETYP_LABEL} onChange={(v) => set('typ', v)} />
        <Zahl label="Baujahr" optional wert={g.baujahr} onChange={(x) => set('baujahr', x === null ? null : Math.round(x))} />
        <Auswahl
          label="Baualtersklasse / Standard"
          wert={g.baualter}
          optionen={BAUALTER}
          beschriftung={Object.fromEntries(BAUALTER.map((b) => [b, BAUALTER_INFO[b].label])) as Record<(typeof BAUALTER)[number], string>}
          hilfe="Bestimmt Vorschläge für U-Werte und Luftdichtheit."
          onChange={(v) =>
            aendern((p) => {
              p.gebaeude.baualter = v
              if (!p.gebaeude.n50Gemessen) p.gebaeude.n50 = BAUALTER_INFO[v].n50
            })
          }
        />
        <Auswahl label="Windabschirmung" wert={g.abschirmung} optionen={ABSCHIRMUNG} beschriftung={ABSCHIRMUNG_LABEL} onChange={(v) => set('abschirmung', v)} />
        <Zahl
          label="Beheizte Wohnfläche"
          einheit="m²"
          optional
          platzhalter="Summe der Räume"
          wert={g.wohnflaeche}
          hilfe="für W/m² und Warmwasseranteil im Verbrauchsabgleich"
          onChange={(x) => set('wohnflaeche', x)}
        />
      </div>

      <h4>Luftdichtheit</h4>
      <div className="raster">
        <Zahl
          label="n50"
          einheit="1/h"
          optional
          wert={g.n50}
          hilfe={`Luftwechsel bei 50 Pa. Ohne Blower-Door-Test Schätzwert für Baualter: ${String(n50Vorschlag).replace('.', ',')} 1/h.`}
          onChange={(x) => set('n50', x)}
        />
        <Haken label="aus Blower-Door-Messung" wert={g.n50Gemessen} onChange={(b) => set('n50Gemessen', b)} />
        {g.n50 === null && <button onClick={() => set('n50', n50Vorschlag)}>Schätzwert {String(n50Vorschlag).replace('.', ',')} übernehmen</button>}
      </div>

      <h4>Lüftung</h4>
      <div className="raster">
        <Haken label="Lüftungsanlage vorhanden" wert={g.lueftungsanlage} onChange={(b) => set('lueftungsanlage', b)} />
        {g.lueftungsanlage && (
          <Zahl
            label="Wärmerückgewinnungsgrad η"
            optional
            wert={g.wrgEta}
            hilfe="0 … 1, z. B. 0,8 für 80 %"
            onChange={(x) => set('wrgEta', x)}
          />
        )}
      </div>
    </Abschnitt>
  )
}
