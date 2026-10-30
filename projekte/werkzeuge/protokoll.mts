// Erzeugt den Anhang „Berechnungsprotokoll" als HTML-Fragment aus dem Rechenkern,
// mit Rechenvorschrift (LaTeX, gerendert per KaTeX), Normbezug und eingesetzten Zahlen.
// Aufruf (im Repo-Wurzelverzeichnis): npx tsx projekte/werkzeuge/protokoll.mts projekte/<name>.json > anhang.html
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const R = fileURLToPath(new URL('../../src/core/', import.meta.url))
const { projektAusJson } = await import(R + 'datei.ts')
const { berechne, RHO_CP_LUFT, F_G1, G_W, LAMBDA_ERDREICH, abschirmKoeffizient, exponierteFassaden } = await import(R + 'berechnung.ts')
const { legeAus, DT_LOG_N, C_WASSER } = await import(R + 'heizkoerper.ts')
const { berechneVoreinstellungen, STANDARD_PUMPENDRUCK } = await import(R + 'ventile.ts')
const { uebergang } = await import(R + 'uwert.ts')
const { bruttoFlaeche, geschossVon } = await import(R + 'geometrie.ts')

const p = projektAusJson(readFileSync(process.argv[2], 'utf8'))
const erg = berechne(p)
const a = legeAus(p, erg)
const ve = berechneVoreinstellungen(p, a)

// ---------------------------------------------------------------- Hilfen
const f = (x: number | null | undefined, n = 1) =>
  x === null || x === undefined || Number.isNaN(x) ? '–' : x.toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n })
/** Zahl für LaTeX: Dezimalkomma ohne Zusatzabstand, Tausenderpunkt */
const t = (x: number | null | undefined, n = 1) => f(x, n).replace(/,/g, '{,}').replace(/−|-/g, '-')
/** Zahl für LaTeX in Differenzen: negative Werte in Klammern */
const tk = (x: number, n = 1) => (x < 0 ? `(${t(x, n)})` : t(x, n))
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** Inline-Formel */
const m = (tex: string) => `<span class="tex">\\(${esc(tex)}\\)</span>`
/** abgesetzte Formel */
const M = (tex: string) => `<div class="formel">\\[${esc(tex)}\\]</div>`
/** Normbezug */
const Q = (text: string) => `<div class="quelle">📖 ${text}</div>`
const ART: Record<string, string> = { aussen: 'außen', erdreich: 'Erdreich', unbeheizt: 'unbeheizt', beheizt: 'beheizt', raum: 'Nachbarraum' }
const bt = new Map(p.bauteile.map((b: any) => [b.id, b]))
const thE = erg.thetaE
const thMe = p.klima.thetaMe ?? 9
const webErd = p.optionen.erdreich === 'bfaktor'
const webGeb = p.optionen.gebaeudeheizlast === 'summeRaeume'
const o: string[] = []

o.push(`<section class="seite anhang">`)
o.push(`<h2>Anhang: Berechnungsprotokoll</h2>`)
o.push(`<p class="small">Automatisch aus dem Rechenkern erzeugt (Stand ${new Date().toLocaleDateString('de-DE')}). Zu jedem Schritt: Rechenvorschrift, Normbezug, eingesetzte Werte, Ergebnis. Zwischenwerte gerundet dargestellt, gerechnet wird ungerundet; letzte Stellen können deshalb abweichen.</p>`)
o.push(`<div class="box small"><b>Normbezug.</b> Grundlage ist DIN EN 12831-1:2017-09 (Norm-Heizlast, Raumheizlast) mit nationalem Anhang DIN/TS 12831-1:2020-04. Teilverfahren: DIN EN ISO 6946 (U-Wert), DIN EN ISO 13370 (Wärmeübertragung über das Erdreich), DIN EN 442-2 (Heizkörperleistung), VDI/VDE 2173 (k<sub>v</sub>-Wert). Die Norm wird hier in der Form des Standardverfahrens umgesetzt, mit Vereinfachungen. Diese sind an den Formeln jeweils als „Umsetzung“ vermerkt. Abschnitts- und Gleichungsnummern der Normen sind bewusst nicht angegeben; für die Prüfung den Normtext heranziehen.</div>`)

