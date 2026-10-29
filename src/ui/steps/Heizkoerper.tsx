import { heizkoerperLeistungN } from '../../core/geometrie'
import { HEIZKOERPER_EXPONENT, HEIZKOERPER_LABEL } from '../../core/kataloge'
import { HEIZKOERPER_TYPEN, neueId, type Heizkoerper, type Raum } from '../../core/model'
import { useProjekt } from '../../store'
import { Abschnitt, Auswahl, fmt, Haken, Text, Zahl } from '../felder'

export function HeizkoerperSchritt() {
  const raeume = useProjekt((s) => s.projekt.raeume)
  const geschosse = useProjekt((s) => s.projekt.geschosse)
  if (raeume.length === 0) return <p className="leer">Zuerst Räume anlegen.</p>
  return (
    <>
      <p className="klein">
        Bestand aufnehmen: Typ und Maße vom Heizkörper, Normleistung Φ_N (75/65/20) aus Datenblatt oder Typenschild. Ventil-Hersteller und
        -Modell stehen meist auf dem Ventilkörper unter dem Thermostatkopf.
      </p>
      {geschosse.map((g) =>
        raeume
          .filter((r) => r.geschossId === g.id)
          .map((r) => <RaumHeizkoerper key={r.id} raum={r} geschoss={g.name} />),
      )}
    </>
  )
}

function RaumHeizkoerper({ raum, geschoss }: { raum: Raum; geschoss: string }) {
  const aendern = useProjekt((s) => s.aendern)
  const summe = heizkoerperLeistungN(raum)
  const updRaum = (rez: (r: Raum) => void) =>
    aendern((p) => {
      const r = p.raeume.find((x) => x.id === raum.id)
      if (r) rez(r)
    })
  const neu = () =>
    updRaum((r) =>
      r.heizkoerper.push({
        id: neueId(),
        bezeichnung: `HK ${r.heizkoerper.length + 1}`,
        typ: 'platte',
        bauart: '22',
        bauhoehe: 600,
        baulaenge: 1000,
        bautiefe: null,
        phiN: null,
        exponent: HEIZKOERPER_EXPONENT.platte,
        anzahl: 1,
        ventil: { hersteller: '', modell: '', voreinstellbar: true, aktuelleEinstellung: '', nennweite: '' },
        leitungslaenge: null,
      }),
    )

  return (
    <Abschnitt
      titel={`${geschoss} · ${raum.nummer} ${raum.name} (${raum.thetaInt} °C)`}
      aktion={
        <span className="knopfleiste">
          <span className="klein">Σ Φ_N: {summe === null ? 'unvollständig' : `${fmt(summe, 0)} W`}</span>
          <button onClick={neu}>+ Heizkörper</button>
        </span>
      }
    >
      {raum.heizkoerper.length === 0 ? (
        <p className="leer">Kein Heizkörper.</p>
      ) : (
        raum.heizkoerper.map((h) => <HeizkoerperKarte key={h.id} h={h} raumId={raum.id} />)
      )}
    </Abschnitt>
  )
}

function HeizkoerperKarte({ h, raumId }: { h: Heizkoerper; raumId: string }) {
  const aendern = useProjekt((s) => s.aendern)
  const upd = (rez: (x: Heizkoerper) => void) =>
    aendern((p) => {
      const z = p.raeume.find((r) => r.id === raumId)?.heizkoerper.find((y) => y.id === h.id)
      if (z) rez(z)
    })
  return (
    <div className="karte">
      <div className="raster">
        <Text label="Bezeichnung" wert={h.bezeichnung} onChange={(v) => upd((z) => void (z.bezeichnung = v))} />
        <Auswahl
          label="Typ"
          wert={h.typ}
          optionen={HEIZKOERPER_TYPEN}
          beschriftung={HEIZKOERPER_LABEL}
          onChange={(v) =>
            upd((z) => {
              z.typ = v
              z.exponent = HEIZKOERPER_EXPONENT[v]
            })
          }
        />
        <Text label="Bauart" platzhalter="z. B. 22, 33, 4-säulig" wert={h.bauart} onChange={(v) => upd((z) => void (z.bauart = v))} />
        <Zahl label="Bauhöhe" einheit="mm" optional wert={h.bauhoehe} onChange={(x) => upd((z) => void (z.bauhoehe = x))} />
        <Zahl label="Baulänge" einheit="mm" optional wert={h.baulaenge} onChange={(x) => upd((z) => void (z.baulaenge = x))} />
        <Zahl label="Bautiefe" einheit="mm" optional wert={h.bautiefe} onChange={(x) => upd((z) => void (z.bautiefe = x))} />
        <Zahl label="Normleistung Φ_N (75/65/20)" einheit="W" optional wert={h.phiN} onChange={(x) => upd((z) => void (z.phiN = x))} />
        <Zahl label="Exponent n" wert={h.exponent} onChange={(x) => upd((z) => void (z.exponent = x ?? 1.3))} />
        <Zahl label="Anzahl" wert={h.anzahl} onChange={(x) => upd((z) => void (z.anzahl = Math.max(1, Math.round(x ?? 1))))} />
        <Zahl
          label="Leitungslänge zum Erzeuger"
          einheit="m"
          optional
          hilfe="grob, einfache Strecke"
          wert={h.leitungslaenge}
          onChange={(x) => upd((z) => void (z.leitungslaenge = x))}
        />
      </div>
      <h4>Thermostatventil</h4>
      <div className="raster">
        <Text label="Hersteller" platzhalter="z. B. Heimeier, Danfoss, Oventrop" wert={h.ventil.hersteller} onChange={(v) => upd((z) => void (z.ventil.hersteller = v))} />
        <Text label="Modell" platzhalter="z. B. V-exact II, RA-N, AV9" wert={h.ventil.modell} onChange={(v) => upd((z) => void (z.ventil.modell = v))} />
        <Text label="Nennweite" platzhalter="DN10 / DN15" wert={h.ventil.nennweite} onChange={(v) => upd((z) => void (z.ventil.nennweite = v))} />
        <Text
          label="Aktuelle Einstellung"
          platzhalter="z. B. N, 4"
          wert={h.ventil.aktuelleEinstellung}
          onChange={(v) => upd((z) => void (z.ventil.aktuelleEinstellung = v))}
        />
        <Haken label="voreinstellbar" wert={h.ventil.voreinstellbar} onChange={(b) => upd((z) => void (z.ventil.voreinstellbar = b))} />
      </div>
      <button
        className="gefahr"
        onClick={() =>
          aendern((p) => {
            const r = p.raeume.find((x) => x.id === raumId)
            if (r) r.heizkoerper = r.heizkoerper.filter((y) => y.id !== h.id)
          })
        }
      >
        Heizkörper entfernen
      </button>
    </div>
  )
}
