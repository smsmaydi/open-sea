import * as THREE from 'three'
import type { Hour } from '../data/content'
import { FOG } from './settings'
import { lit, mats } from './materials'
import { coastShape, makeCoast } from './coast'
import { loadKit } from './kit'
import type { Collider } from './Ship'
import type { Shore } from './Ocean'
import { waveHeight } from './waves'

type Bird = {
  group: THREE.Group
  left: THREE.Mesh
  right: THREE.Mesh
  angle: number
  radius: number
  speed: number
  height: number
}

const ROCKS: Shore[] = [
  { x: 16, z: 8, radius: 1.7 },
  { x: -18, z: 12, radius: 1.5 },
  { x: 14, z: -18, radius: 1.4 },
  { x: -16, z: -14, radius: 1.8 },
  { x: 0, z: 20, radius: 1.3 },
  { x: 28, z: -6, radius: 1.2 },
]

const FAR: Shore[] = [
  { x: 120, z: -30, radius: 11 },
  { x: -130, z: 20, radius: 13 },
  { x: 30, z: 140, radius: 10 },
  { x: -40, z: -145, radius: 12 },
  { x: 150, z: 80, radius: 9 },
]

function rngFrom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Dressing {
  /** Sky, sun, clouds, rocks, and far scenery. */
  readonly root = new THREE.Group()
  readonly colliders: Collider[]
  readonly shores: Shore[]
  private readonly sky: THREE.Mesh
  private readonly sun: THREE.Group
  private readonly sunMesh: THREE.Mesh
  private readonly sunBase = new THREE.Vector3()
  private readonly buoy: THREE.Group
  private readonly clouds: { mesh: THREE.Group; speed: number }[] = []
  private readonly birds: Bird[] = []

  constructor() {
    this.sky = this.makeSky()
    const sun = this.makeSun()
    this.sun = sun.group
    this.sunMesh = sun.mesh
    this.sunBase.copy(this.sun.position)
    this.root.add(this.sky)
    this.root.add(this.sun)
    this.makeClouds()
    this.makeBirds()
    this.buoy = this.makeBuoy()
    this.buoy.position.set(12, 0, 6)
    this.root.add(this.buoy)

    this.colliders = []
    this.shores = []

    ROCKS.forEach((rock, index) => {
      this.root.add(this.makeRocks(rock, index + 3))
      this.colliders.push({ x: rock.x, z: rock.z, radius: rock.radius + 1.1 })
      this.shores.push(rock)
    })

    FAR.forEach((island, index) => {
      this.root.add(this.makeFarIsland(island, index + 11))
      this.shores.push(island)
    })
  }

  private makeSky() {
    const radius = 520
    const geometry = new THREE.SphereGeometry(radius, 28, 18)
    const colors = new Float32Array(geometry.attributes.position.count * 3)
    const position = geometry.attributes.position
    const top = new THREE.Color('#2f7ed4')
    const mid = new THREE.Color('#79c0ea')
    const fogCol = new THREE.Color(FOG.color)
    const color = new THREE.Color()

    for (let i = 0; i < position.count; i += 1) {
      const y = position.getY(i) / radius
      if (y > 0.1) color.copy(mid).lerp(top, Math.min((y - 0.1) / 0.4, 1))
      else if (y > 0.0) color.copy(mid)
      else color.copy(fogCol).lerp(mid, Math.min((y + 0.06) / 0.06, 1))
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
    material.dithering = true
    const sky = new THREE.Mesh(geometry, material)
    sky.frustumCulled = false
    sky.renderOrder = -1
    sky.userData.noCurve = true
    return sky
  }

  private makeSun() {
    const group = new THREE.Group()
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(18, 18, 16),
      new THREE.MeshBasicMaterial({ color: '#fff4d2', fog: false, depthWrite: false }),
    )
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(34, 16, 14),
      new THREE.MeshBasicMaterial({
        color: '#ffc98a',
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    group.add(sun, glow)
    group.position.set(170, 190, 80).normalize().multiplyScalar(430)
    group.userData.noCurve = true
    return { group, mesh: sun }
  }

  private makeClouds() {
    const seeds = [
      [-70, 34, -20],
      [40, 30, -80],
      [90, 38, 30],
      [-30, 28, 70],
      [10, 42, 10],
      [-110, 36, 40],
      [130, 32, -40],
    ]
    seeds.forEach(([x, y, z], index) => {
      const rng = rngFrom(index + 40)
      const cloud = new THREE.Group()
      const puffCount = 4 + Math.floor(rng() * 3)
      for (let i = 0; i < puffCount; i += 1) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(2.2 + rng() * 2.4, 7, 6),
          lit('#f7fbff', { roughness: 1, flat: true }),
        )
        puff.position.set((rng() - 0.5) * 8, (rng() - 0.4) * 1.4, (rng() - 0.5) * 4)
        puff.scale.y = 0.62
        cloud.add(puff)
      }
      cloud.position.set(x, y, z)
      cloud.userData.noCurve = true
      this.root.add(cloud)
      this.clouds.push({ mesh: cloud, speed: 1.1 + rng() * 1.4 })
    })
  }

  private makeBirds() {
    const wing = new THREE.BoxGeometry(0.55, 0.05, 0.18)
    const material = new THREE.MeshBasicMaterial({ color: '#243038' })
    for (let i = 0; i < 5; i += 1) {
      const group = new THREE.Group()
      const left = new THREE.Mesh(wing, material)
      const right = new THREE.Mesh(wing, material)
      left.position.x = -0.28
      right.position.x = 0.28
      group.add(left, right)
      group.userData.noCurve = true
      this.root.add(group)
      this.birds.push({
        group,
        left,
        right,
        angle: (i / 5) * Math.PI * 2,
        radius: 24 + i * 9,
        speed: 0.18 + i * 0.03,
        height: 13 + (i % 3) * 2.5,
      })
    }
  }

  private makeBuoy() {
    const group = new THREE.Group()
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), lit('#c0392b', { roughness: 0.55 }))
    body.scale.y = 0.82
    body.castShadow = true
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 6, 12), mats.white)
    belt.rotation.x = Math.PI / 2
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 5), mats.woodDark)
    pole.position.y = 0.7
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.22),
      new THREE.MeshStandardMaterial({ color: '#e0b15a', side: THREE.DoubleSide }),
    )
    flag.position.set(0.18, 1.05, 0)
    group.add(body, belt, pole, flag)
    return group
  }

  private makeRocks(rock: Shore, seed: number) {
    const group = new THREE.Group()
    group.position.set(rock.x, 0, rock.z)
    const rng = rngFrom(seed)
    const material = lit('#6d6258', { roughness: 0.95 })
    const count = 2 + Math.floor(rng() * 2)
    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(rock.radius * (0.45 + rng() * 0.35), 0), material)
      mesh.position.set((rng() - 0.5) * rock.radius, 0.15, (rng() - 0.5) * rock.radius)
      mesh.rotation.set(rng(), rng(), rng())
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    }
    return group
  }

  private makeFarIsland(island: Shore, seed: number) {
    const group = new THREE.Group()
    group.position.set(island.x, 0, island.z)
    const rng = rngFrom(seed)
    const coast = makeCoast(island.radius, seed + 19, 28)
    const rock = new THREE.Mesh(this.farSlab(coast.points, 1, 2.1), lit('#7b6a58'))
    rock.position.y = -1.35
    const sand = new THREE.Mesh(this.farSlab(coast.points, 0.88, 0.28), lit('#e4d0a4'))
    sand.position.y = 0.62
    const grass = new THREE.Mesh(new THREE.ShapeGeometry(coastShape(coast.points, 0.66)), lit('#5d9a48'))
    grass.geometry.rotateX(-Math.PI / 2)
    grass.position.y = 0.94
    group.add(rock, sand, grass)

    const palms = ['Environment_PalmTree_1', 'Environment_PalmTree_2', 'Environment_PalmTree_3']
    const count = 1 + Math.floor(rng() * 2)
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * Math.PI * 2
      const dist = coast.radiusAt(angle) * (0.25 + rng() * 0.35)
      const palm = new THREE.Group()
      palm.position.set(Math.sin(angle) * dist, 0.94, Math.cos(angle) * dist)
      palm.rotation.y = rng() * Math.PI * 2
      loadKit(palms[i % palms.length], palm)
      group.add(palm)
    }
    const cliff = new THREE.Group()
    cliff.position.y = 0.4
    cliff.scale.setScalar(0.5)
    cliff.rotation.y = rng() * Math.PI * 2
    loadKit(`Environment_Cliff${1 + (seed % 4)}`, cliff)
    group.add(cliff)
    return group
  }

  /**
   * Extrudes a distant island outline.
   * @param points - Local XZ shore.
   * @param scale - Inset factor.
   * @param depth - Slab thickness before it is laid flat.
   * @returns Geometry with the top facing up.
   */
  private farSlab(points: THREE.Vector2[], scale: number, depth: number) {
    const geometry = new THREE.ExtrudeGeometry(coastShape(points, scale), {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.2,
      bevelSegments: 1,
      steps: 1,
    })
    geometry.rotateX(-Math.PI / 2)
    geometry.computeVertexNormals()
    return geometry
  }

  setHour(hour: Hour) {
    const dusk = hour === 'dusk'
    this.paintSky(dusk ? '#31457f' : '#2f7ed4', dusk ? '#f2a56e' : '#79c0ea', dusk ? '#f3c4a2' : FOG.color)
    const aim = dusk ? new THREE.Vector3(250, 42, 80) : new THREE.Vector3(170, 190, 80)
    this.sunBase.copy(aim.normalize().multiplyScalar(430))
    const material = this.sunMesh.material as THREE.MeshBasicMaterial
    material.color.set(dusk ? '#ffb067' : '#fff4d2')
  }

  private paintSky(topHex: string, midHex: string, fogHex: string) {
    const radius = 520
    const position = this.sky.geometry.attributes.position
    const colors = this.sky.geometry.attributes.color as THREE.BufferAttribute
    const top = new THREE.Color(topHex)
    const mid = new THREE.Color(midHex)
    const fogCol = new THREE.Color(fogHex)
    const color = new THREE.Color()
    for (let i = 0; i < position.count; i += 1) {
      const y = position.getY(i) / radius
      if (y > 0.1) color.copy(mid).lerp(top, Math.min((y - 0.1) / 0.4, 1))
      else if (y > 0.0) color.copy(mid)
      else color.copy(fogCol).lerp(mid, Math.min((y + 0.06) / 0.06, 1))
      colors.setXYZ(i, color.r, color.g, color.b)
    }
    colors.needsUpdate = true
  }

  follow(x: number, z: number) {
    this.sky.position.set(x, 0, z)
    this.sun.position.set(this.sunBase.x + x, this.sunBase.y, this.sunBase.z + z)
  }

  update(dt: number, time: number, shipX = 0, shipZ = 0) {
    this.buoy.position.y = waveHeight(this.buoy.position.x, this.buoy.position.z, time) + 0.2
    this.buoy.rotation.z = Math.sin(time * 0.8) * 0.08
    this.buoy.rotation.x = Math.cos(time * 0.7) * 0.05

    for (const cloud of this.clouds) {
      cloud.mesh.position.x += cloud.speed * dt
      if (cloud.mesh.position.x > 190) cloud.mesh.position.x = -190
    }

    for (const bird of this.birds) {
      bird.angle += dt * bird.speed
      bird.group.position.set(
        shipX + Math.cos(bird.angle) * bird.radius,
        bird.height + Math.sin(time * 1.6 + bird.angle) * 0.35,
        shipZ + Math.sin(bird.angle) * bird.radius * 0.72,
      )
      bird.group.rotation.y = -bird.angle
      const flap = Math.sin(time * 7 + bird.angle) * 0.45
      bird.left.rotation.z = 0.35 + flap
      bird.right.rotation.z = -0.35 - flap
    }
  }
}