// ---------------------------------------------------------------- A Randbedingungen
o.push(`<h3>A Randbedingungen</h3><div class="tw"><table>`)
const zeilen: [string, string][] = [
  ['Norm-Außentemperatur', `${m(`\\theta_e = ${t(thE, 0)}\\,°\\mathrm{C}`)} (${esc(p.klima.referenzort || '')}${p.klima.thetaEQuelle === 'plz' ? ', Vorschlag über PLZ-Region' : ', manuell'})`],
  ['Jahresmittel Außentemperatur', m(`\\theta_{m,e} = ${t(thMe, 0)}\\,°\\mathrm{C}`)],
  ['Luftdichtheit', `${m(`n_{50} = ${t(p.gebaeude.n50, 1)}\\,\\mathrm{h^{-1}}`)} (${p.gebaeude.n50Gemessen ? 'gemessen' : 'geschätzt'}), Abschirmung „${p.gebaeude.abschirmung}“`],
  ['Erdreich', `${m(`\\lambda_g = ${t(LAMBDA_ERDREICH, 1)}\\,\\mathrm{W/(m\\,K)}`)}, ${m(`f_{g1} = ${t(F_G1, 2)}`)}, ${m(`G_w = ${t(G_W, 1)}`)}`],
  ['Wärmekapazität Luft', m(`\\rho\\,c_p = ${t(RHO_CP_LUFT, 2)}\\,\\mathrm{Wh/(m^3\\,K)}`)],
  ['Auslegung Heizung', `${m(`\\sigma = ${t(p.anlage.zielSpreizung, 0)}\\,\\mathrm{K}`)} Ziel-Spreizung im maßgebenden Raum, ${m(`\\Delta p_{Pumpe} = ${t(p.anlage.pumpenDruck ?? STANDARD_PUMPENDRUCK, 0)}\\,\\mathrm{mbar}`)}${p.anlage.pumpenDruck ? '' : ' (Standardwert)'}`],
]
for (const [k, v] of zeilen) o.push(`<tr><td>${k}</td><td>${v}</td></tr>`)
o.push(`</table></div>`)
o.push(M(`\\Phi_{HL,i} = \\Phi_{T,i} + \\Phi_{V,i} + \\Phi_{hu,i}, \\qquad \\Phi_{hu,i} = 0`))
o.push(Q('DIN EN 12831-1, Raumheizlast als Summe aus Transmissions-, Lüftungs- und Aufheizwärmeverlust. Umsetzung: keine Aufheizleistung (durchgehender Heizbetrieb ohne Absenkung).'))

