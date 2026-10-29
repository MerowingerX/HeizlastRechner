/**
 * Einfaches Liniendiagramm (SVG), ohne Bibliothek.
 */
export interface Serie {
  name: string
  farbe: string
  punkte: { x: number; y: number }[]
  gestrichelt?: boolean
}

interface Props {
  serien: Serie[]
  xTitel: string
  yTitel: string
  hoehe?: number
  /** x-Werte als Zeit (ms) formatieren */
  zeitachse?: boolean
  /** markierter Bereich auf der x-Achse */
  bereich?: { von: number; bis: number } | null
}

function ticks(min: number, max: number, anzahl = 6): number[] {
  if (max <= min) return [min]
  const roh = (max - min) / anzahl
  const pot = 10 ** Math.floor(Math.log10(roh))
  const schritt = [1, 2, 5, 10].map((f) => f * pot).find((s) => s >= roh) ?? roh
  const out: number[] = []
  for (let v = Math.ceil(min / schritt) * schritt; v <= max + 1e-9; v += schritt) out.push(Math.round(v * 1e6) / 1e6)
  return out
}

export function Diagramm({ serien, xTitel, yTitel, hoehe = 260, zeitachse, bereich }: Props) {
  const alle = serien.flatMap((s) => s.punkte)
  if (alle.length === 0) return <p className="leer">Keine Daten.</p>
  const B = 640
  const H = hoehe
  const r = { l: 48, r: 12, o: 12, u: 36 }
  let xmin = Math.min(...alle.map((p) => p.x))
  let xmax = Math.max(...alle.map((p) => p.x))
  let ymin = Math.min(...alle.map((p) => p.y))
  let ymax = Math.max(...alle.map((p) => p.y))
  if (xmax === xmin) xmax = xmin + 1
  const py = (ymax - ymin) * 0.08 || 1
  ymin -= py
  ymax += py
  const sx = (x: number) => r.l + ((x - xmin) / (xmax - xmin)) * (B - r.l - r.r)
  const sy = (y: number) => H - r.u - ((y - ymin) / (ymax - ymin)) * (H - r.o - r.u)
  const xt = zeitachse ? ticks(xmin / 3.6e6, xmax / 3.6e6).map((h) => h * 3.6e6) : ticks(xmin, xmax)
  const yt = ticks(ymin, ymax, 5)
  const fx = (x: number) =>
    zeitachse ? new Date(x).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : String(x).replace('.', ',')
  xmin = Math.min(xmin, xmin)
  return (
    <figure className="diagramm">
      <svg viewBox={`0 0 ${B} ${H}`} role="img" aria-label={`${yTitel} über ${xTitel}`}>
        {bereich && (
          <rect x={sx(Math.max(bereich.von, xmin))} y={r.o} width={Math.max(sx(Math.min(bereich.bis, xmax)) - sx(Math.max(bereich.von, xmin)), 0)} height={H - r.o - r.u} className="bereich" />
        )}
        {yt.map((y) => (
          <g key={`y${y}`}>
            <line x1={r.l} x2={B - r.r} y1={sy(y)} y2={sy(y)} className="gitter" />
            <text x={r.l - 6} y={sy(y) + 4} textAnchor="end" className="achse">
              {String(y).replace('.', ',')}
            </text>
          </g>
        ))}
        {xt.map((x) => (
          <text key={`x${x}`} x={sx(x)} y={H - r.u + 16} textAnchor="middle" className="achse">
            {fx(x)}
          </text>
        ))}
        <text x={(B + r.l) / 2} y={H - 4} textAnchor="middle" className="achse titel">
          {xTitel}
        </text>
        <text x={12} y={H / 2} textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`} className="achse titel">
          {yTitel}
        </text>
        {serien.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.farbe}
            strokeWidth={2}
            strokeDasharray={s.gestrichelt ? '6 4' : undefined}
            points={s.punkte.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
          />
        ))}
      </svg>
      <figcaption>
        {serien.map((s) => (
          <span key={s.name} className="legende">
            <i style={{ background: s.farbe }} />
            {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
