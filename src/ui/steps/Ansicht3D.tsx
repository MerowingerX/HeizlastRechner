/**
 * 3D-Ansicht des Gebäudes (three.js). Räume als Quader aus der Grundriss-Lage,
 * gestapelt nach Geschossen, eingefärbt nach W/m². Export als .glb für Blender.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { berechne, type RaumErgebnis } from '../../core/berechnung'
import type { Orientierung, Projekt, Raum } from '../../core/model'
import { useProjekt } from '../../store'
import { Abschnitt, fmt } from '../felder'
import { autoLage } from './Grundriss'

type Lage = NonNullable<Raum['lage']>

function farbe(wProM2: number | undefined): THREE.Color {
  if (wProM2 === undefined) return new THREE.Color(0x8892a0)
  const t = Math.min(Math.max((wProM2 - 40) / 120, 0), 1)
  return new THREE.Color().setHSL((120 - t * 120) / 360, 0.7, 0.5)
}

const HAUPTRICHTUNG: Partial<Record<Orientierung, 'N' | 'S' | 'O' | 'W'>> = { N: 'N', NO: 'N', NW: 'N', S: 'S', SO: 'S', SW: 'S', O: 'O', W: 'W' }

/** Lagen aller Räume (fehlende automatisch) je Geschoss. */
function lagen(p: Projekt): Map<string, Lage> {
  const m = new Map<string, Lage>()
  for (const g of p.geschosse) {
    const kopie = p.raeume.filter((r) => r.geschossId === g.id).map((r) => ({ ...r }))
    for (const r of kopie) {
      if (!r.lage) r.lage = autoLage(kopie, r)
      m.set(r.id, r.lage)
    }
  }
  return m
}

function baueSzene(p: Projekt, last: Map<string, RaumErgebnis>, abstand: number): { szene: THREE.Group; mitte: THREE.Vector3; groesse: number } {
  const gruppe = new THREE.Group()
  gruppe.name = p.meta.name
  const lageMap = lagen(p)
  const glas = new THREE.MeshStandardMaterial({ color: 0x9fd3ff, transparent: true, opacity: 0.85, roughness: 0.1 })
  const tuer = new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
  const kante = new THREE.LineBasicMaterial({ color: 0x222222 })
  const bauteil = new Map(p.bauteile.map((t) => [t.id, t]))
  const box = new THREE.Box3()
  let basis = 0
  for (const g of p.geschosse) {
    for (const r of p.raeume.filter((x) => x.geschossId === g.id)) {
      const l = lageMap.get(r.id) as Lage
      const h = r.lichteHoehe ?? g.lichteHoehe
      const e = last.get(r.id)
      const mat = new THREE.MeshStandardMaterial({ color: farbe(e?.wProM2), transparent: true, opacity: 0.8 })
      const geo = new THREE.BoxGeometry(l.breite, h, l.tiefe)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(l.x + l.breite / 2, basis + h / 2, l.y + l.tiefe / 2)
      mesh.name = r.name
      mesh.userData = { raumId: r.id, info: `${g.name} · ${r.name}: ${e ? `${fmt(e.phiHL, 0)} W, ${fmt(e.wProM2, 0)} W/m²` : '–'}` }
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), kante))
      gruppe.add(mesh)
      box.expandByObject(mesh)

      // Öffnungen auf der passenden Außenseite verteilen
      for (const f of r.flaechen) {
        const seite = HAUPTRICHTUNG[f.orientierung]
        if (!seite || f.oeffnungen.length === 0) continue
        const einzel = f.oeffnungen.flatMap((o) => Array.from({ length: o.anzahl }, () => o))
        const seitenLaenge = seite === 'N' || seite === 'S' ? l.breite : l.tiefe
        einzel.forEach((o, i) => {
          const kat = bauteil.get(o.bauteilId)?.kategorie
          const b = Math.min(o.breite, seitenLaenge / einzel.length - 0.1)
          const hoehe = Math.min(o.hoehe, h - 0.1)
          const unten = kat === 'AT' || kat === 'IT' || o.hoehe > 1.8 ? 0 : Math.min(0.9, h - hoehe - 0.1)
          const pos = ((i + 0.5) / einzel.length) * seitenLaenge
          const platte = new THREE.Mesh(new THREE.BoxGeometry(seite === 'N' || seite === 'S' ? b : 0.06, hoehe, seite === 'N' || seite === 'S' ? 0.06 : b), kat === 'AT' ? tuer : glas)
          const y = basis + unten + hoehe / 2
          if (seite === 'N') platte.position.set(l.x + pos, y, l.y - 0.03)
          if (seite === 'S') platte.position.set(l.x + pos, y, l.y + l.tiefe + 0.03)
          if (seite === 'W') platte.position.set(l.x - 0.03, y, l.y + pos)
          if (seite === 'O') platte.position.set(l.x + l.breite + 0.03, y, l.y + pos)
          platte.name = `${r.name} ${o.bezeichnung || kat}`
          gruppe.add(platte)
        })
      }
    }
    basis += g.geschosshoehe + abstand
  }
  const mitte = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3())
  const groesse = box.isEmpty() ? 10 : box.getSize(new THREE.Vector3()).length()
  return { szene: gruppe, mitte, groesse }
}