// ---------------------------------------------------------------- B Bauteile
o.push(`<h3>B Wärmedurchgangskoeffizienten</h3>`)
o.push(M(`U = \\frac{1}{R_{si} + \\sum_j \\frac{d_j}{\\lambda_j} + R_{se}}`))
o.push(Q('DIN EN ISO 6946, Wärmedurchgangswiderstand homogener Schichten. R<sub>si</sub> = 0,13 (Wärmestrom horizontal), 0,10 (aufwärts), 0,17 (abwärts) m²K/W; R<sub>se</sub> = 0,04 m²K/W. Umsetzung: inhomogene Schichten (Dämmung zwischen Sparren) als flächengewichtetes λ<sub>eff</sub>.'))
o.push(`<div class="tw"><table><tr><th>Bauteil</th><th>Rechnung</th><th class="n">U</th><th class="n">ΔU<sub>TB</sub></th></tr>`)
for (const b of p.bauteile as any[]) {
  let rechnung = `<span class="small">${esc(b.notiz || 'direkter U-Wert')}</span>`
  if (b.schichten.length) {
    const { rsi, rse } = uebergang(b.kategorie)
    const summe = b.schichten.map((s: any) => `\\frac{${t(s.dicke, 3)}}{${t(s.lambda, 3)}}`).join(' + ')
    const r = rsi + rse + b.schichten.reduce((x: number, s: any) => x + s.dicke / s.lambda, 0)
    rechnung = m(`U = \\frac{1}{${t(rsi, 2)} + ${summe} + ${t(rse, 2)}} = \\frac{1}{${t(r, 3)}} = ${t(1 / r, 3)}`) +
      `<br><span class="small">${b.schichten.map((s: any) => esc(s.material)).join(' · ')}</span>`
  }
  o.push(`<tr><td>${esc(b.name)}<br><span class="small">${b.id}</span></td><td>${rechnung}</td><td class="n">${f(b.u, 2)}</td><td class="n">${f(b.deltaUTb, 2)}</td></tr>`)
}
o.push(`</table></div>`)
o.push(`<p class="small">${m('\\Delta U_{TB}')}: pauschaler Wärmebrückenzuschlag. Grundlage DIN/TS 12831-1 (pauschaler Ansatz). Umsetzung: 0,10 W/(m²K) für alle Außenbauteile, 0 für Innenbauteile.</p>`)

// Erdreich
if (webErd) {
  const th = 20 - p.optionen.erdreichB * (20 - thE)
  o.push(`<h4>Bodenplatte auf Erdreich (Option „wie heizlast-web“)</h4>`)
  o.push(M(`\\theta_{u,g} = 20 - b_g\\,(20 - \\theta_e) = 20 - ${t(p.optionen.erdreichB, 2)} \\cdot (20 - ${tk(thE, 0)}) = ${t(th, 1)}\\,°\\mathrm{C}, \\qquad \\Phi_{T,g} = A\\,(U + \\Delta U_{TB})\\,(\\theta_{int} - \\theta_{u,g})`))
  o.push(Q('Rechenoption zum Vergleich mit heizlast-web: Erdreich wie ein unbeheizter Nachbarbereich mit Temperaturkorrektur b (DIN EN 12831-1). Nicht das Erdreichverfahren nach DIN EN ISO 13370.'))
}
if (!webErd && erg.bStrich !== null) {
  const fb = p.bauteile.find((b: any) => b.kategorie === 'FB') as any
  let ag = 0
  for (const r of p.raeume as any[])
    for (const fl of r.flaechen) {
      const tt = bt.get(fl.bauteilId) as any
      if (fl.angrenzung.art === 'erdreich' && tt?.kategorie === 'FB') ag += bruttoFlaeche(fl, geschossVon(p, r))
    }
  const umfang = ag / (0.5 * erg.bStrich)
  const w = 0.3
  const rf = Math.max(1 / fb.u - 0.17 - 0.04, 0)
  const dt = w + LAMBDA_ERDREICH * (0.17 + rf + 0.04)
  const bs = erg.bStrich
  const ueq = dt < bs ? ((2 * LAMBDA_ERDREICH) / (Math.PI * bs + dt)) * Math.log((Math.PI * bs) / dt + 1) : LAMBDA_ERDREICH / (0.457 * bs + dt)
  o.push(`<h4>Bodenplatte auf Erdreich</h4>`)
  o.push(M(`B' = \\frac{A_g}{0{,}5\\,P} = \\frac{${t(ag, 2)}}{0{,}5 \\cdot ${t(umfang, 2)}} = ${t(bs, 2)}\\,\\mathrm{m}`))
  o.push(M(`R_f = \\frac{1}{U} - R_{si} - R_{se} = \\frac{1}{${t(fb.u, 2)}} - 0{,}17 - 0{,}04 = ${t(rf, 3)}\\,\\mathrm{m^2K/W}`))
  o.push(M(`d_t = w + \\lambda_g\\,(R_{si} + R_f + R_{se}) = ${t(w, 2)} + ${t(LAMBDA_ERDREICH, 1)} \\cdot (0{,}17 + ${t(rf, 3)} + 0{,}04) = ${t(dt, 3)}\\,\\mathrm{m}`))
  o.push(dt < bs
    ? M(`d_t < B': \\quad U_{equiv} = \\frac{2\\,\\lambda_g}{\\pi B' + d_t}\\,\\ln\\!\\left(\\frac{\\pi B'}{d_t} + 1\\right) = \\frac{2 \\cdot ${t(LAMBDA_ERDREICH, 1)}}{\\pi \\cdot ${t(bs, 2)} + ${t(dt, 3)}}\\,\\ln\\!\\left(\\frac{\\pi \\cdot ${t(bs, 2)}}{${t(dt, 3)}} + 1\\right) = ${t(ueq, 3)}\\,\\mathrm{W/(m^2K)}`)
    : M(`d_t \\ge B': \\quad U_{equiv} = \\frac{\\lambda_g}{0{,}457\\,B' + d_t} = ${t(ueq, 3)}\\,\\mathrm{W/(m^2K)}`))
  o.push(M(`\\Phi_{T,g} = A \\cdot U_{equiv} \\cdot f_{g1} \\cdot G_w \\cdot (\\theta_{int} - \\theta_{m,e})`))
  o.push(Q('DIN EN ISO 13370, Bodenplatte auf Erdreich (charakteristisches Bodenmaß B\', wirksame Dicke d<sub>t</sub>). Temperaturbezug über f<sub>g1</sub> (Jahresschwankung) und f<sub>g2</sub> = (θ<sub>int</sub> − θ<sub>m,e</sub>)/(θ<sub>int</sub> − θ<sub>e</sub>) nach DIN EN 12831; f<sub>g2</sub>·(θ<sub>int</sub> − θ<sub>e</sub>) ist oben bereits eingesetzt. Umsetzung: Umfang P für einen quadratischen Grundriss geschätzt, Wanddicke w = 0,3 m.'))
}

