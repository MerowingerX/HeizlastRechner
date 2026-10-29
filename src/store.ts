/**
 * Projekt-Store: ein Projekt, automatisch im Browser zwischengespeichert.
 * Quelle der Daten ist normalerweise eine Datei in `projekte/` (von Claude
 * Code erfasst); `dateiname` merkt sich, wohin „Speichern" schreibt.
 * Änderungen laufen über `aendern(rezept)`, das auf einer Kopie arbeitet.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { leeresProjekt, ProjektSchema, type Projekt } from './core/model'
export { projektAlsJson, projektAusJson } from './core/datei'

interface ProjektStore {
  projekt: Projekt
  dateiname: string | null
  /** ungespeicherte Änderungen seit Laden/Speichern */
  geaendert: boolean
  aendern: (rezept: (p: Projekt) => void) => void
  laden: (p: Projekt, dateiname: string | null) => void
  gespeichert: (dateiname: string) => void
  neu: () => void
}

export const useProjekt = create<ProjektStore>()(
  persist(
    (set) => ({
      projekt: leeresProjekt(),
      dateiname: null,
      geaendert: false,
      aendern: (rezept) =>
        set((s) => {
          const kopie = structuredClone(s.projekt)
          rezept(kopie)
          return { projekt: kopie, geaendert: true }
        }),
      laden: (p, dateiname) => set({ projekt: p, dateiname, geaendert: false }),
      gespeichert: (dateiname) => set({ dateiname, geaendert: false }),
      neu: () => set({ projekt: leeresProjekt(), dateiname: null, geaendert: false }),
    }),
    {
      name: 'heizlast-projekt',
      version: 1,
      // Gespeicherten Stand nur übernehmen, wenn er zum aktuellen Schema passt
      merge: (gespeichert, aktuell) => {
        const g = gespeichert as Partial<ProjektStore> | undefined
        const r = g?.projekt ? ProjektSchema.safeParse(g.projekt) : null
        return r?.success ? { ...aktuell, projekt: r.data, dateiname: g?.dateiname ?? null, geaendert: g?.geaendert ?? false } : aktuell
      },
    },
  ),
)
