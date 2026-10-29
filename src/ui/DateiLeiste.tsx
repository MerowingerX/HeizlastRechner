/**
 * Projektdateien aus `projekte/` laden und speichern (Dev-Server-API),
 * dazu Export/Import als Datei für den Betrieb ohne Dev-Server.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { projektAlsJson, projektAusJson, useProjekt } from '../store'

async function holeListe(): Promise<string[]> {
  const r = await fetch('/api/projekte')
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export function DateiLeiste() {
  const { projekt, dateiname, geaendert, laden, gespeichert, neu } = useProjekt()
  const [dateien, setDateien] = useState<string[]>([])
  const [meldung, setMeldung] = useState<string>('')
  const importFeld = useRef<HTMLInputElement>(null)

  const aktualisieren = useCallback(() => {
    holeListe()
      .then(setDateien)
      .catch(() => setDateien([]))
  }, [])

  const oeffnen = useCallback(
    async (name: string) => {
      try {
        const r = await fetch(`/api/projekte/${encodeURIComponent(name)}`)
        laden(projektAusJson(await r.text()), name)
        setMeldung(`${name} geladen`)
      } catch (e) {
        setMeldung(`Fehler: ${(e as Error).message}`)
      }
    },
    [laden],
  )

  useEffect(aktualisieren, [aktualisieren])

  // ?datei=<name>.json öffnet die Datei direkt (Links aus Claude Code)
  useEffect(() => {
    const name = new URLSearchParams(location.search).get('datei')
    if (name) void oeffnen(name)
  }, [oeffnen])

  // Datei wurde außerhalb (z. B. von Claude Code) geändert → neu laden, wenn hier nichts offen ist
  useEffect(() => {
    if (!import.meta.hot) return
    const h = (name: string) => {
      aktualisieren()
      const s = useProjekt.getState()
      if (name !== s.dateiname) return
      if (s.geaendert) setMeldung(`${name} wurde extern geändert – lokale Änderungen nicht gespeichert!`)
      else void oeffnen(name)
    }
    import.meta.hot.on('projekt-geaendert', h)
    return () => import.meta.hot?.off('projekt-geaendert', h)
  }, [aktualisieren, oeffnen])

  const speichern = async () => {
    let name = dateiname
    if (!name) {
      const vorschlag = projekt.meta.name.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '') || 'projekt'
      name = prompt('Dateiname in projekte/', `${vorschlag}.json`)
      if (!name) return
      if (!name.endsWith('.json')) name += '.json'
    }
    const r = await fetch(`/api/projekte/${encodeURIComponent(name)}`, { method: 'PUT', body: projektAlsJson(projekt) })
    if (r.ok) {
      gespeichert(name)
      setMeldung(`${name} gespeichert`)
      aktualisieren()
    } else setMeldung(`Speichern fehlgeschlagen: ${await r.text()}`)
  }

  const exportieren = () => {
    const url = URL.createObjectURL(new Blob([projektAlsJson(projekt)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = dateiname ?? 'projekt.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="dateileiste">
      <select
        value={dateiname ?? ''}
        onFocus={aktualisieren}
        onChange={(e) => {
          if (geaendert && !confirm('Ungespeicherte Änderungen verwerfen?')) return
          if (e.target.value) void oeffnen(e.target.value)
        }}
        aria-label="Projektdatei"
      >
        <option value="">{dateiname ? '' : '– Datei aus projekte/ –'}</option>
        {dateien.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <button onClick={speichern} className={geaendert ? 'primaer' : ''}>
        Speichern{geaendert ? ' *' : ''}
      </button>
      <button
        onClick={() => {
          if (geaendert && !confirm('Ungespeicherte Änderungen verwerfen?')) return
          neu()
          setMeldung('')
        }}
      >
        Neu
      </button>
      <button onClick={exportieren}>Export</button>
      <button onClick={() => importFeld.current?.click()}>Import</button>
      <input
        ref={importFeld}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          try {
            laden(projektAusJson(await f.text()), null)
            setMeldung(`${f.name} importiert`)
          } catch (err) {
            setMeldung(`Fehler: ${(err as Error).message}`)
          }
          e.target.value = ''
        }}
      />
      {meldung && <span className="meldung">{meldung}</span>}
    </div>
  )
}