// ---------------------------------------------------------------- C Räume
o.push(`<h3>C Raumweise Heizlast</h3>`)
o.push(M(`\\Phi_{T,i} = \\sum_k A_k\\,(U_k + \\Delta U_{TB})\\,(\\theta_{int,i} - \\theta_{adj,k})`))
o.push(M(`\\theta_{u} = \\theta_{int} - b_u\\,(\\theta_{int} - \\theta_e) \\quad \\text{(unbeheizter Nachbarbereich)}`))
o.push(Q('DIN EN 12831-1, Transmissionswärmeverlust über die Raumhülle zu außen, unbeheizten Bereichen (Temperaturkorrektur b<sub>u</sub>), Nachbarräumen anderer Temperatur und Erdreich. Umsetzung: Wandflächen netto (ohne Öffnungen) aus Außenmaßen × Geschosshöhe, Öffnungen einzeln.'))
o.push(M(`\\Phi_{V,i} = \\rho\\,c_p \\cdot \\dot V_i \\cdot (\\theta_{int,i} - \\theta_e), \\qquad \\dot V_i = \\max(\\dot V_{inf,i},\\ \\dot V_{min,i})`))
o.push(M(`\\dot V_{min,i} = n_{min}\\,V_i, \\qquad \\dot V_{inf,i} = 2\\,V_i\\,n_{50}\\,e_i\\,\\varepsilon_i`))
o.push(Q('DIN EN 12831-1 / DIN/TS 12831-1, Lüftungswärmeverlust aus hygienischem Mindestluftwechsel und Infiltration. Umsetzung: Infiltration aus n<sub>50</sub> mit Abschirmkoeffizient e (keine/mittel/gut, eine bzw. mehrere exponierte Fassaden: 0,03/0,05 · 0,02/0,03 · 0,01/0,02) und Höhenkorrektur ε = 1 (Gebäude &lt; 10 m) nach dem bewährten Ansatz der DIN EN 12831; ohne Lüftungsanlage.'))
for (const e of erg.raeume) {
  const r = p.raeume.find((x: any) => x.id === e.raumId)!
  const dTe = e.thetaInt - thE
  const fass = exponierteFassaden(r, bt as any)
  const eK = abschirmKoeffizient(p.gebaeude.abschirmung, fass)
  o.push(`<h4>${esc(e.nummer)} ${esc(e.name)} <span class="small">(${esc(e.geschoss)}, ${m(`\\theta_{int} = ${t(e.thetaInt, 0)}\\,°\\mathrm{C}`)}, ${m(`A = ${t(e.grundflaeche, 2)}\\,\\mathrm{m^2}`)}, ${m(`V = ${t(e.volumen, 1)}\\,\\mathrm{m^3}`)})</span></h4>`)
  o.push(`<div class="tw"><table class="proto"><tr><th>Posten</th><th>Ori.</th><th>Angrenzung</th><th>Rechnung ${m('A \\cdot U_{korr} \\cdot \\Delta\\theta')}</th><th class="n">Φ W</th></tr>`)
  for (const x of e.posten) {
    const dt = e.thetaInt - x.thetaAdj
    const sub = x.oeffnungId ? ' class="sub"' : ''
    const rech = x.art === 'erdreich' && !webErd
      ? m(`${t(x.flaeche, 2)} \\cdot ${t(x.uKorr, 3)} \\cdot ${t(F_G1, 2)} \\cdot ${t(G_W, 1)} \\cdot (${t(e.thetaInt, 0)} - ${t(x.thetaAdj, 1)})`)
      : m(`${t(x.flaeche, 2)} \\cdot ${t(x.uKorr, 3)} \\cdot (${t(e.thetaInt, 0)} - ${tk(x.thetaAdj, 1)})`)
    o.push(`<tr${sub}><td>${x.oeffnungId ? '↳ ' : ''}${esc(x.bezeichnung)}</td><td>${x.orientierung}</td><td>${ART[x.art] ?? x.art}</td><td>${rech}${dt === 0 ? '' : ''}</td><td class="n">${f(x.phi, 0)}</td></tr>`)
  }
  o.push(`<tr class="zw"><td colspan="4">${m(`\\Phi_{T,i} = \\sum \\Phi_k`)}</td><td class="n">${f(e.phiT, 0)}</td></tr>`)
  o.push(`<tr><td colspan="4">${m(`\\dot V_{min} = ${t(r.nMin, 1)} \\cdot ${t(e.volumen, 1)} = ${t(e.vMin, 1)}`)}; ${m(`\\dot V_{inf} = 2 \\cdot ${t(e.volumen, 1)} \\cdot ${t(p.gebaeude.n50, 1)} \\cdot ${t(eK, 2)} \\cdot 1 = ${t(e.vInf, 1)}`)} (${fass} exponierte Fassade${fass === 1 ? '' : 'n'})<br>${m(`\\Phi_{V,i} = ${t(RHO_CP_LUFT, 2)} \\cdot ${t(e.vWirksam, 1)} \\cdot (${t(e.thetaInt, 0)} - ${tk(thE, 0)})`)}</td><td class="n">${f(e.phiV, 0)}</td></tr>`)
  o.push(`<tr class="sum"><td colspan="4">${m(`\\Phi_{HL,i} = ${t(e.phiT, 0)} + ${t(e.phiV, 0)}`)} &nbsp;(${f(e.wProM2, 0)} W/m²)</td><td class="n">${f(e.phiHL, 0)}</td></tr>`)
  o.push(`</table></div>`)
}
o.push(`<p class="small">U<sub>korr</sub> = U + ΔU<sub>TB</sub> (Erdreich: U<sub>equiv</sub>). ↳ = Öffnung in der darüberstehenden Fläche. Volumenströme in m³/h.</p>`)

