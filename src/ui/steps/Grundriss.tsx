/**
 * Grundriss-Editor: Räume als Rechtecke je Geschoss (Ursprung NW-Ecke,
 * x nach Osten, y nach Süden, Meter). Ziehen = verschieben, Ecke = Größe.
 */
import { useMemo, useRef, useState } from 'react'
import { berechne } from '../../core/berechnung'
import { neueId, type Orientierung, type Projekt, type Raum } from '../../core/model'
import { useProjekt } from '../../store'
import { Abschnitt, Auswahl, fmt, Zahl } from '../felder'

type Lage = NonNullable<Raum['lage']>
const M = 50 // px je m
const RASTER = 0.05

const rund = (x: number) => Math.round(x / RASTER) * RASTER

/** Farbe nach spezifischer Heizlast: 40 W/m² grün → 160 W/m² rot */
export function waermeFarbe(wProM2: number | undefined): string {
  if (wProM2 === undefined) return 'hsl(220 10% 60%)'
  const t = Math.min(Math.max((wProM2 - 40) / 120, 0), 1)
  return `hsl(${120 - t * 120} 70% 50%)`
}

/** Rechteck für Räume ohne Lage: zeilenweise rechts an den zuletzt platzierten Raum anhängen. */
export function autoLage(raeume: Raum[], r: Raum): Lage {
  const belegt = raeume.filter((x) => x.lage && x.id !== r.id).map((x) => x.lage as Lage)
  const flaeche = r.grundflaeche > 0 ? r.grundflaeche : 9
  const breite = rund(Math.max(Math.sqrt(flaeche), 1.5))
  const tiefe = rund(flaeche / breite)
  const letzte = belegt.at(-1)
  if (!letzte) return { x: 0, y: 0, breite, tiefe }
  if (letzte.x + letzte.breite + 0.5 + breite <= 16) return { x: rund(letzte.x + letzte.breite + 0.5), y: letzte.y, breite, tiefe }
  const unten = belegt.reduce((m, l) => Math.max(m, l.y + l.tiefe), 0)
  return { x: 0, y: rund(unten + 0.5), breite, tiefe }
}

/** Kanten des Raums, die auf dem Umriss des Geschosses liegen → Außenwand-Vorschläge. */
export function aussenKanten(raeume: Raum[], r: Raum): { orientierung: Orientierung; laenge: number }[] {
  if (!r.lage) return []
  const ls = raeume.filter((x) => x.lage).map((x) => x.lage as Lage)
  const minX = Math.min(...ls.map((l) => l.x))
  const minY = Math.min(...ls.map((l) => l.y))
  const maxX = Math.max(...ls.map((l) => l.x + l.breite))
  const maxY = Math.max(...ls.map((l) => l.y + l.tiefe))
  const l = r.lage
  const eps = 0.15
  const out: { orientierung: Orientierung; laenge: number }[] = []
  if (Math.abs(l.y - minY) < eps) out.push({ orientierung: 'N', laenge: l.breite })
  if (Math.abs(l.y + l.tiefe - maxY) < eps) out.push({ orientierung: 'S', laenge: l.breite })
  if (Math.abs(l.x - minX) < eps) out.push({ orientierung: 'W', laenge: l.tiefe })
  if (Math.abs(l.x + l.breite - maxX) < eps) out.push({ orientierung: 'O', laenge: l.tiefe })
  return out
}

