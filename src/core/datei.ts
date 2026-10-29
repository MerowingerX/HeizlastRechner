/**
 * Projektdatei lesen/schreiben (ohne Browser-Abhängigkeit, auch für CLI).
 */
import { ProjektSchema, type Projekt } from './model'

/** Projekt als JSON-Text (für Datei-Export). */
export const projektAlsJson = (p: Projekt): string => JSON.stringify(p, null, 2) + '\n'

/** JSON-Text einlesen und prüfen. Wirft Fehler mit lesbarer Meldung. */
export function projektAusJson(text: string): Projekt {
  let roh: unknown
  try {
    roh = JSON.parse(text)
  } catch {
    throw new Error('Datei ist kein gültiges JSON.')
  }
  const r = ProjektSchema.safeParse(roh)
  if (!r.success) {
    const erst = r.error.issues[0]
    throw new Error(`Projektdatei ungültig: ${erst?.path.join('.') ?? ''} – ${erst?.message ?? ''}`)
  }
  return r.data
}
