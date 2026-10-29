/**
 * Kommandozeile für Claude Code (Skill heizlast-aufnahme) und Menschen.
 *
 *   npm run heizlast -- pruefen projekte/haus.json   Schema + Plausibilität prüfen, Übersicht ausgeben
 *   npm run heizlast -- schema                       JSON-Schema der Projektdatei ausgeben
 *   npm run heizlast -- vorlage [baualter]           Startdatei mit Bauteilkatalog ausgeben
 *   npm run heizlast -- berechnen projekte/haus.json Heizlast, Vorlauf, Heizkurve, Ventil-Voreinstellung
 *   npm run heizlast -- messung projekte/haus.json <raumId> <innen.csv> <aussen.csv|°C> [vl.csv rl.csv]
 *                                                   Messreihe (Tuya/Home-Assistant-CSV) an das Projekt anhängen
 *
 * Exit-Code 1, wenn die Datei Fehler enthält.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { projektAlsJson, projektAusJson } from '../src/core/datei'
import { bruttoFlaeche, geschossVon, heizkoerperLeistungN, oeffnungenSumme, raumVolumen } from '../src/core/geometrie'
import { BAUALTER_INFO, KATEGORIE_LABEL, standardBauteile } from '../src/core/kataloge'
import { BAUALTER, leeresProjekt, ProjektSchema, type Baualter, type Projekt } from '../src/core/model'
import { pruefeProjekt } from '../src/core/validierung'
import { berechne } from '../src/core/berechnung'
import { legeAus } from '../src/core/heizkoerper'
import { berechneVoreinstellungen } from '../src/core/ventile'
import { bewerteVerhaeltnis, werteVerbrauchAus } from '../src/core/verbrauch'
import { fuehreZusammen, parseZeitreihe, werteMessungAus } from '../src/core/messung'
import { neueId } from '../src/core/model'

const f = (x: number, n = 1) => x.toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n })

function uebersicht(p: Projekt): string {
  const z: string[] = []
  z.push(`Projekt: ${p.meta.name} (${p.meta.plz} ${p.meta.ort})`)
  z.push(`θ_e = ${p.klima.thetaE ?? '?'} °C, θ_m,e = ${p.klima.thetaMe ?? '?'} °C, n50 = ${p.gebaeude.n50 ?? '?'} 1/h`)
  z.push(`Bauteile: ${p.bauteile.map((t) => `${t.id}=${t.kategorie} U ${t.u}`).join(', ') || '–'}`)
  for (const g of p.geschosse) {
    z.push(`\n[${g.name}] Geschosshöhe ${g.geschosshoehe} m, lichte Höhe ${g.lichteHoehe} m`)
    for (const r of p.raeume.filter((x) => x.geschossId === g.id)) {
      const gs = geschossVon(p, r)
      const oe = r.flaechen.reduce((s, x) => s + oeffnungenSumme(x), 0)
      const hk = heizkoerperLeistungN(r)
      z.push(
        `  ${r.nummer} ${r.name} (${r.id}): ${r.thetaInt} °C, ${f(r.grundflaeche)} m², ${f(raumVolumen(r, gs))} m³, ` +
          `${r.flaechen.length} Flächen, Öffnungen ${f(oe, 2)} m², ${r.heizkoerper.length} HK (Σ Φ_N ${hk === null ? '?' : f(hk, 0)} W)`,
      )
      for (const x of r.flaechen) {
        const t = p.bauteile.find((b) => b.id === x.bauteilId)
        const a = x.angrenzung
        const an =
          a.art === 'raum'
            ? `Raum ${p.raeume.find((q) => q.id === a.raumId)?.name ?? a.raumId}`
            : a.art === 'unbeheizt' || a.art === 'beheizt'
              ? `${a.bezeichnung} ${a.theta} °C`
              : a.art
        z.push(`      ${t ? KATEGORIE_LABEL[t.kategorie] : '??'} ${x.orientierung} ${f(bruttoFlaeche(x, gs), 2)} m² → ${an}` + (x.oeffnungen.length ? ` (${x.oeffnungen.length} Öffnungen)` : ''))
      }
    }
  }
  const ohne = p.raeume.filter((r) => !p.geschosse.some((g) => g.id === r.geschossId))
  if (ohne.length) z.push(`\nRäume ohne gültiges Geschoss: ${ohne.map((r) => r.name).join(', ')}`)
  return z.join('\n')
}

function pruefen(datei: string): number {
  let p: Projekt
  try {
    p = projektAusJson(readFileSync(datei, 'utf8'))
  } catch (e) {
    console.error(`SCHEMAFEHLER: ${(e as Error).message}`)
    return 1
  }
  console.log(uebersicht(p))
  const befunde = pruefeProjekt(p)
  const fehler = befunde.filter((b) => b.ebene === 'fehler')
  const hinweise = befunde.filter((b) => b.ebene === 'hinweis')
  console.log(`\n${fehler.length} Fehler, ${hinweise.length} Hinweise`)
  for (const b of fehler) console.log(`  FEHLER  [${b.schritt}] ${b.text}`)
  for (const b of hinweise) console.log(`  HINWEIS [${b.schritt}] ${b.text}`)
  return fehler.length > 0 ? 1 : 0
}

function vorlage(baualter: Baualter): string {
  const p = leeresProjekt()
  p.gebaeude.baualter = baualter
  p.gebaeude.n50 = BAUALTER_INFO[baualter].n50
  // sprechende IDs, damit Claude sie leicht referenzieren kann
  const vergeben = new Set<string>()
  p.bauteile = standardBauteile(baualter).map((t) => {
    let id = `bt-${t.kategorie.toLowerCase()}`
    if (t.name.includes('innen')) id += '-innen'
    while (vergeben.has(id)) id += '-2'
    vergeben.add(id)
    return { ...t, id }
  })
  return projektAlsJson(p)
}

function berechnen(datei: string): number {
  const p = projektAusJson(readFileSync(datei, 'utf8'))
  const fehler = pruefeProjekt(p).filter((b) => b.ebene === 'fehler')
  if (fehler.length) {
    for (const b of fehler) console.error(`FEHLER [${b.schritt}] ${b.text}`)
    return 1
  }
  const g = berechne(p)
  const a = legeAus(p, g)
  const v = berechneVoreinstellungen(p, a)
  const pad = (s: string, n: number) => s.padEnd(n).slice(0, n)
  const z = (x: number | null, n = 0) => (x === null ? '–' : f(x, n)).padStart(8)
  console.log(`Raumheizlast (θ_e = ${g.thetaE} °C)`)
  console.log(`${pad('Raum', 22)}${'θ_int'.padStart(8)}${'Φ_T'.padStart(8)}${'Φ_V'.padStart(8)}${'Φ_HL'.padStart(8)}${'W/m²'.padStart(8)}${'Φ_N HK'.padStart(8)}${'VL nötig'.padStart(9)}${'Ist %'.padStart(7)}`)
  for (const e of g.raeume) {
    const r = a.raeume.find((x) => x.raumId === e.raumId)
    console.log(`${pad(`${e.geschoss} ${e.name}`, 22)}${z(e.thetaInt)}${z(e.phiT)}${z(e.phiV)}${z(e.phiHL)}${z(e.wProM2)}${z(r?.phiN ?? null)}${z(r?.vlNoetig ?? null, 1)} ${z(r?.deckungIst ?? null).slice(2)}`)
  }
  console.log(`\nGebäude: Φ_HL = ${f(g.phiHL / 1000, 2)} kW (Φ_T ${f(g.phiT / 1000, 2)} + Φ_V ${f(g.phiV / 1000, 2)}), ${f(g.wProM2, 0)} W/m², H = ${f(g.h, 0)} W/K, Σ Räume ${f(g.summeRaeume / 1000, 2)} kW`)
  console.log(`\nSystem: Vorlauf ${a.vorlauf ?? '–'} °C bei ${g.thetaE} °C (maßgebend: ${g.raeume.find((e) => e.raumId === a.massgebenderRaum)?.name ?? '–'}), Mischrücklauf ${a.ruecklaufMisch === null ? '–' : f(a.ruecklaufMisch, 1)} °C, Volumenstrom ${f(a.volumenstromGesamt, 0)} l/h`)
  if (a.steilheit !== null) console.log(`Heizkurve (linearisiert, Raum 20 °C): Steilheit ${f(a.steilheit, 2)}, Niveau ${f(a.niveau ?? 0, 1)} K`)
  console.log('  ' + a.heizkurve.filter((q) => q.aussen % 5 === 0).map((q) => `${q.aussen} °C → ${f(q.vorlauf, 1)}/${f(q.ruecklauf, 1)}`).join(' | '))
  console.log('\nVentil-Voreinstellung')
  for (const x of v)
    console.log(`  ${pad(x.raumName, 16)} ${pad(x.heizkoerper, 16)} ${pad(x.ventil, 26)} ${z(x.volumenstrom)} l/h  kv ${f(x.kvErforderlich, 3)}  → ${x.einstellung ?? '?'} (ist ${x.aktuell || '?'}) ${x.hinweis}`)
  for (const w of a.warnungen) console.log(`WARNUNG ${w}`)
  if (p.verbrauch.length) {
    console.log('\nVerbrauchsabgleich')
    for (const ve of p.verbrauch) {
      const r = werteVerbrauchAus(p, ve, g.wohnflaeche, g.phiHL)
      console.log(`  ${ve.zeitraum}: Heizwärme ${f(r.heizwaerme, 0)} kWh, H ${f(r.h, 0)} W/K → ${f(r.phi / 1000, 2)} kW; Norm/Verbrauch ${r.verhaeltnis === null ? '–' : f(r.verhaeltnis, 2)}: ${bewerteVerhaeltnis(r.verhaeltnis)}`)
    }
  }
  for (const m of p.messreihen) {
    const r = werteMessungAus(p, m)
    const e = g.raeume.find((x) => x.raumId === m.raumId)
    console.log(`\nMessung ${m.name}: ` + (r ? `τ ${f(r.tau, 1)} h, H ${f(r.h, 1)} W/K (Norm ${f(e?.h ?? 0, 1)}), Φ ${f(r.phi, 0)} W, R² ${f(r.r2, 2)} ${r.hinweis}` : 'nicht auswertbar'))
  }
  return 0
}

function messungImport(datei: string, raumId: string, innenCsv: string, aussen: string, vlCsv?: string, rlCsv?: string): number {
  const p = projektAusJson(readFileSync(datei, 'utf8'))
  const raum = p.raeume.find((r) => r.id === raumId)
  if (!raum) {
    console.error(`Raum ${raumId} nicht gefunden. Vorhanden: ${p.raeume.map((r) => r.id).join(', ')}`)
    return 2
  }
  const innen = parseZeitreihe(readFileSync(innenCsv, 'utf8'))
  const konstant = Number(aussen.replace(',', '.'))
  const aussenReihe = Number.isFinite(konstant) && !aussen.endsWith('.csv')
    ? [{ t: innen[0]?.t ?? 0, wert: konstant }, { t: innen.at(-1)?.t ?? 0, wert: konstant }]
    : parseZeitreihe(readFileSync(aussen, 'utf8'))
  const vl = vlCsv ? parseZeitreihe(readFileSync(vlCsv, 'utf8')) : undefined
  const rl = rlCsv ? parseZeitreihe(readFileSync(rlCsv, 'utf8')) : undefined
  const punkte = fuehreZusammen(innen, aussenReihe, vl, rl)
  console.log(`innen ${innen.length} Werte, außen ${aussenReihe.length}, gemeinsam ${punkte.length} Punkte`)
  if (punkte.length < 6) {
    console.error('Zu wenige gemeinsame Punkte – überlappen die Zeiträume?')
    return 1
  }
  const m = { id: neueId(), raumId, name: `Messung ${raum.name} ${punkte[0].t.slice(0, 10)}`, punkte, von: null, bis: null, notiz: '' }
  p.messreihen.push(m)
  writeFileSync(datei, projektAlsJson(p))
  const r = werteMessungAus(p, m)
  console.log(r ? `τ ${f(r.tau, 1)} h, H ${f(r.h, 1)} W/K, Φ ${f(r.phi, 0)} W, R² ${f(r.r2, 2)} ${r.hinweis}` : 'Noch nicht auswertbar – Auswertefenster in der App setzen.')
  return 0
}

const [befehl, arg] = process.argv.slice(2)
switch (befehl) {
  case 'pruefen':
    if (!arg) {
      console.error('Datei fehlt: npm run heizlast -- pruefen projekte/<datei>.json')
      process.exit(2)
    }
    process.exit(pruefen(arg))
  case 'berechnen':
    if (!arg) {
      console.error('Datei fehlt')
      process.exit(2)
    }
    process.exit(berechnen(arg))
  case 'messung': {
    const [, d, raumId, innen, aussen, vl, rl] = process.argv.slice(2)
    if (!d || !raumId || !innen || !aussen) {
      console.error('Aufruf: messung <projekt.json> <raumId> <innen.csv> <aussen.csv|Temperatur> [vl.csv rl.csv]')
      process.exit(2)
    }
    process.exit(messungImport(d, raumId, innen, aussen, vl, rl))
  }
  case 'schema':
    console.log(JSON.stringify(z.toJSONSchema(ProjektSchema, { io: 'input' }), null, 2))
    break
  case 'vorlage': {
    const b = (arg ?? 'vor1977') as Baualter
    if (!BAUALTER.includes(b)) {
      console.error(`Unbekanntes Baualter. Erlaubt: ${BAUALTER.join(', ')}`)
      process.exit(2)
    }
    process.stdout.write(vorlage(b))
    break
  }
  default:
    console.log('Befehle: pruefen <datei> | berechnen <datei> | messung <datei> <raumId> <innen.csv> <aussen.csv|°C> [vl rl] | schema | vorlage [baualter]')
    process.exit(befehl ? 2 : 0)
}