// ---------------------------------------------------------------- D Gebäude
const vGeb = erg.raeume.map((e: any) => Math.max(0.5 * e.vInf, e.vMin))
o.push(`<h3>D Gebäudeheizlast</h3>`)
if (webGeb) {
  o.push(M(`\\Phi_{HL} = \\sum_i \\Phi_{T,i} + \\sum_i \\Phi_{V,i}`))
  o.push(Q('Rechenoption zum Vergleich mit heizlast-web: Gebäudeheizlast als Summe der Raumheizlasten (Innenbauteile und volle Infiltration je Raum eingeschlossen).'))
} else {
  o.push(M(`\\Phi_{HL} = \\sum_{\\text{Hülle}} \\Phi_{T} + \\rho\\,c_p \\sum_i \\max(0{,}5\\,\\dot V_{inf,i},\\ \\dot V_{min,i})\\,(\\theta_{int,i} - \\theta_e)`))
  o.push(Q('DIN EN 12831-1, Gebäudeheizlast: Wärmeströme zwischen beheizten Räumen heben sich auf, Infiltration wirkt nicht an allen Fassaden gleichzeitig. Umsetzung: Gleichzeitigkeit der Infiltration 0,5.'))
}
o.push(M(`\\Phi_{HL} = ${t(erg.phiT, 0)} + ${t(erg.phiV, 0)} = ${t(erg.phiHL, 0)}\\,\\mathrm{W}, \\qquad \\textstyle\\sum \\dot V = ${t(vGeb.reduce((s: number, x: number) => s + x, 0), 1)}\\,\\mathrm{m^3/h}`))
o.push(M(`H = \\frac{\\Phi_{HL}}{20 - \\theta_e} = \\frac{${t(erg.phiHL, 0)}}{20 - ${tk(thE, 0)}} = ${t(erg.h, 1)}\\,\\mathrm{W/K}, \\qquad \\frac{\\Phi_{HL}}{A} = \\frac{${t(erg.phiHL, 0)}}{${t(erg.wohnflaeche, 1)}} = ${t(erg.wProM2, 1)}\\,\\mathrm{W/m^2}`))
o.push(`<p class="small">Summe der Raumheizlasten zum Vergleich: ${f(erg.summeRaeume, 0)} W (für die Heizkörperauslegung je Raum maßgebend).</p>`)

// ---------------------------------------------------------------- E Heizkörper
const sigma = p.anlage.zielSpreizung > 0 ? p.anlage.zielSpreizung : 10
o.push(`<h3>E Heizkörper-Auslegung bei θ<sub>e</sub></h3>`)
o.push(M(`\\Phi = \\Phi_N \\left(\\frac{\\Delta T_{log}}{${t(DT_LOG_N, 2)}\\,\\mathrm{K}}\\right)^{n}, \\qquad \\Delta T_{log} = \\frac{VL - RL}{\\ln\\dfrac{VL - \\theta_i}{RL - \\theta_i}}`))
o.push(Q('DIN EN 442-2, Kennlinie der Heizkörperleistung; Normleistung Φ<sub>N</sub> bei 75/65/20 °C (ΔT<sub>log</sub> = 49,83 K), Exponent n (Platte/Glieder 1,3, Badheizkörper 1,25, Fußbodenheizung 1,1). Umsetzung: Heizkörper + Rücklaufschleife als ein Element mit leistungsgewichtetem n; Fußbodenheizung über dieselbe Kennlinie angenähert.'))
o.push(`<p>Nötiger Vorlauf je Raum: Aus Φ<sub>HL</sub> folgt das erforderliche ΔT<sub>log</sub>, mit der Spreizung σ = VL − RL die geschlossene Lösung für VL:</p>`)
o.push(M(`\\Delta T_{log,erf} = ${t(DT_LOG_N, 2)}\\left(\\frac{\\Phi_{HL}}{\\Phi_N}\\right)^{1/n}, \\qquad q = e^{\\sigma/\\Delta T_{log,erf}}, \\qquad VL_{erf} = \\theta_i + \\frac{\\sigma\\,q}{q - 1}`))
o.push(`<div class="tw"><table><tr><th>Raum</th><th>Rechnung</th><th class="n">VL<sub>erf</sub></th></tr>`)
for (const x of a.raeume) {
  const r = p.raeume.find((y: any) => y.id === x.raumId)!
  const n = r.heizkoerper[0]?.exponent
  if (!x.phiN || !n || x.vlNoetig === null) {
    o.push(`<tr><td>${esc(x.name)}</td><td class="small">${x.status === 'kein_hk' ? 'kein Heizkörper (wird über Nachbarräume mitversorgt)' : 'keine Auslegung'}</td><td class="n">–</td></tr>`)
    continue
  }
  const dt = DT_LOG_N * Math.pow(x.phiHL / x.phiN, 1 / n)
  const q = Math.exp(sigma / dt)
  o.push(`<tr><td>${esc(x.name)}</td><td>${m(`\\Delta T_{log} = ${t(DT_LOG_N, 2)}\\left(\\tfrac{${t(x.phiHL, 0)}}{${t(x.phiN, 0)}}\\right)^{1/${t(n, 2)}} = ${t(dt, 2)};\\ q = e^{${t(sigma, 0)}/${t(dt, 2)}} = ${t(q, 3)};\\ VL = ${t(x.thetaInt, 0)} + \\tfrac{${t(sigma, 0)} \\cdot ${t(q, 3)}}{${t(q - 1, 3)}}`)}</td><td class="n">${f(x.vlNoetig, 1)} °C</td></tr>`)
}
o.push(`</table></div>`)
o.push(M(`VL_{System} = \\max_i VL_{erf,i} = ${t(a.vorlauf, 1)}\\,°\\mathrm{C} \\quad (\\text{maßgebend: ${esc(a.raeume.find((x: any) => x.raumId === a.massgebenderRaum)?.name ?? '–')}})`))
o.push(`<p>Beim Systemvorlauf stellt sich je Raum der Rücklauf so ein, dass genau Φ<sub>HL</sub> abgegeben wird (Ventil drosselt). Volumenstrom und Mischrücklauf:</p>`)
o.push(M(`\\dot m_i = \\frac{\\Phi_{HL,i}}{c_w\\,(VL - RL_i)}, \\quad c_w = ${t(C_WASSER, 3)}\\,\\mathrm{Wh/(kg\\,K)}, \\qquad RL_{Misch} = \\frac{\\sum \\dot m_i\\,RL_i}{\\sum \\dot m_i}`))
o.push(`<div class="tw"><table><tr><th>Raum</th><th>Rechnung ${m('\\dot m = \\Phi/(c_w\\,\\sigma_i)')}</th><th class="n">RL</th><th class="n">ṁ l/h</th></tr>`)
for (const x of a.raeume) {
  if (x.volumenstrom === null || x.rl === null || x.phiLiefer === null) continue
  o.push(`<tr><td>${esc(x.name)}</td><td>${m(`\\tfrac{${t(x.phiLiefer, 0)}}{${t(C_WASSER, 3)} \\cdot (${t(a.vorlauf, 1)} - ${t(x.rl, 1)})}`)}</td><td class="n">${f(x.rl, 1)}</td><td class="n">${f(x.volumenstrom, 0)}</td></tr>`)
}
o.push(`</table></div>`)
o.push(M(`RL_{Misch} = ${t(a.ruecklaufMisch, 1)}\\,°\\mathrm{C}, \\qquad \\textstyle\\sum \\dot m = ${t(a.volumenstromGesamt, 0)}\\,\\mathrm{l/h}`))
o.push(`<h4>Heizkurve</h4>`)
o.push(M(`\\frac{\\Phi(\\theta_a)}{\\Phi_{HL}} = \\frac{20 - \\theta_a}{20 - \\theta_e}, \\quad \\sigma(\\theta_a) = \\sigma_0\\,\\frac{\\Phi}{\\Phi_{HL}}, \\quad \\Delta T_{log}(\\theta_a) = \\Delta T_{log,0}\\left(\\frac{\\Phi}{\\Phi_{HL}}\\right)^{1/1{,}3}`))
o.push(M(`\\text{linear genähert:}\\quad VL = 20 + \\text{Niveau} + \\text{Steilheit}\\cdot(20 - \\theta_a) = 20 + ${t(a.niveau, 1)} + ${t(a.steilheit, 2)}\\,(20 - \\theta_a)`))
o.push(Q('Keine Normformel: Betriebspunkte bei Teillast aus der Heizkörperkennlinie (DIN EN 442-2) bei konstantem Volumenstrom, Raum 20 °C. Herstellerkurven (Steilheit) sind unterschiedlich definiert; die Tabelle VL(θ<sub>a</sub>) ist maßgebend.'))
o.push(`<div class="tw"><table><tr><th>θ<sub>a</sub> °C</th>${a.heizkurve.map((h: any) => `<th class="n">${f(h.aussen, 0)}</th>`).join('')}</tr>`)
o.push(`<tr><td>VL</td>${a.heizkurve.map((h: any) => `<td class="n">${f(h.vorlauf, 1)}</td>`).join('')}</tr>`)
o.push(`<tr><td>RL</td>${a.heizkurve.map((h: any) => `<td class="n">${f(h.ruecklauf, 1)}</td>`).join('')}</tr></table></div>`)