export default function Ansicht3D() {
  const p = useProjekt((s) => s.projekt)
  const rahmen = useRef<HTMLDivElement>(null)
  const [abstand, setAbstand] = useState(0)
  const [info, setInfo] = useState('')
  const gruppeRef = useRef<THREE.Group | null>(null)
  const last = useMemo(() => {
    try {
      return new Map(berechne(p).raeume.map((r) => [r.raumId, r]))
    } catch {
      return new Map<string, RaumErgebnis>()
    }
  }, [p])

  useEffect(() => {
    const el = rahmen.current
    if (!el) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    const breite = el.clientWidth
    const hoehe = 520
    renderer.setSize(breite, hoehe)
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2))
    const sonne = new THREE.DirectionalLight(0xffffff, 1.5)
    sonne.position.set(10, 20, 15) // von Süden
    scene.add(sonne)
    const { szene, mitte, groesse } = baueSzene(p, last, abstand)
    gruppeRef.current = szene
    scene.add(szene)
    const boden = new THREE.GridHelper(60, 60, 0x999999, 0xcccccc)
    boden.position.set(mitte.x, -0.01, mitte.z)
    scene.add(boden)
    // Nordpfeil
    const pfeil = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(mitte.x, 0.05, mitte.z - groesse / 2 - 1), 2, 0xc2410c, 0.6, 0.4)
    scene.add(pfeil)
    const kamera = new THREE.PerspectiveCamera(45, breite / hoehe, 0.1, 500)
    kamera.position.set(mitte.x + groesse * 0.8, mitte.y + groesse * 0.7, mitte.z + groesse * 1.0)
    const steuerung = new OrbitControls(kamera, renderer.domElement)
    steuerung.target.copy(mitte)
    steuerung.update()
    const ray = new THREE.Raycaster()
    const zeiger = new THREE.Vector2()
    const bewegen = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      zeiger.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(zeiger, kamera)
      const treffer = ray.intersectObjects(szene.children, false).find((t) => t.object.userData.info)
      setInfo(treffer ? (treffer.object.userData.info as string) : '')
    }
    renderer.domElement.addEventListener('pointermove', bewegen)
    let lauf = true
    const schleife = () => {
      if (!lauf) return
      renderer.render(scene, kamera)
      requestAnimationFrame(schleife)
    }
    schleife()
    const groesseAnpassen = () => {
      const w = el.clientWidth
      renderer.setSize(w, hoehe)
      kamera.aspect = w / hoehe
      kamera.updateProjectionMatrix()
    }
    window.addEventListener('resize', groesseAnpassen)
    return () => {
      lauf = false
      window.removeEventListener('resize', groesseAnpassen)
      renderer.domElement.removeEventListener('pointermove', bewegen)
      steuerung.dispose()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose()
      })
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [p, last, abstand])

  const exportieren = async () => {
    const g = gruppeRef.current
    if (!g) return
    const daten = (await new GLTFExporter().parseAsync(g, { binary: true })) as ArrayBuffer
    const url = URL.createObjectURL(new Blob([daten], { type: 'model/gltf-binary' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${p.meta.name || 'gebaeude'}.glb`
    a.click()
    URL.revokeObjectURL(url)
  }

  const ohneLage = p.raeume.filter((r) => !r.lage).length
  return (
    <Abschnitt
      titel="3D-Ansicht"
      aktion={
        <span className="knopfleiste">
          <label className="klein">
            Geschosse spreizen{' '}
            <input type="range" min={0} max={4} step={0.5} value={abstand} onChange={(e) => setAbstand(Number(e.target.value))} />
          </label>
          <button onClick={exportieren}>Export .glb (Blender)</button>
        </span>
      }
    >
      <div ref={rahmen} className="dreid" />
      <p className="klein">
        {info || 'Maus über einen Raum: Heizlast. Ziehen = drehen, Rad = zoomen, rechte Maustaste = verschieben.'}
        {ohneLage > 0 && ` ${ohneLage} Räume ohne Grundriss-Lage wurden automatisch angeordnet – im Grundriss platzieren.`}
      </p>
    </Abschnitt>
  )
}
