/**
 * Wiederverwendbare Eingabefelder. Zahlen akzeptieren Komma und Punkt.
 */
import { useEffect, useId, useState, type ReactNode } from 'react'

const formatZahl = (x: number | null): string => (x === null || Number.isNaN(x) ? '' : String(x).replace('.', ','))

function parseZahl(s: string): number | null | undefined {
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const x = Number(t)
  return Number.isFinite(x) ? x : undefined // undefined = ungültig, nicht übernehmen
}

interface FeldRahmenProps {
  label?: string
  hilfe?: string
  children: (id: string) => ReactNode
  breit?: boolean
}

function FeldRahmen({ label, hilfe, children, breit }: FeldRahmenProps) {
  const id = useId()
  if (!label) return <>{children(id)}</>
  return (
    <div className={breit ? 'feld feld-breit' : 'feld'}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hilfe && <small className="hilfe">{hilfe}</small>}
    </div>
  )
}

interface ZahlProps {
  label?: string
  wert: number | null
  onChange: (x: number | null) => void
  einheit?: string
  hilfe?: string
  /** leeres Feld erlaubt (null); sonst wird leer zu 0 */
  optional?: boolean
  platzhalter?: string
  klein?: boolean
}

export function Zahl({ label, wert, onChange, einheit, hilfe, optional, platzhalter, klein }: ZahlProps) {
  const [text, setText] = useState(formatZahl(wert))
  const [fokus, setFokus] = useState(false)
  useEffect(() => {
    if (!fokus) setText(formatZahl(wert))
  }, [wert, fokus])
  const ungueltig = parseZahl(text) === undefined || (!optional && text.trim() === '')
  return (
    <FeldRahmen label={label} hilfe={hilfe}>
      {(id) => (
        <span className={klein ? 'zahl zahl-klein' : 'zahl'}>
          <input
            id={id}
            inputMode="decimal"
            value={text}
            placeholder={platzhalter}
            aria-invalid={ungueltig}
            onFocus={() => setFokus(true)}
            onBlur={() => {
              setFokus(false)
              setText(formatZahl(wert))
            }}
            onChange={(e) => {
              setText(e.target.value)
              const x = parseZahl(e.target.value)
              if (x === undefined) return
              if (x === null && !optional) return
              onChange(x)
            }}
          />
          {einheit && <span className="einheit">{einheit}</span>}
        </span>
      )}
    </FeldRahmen>
  )
}

interface TextProps {
  label?: string
  wert: string
  onChange: (s: string) => void
  hilfe?: string
  platzhalter?: string
  breit?: boolean
  mehrzeilig?: boolean
}

export function Text({ label, wert, onChange, hilfe, platzhalter, breit, mehrzeilig }: TextProps) {
  return (
    <FeldRahmen label={label} hilfe={hilfe} breit={breit}>
      {(id) =>
        mehrzeilig ? (
          <textarea id={id} value={wert} placeholder={platzhalter} rows={3} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={id} value={wert} placeholder={platzhalter} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </FeldRahmen>
  )
}

interface AuswahlProps<T extends string> {
  label?: string
  wert: T
  optionen: readonly T[] | readonly { wert: T; text: string }[]
  beschriftung?: Record<T, string>
  onChange: (x: T) => void
  hilfe?: string
}

export function Auswahl<T extends string>({ label, wert, optionen, beschriftung, onChange, hilfe }: AuswahlProps<T>) {
  const liste = optionen.map((o) =>
    typeof o === 'string' ? { wert: o as T, text: beschriftung?.[o as T] ?? o } : (o as { wert: T; text: string }),
  )
  return (
    <FeldRahmen label={label} hilfe={hilfe}>
      {(id) => (
        <select id={id} value={wert} onChange={(e) => onChange(e.target.value as T)}>
          {liste.map((o) => (
            <option key={o.wert} value={o.wert}>
              {o.text}
            </option>
          ))}
        </select>
      )}
    </FeldRahmen>
  )
}

export function Haken({ label, wert, onChange }: { label: string; wert: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="haken">
      <input type="checkbox" checked={wert} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function Abschnitt({ titel, children, aktion }: { titel: string; children: ReactNode; aktion?: ReactNode }) {
  return (
    <section className="abschnitt">
      <header>
        <h3>{titel}</h3>
        {aktion}
      </header>
      {children}
    </section>
  )
}

export const fmt = (x: number, stellen = 2): string =>
  x.toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen })
