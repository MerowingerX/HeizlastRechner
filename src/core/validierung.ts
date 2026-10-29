/**
 * Plausibilitätsprüfung der Eingaben vor der Berechnung.
 * Fehler blockieren die Berechnung, Hinweise nicht.
 */
import { bruttoFlaeche, geschossVon, oeffnungenSumme } from './geometrie'
import { KATEGORIE_LABEL } from './kataloge'
import { OEFFNUNGS_KATEGORIEN, type Projekt } from './model'

export type SchrittId =
  | 'projekt'
  | 'klima'
  | 'gebaeude'
  | 'anlage'
  | 'bauteile'
  | 'geschosse'
  | 'raeume'
  | 'heizkoerper'
  | 'verbrauch'

export interface Befund {
  ebene: 'fehler' | 'hinweis'
  schritt: SchrittId
  text: string
  /** Raum-ID, falls der Befund zu einem Raum gehört */
  raumId?: string
}

export function pruefeProjekt(p: Projekt): Befund[] {
  const b: Befund[] = []
  const fehler = (schritt: SchrittId, text: string, raumId?: string) => b.push({ ebene: 'fehler', schritt, text, raumId })
  const hinweis = (schritt: SchrittId, text: string, raumId?: string) => b.push({ ebene: 'hinweis', schritt, text, raumId })

  // Projekt
  if (!p.meta.name.trim()) hinweis('projekt', 'Projektname fehlt.')
  if (!p.meta.plz.trim()) hinweis('projekt', 'PLZ fehlt – wird für die Norm-Außentemperatur gebraucht.')

  // Klima
  if (p.klima.thetaE === null) fehler('klima', 'Norm-Außentemperatur θ_e fehlt.')
  else if (p.klima.thetaE < -30 || p.klima.thetaE > 0) hinweis('klima', `θ_e = ${p.klima.thetaE} °C ist für Deutschland ungewöhnlich.`)
  if (p.klima.thetaMe === null) hinweis('klima', 'Jahresmitteltemperatur θ_m,e fehlt – nötig für Flächen gegen Erdreich.')

  // Gebäude
  if (p.gebaeude.n50 === null) fehler('gebaeude', 'Luftdichtheit n50 fehlt (Messwert oder Schätzwert nach Baualter).')
  else if (p.gebaeude.n50 <= 0 || p.gebaeude.n50 > 15) hinweis('gebaeude', `n50 = ${p.gebaeude.n50} 1/h ist unplausibel.`)
  if (p.gebaeude.lueftungsanlage && (p.gebaeude.wrgEta === null || p.gebaeude.wrgEta < 0 || p.gebaeude.wrgEta > 1))
    fehler('gebaeude', 'Lüftungsanlage: Wärmerückgewinnungsgrad (0…1) fehlt.')

  // Anlage
  const a = p.anlage
  if (a.vorlauf <= a.ruecklauf) fehler('anlage', 'Vorlauftemperatur muss über der Rücklauftemperatur liegen.')
  if (a.vorlauf > 90 || a.ruecklauf < 20) hinweis('anlage', 'Systemtemperaturen außerhalb des üblichen Bereichs.')
  if (a.heizkurve.steilheit === null) hinweis('anlage', 'Aktuelle Heizkurven-Steilheit fehlt – für Vorher/Nachher-Vergleich hilfreich.')
  if (a.pumpenDruck === null) hinweis('anlage', 'Pumpendruck unbekannt – für Voreinstellwerte wird ein Standardwert angenommen.')

  // Bauteile
  if (p.bauteile.length === 0) fehler('bauteile', 'Keine Bauteile angelegt.')
  for (const t of p.bauteile) {
    if (!(t.u > 0)) fehler('bauteile', `Bauteil „${t.name}": U-Wert muss > 0 sein.`)
    else if (t.u > 6) hinweis('bauteile', `Bauteil „${t.name}": U-Wert ${t.u} ist sehr hoch.`)
    if (t.deltaUTb < 0) fehler('bauteile', `Bauteil „${t.name}": ΔU_TB darf nicht negativ sein.`)
  }

  // Geschosse
  if (p.geschosse.length === 0) fehler('geschosse', 'Kein Geschoss angelegt.')
  for (const g of p.geschosse) {
    if (!(g.geschosshoehe > 0)) fehler('geschosse', `Geschoss „${g.name}": Geschosshöhe fehlt.`)
    if (!(g.lichteHoehe > 0)) fehler('geschosse', `Geschoss „${g.name}": lichte Höhe fehlt.`)
    if (g.lichteHoehe > g.geschosshoehe) hinweis('geschosse', `Geschoss „${g.name}": lichte Höhe größer als Geschosshöhe.`)
  }

  // Räume
  if (p.raeume.length === 0) fehler('raeume', 'Keine Räume angelegt.')
  const bauteil = new Map(p.bauteile.map((t) => [t.id, t]))
  const raumIds = new Set(p.raeume.map((r) => r.id))
  for (const r of p.raeume) {
    const g = geschossVon(p, r)
    const n = `Raum „${r.name}"`
    if (!g) fehler('raeume', `${n}: Geschoss fehlt.`, r.id)
    if (!(r.grundflaeche > 0)) fehler('raeume', `${n}: Grundfläche fehlt.`, r.id)
    if (r.flaechen.length === 0) fehler('raeume', `${n}: keine Umschließungsflächen erfasst.`, r.id)
    if (!r.flaechen.some((f) => f.angrenzung.art !== 'raum'))
      hinweis('raeume', `${n}: keine Fläche nach außen, Erdreich oder unbeheizt – stimmt das?`, r.id)

    r.flaechen.forEach((f, i) => {
      const fn = `${n}, Fläche ${i + 1}`
      const t = bauteil.get(f.bauteilId)
      if (!t) fehler('raeume', `${fn}: Bauteil fehlt.`, r.id)
      else if (OEFFNUNGS_KATEGORIEN.includes(t.kategorie))
        fehler('raeume', `${fn}: ${KATEGORIE_LABEL[t.kategorie]} gehört als Öffnung in eine Wand, nicht als Fläche.`, r.id)
      const brutto = bruttoFlaeche(f, g)
      if (!(brutto > 0)) fehler('raeume', `${fn}: Fläche ist 0.`, r.id)
      if (oeffnungenSumme(f) > brutto + 1e-9) fehler('raeume', `${fn}: Öffnungen größer als die Fläche.`, r.id)
      if (f.angrenzung.art === 'raum') {
        if (!raumIds.has(f.angrenzung.raumId)) fehler('raeume', `${fn}: angrenzender Raum existiert nicht.`, r.id)
        else if (f.angrenzung.raumId === r.id) fehler('raeume', `${fn}: grenzt an sich selbst.`, r.id)
      }
      if (f.angrenzung.art === 'erdreich' && p.klima.thetaMe === null)
        hinweis('raeume', `${fn}: Erdreich – Jahresmitteltemperatur im Schritt Klima eintragen.`, r.id)
      f.oeffnungen.forEach((o, j) => {
        const ot = bauteil.get(o.bauteilId)
        if (!ot) fehler('raeume', `${fn}, Öffnung ${j + 1}: Bauteil fehlt.`, r.id)
        else if (!OEFFNUNGS_KATEGORIEN.includes(ot.kategorie))
          fehler('raeume', `${fn}, Öffnung ${j + 1}: Bauteil muss Fenster oder Tür sein.`, r.id)
        if (!(o.breite > 0 && o.hoehe > 0 && o.anzahl > 0)) fehler('raeume', `${fn}, Öffnung ${j + 1}: Maße fehlen.`, r.id)
      })
    })
  }

  // Grundriss-Lage
  for (const r of p.raeume) {
    if (!r.lage) continue
    const a = r.lage.breite * r.lage.tiefe
    if (r.grundflaeche > 0 && Math.abs(a - r.grundflaeche) / r.grundflaeche > 0.25)
      hinweis('raeume', `Raum „${r.name}": Grundriss-Rechteck (${a.toFixed(1)} m²) weicht stark von der Grundfläche (${r.grundflaeche} m²) ab.`, r.id)
  }

  // Heizkörper
  for (const r of p.raeume) {
    const n = `Raum „${r.name}"`
    if (r.heizkoerper.length === 0) {
      if (r.thetaInt >= 18) hinweis('heizkoerper', `${n}: kein Heizkörper erfasst.`, r.id)
      continue
    }
    r.heizkoerper.forEach((h, i) => {
      const hn = `${n}, Heizkörper ${i + 1}`
      if (h.phiN === null) hinweis('heizkoerper', `${hn}: Normleistung (75/65/20) fehlt – aus Typ und Maßen bestimmen.`, r.id)
      if (!h.ventil.voreinstellbar) hinweis('heizkoerper', `${hn}: Ventil nicht voreinstellbar – Abgleich nur über Rücklaufverschraubung oder Ventiltausch.`, r.id)
      else if (!h.ventil.hersteller.trim() || !h.ventil.modell.trim())
        hinweis('heizkoerper', `${hn}: Ventil-Hersteller/Modell fehlt – nötig für den Voreinstellwert.`, r.id)
    })
  }

  // Verbrauch
  for (const v of p.verbrauch) {
    if (!(v.menge > 0)) fehler('verbrauch', `Verbrauch ${v.zeitraum || '(ohne Zeitraum)'}: Menge fehlt.`)
    if (!(v.nutzungsgrad > 0)) fehler('verbrauch', `Verbrauch ${v.zeitraum}: Nutzungsgrad muss > 0 sein.`)
  }

  // Messreihen
  for (const m of p.messreihen) if (!raumIds.has(m.raumId)) fehler('raeume', `Messreihe „${m.name}": Raum existiert nicht mehr.`)

  return b
}
