// src/modules/CinematicIntro/ThreeCanvas.tsx
// High-performance Three.js 3D isometric cinematic command center

import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { IntroScene, CinematicProjectData } from './types'

function getInitials(name: string): string {
  if (!name) return 'QA'
  const clean = name.replace(/\(.*?\)/g, '').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'QA'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface ThreeCanvasProps {
  activeScene: IntroScene
  onSceneProgress?: (progress: number) => void
  isInteractive?: boolean
  selectedPanelId?: string | null
  onPanelClick?: (panelId: string) => void
  projectData?: CinematicProjectData | null
  isDark?: boolean
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  activeScene,
  isInteractive = true,
  selectedPanelId,
  onPanelClick,
  projectData,
  isDark = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const isModalOpenRef = useRef(false)

  useEffect(() => {
    isModalOpenRef.current = !!selectedPanelId
  }, [selectedPanelId])
  const sceneStateRef = useRef<{
    activeScene: IntroScene
    mouseTarget: THREE.Vector2
    mouseCurrent: THREE.Vector2
    isDragging: boolean
    previousMousePosition: { x: number; y: number }
    cameraAngleOffset: { x: number; y: number }
    zoomTarget: number
    zoomCurrent: number
  }>({
    activeScene,
    mouseTarget: new THREE.Vector2(0, 0),
    mouseCurrent: new THREE.Vector2(0, 0),
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    cameraAngleOffset: { x: 0, y: 0 },
    zoomTarget: 0,
    zoomCurrent: 0,
  })

  // Keep scene state ref updated
  useEffect(() => {
    sceneStateRef.current.activeScene = activeScene
  }, [activeScene])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let width = container.clientWidth || window.innerWidth
    let height = container.clientHeight || window.innerHeight

    // ── Three.js Scene Setup (Theme Responsive) ─────────────────────────────
    const scene = new THREE.Scene()
    const bgColor = isDark ? 0x0c141a : 0xf1f5f4
    const fogColor = isDark ? 0x0c141a : 0xeaf0ee
    scene.background = new THREE.Color(bgColor)
    scene.fog = new THREE.FogExp2(fogColor, 0.015)

    // Camera setup - Isometric perspective
    const aspect = width / height
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 1000)
    const baseCamPos = new THREE.Vector3(22, 21, 22)
    const baseCamLook = new THREE.Vector3(0, 1.8, 0)
    camera.position.copy(baseCamPos)
    camera.lookAt(baseCamLook)

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = isDark ? 1.15 : 1.08
    container.appendChild(renderer.domElement)

    // ── Lighting System ───────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(isDark ? 0x223c48 : 0xdde8e5, isDark ? 1.4 : 1.25)
    scene.add(ambientLight)

    // Main studio key light (soft shadow)
    const keyLight = new THREE.DirectionalLight(isDark ? 0xe0f7fa : 0xffffff, isDark ? 1.5 : 1.4)
    keyLight.position.set(16, 28, 14)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 1024
    keyLight.shadow.mapSize.height = 1024
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 70
    const d = 16
    keyLight.shadow.camera.left = -d
    keyLight.shadow.camera.right = d
    keyLight.shadow.camera.top = d
    keyLight.shadow.camera.bottom = -d
    keyLight.shadow.bias = -0.0004
    scene.add(keyLight)

    // Subtle fill light
    const fillLight = new THREE.DirectionalLight(isDark ? 0x1b303a : 0xd8e8e3, 0.6)
    fillLight.position.set(-14, 15, -12)
    scene.add(fillLight)

    // Perimeter accent lights: Cyan/Mint & Coral/Orange
    const cyanAccentLight = new THREE.PointLight(0x00f2fe, isDark ? 3.0 : 2.4, 28, 1.5)
    cyanAccentLight.position.set(-7, 2, -6)
    scene.add(cyanAccentLight)

    const coralAccentLight = new THREE.PointLight(0xff7557, isDark ? 2.8 : 2.2, 28, 1.5)
    coralAccentLight.position.set(7, 2, 7)
    scene.add(coralAccentLight)

    // Central AI emblem glow light
    const emblemLight = new THREE.PointLight(0xffffff, 2.0, 14, 1.2)
    emblemLight.position.set(0, 4.4, 0)
    scene.add(emblemLight)

    // ── Ground Plane & Floor Circuit Traces ───────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(80, 80)
    const floorMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0c141a : 0xebf2f0,
      roughness: 0.75,
      metalness: isDark ? 0.2 : 0.05,
    })
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.y = -0.02
    floorMesh.receiveShadow = true
    scene.add(floorMesh)

    // Schematic circuit lines texture on the ground
    const createCircuitTexture = () => {
      const cvs = document.createElement('canvas')
      cvs.width = 1024
      cvs.height = 1024
      const ctx = cvs.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ebf2f0'
        ctx.fillRect(0, 0, 1024, 1024)

        ctx.strokeStyle = '#cddcd7'
        ctx.lineWidth = 1.8

        const drawTrace = (pts: Array<[number, number]>) => {
          ctx.beginPath()
          ctx.moveTo(pts[0][0], pts[0][1])
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0], pts[i][1])
          }
          ctx.stroke()

          // End dot
          const last = pts[pts.length - 1]
          ctx.fillStyle = '#b7ccc6'
          ctx.beginPath()
          ctx.arc(last[0], last[1], 4, 0, Math.PI * 2)
          ctx.fill()
        }

        // Trace paths radiating from center outwards
        drawTrace([[512, 512], [300, 512], [240, 420], [160, 420]])
        drawTrace([[512, 512], [720, 512], [780, 600], [880, 600]])
        drawTrace([[512, 512], [512, 300], [420, 220], [420, 140]])
        drawTrace([[512, 512], [512, 720], [600, 800], [600, 900]])
        drawTrace([[400, 400], [280, 400], [220, 320]])
        drawTrace([[624, 624], [744, 624], [804, 724]])
      }
      const tex = new THREE.CanvasTexture(cvs)
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(1, 1)
      return tex
    }
    floorMat.map = createCircuitTexture()
    floorMat.needsUpdate = true

    // ── Floating Platform Construction ────────────────────────────────────────
    const platformGroup = new THREE.Group()
    scene.add(platformGroup)

    // Rounded rectangle helper
    const createRoundedRectShape = (w: number, h: number, r: number) => {
      const shape = new THREE.Shape()
      const x = -w / 2
      const y = -h / 2
      shape.moveTo(x + r, y)
      shape.lineTo(x + w - r, y)
      shape.quadraticCurveTo(x + w, y, x + w, y + r)
      shape.lineTo(x + w, y + h - r)
      shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      shape.lineTo(x + r, y + h)
      shape.quadraticCurveTo(x, y + h, x, y + h - r)
      shape.lineTo(x, y + r)
      shape.quadraticCurveTo(x, y, x + r, y)
      return shape
    }

    // Tier 1: Sub-base slab (shadow caster)
    const baseShape = createRoundedRectShape(14.8, 14.8, 2.2)
    const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.15,
      bevelThickness: 0.15,
    })
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xd4e2de,
      roughness: 0.6,
      metalness: 0.1,
    })
    const baseMesh = new THREE.Mesh(baseGeo, baseMat)
    baseMesh.rotation.x = -Math.PI / 2
    baseMesh.position.y = 0.25
    baseMesh.castShadow = true
    baseMesh.receiveShadow = true
    platformGroup.add(baseMesh)

    // Tier 2: Main Elevated Deck
    const deckShape = createRoundedRectShape(13.6, 13.6, 1.8)
    const deckGeo = new THREE.ExtrudeGeometry(deckShape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.12,
    })
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0xf3f8f6,
      roughness: 0.35,
      metalness: 0.15,
    })
    const deckMesh = new THREE.Mesh(deckGeo, deckMat)
    deckMesh.rotation.x = -Math.PI / 2
    deckMesh.position.y = 0.72
    deckMesh.castShadow = true
    deckMesh.receiveShadow = true
    platformGroup.add(deckMesh)

    // Tier 3: Glowing Perimeter Neon Tracks (Reference Image Detail)
    // Cyan/Mint track on top/left edge, Coral/Orange track on bottom/right edge
    const createPerimeterTrack = (colorHex: number, startAngle: number, endAngle: number, rx: number, rz: number) => {
      const curvePts: THREE.Vector3[] = []
      const segments = 48
      for (let i = 0; i <= segments; i++) {
        const theta = startAngle + (i / segments) * (endAngle - startAngle)
        // Approximate rounded rect perimeter
        const cosT = Math.cos(theta)
        const sinT = Math.sin(theta)
        const x = Math.sign(cosT) * Math.min(Math.abs(cosT) * rx * 1.3, rx)
        const z = Math.sign(sinT) * Math.min(Math.abs(sinT) * rz * 1.3, rz)
        curvePts.push(new THREE.Vector3(x, 0.74, z))
      }
      const curve = new THREE.CatmullRomCurve3(curvePts)
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.07, 8, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 3.2,
        roughness: 0.2,
      })
      return new THREE.Mesh(tubeGeo, tubeMat)
    }

    const cyanTrack = createPerimeterTrack(0x00f2fe, Math.PI * 0.55, Math.PI * 1.55, 6.7, 6.7)
    platformGroup.add(cyanTrack)

    const coralTrack = createPerimeterTrack(0xff7557, -Math.PI * 0.45, Math.PI * 0.55, 6.7, 6.7)
    platformGroup.add(coralTrack)

    // Corner Plants (Reference image architectural detail)
    const cornerPlantGroup = new THREE.Group()
    const plantPositions = [
      [-6.2, 0.85, -6.2],
      [6.2, 0.85, -6.2],
      [-6.2, 0.85, 6.2],
      [6.2, 0.85, 6.2],
    ]
    const potGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.35, 16)
    const potMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    const plantFoliageGeo = new THREE.DodecahedronGeometry(0.22, 1)
    const plantFoliageMat = new THREE.MeshStandardMaterial({ color: 0x4a7c6d, roughness: 0.8 })

    plantPositions.forEach(([px, py, pz]) => {
      const pot = new THREE.Mesh(potGeo, potMat)
      pot.position.set(px, py + 0.17, pz)
      pot.castShadow = true
      cornerPlantGroup.add(pot)

      const foliage = new THREE.Mesh(plantFoliageGeo, plantFoliageMat)
      foliage.position.set(px, py + 0.45, pz)
      foliage.scale.set(1, 1.25, 1)
      foliage.castShadow = true
      cornerPlantGroup.add(foliage)
    })
    platformGroup.add(cornerPlantGroup)

    // Glass Holographic Security Shield (Front edge of platform)
    const shieldShape = new THREE.Shape()
    shieldShape.moveTo(0, 0.5)
    shieldShape.lineTo(0.35, 0.35)
    shieldShape.lineTo(0.28, -0.2)
    shieldShape.lineTo(0, -0.45)
    shieldShape.lineTo(-0.28, -0.2)
    shieldShape.lineTo(-0.35, 0.35)
    shieldShape.closePath()
    const shieldGeo = new THREE.ShapeGeometry(shieldShape)
    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x98d4c9,
      transmission: 0.85,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1,
      ior: 1.4,
      side: THREE.DoubleSide,
    })
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat)
    shieldMesh.position.set(0, 1.35, 6.6)
    shieldMesh.rotation.y = Math.PI / 4
    platformGroup.add(shieldMesh)

    // ── Central Workspace Table & Props ───────────────────────────────────────
    const workspaceGroup = new THREE.Group()
    platformGroup.add(workspaceGroup)

    // Conference Table (modern beveled rounded-rectangle)
    const tableShape = createRoundedRectShape(6.2, 4.4, 0.9)
    const tableGeo = new THREE.ExtrudeGeometry(tableShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    })
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.1,
    })
    const tableMesh = new THREE.Mesh(tableGeo, tableMat)
    tableMesh.rotation.x = -Math.PI / 2
    tableMesh.position.y = 1.62
    tableMesh.castShadow = true
    tableMesh.receiveShadow = true
    workspaceGroup.add(tableMesh)

    // Center Tech Strip / Cable Well
    const wellGeo = new THREE.BoxGeometry(3.6, 0.02, 0.6)
    const wellMat = new THREE.MeshStandardMaterial({
      color: 0xd9e5e2,
      roughness: 0.4,
      metalness: 0.2,
    })
    const wellMesh = new THREE.Mesh(wellGeo, wellMat)
    wellMesh.position.set(0, 1.72, 0)
    workspaceGroup.add(wellMesh)

    // Table Sled Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x7a8e89, metalness: 0.8, roughness: 0.3 })
    const legPositions = [
      [-2.4, 1.25, -1.6],
      [2.4, 1.25, -1.6],
      [-2.4, 1.25, 1.6],
      [2.4, 1.25, 1.6],
    ]
    legPositions.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat)
      leg.position.set(lx, ly, lz)
      leg.castShadow = true
      workspaceGroup.add(leg)
    })

    // Laptops on table
    const laptopGroup = new THREE.Group()
    const laptopBaseGeo = new THREE.BoxGeometry(0.55, 0.02, 0.4)
    const laptopBaseMat = new THREE.MeshStandardMaterial({ color: 0xdce5e3, metalness: 0.6, roughness: 0.3 })
    const laptopScreenGeo = new THREE.BoxGeometry(0.55, 0.38, 0.02)
    const laptopScreenMat = new THREE.MeshStandardMaterial({
      color: 0x111e25,
      emissive: 0x4fd1c5,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    })

    const createLaptop = (x: number, z: number, rotY: number) => {
      const lp = new THREE.Group()
      const base = new THREE.Mesh(laptopBaseGeo, laptopBaseMat)
      base.castShadow = true
      lp.add(base)

      const screen = new THREE.Mesh(laptopScreenGeo, laptopScreenMat)
      screen.position.set(0, 0.18, -0.19)
      screen.rotation.x = -0.25
      lp.add(screen)

      lp.position.set(x, 1.73, z)
      lp.rotation.y = rotY
      return lp
    }

    laptopGroup.add(createLaptop(-1.6, -1.35, 0))
    laptopGroup.add(createLaptop(0, -1.4, 0))
    laptopGroup.add(createLaptop(1.6, -1.35, 0))
    laptopGroup.add(createLaptop(-1.6, 1.35, Math.PI))
    laptopGroup.add(createLaptop(0, 1.4, Math.PI))
    laptopGroup.add(createLaptop(1.6, 1.35, Math.PI))
    workspaceGroup.add(laptopGroup)

    // Ergonomic Chairs
    const chairGroup = new THREE.Group()
    const seatGeo = new THREE.BoxGeometry(0.65, 0.08, 0.65)
    const backGeo = new THREE.BoxGeometry(0.65, 0.65, 0.08)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x2d3a3d, roughness: 0.5 })
    const chairLegMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 })
    const chairLegGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.68, 6)

    const createChair = (x: number, z: number, rotY: number) => {
      const ch = new THREE.Group()
      const seat = new THREE.Mesh(seatGeo, chairMat)
      seat.position.y = 0.68
      seat.castShadow = true
      ch.add(seat)

      const back = new THREE.Mesh(backGeo, chairMat)
      back.position.set(0, 1.05, -0.3)
      back.castShadow = true
      ch.add(back)

      // Chair sled legs
      const l1 = new THREE.Mesh(chairLegGeo, chairLegMat)
      l1.position.set(-0.25, 0.34, -0.25)
      ch.add(l1)
      const l2 = new THREE.Mesh(chairLegGeo, chairLegMat)
      l2.position.set(0.25, 0.34, -0.25)
      ch.add(l2)
      const l3 = new THREE.Mesh(chairLegGeo, chairLegMat)
      l3.position.set(-0.25, 0.34, 0.25)
      ch.add(l3)
      const l4 = new THREE.Mesh(chairLegGeo, chairLegMat)
      l4.position.set(0.25, 0.34, 0.25)
      ch.add(l4)

      ch.position.set(x, 0.88, z)
      ch.rotation.y = rotY
      return ch
    }

    // Surround table with chairs
    const chairCoords = [
      [-1.8, -2.2, 0],
      [0, -2.25, 0],
      [1.8, -2.2, 0],
      [-1.8, 2.2, Math.PI],
      [0, 2.25, Math.PI],
      [1.8, 2.2, Math.PI],
      [-3.3, 0, Math.PI / 2],
      [3.3, 0, -Math.PI / 2],
    ]
    chairCoords.forEach(([cx, cz, crot]) => {
      chairGroup.add(createChair(cx, cz, crot))
    })
    workspaceGroup.add(chairGroup)

    // ── 3D Human Characters (Realistic & Professional) ────────────────────────
    // Build human character hierarchies with anatomical proportions and subtle idle animation
    const teamGroup = new THREE.Group()
    workspaceGroup.add(teamGroup)

    const charactersList: Array<{
      group: THREE.Group
      head: THREE.Mesh
      torso: THREE.Mesh
      baseTorsoY: number
      initialRot: THREE.Euler
      animPhase: number
      isStanding: boolean
    }> = []

    // Character materials
    const skinToneMat1 = new THREE.MeshStandardMaterial({ color: 0xdeb89a, roughness: 0.6 })
    const skinToneMat2 = new THREE.MeshStandardMaterial({ color: 0xd19c72, roughness: 0.6 })
    const skinToneMat3 = new THREE.MeshStandardMaterial({ color: 0xf5cfb3, roughness: 0.6 })
    const hairDarkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
    const hairBrownMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.8 })

    const suitDarkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 })
    const suitNavyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.5 })
    const shirtWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.4 })
    const suitSlateMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })

    // Nametag generator helper for characters (Theme Responsive & Compact)
    const createNametagSprite = (name: string, role: string, isSenior: boolean) => {
      const canvas = document.createElement('canvas')
      canvas.width = 460
      canvas.height = 120
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      // Rounded pill badge with shadow
      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)'
      ctx.beginPath()
      ctx.roundRect(8, 8, 444, 104, 52)
      ctx.fill()

      // Border glow
      ctx.lineWidth = 4
      ctx.strokeStyle = isSenior ? '#ff7557' : '#00f2fe'
      ctx.stroke()

      // Initials circle
      const initials = getInitials(name)
      ctx.fillStyle = isSenior ? '#ff7557' : '#00f2fe'
      ctx.beginPath()
      ctx.arc(60, 60, 36, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = 'bold 28px "Inter", sans-serif'
      ctx.fillStyle = isSenior ? '#ffffff' : '#042f2e'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(initials, 60, 62)

      // Name
      ctx.textAlign = 'left'
      ctx.font = 'bold 30px "Inter", "Segoe UI", sans-serif'
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a'
      const displayName = name.length > 18 ? name.slice(0, 17) + '…' : name
      ctx.fillText(displayName, 115, 50)

      // Role
      ctx.font = '500 22px "Inter", "Segoe UI", sans-serif'
      ctx.fillStyle = isSenior ? (isDark ? '#ff9b7a' : '#c2410c') : (isDark ? '#2dd4bf' : '#0f766e')
      const displayRole = role.length > 24 ? role.slice(0, 23) + '…' : role
      ctx.fillText(displayRole, 115, 84)

      const texture = new THREE.CanvasTexture(canvas)
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true,
        depthWrite: false,
      })
      const sprite = new THREE.Sprite(material)
      sprite.scale.set(1.05, 0.28, 1)
      return sprite
    }

    const createCharacter = (
      x: number,
      z: number,
      rotY: number,
      isStanding: boolean,
      suitMat: THREE.Material,
      skinMat: THREE.Material,
      hairMat: THREE.Material,
      phaseOffset: number,
      attendeeName?: string,
      attendeeRole?: string,
      isSenior?: boolean
    ) => {
      const charGroup = new THREE.Group()

      // Torso / Suit jacket
      const torsoGeo = new THREE.BoxGeometry(0.46, isStanding ? 0.62 : 0.56, 0.28)
      const torso = new THREE.Mesh(torsoGeo, suitMat)
      torso.position.y = isStanding ? 1.55 : 1.28
      torso.castShadow = true
      charGroup.add(torso)

      // Inner collared shirt / tie detail
      const shirtGeo = new THREE.BoxGeometry(0.2, 0.32, 0.05)
      const shirt = new THREE.Mesh(shirtGeo, shirtWhiteMat)
      shirt.position.set(0, isStanding ? 1.62 : 1.34, 0.13)
      charGroup.add(shirt)

      // Head & Neck
      const headGeo = new THREE.SphereGeometry(0.16, 16, 16)
      const head = new THREE.Mesh(headGeo, skinMat)
      head.position.set(0, isStanding ? 2.02 : 1.74, 0.02)
      head.castShadow = true
      charGroup.add(head)

      // Hair styling
      const hairGeo = new THREE.SphereGeometry(0.17, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)
      const hair = new THREE.Mesh(hairGeo, hairMat)
      hair.position.set(0, isStanding ? 2.04 : 1.76, 0.02)
      charGroup.add(hair)

      // Arms (natural posture)
      const armGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.52, 8)
      const leftArm = new THREE.Mesh(armGeo, suitMat)
      const rightArm = new THREE.Mesh(armGeo, suitMat)

      if (isStanding) {
        // Standing character with one arm slightly raised/gesturing
        leftArm.position.set(-0.31, 1.45, 0.02)
        leftArm.rotation.z = 0.12
        rightArm.position.set(0.31, 1.52, 0.12)
        rightArm.rotation.x = -0.45
        rightArm.rotation.z = -0.25
      } else {
        // Seated character with hands forward toward desk / typing
        leftArm.position.set(-0.28, 1.25, 0.18)
        leftArm.rotation.x = -0.85
        leftArm.rotation.z = 0.2
        rightArm.position.set(0.28, 1.25, 0.18)
        rightArm.rotation.x = -0.85
        rightArm.rotation.z = -0.2
      }
      leftArm.castShadow = true
      rightArm.castShadow = true
      charGroup.add(leftArm)
      charGroup.add(rightArm)

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.08, 0.07, isStanding ? 0.95 : 0.65, 8)
      if (isStanding) {
        const legL = new THREE.Mesh(legGeo, suitMat)
        legL.position.set(-0.14, 0.68, 0)
        legL.castShadow = true
        charGroup.add(legL)
        const legR = new THREE.Mesh(legGeo, suitMat)
        legR.position.set(0.14, 0.68, 0)
        legR.castShadow = true
        charGroup.add(legR)
      } else {
        // Seated upper thigh
        const thighGeo = new THREE.CylinderGeometry(0.08, 0.075, 0.45, 8)
        const thighL = new THREE.Mesh(thighGeo, suitMat)
        thighL.rotation.x = Math.PI / 2
        thighL.position.set(-0.14, 0.88, 0.22)
        charGroup.add(thighL)
        const thighR = new THREE.Mesh(thighGeo, suitMat)
        thighR.rotation.x = Math.PI / 2
        thighR.position.set(0.14, 0.88, 0.22)
        charGroup.add(thighR)

        // Seated lower leg
        const calfGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.58, 8)
        const calfL = new THREE.Mesh(calfGeo, suitMat)
        calfL.position.set(-0.14, 0.48, 0.42)
        charGroup.add(calfL)
        const calfR = new THREE.Mesh(calfGeo, suitMat)
        calfR.position.set(0.14, 0.48, 0.42)
        charGroup.add(calfR)
      }

      // Add Floating Nametag above character's head
      if (attendeeName) {
        const nametag = createNametagSprite(attendeeName, attendeeRole || 'QA Engineer', !!isSenior)
        if (nametag) {
          nametag.position.set(0, isStanding ? 2.22 : 1.88, 0)
          charGroup.add(nametag)
        }
      }

      charGroup.position.set(x, 0.88, z)
      charGroup.rotation.y = rotY

      charactersList.push({
        group: charGroup,
        head,
        torso,
        baseTorsoY: torso.position.y,
        initialRot: charGroup.rotation.clone(),
        animPhase: phaseOffset,
        isStanding,
      })

      return charGroup
    }

    // Resolve real attendee names from projectData
    const roster = projectData?.teamMembers || []
    const getMember = (idx: number, defaultName: string, defaultRole: string) => {
      const m = roster[idx]
      return {
        name: m?.name || defaultName,
        role: m?.role || defaultRole,
        isSenior: m?.role?.toLowerCase().includes('lead') || m?.role?.toLowerCase().includes('senior') || m?.role?.toLowerCase().includes('attendee') || m?.role?.toLowerCase().includes('director') || m?.role?.toLowerCase().includes('vp')
      }
    }

    const m0 = getMember(0, 'Sarah Jenkins', 'VP Quality & Operations')
    const m1 = getMember(1, 'Alex Morgan', 'Lead Automation Eng')
    const m2 = getMember(2, 'David Kim', 'Performance Architect')
    const m3 = getMember(3, 'Elena Rostova', 'Release Coordinator')
    const m4 = getMember(4, 'Marcus Chen', 'Senior Automation Eng')
    const m5 = getMember(5, 'Aria Thorne', 'Security & QA Specialist')
    const m6 = getMember(6, 'Devon Miller', 'Test Architect')
    const m7 = getMember(7, 'Sara Lin', 'Integration Engineer')
    const m8 = getMember(8, 'Tariq Al-Mansoor', 'AI Systems Lead')
    const m9 = getMember(9, 'Carlos Mendez', 'Platform QA Lead')

    // Add Seated Team Members around the table
    teamGroup.add(createCharacter(-1.8, -2.1, 0.05, false, suitDarkMat, skinToneMat1, hairDarkMat, 0.2, m0.name, m0.role, m0.isSenior))
    teamGroup.add(createCharacter(0, -2.15, 0, false, shirtWhiteMat, skinToneMat2, hairBrownMat, 1.4, m1.name, m1.role, m1.isSenior))
    teamGroup.add(createCharacter(1.8, -2.1, -0.05, false, suitNavyMat, skinToneMat3, hairDarkMat, 2.8, m2.name, m2.role, m2.isSenior))

    teamGroup.add(createCharacter(-1.8, 2.1, Math.PI - 0.05, false, suitSlateMat, skinToneMat2, hairBrownMat, 3.5, m3.name, m3.role, m3.isSenior))
    teamGroup.add(createCharacter(0, 2.15, Math.PI, false, suitNavyMat, skinToneMat1, hairDarkMat, 4.2, m4.name, m4.role, m4.isSenior))
    teamGroup.add(createCharacter(1.8, 2.1, Math.PI + 0.05, false, suitDarkMat, skinToneMat3, hairBrownMat, 5.1, m5.name, m5.role, m5.isSenior))

    // Seated Table Ends
    teamGroup.add(createCharacter(-3.2, 0, Math.PI / 2, false, suitSlateMat, skinToneMat1, hairDarkMat, 1.9, m6.name, m6.role, m6.isSenior))
    teamGroup.add(createCharacter(3.2, 0, -Math.PI / 2, false, shirtWhiteMat, skinToneMat2, hairBrownMat, 2.5, m7.name, m7.role, m7.isSenior))

    // Standing Characters (Left Lead & Right Presenter from reference image)
    const standingLeft = createCharacter(-5.2, -3.2, 0.65, true, suitDarkMat, skinToneMat1, hairDarkMat, 0.8, m8.name, m8.role, true)
    teamGroup.add(standingLeft)

    const standingRight = createCharacter(5.2, 2.4, -2.1, true, suitNavyMat, skinToneMat3, hairDarkMat, 3.1, m9.name, m9.role, true)
    teamGroup.add(standingRight)

    // ── Floating "MEETING WITH" Holographic Banner Above Table ────────────────
    const meetingWithText = projectData?.meetingWith || 'Executive QA Stakeholders'
    const projectNameText = projectData?.projectName || 'Flux AI Core'

    const createMeetingBannerMesh = () => {
      const cvs = document.createElement('canvas')
      cvs.width = 1024
      cvs.height = 280
      const ctx = cvs.getContext('2d')
      if (!ctx) return null

      // Rounded glass panel (Theme Responsive)
      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)'
      ctx.beginPath()
      ctx.roundRect(14, 14, 996, 252, 40)
      ctx.fill()

      // Gradient glowing border
      ctx.lineWidth = 6
      const borderGrad = ctx.createLinearGradient(0, 0, 1024, 0)
      borderGrad.addColorStop(0, '#00f2fe')
      borderGrad.addColorStop(0.5, '#4fd1c5')
      borderGrad.addColorStop(1, '#ff7557')
      ctx.strokeStyle = borderGrad
      ctx.stroke()

      // Header Tag: "✦ MEETING WITH"
      ctx.fillStyle = isDark ? 'rgba(0, 242, 254, 0.22)' : 'rgba(0, 242, 254, 0.16)'
      ctx.beginPath()
      ctx.roundRect(45, 36, 230, 44, 22)
      ctx.fill()

      ctx.font = 'bold 22px "Inter", monospace'
      ctx.fillStyle = isDark ? '#2dd4bf' : '#0f766e'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('✦ MEETING WITH', 65, 58)

      // Main attendee names / title
      ctx.font = '900 46px "Clash Display", "Inter", sans-serif'
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a'
      const displayTitle = meetingWithText.length > 34 ? meetingWithText.slice(0, 33) + '…' : meetingWithText
      ctx.fillText(displayTitle, 45, 128)

      // Subtitle with project name
      ctx.font = '600 24px "Inter", sans-serif'
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b'
      ctx.fillText(`Project: ${projectNameText} • Quality Assurance & Architecture Alignment`, 45, 192)

      const tex = new THREE.CanvasTexture(cvs)
      const planeGeo = new THREE.PlaneGeometry(4.0, 1.1)
      const planeMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(planeGeo, planeMat)
      mesh.position.set(0, 3.35, 0) // Elevated well above character nametags to prevent overlapping
      mesh.rotation.y = -Math.PI / 4 // align with isometric viewing angle
      return mesh
    }

    const meetingBanner = createMeetingBannerMesh()
    if (meetingBanner) {
      workspaceGroup.add(meetingBanner)
    }

    // ── Central Floating AI Emblem (The Visual Focal Point) ────────────────────
    const aiEmblemGroup = new THREE.Group()
    aiEmblemGroup.position.set(0, 4.4, 0)
    workspaceGroup.add(aiEmblemGroup)

    // Circular Medallion Coin
    const coinGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.16, 48)
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.35,
      roughness: 0.15,
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
    })
    const coinMesh = new THREE.Mesh(coinGeo, coinMat)
    coinMesh.rotation.x = Math.PI / 2
    coinMesh.castShadow = true
    aiEmblemGroup.add(coinMesh)

    // Outer Beveled Golden/Platinum Rim
    const rimGeo = new THREE.TorusGeometry(1.22, 0.06, 16, 64)
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xffa07a,
      emissive: 0xff6b6b,
      emissiveIntensity: 1.2,
      metalness: 0.85,
      roughness: 0.2,
    })
    const rimMesh = new THREE.Mesh(rimGeo, rimMat)
    aiEmblemGroup.add(rimMesh)

    // "AI" Typography Texture on the Emblem Face
    const createAITexture = () => {
      const cvs = document.createElement('canvas')
      cvs.width = 512
      cvs.height = 512
      const ctx = cvs.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(256, 256, 254, 0, Math.PI * 2)
        ctx.fill()

        ctx.font = '900 240px "Clash Display", "Inter", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // "A" in sleek dark graphite
        ctx.fillStyle = '#1e293b'
        ctx.fillText('A', 175, 260)

        // "I" in bright coral/orange gradient
        const grad = ctx.createLinearGradient(300, 150, 360, 370)
        grad.addColorStop(0, '#ff7557')
        grad.addColorStop(1, '#ff4b2b')
        ctx.fillStyle = grad
        ctx.fillText('I', 335, 260)
      }
      return new THREE.CanvasTexture(cvs)
    }

    const aiFaceGeo = new THREE.CircleGeometry(1.18, 48)
    const aiFaceMat = new THREE.MeshBasicMaterial({
      map: createAITexture(),
      side: THREE.DoubleSide,
    })
    const aiFaceFront = new THREE.Mesh(aiFaceGeo, aiFaceMat)
    aiFaceFront.position.z = 0.085
    aiEmblemGroup.add(aiFaceFront)

    const aiFaceBack = new THREE.Mesh(aiFaceGeo, aiFaceMat)
    aiFaceBack.position.z = -0.085
    aiFaceBack.rotation.y = Math.PI
    aiEmblemGroup.add(aiFaceBack)

    // Vertical Fiber-Optic Connection Lines from Emblem to Table
    const beamLinesGroup = new THREE.Group()
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x4fd1c5,
      transparent: true,
      opacity: 0.6,
    })
    const beamCount = 8
    for (let i = 0; i < beamCount; i++) {
      const angle = (i / beamCount) * Math.PI * 2
      const bx = Math.cos(angle) * 0.9
      const bz = Math.sin(angle) * 0.6
      const pts = [
        new THREE.Vector3(bx * 0.4, 0, bz * 0.4),
        new THREE.Vector3(bx * 1.5, -2.6, bz * 1.5),
      ]
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
      beamLinesGroup.add(new THREE.Line(lineGeo, lineMat))
    }
    aiEmblemGroup.add(beamLinesGroup)

    // Floating Ambient Light Motes / Particles
    const particleCount = 180
    const particleGeo = new THREE.BufferGeometry()
    const particlePos = new Float32Array(particleCount * 3)
    const particleSpeeds = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 24
      particlePos[i * 3 + 1] = Math.random() * 9 + 0.5
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 24
      particleSpeeds[i] = 0.005 + Math.random() * 0.015
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0x4fd1c5,
      size: 0.08,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    })
    const particlePoints = new THREE.Points(particleGeo, particleMat)
    scene.add(particlePoints)

    // ── Mouse & Interaction Handling ──────────────────────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (isModalOpenRef.current || !!target?.closest('.cinematic-modal-content')) return

      const rect = container.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1)

      sceneStateRef.current.mouseTarget.set(nx, ny)

      if (sceneStateRef.current.isDragging && isInteractive) {
        const deltaX = e.clientX - sceneStateRef.current.previousMousePosition.x
        const deltaY = e.clientY - sceneStateRef.current.previousMousePosition.y

        sceneStateRef.current.cameraAngleOffset.x += deltaX * 0.004
        sceneStateRef.current.cameraAngleOffset.y = Math.max(
          -0.3,
          Math.min(0.3, sceneStateRef.current.cameraAngleOffset.y + deltaY * 0.003)
        )
      }

      sceneStateRef.current.previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (isModalOpenRef.current || !!target?.closest('.cinematic-modal-content')) return

      sceneStateRef.current.isDragging = true
      sceneStateRef.current.previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      sceneStateRef.current.isDragging = false
    }

    // ── Mouse & Wheel Event Handlers ─────────────────────────────────────────
    const handleWheel = (e: WheelEvent) => {
      // Check if target or active state is inside modal
      const target = e.target as HTMLElement | null
      const isInsideModal =
        isModalOpenRef.current ||
        !!target?.closest('.cinematic-modal-content') ||
        !!target?.closest('.overflow-y-auto') ||
        !!target?.closest('[role="dialog"]')

      if (isInsideModal) {
        // ALLOW NATURAL MODAL SCROLLING! Do not preventDefault or dolly camera!
        return
      }

      // Prevent browser page scroll & use delta to smoothly adjust 3D scene camera depth
      e.preventDefault()

      const zoomDelta = e.deltaY * 0.0014
      sceneStateRef.current.zoomTarget = THREE.MathUtils.clamp(
        sceneStateRef.current.zoomTarget + zoomDelta,
        0,
        1
      )
    }

    const handleCustomZoom = (e: Event) => {
      const custom = e as CustomEvent<{ delta?: number; reset?: boolean }>
      if (custom.detail?.reset) {
        sceneStateRef.current.zoomTarget = 0
        sceneStateRef.current.cameraAngleOffset = { x: 0, y: 0 }
      } else if (typeof custom.detail?.delta === 'number') {
        sceneStateRef.current.zoomTarget = THREE.MathUtils.clamp(
          sceneStateRef.current.zoomTarget + custom.detail.delta,
          0,
          1
        )
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpenRef.current) return

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === '+' || e.key === '=') {
        sceneStateRef.current.zoomTarget = THREE.MathUtils.clamp(
          sceneStateRef.current.zoomTarget + 0.12,
          0,
          1
        )
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === '-' || e.key === '_') {
        sceneStateRef.current.zoomTarget = THREE.MathUtils.clamp(
          sceneStateRef.current.zoomTarget - 0.12,
          0,
          1
        )
      } else if (e.key === 'ArrowLeft') {
        sceneStateRef.current.cameraAngleOffset.x -= 0.1
      } else if (e.key === 'ArrowRight') {
        sceneStateRef.current.cameraAngleOffset.x += 0.1
      } else if (e.key === 'Home') {
        sceneStateRef.current.zoomTarget = 0
        sceneStateRef.current.cameraAngleOffset = { x: 0, y: 0 }
      }
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('cinematic:zoom', handleCustomZoom)
    window.addEventListener('keydown', handleKeyDown)

    // Touch support for tablet/mobile (swipe & pinch)
    let touchStartY = 0
    let touchStartDist = 0
    let isTouchPinch = false

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (isModalOpenRef.current || !!target?.closest('.cinematic-modal-content')) return

      if (e.touches.length === 1) {
        isTouchPinch = false
        touchStartY = e.touches[0].clientY
        sceneStateRef.current.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
      } else if (e.touches.length === 2) {
        isTouchPinch = true
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        touchStartDist = Math.hypot(dx, dy)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (isModalOpenRef.current || !!target?.closest('.cinematic-modal-content')) return
      if (e.touches.length === 1 && !isTouchPinch) {
        const deltaY = touchStartY - e.touches[0].clientY
        touchStartY = e.touches[0].clientY
        sceneStateRef.current.zoomTarget = THREE.MathUtils.clamp(
          sceneStateRef.current.zoomTarget + deltaY * 0.003,
          0,
          1
        )

        const deltaX = e.touches[0].clientX - sceneStateRef.current.previousMousePosition.x
        sceneStateRef.current.cameraAngleOffset.x += deltaX * 0.003
        sceneStateRef.current.previousMousePosition = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const pinchDelta = (touchStartDist - dist) * 0.005
        touchStartDist = dist
        sceneStateRef.current.zoomTarget = THREE.MathUtils.clamp(
          sceneStateRef.current.zoomTarget + pinchDelta,
          0,
          1
        )
      }
    }
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })

    // ── Window Resize ─────────────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return
      width = container.clientWidth || window.innerWidth
      height = container.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    // ── Animation Loop & Scene Timeline Orchestration ─────────────────────────
    let animationFrameId: number
    let clock = new THREE.Clock()
    let isTabVisible = true

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden
      if (isTabVisible) clock.start()
      else clock.stop()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      if (!isTabVisible) return

      const elapsed = clock.getElapsedTime()
      const currentScene = sceneStateRef.current.activeScene

      // Smooth mouse interpolation for subtle parallax
      sceneStateRef.current.mouseCurrent.lerp(sceneStateRef.current.mouseTarget, 0.05)
      const mouseX = sceneStateRef.current.mouseCurrent.x
      const mouseY = sceneStateRef.current.mouseCurrent.y

      // Idle movement for 3D human characters (natural breathing & subtle head movement)
      charactersList.forEach((char) => {
        const idleCycle = elapsed * 1.8 + char.animPhase
        // Torso micro breathing without drift
        char.torso.position.y = char.baseTorsoY + Math.sin(idleCycle) * 0.008
        // Head sway
        char.head.rotation.y = Math.sin(idleCycle * 0.6) * 0.12
        char.head.rotation.x = Math.sin(idleCycle * 0.8) * 0.05
      })

      // Central AI Emblem rotation & levitation bob
      aiEmblemGroup.rotation.y = elapsed * 0.35
      aiEmblemGroup.position.y = 4.4 + Math.sin(elapsed * 1.5) * 0.15

      // Perimeter glow track pulse
      const pulse = (Math.sin(elapsed * 2.5) + 1) * 0.5
      cyanAccentLight.intensity = 2.0 + pulse * 1.2
      coralAccentLight.intensity = 1.8 + (1 - pulse) * 1.0

      // Particle floating loop
      const positions = particleGeo.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += particleSpeeds[i]
        if (positions[i * 3 + 1] > 10) {
          positions[i * 3 + 1] = 0.5
        }
      }
      particleGeo.attributes.position.needsUpdate = true

      // ── Scroll & Orbit Camera Calculation ──────────────────────────────────
      // Smooth lerp for scroll-driven zoom (0 = wide isometric, 1 = close inspection)
      sceneStateRef.current.zoomCurrent = THREE.MathUtils.lerp(
        sceneStateRef.current.zoomCurrent,
        sceneStateRef.current.zoomTarget,
        0.07
      )
      const zoom = sceneStateRef.current.zoomCurrent

      // Azimuth angle combining base 45° isometric view + user drag orbit + mouse parallax
      const azimuthAngle =
        Math.PI * 0.25 + sceneStateRef.current.cameraAngleOffset.x + mouseX * 0.06

      // Radius & altitude interpolate dynamically with zoom:
      // Zoom 0 = Wide Panoramic Isometric (Cam X≈22, Z≈22, Y≈21)
      // Zoom 1 = Close inspection of meeting table & attendees (Cam X≈7.8, Z≈7.8, Y≈5.2)
      const radius = THREE.MathUtils.lerp(31.1, 10.8, zoom)
      const altitude =
        THREE.MathUtils.lerp(21, 5.2, zoom) +
        mouseY * 1.5 +
        sceneStateRef.current.cameraAngleOffset.y * 7

      const targetCamX = Math.cos(azimuthAngle) * radius
      const targetCamZ = Math.sin(azimuthAngle) * radius
      const targetCamY = Math.max(3.0, altitude)

      // Target look-at point:
      // Wide overview: center of table base (0, 1.8, 0)
      // Close up: center of attendees and floating AI emblem (0, 2.4, 0)
      const targetLookY = THREE.MathUtils.lerp(1.8, 2.4, zoom)

      // Always orient meeting banner smoothly towards camera
      if (meetingBanner) {
        meetingBanner.lookAt(camera.position.x, meetingBanner.position.y, camera.position.z)
      }

      // ── Stage-Specific 3D Orchestration ──────────────────────────────────────
      switch (currentScene) {
        case 'scene_01_init':
          // Platform submerged / minimal
          platformGroup.position.y = THREE.MathUtils.lerp(platformGroup.position.y, -3.5, 0.06)
          workspaceGroup.scale.setScalar(THREE.MathUtils.lerp(workspaceGroup.scale.x, 0.01, 0.08))
          aiEmblemGroup.scale.setScalar(0.01)
          keyLight.intensity = THREE.MathUtils.lerp(keyLight.intensity, 0.3, 0.05)
          camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.04)
          camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.04)
          camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.04)
          camera.lookAt(0, targetLookY, 0)
          break

        case 'scene_02_platform':
          // Platform rises from ground with neon tracks
          platformGroup.position.y = THREE.MathUtils.lerp(platformGroup.position.y, 0, 0.05)
          workspaceGroup.scale.setScalar(THREE.MathUtils.lerp(workspaceGroup.scale.x, 0.3, 0.05))
          aiEmblemGroup.scale.setScalar(0.01)
          keyLight.intensity = THREE.MathUtils.lerp(keyLight.intensity, 1.1, 0.05)
          camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.04)
          camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.04)
          camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.04)
          camera.lookAt(0, targetLookY, 0)
          break

        case 'scene_03_team':
          // Team members and table expand, AI emblem ascends
          platformGroup.position.y = THREE.MathUtils.lerp(platformGroup.position.y, 0, 0.08)
          workspaceGroup.scale.setScalar(THREE.MathUtils.lerp(workspaceGroup.scale.x, 1, 0.06))
          aiEmblemGroup.scale.setScalar(THREE.MathUtils.lerp(aiEmblemGroup.scale.x, 1, 0.08))
          keyLight.intensity = THREE.MathUtils.lerp(keyLight.intensity, 1.35, 0.05)
          camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.04)
          camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.04)
          camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.04)
          camera.lookAt(0, targetLookY, 0)
          break

        case 'scene_04_hologram':
        case 'scene_05_reveal':
        case 'scene_06_interactive':
        default:
          // Full environment visible with camera pull-back and subtle parallax
          platformGroup.position.y = THREE.MathUtils.lerp(platformGroup.position.y, 0, 0.08)
          workspaceGroup.scale.setScalar(1)
          aiEmblemGroup.scale.setScalar(1)
          keyLight.intensity = 1.4

          camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.06)
          camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.06)
          camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.06)
          camera.lookAt(0, targetLookY, 0)
          break
      }

      renderer.render(scene, camera)
    }

    animate()

    // ── Cleanup on unmount (prevent memory leaks) ─────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('cinematic:zoom', handleCustomZoom)
      window.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // Dispose Three.js scene assets
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh
          mesh.geometry?.dispose()
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose())
          } else if (mesh.material) {
            mesh.material.dispose()
          }
        }
      })
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [activeScene, isInteractive, projectData, isDark])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden pointer-events-auto"
      style={{ touchAction: 'none' }}
    />
  )
}