export function GrundrissSchritt() {
  const p = useProjekt((s) => s.projekt)
  const aendern = useProjekt((s) => s.aendern)
  const [geschossId, setGeschossId] = useState(p.geschosse[0]?.id ?? '')
  const [auswahl, setAuswahl] = useState<string | null>(null)
  const [zug, setZug] = useState<{ id: string; modus: 'move' | 'size'; start: { x: number; y: number }; lage: Lage; jetzt: Lage } | null>(null)
  const svg = useRef<SVGSVGElement>(null)

  const last = useMemo(() => {
    try {
      return new Map(berechne(p).raeume.map((r) => [r.raumId, r]))
    } catch {
      return new Map()
    }
  }, [p])

  if (p.geschosse.length === 0) return <p className="leer">Zuerst Geschosse und Räume anlegen.</p>
  const g = p.geschosse.find((x) => x.id === geschossId) ?? p.geschosse[0]
  const raeume = p.raeume.filter((r) => r.geschossId === g.id)
  const idx = p.geschosse.indexOf(g)
  const darunter = idx > 0 ? p.raeume.filter((r) => r.geschossId === p.geschosse[idx - 1].id && r.lage) : []
  const ohneLage = raeume.filter((r) => !r.lage)
  const lageVon = (r: Raum): Lage | null => (zug?.id === r.id ? zug.jetzt : r.lage)

  const alle = [...raeume, ...darunter].map(lageVon).filter((l): l is Lage => l !== null)
  const breite = Math.max(12, ...alle.map((l) => l.x + l.breite + 2))
  const tiefe = Math.max(10, ...alle.map((l) => l.y + l.tiefe + 2))

  const svgPunkt = (e: React.PointerEvent) => {
    const ctm = svg.current?.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: pt.x / M, y: pt.y / M }
  }
  const setLage = (id: string, l: Lage | null) =>
    aendern((q) => {
      const r = q.raeume.find((x) => x.id === id)
      if (r) r.lage = l
    })

  const start = (e: React.PointerEvent, r: Raum, modus: 'move' | 'size') => {
    if (!r.lage) return
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    setAuswahl(r.id)
    setZug({ id: r.id, modus, start: svgPunkt(e), lage: r.lage, jetzt: r.lage })
  }
  const bewegen = (e: React.PointerEvent) => {
    if (!zug) return
    const pt = svgPunkt(e)
    const dx = pt.x - zug.start.x
    const dy = pt.y - zug.start.y
    const l = zug.lage
    const jetzt =
      zug.modus === 'move'
        ? { ...l, x: Math.max(rund(l.x + dx), 0), y: Math.max(rund(l.y + dy), 0) }
        : { ...l, breite: Math.max(rund(l.breite + dx), 0.5), tiefe: Math.max(rund(l.tiefe + dy), 0.5) }
    setZug({ ...zug, jetzt })
  }
  const ende = () => {
    if (zug) setLage(zug.id, zug.jetzt)
    setZug(null)
  }

  const gewaehlt = raeume.find((r) => r.id === auswahl) ?? null

  return (
    <>
      <Abschnitt
        titel="Grundriss"
        aktion={
          <span className="knopfleiste">
            <Auswahl wert={g.id} optionen={p.geschosse.map((x) => ({ wert: x.id, text: x.name }))} onChange={(v) => { setGeschossId(v); setAuswahl(null) }} />
            {ohneLage.length > 0 && (
              <button
                onClick={() =>
                  aendern((q) => {
                    for (const r of q.raeume.filter((x) => x.geschossId === g.id && !x.lage)) r.lage = autoLage(q.raeume.filter((x) => x.geschossId === g.id), r)
                  })
                }
              >
                {ohneLage.length} Räume platzieren
              </button>
            )}
          </span>
        }
      >
        <p className="klein">
          Norden ist oben. Raum ziehen = verschieben, Ecke unten rechts = Größe (Raster 5 cm, Innenmaße). Farbe = Heizlast je m² (grün 40 → rot 160 W/m²).
          {darunter.length > 0 && ' Gestrichelt: Geschoss darunter.'}
        </p>
        <div className="grundriss-rahmen">
          <svg
            ref={svg}
            className="grundriss"
            width={breite * M}
            height={tiefe * M}
            viewBox={`0 0 ${breite * M} ${tiefe * M}`}
            onPointerMove={bewegen}
            onPointerUp={ende}
            onPointerDown={() => setAuswahl(null)}
          >
            <defs>
              <pattern id="raster" width={M} height={M} patternUnits="userSpaceOnUse">
                <path d={`M ${M} 0 L 0 0 0 ${M}`} className="raster-linie" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#raster)" />
            <g transform={`translate(${breite * M - 30} 34)`} className="nordpfeil">
              <path d="M0 -22 L8 6 L0 0 L-8 6 Z" />
              <text y="22" textAnchor="middle">
                N
              </text>
            </g>
            {darunter.map((r) => {
              const l = r.lage as Lage
              return <rect key={r.id} x={l.x * M} y={l.y * M} width={l.breite * M} height={l.tiefe * M} className="geist" />
            })}
            {raeume.map((r) => {
              const l = lageVon(r)
              if (!l) return null
              const e = last.get(r.id)
              return (
                <g key={r.id} className={r.id === auswahl ? 'raum aktiv' : 'raum'}>
                  <rect
                    x={l.x * M}
                    y={l.y * M}
                    width={l.breite * M}
                    height={l.tiefe * M}
                    fill={waermeFarbe(e?.wProM2)}
                    onPointerDown={(ev) => start(ev, r, 'move')}
                  />
                  <text x={(l.x + l.breite / 2) * M} y={(l.y + l.tiefe / 2) * M - 6} textAnchor="middle">
                    {r.name}
                  </text>
                  <text x={(l.x + l.breite / 2) * M} y={(l.y + l.tiefe / 2) * M + 10} textAnchor="middle" className="klein">
                    {fmt(l.breite * l.tiefe, 1)} m² · {e ? `${fmt(e.phiHL, 0)} W` : ''}
                  </text>
                  <rect x={(l.x + l.breite) * M - 10} y={(l.y + l.tiefe) * M - 10} width={10} height={10} className="griff" onPointerDown={(ev) => start(ev, r, 'size')} />
                </g>
              )
            })}
          </svg>
        </div>
      </Abschnitt>

      {gewaehlt && <RaumLage raum={gewaehlt} p={p} raeume={raeume} />}
    </>
  )
}