// ---------------------------------------------------------------- F Ventile
const pumpe = p.anlage.pumpenDruck ?? STANDARD_PUMPENDRUCK
o.push(`<h3>F Ventil-Voreinstellung</h3>`)
o.push(M(`\\Delta p_{Rohr} = 2\\,L \\cdot R \\cdot Z, \\qquad \\Delta p_{Ventil} = \\max(\\Delta p_{Pumpe} - \\Delta p_{Rohr},\\ 30\\,\\mathrm{mbar}), \\qquad k_{v,erf} = \\frac{\\dot V\\,[\\mathrm{m^3/h}]}{\\sqrt{\\Delta p_{Ventil}\\,[\\mathrm{bar}]}}`))
o.push(Q(`VDI/VDE 2173, Definition des k<sub>v</sub>-Werts (Durchfluss in m³/h bei 1 bar Druckverlust). Umsetzung: R = 1 mbar/m, Formteilzuschlag Z = 1,3, Leitungslänge L unbekannt → 10 m, Pumpendruck ${f(pumpe, 0)} mbar. Gewählt wird die kleinste Stufe mit k<sub>v</sub> ≥ k<sub>v,erf</sub> (gerundete Herstellerrichtwerte; bei abweichendem Ventilmodell Herstellerdiagramm verwenden).`))
o.push(`<div class="tw"><table><tr><th>Raum</th><th>Ventil</th><th>Rechnung</th><th class="n">Stufe</th></tr>`)
for (const v of ve) {
  const rech = m(`k_{v,erf} = \\frac{${t(v.volumenstrom / 1000, 4)}}{\\sqrt{${t(v.dpVentil / 1000, 3)}}} = ${t(v.kvErforderlich, 3)}`)
  o.push(`<tr><td>${esc(v.raumName)}</td><td>${esc(v.ventil || '–')}</td><td>${rech}</td><td class="n">${esc(v.einstellung ?? '–')}</td></tr>`)
}
o.push(`</table></div>`)
if (a.warnungen.length) o.push(`<p class="small">Hinweise der Berechnung: ${a.warnungen.map(esc).join(' · ')}</p>`)
o.push(`</section>`)
console.log(o.join('\n'))