function RaumLage({ raum, p, raeume }: { raum: Raum; p: Projekt; raeume: Raum[] }) {
  const aendern = useProjekt((s) => s.aendern)
  const l = raum.lage
  if (!l) return null
  const set = (k: keyof Lage, v: number | null) =>
    aendern((q) => {
      const r = q.raeume.find((x) => x.id === raum.id)
      if (r?.lage) r.lage[k] = v ?? 0
    })
  const kanten = aussenKanten(raeume, raum)
  const aw = p.bauteile.find((t) => t.kategorie === 'AW')
  const vorhanden = new Set(raum.flaechen.filter((f) => f.angrenzung.art === 'aussen').map((f) => f.orientierung))
  const neu = kanten.filter((k) => !vorhanden.has(k.orientierung))
  return (
    <Abschnitt titel={`Lage: ${raum.name}`}>
      <div className="raster">
        <Zahl label="x (von West)" einheit="m" wert={l.x} onChange={(v) => set('x', v)} />
        <Zahl label="y (von Nord)" einheit="m" wert={l.y} onChange={(v) => set('y', v)} />
        <Zahl label="Breite (O–W)" einheit="m" wert={l.breite} onChange={(v) => set('breite', v)} />
        <Zahl label="Tiefe (N–S)" einheit="m" wert={l.tiefe} onChange={(v) => set('tiefe', v)} />
      </div>
      <p className="klein">
        Rechteck: {fmt(l.breite * l.tiefe, 2)} m², erfasste Grundfläche: {fmt(raum.grundflaeche, 2)} m².{' '}
        <button className="mini" onClick={() => aendern((q) => void (q.raeume.find((x) => x.id === raum.id)!.grundflaeche = Math.round(l.breite * l.tiefe * 100) / 100))}>
          Grundfläche übernehmen
        </button>{' '}
        <button className="mini" onClick={() => aendern((q) => void (q.raeume.find((x) => x.id === raum.id)!.lage = null))}>
          aus Grundriss entfernen
        </button>
      </p>
      <p className="klein">
        Am Umriss liegende Seiten: {kanten.map((k) => `${k.orientierung} ${fmt(k.laenge, 2)} m`).join(', ') || 'keine'}.{' '}
        {neu.length > 0 && aw && (
          <button
            className="mini"
            onClick={() =>
              aendern((q) => {
                const r = q.raeume.find((x) => x.id === raum.id)
                if (!r) return
                for (const k of neu)
                  r.flaechen.push({
                    id: neueId(),
                    bauteilId: aw.id,
                    orientierung: k.orientierung,
                    // Innenmaß + 2 × halbe Außenwanddicke als Näherung für Außenmaß
                    laenge: Math.round((k.laenge + 0.35) * 100) / 100,
                    hoehe: null,
                    flaecheDirekt: null,
                    angrenzung: { art: 'aussen' },
                    oeffnungen: [],
                  })
              })
            }
          >
            {neu.length} Außenwand-Fläche(n) anlegen
          </button>
        )}
      </p>
    </Abschnitt>
  )
}
