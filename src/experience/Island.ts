import * as THREE from 'three'
import type { IslandContent } from '../data/content'
import { coastShape, makeCoast, type Coast } from './coast'
import { loadKit } from './kit'
import { lit, mats } from './materials'
import { TUNE } from './settings'
import { makeSignTexture } from './textures'

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A palm or pebble that Rapier will take over. `tone` '#6b4428' marks a tree. */
type LooseProp = {
  object: THREE.Object3D
  /** Horizontal hit size, in meters. */
  radius: number
  /** Vertical hit size, in meters. */
  height: number
  tone: string
}

/** Which loose prop this is. Trees topple. Rocks slide. */
export type PropKind = 'tree' | 'rock'

/**
 * A palm or pebble detached from the island, ready for a Rapier body.
 * `position` and `rotation` are world space. The object itself sits at its own origin.
 */
export type WorldProp = {
  id: string
  object: THREE.Object3D
  kind: PropKind
  radius: number
  height: number
  position: [number, number, number]
  rotation: [number, number, number]
}

function hashId(id: string) {
  let hash = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export class Island {
  readonly group = new THREE.Group()
  private readonly centerDir: THREE.Vector3
  private readonly rng: () => number
  private signMaterial!: THREE.MeshStandardMaterial
  private readonly ring: THREE.Mesh
  private readonly coast: Coast
  private readonly marker: THREE.Mesh
  private readonly phase: number
  /** Palms and pebbles collected before the first render, then handed to Rapier. */
  private readonly loose: LooseProp[] = []

  constructor(readonly data: IslandContent) {
    this.rng = mulberry32(hashId(data.id))
    this.coast = makeCoast(data.radius, hashId(data.id))
    this.phase = this.rng() * Math.PI * 2
    this.centerDir = new THREE.Vector3(-data.position[0], 0, -data.position[1])
    if (this.centerDir.lengthSq() < 0.001) this.centerDir.set(0, 0, 1)
    this.centerDir.normalize()

    this.group.position.set(data.position[0], 0, data.position[1])
    this.group.name = data.id

    const ringMat = new THREE.MeshBasicMaterial({
      color: data.accent,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    this.ring = new THREE.Mesh(this.approachRing(), ringMat)
    this.ring.position.y = 0.28
    this.ring.visible = false

    this.marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.48, 4),
      new THREE.MeshBasicMaterial({ color: data.accent }),
    )
    this.marker.rotation.x = Math.PI
    this.marker.position.y = 6
    this.marker.visible = false

    this.buildTerrain()
    this.buildDock()
    this.buildSign()
    this.buildPalms()
    this.buildPebbles()
    this.buildKind()
    this.group.add(this.ring, this.marker)
  }

  refreshSign() {
    const previous = this.signMaterial.map
    this.signMaterial.map = makeSignTexture(this.data.title, this.data.accent)
    this.signMaterial.needsUpdate = true
    previous?.dispose()
  }

  get triggerRadius() {
    return this.data.radius + TUNE.triggerPadding
  }

  get collisionRadius() {
    return this.data.radius + TUNE.collisionPadding
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  private facingYaw() {
    return Math.atan2(this.centerDir.x, this.centerDir.z)
  }

  private buildTerrain() {
    const { ground } = this.data
    const rockMat = lit(ground.rock, { roughness: 0.95 })
    const sandMat = lit(ground.sand, { roughness: 0.96 })
    const grassMat = lit(ground.grass, { roughness: 0.9 })
    const rock = this.mesh(this.landGeometry(1, 2.35), rockMat)
    rock.position.y = -1.62
    const sand = this.mesh(this.landGeometry(0.9, 0.22), sandMat)
    sand.position.y = 0.7
    const grass = this.mesh(new THREE.ShapeGeometry(coastShape(this.coast.points, 0.7)), grassMat)
    grass.geometry.rotateX(-Math.PI / 2)
    grass.position.y = 0.96
    this.group.add(rock, sand, grass)
  }

  /**
   * A thin marker that follows the coastline, a little out to sea.
   * @returns A closed tube around this island.
   */
  private approachRing() {
    const path = this.coast.points.map((point) => {
      const len = Math.hypot(point.x, point.y) || 1
      const scale = (len + 1.15) / len
      return new THREE.Vector3(point.x * scale, 0, point.y * scale)
    })
    const curve = new THREE.CatmullRomCurve3(path, true, 'catmullrom', 0.2)
    return new THREE.TubeGeometry(curve, 72, 0.07, 5, true)
  }

  /**
   * Extrudes the coastline into a slab.
   * @param scale - 1 follows the shore. Smaller values pull the cap inland.
   * @param depth - Thickness in meters, before the mesh is laid flat.
   * @returns Geometry whose top faces up.
   */
  private landGeometry(scale: number, depth: number) {
    const geometry = new THREE.ExtrudeGeometry(coastShape(this.coast.points, scale), {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: scale > 0.95 ? 0.14 : 0.08,
      bevelSegments: 2,
      steps: 1,
    })
    geometry.rotateX(-Math.PI / 2)
    geometry.computeVertexNormals()
    return geometry
  }

  private buildDock() {
    const shore = this.coast.radiusAt(Math.atan2(this.centerDir.x, this.centerDir.z))
    const dist = shore * 0.9
    this.prop('Environment_Dock', this.centerDir.x * dist, 0.2, this.centerDir.z * dist, this.facingYaw())
  }

  private buildSign() {
    const side = new THREE.Vector3(this.centerDir.z, 0, -this.centerDir.x)
    const spot = this.centerDir
      .clone()
      .multiplyScalar(this.data.radius * 0.38)
      .add(side.multiplyScalar(this.data.radius * 0.46))
    const reach = Math.hypot(spot.x, spot.z)
    const shore = this.coast.radiusAt(Math.atan2(spot.x, spot.z))
    if (reach > shore * 0.62) spot.multiplyScalar((shore * 0.62) / Math.max(reach, 0.001))

    const sign = new THREE.Group()
    sign.position.set(spot.x, 0, spot.z)
    sign.rotation.y = this.facingYaw()

    const board = this.mesh(new THREE.BoxGeometry(2.7, 1.25, 0.12), mats.wood)
    board.position.y = 1.85
    this.signMaterial = new THREE.MeshStandardMaterial({
      map: makeSignTexture(this.data.title, this.data.accent),
      roughness: 0.85,
    })
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 1.02), this.signMaterial)
    face.position.set(0, 1.85, 0.07)
    const postL = this.mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.5, 5), mats.woodDark)
    postL.position.set(-1.05, 0.85, 0)
    const postR = postL.clone()
    postR.position.x = 1.05
    sign.add(board, face, postL, postR)
    this.group.add(sign)
  }

  private buildPalms() {
    const count = this.data.kind === 'about' ? 4 : this.data.kind === 'contact' ? 1 : 3
    let placed = 0
    let guard = 0
    while (placed < count && guard < 24) {
      guard += 1
      const angle = this.rng() * Math.PI * 2
      const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle))
      if (dir.dot(this.centerDir) > 0.5) continue
      const shore = this.coast.radiusAt(angle)
      const dist = shore * (0.28 + this.rng() * 0.42)
      this.addPalm(dir.x * dist, dir.z * dist)
      placed += 1
    }
  }

  private addPalm(x: number, z: number) {
    const names = ['Environment_PalmTree_1', 'Environment_PalmTree_2', 'Environment_PalmTree_3'] as const
    const palm = this.prop(names[Math.floor(this.rng() * names.length)], x, 0.96, z, this.rng() * Math.PI * 2)
    this.loose.push(this.makeLoose(palm, 0.75, 3.4, '#6b4428'))
  }

  private buildPebbles() {
    const names = ['Environment_Rock_1', 'Environment_Rock_2', 'Environment_Rock_3', 'Environment_Rock_4', 'Environment_Rock_5'] as const
    for (let i = 0; i < 3; i += 1) {
      const angle = this.rng() * Math.PI * 2
      const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle))
      if (dir.dot(this.centerDir) > 0.62) continue
      const shore = this.coast.radiusAt(angle)
      const dist = shore * (0.34 + this.rng() * 0.36)
      const spot = this.inland(dir.x * dist, dir.z * dist, 0.72)
      const rock = this.prop(names[i % names.length], spot.x, 0.96, spot.z, this.rng() * Math.PI * 2)
      this.loose.push(this.makeLoose(rock, 0.48, 0.7, this.data.ground.rock))
    }
  }

  /**
   * Adds a kit model in island-local space. The mesh arrives when the file loads.
   * @param name - Model file name without an extension.
   * @param x - Local X.
   * @param y - Local Y. Grass sits near 0.96.
   * @param z - Local Z.
   * @param yaw - Radians about Y.
   * @param scale - Uniform size. 1 keeps the kit's meters.
   * @returns The holder handed to the scene or to Rapier.
   */
  private prop(name: string, x: number, y: number, z: number, yaw = 0, scale = 1) {
    const holder = new THREE.Group()
    holder.position.set(x, y, z)
    holder.rotation.y = yaw
    holder.scale.setScalar(scale)
    loadKit(name, holder)
    this.group.add(holder)
    return holder
  }

  private makeLoose(object: THREE.Object3D, radius: number, height: number, tone: string): LooseProp {
    return { object, radius, height, tone }
  }

  /**
   * Hands every palm and pebble to the physics world.
   * A direct cannon hit is the only thing that should move them, so they leave the island group.
   * @returns World-space props. Trees use kind `tree`. Pebbles use kind `rock`.
   */
  collectProps(): WorldProp[] {
    const world = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const euler = new THREE.Euler()
    return this.loose.splice(0).map((prop, index) => {
      prop.object.updateWorldMatrix(true, true)
      prop.object.getWorldPosition(world)
      prop.object.getWorldQuaternion(quat)
      euler.setFromQuaternion(quat)
      prop.object.removeFromParent()
      prop.object.position.set(0, 0, 0)
      prop.object.rotation.set(0, 0, 0)
      const kind: PropKind = prop.tone === '#6b4428' ? 'tree' : 'rock'
      return {
        id: `${this.data.id}-${kind}-${index}`,
        object: prop.object,
        kind,
        radius: prop.radius,
        height: prop.height,
        position: [world.x, world.y, world.z],
        rotation: [euler.x, euler.y, euler.z],
      }
    })
  }

  private buildKind() {
    const yaw = this.facingYaw()
    const back = this.placeBack(this.data.radius * 0.22)
    const kind = this.data.kind
    if (kind === 'about') {
      this.prop('Environment_House1', back.x, 0, back.z, yaw)
      this.prop('Prop_Barrel', back.x + 1.7, 0.96, back.z + 0.3, yaw)
      this.cliff('Environment_Cliff1')
    }
    if (kind === 'projects') {
      this.prop('Prop_Chest_Gold', back.x - 1.15, 0.96, back.z, yaw + 0.25)
      this.prop('Prop_Chest_Closed', back.x + 1.05, 0.96, back.z + 0.35, yaw - 0.2)
      this.prop('Prop_Coins', back.x + 0.1, 0.96, back.z + 1.15, yaw)
      this.prop('Prop_GoldBag', back.x + 0.45, 0.96, back.z - 0.85, yaw)
      this.cliff('Environment_Cliff2', 0.7)
    }
    if (kind === 'skills') {
      this.prop('Environment_Sawmill', back.x, 0.96, back.z, yaw)
      this.prop('Prop_Barrel', back.x + 1.5, 0.96, back.z + 0.2, yaw)
      this.cliff('Environment_Cliff3', 0.78)
    }
    if (kind === 'languages') {
      this.prop('Environment_House1', back.x, 0, back.z, yaw, 0.82)
      this.cliff('Environment_Cliff4', 0.72)
    }
    if (kind === 'github') {
      this.prop('Environment_House3', back.x, 0.96, back.z, yaw, 0.52)
      this.prop('Prop_Anchor', back.x + 2.1, 0.96, back.z, yaw)
      this.cliff('Environment_Cliff1', 0.68)
    }
    if (kind === 'education') {
      this.prop('Environment_House1', back.x, 0, back.z, yaw, 0.9)
      this.cliff('Environment_Cliff4', 0.7)
    }
    if (kind === 'linkedin') {
      this.prop('Environment_House3', back.x, 0.96, back.z, yaw, 0.6)
      this.cliff('Environment_Cliff3', 0.64)
    }
    if (kind === 'experience') {
      this.prop('Environment_House1', back.x, 0, back.z, yaw, 0.9)
      this.prop('Prop_Anchor', back.x + 2.1, 0.96, back.z + 0.2, yaw)
      this.prop('Prop_Barrel', back.x - 1.6, 0.96, back.z, yaw)
      this.cliff('Environment_Cliff2', 0.62)
    }
    if (kind === 'contact') {
      this.prop('Prop_Bottle_1', back.x, 0.96, back.z, yaw)
      this.prop('Prop_Bottle_2', back.x + 0.4, 0.96, back.z + 0.2, yaw)
      this.prop('Prop_Chest_Closed', back.x - 0.9, 0.96, back.z, yaw)
      this.prop('Prop_Bucket', back.x + 1.05, 0.96, back.z - 0.25, yaw)
      this.cliff('Environment_Cliff1', 0.58)
    }
  }

  private placeBack(distance: number) {
    return this.centerDir.clone().multiplyScalar(-distance)
  }

  /**
   * Pulls a point back inside the local shore.
   * @param x - Local X.
   * @param z - Local Z.
   * @param fraction - How far toward the water the point may sit. 1 is the shore.
   * @returns The clamped point.
   */
  private inland(x: number, z: number, fraction: number) {
    const reach = Math.hypot(x, z)
    const shore = this.coast.radiusAt(Math.atan2(x, z))
    const limit = shore * fraction
    if (reach <= limit) return { x, z }
    const scale = limit / Math.max(reach, 0.001)
    return { x: x * scale, z: z * scale }
  }

  /** A rock outcrop off to the side of the landmark, kept on the grass. */
  private cliff(name: string, scale = 1) {
    const side = new THREE.Vector3(this.centerDir.z, 0, -this.centerDir.x)
    const spot = this.inland(
      -this.centerDir.x * this.data.radius * 0.16 + side.x * this.data.radius * 0.38,
      -this.centerDir.z * this.data.radius * 0.16 + side.z * this.data.radius * 0.38,
      0.58,
    )
    this.prop(name, spot.x, 0.45, spot.z, this.rng() * Math.PI * 2, scale)
  }

  /**
   * Animates the approach ring, marker, and island details.
   * @param dt - Frame delta in seconds. Unused by the ring, kept for callers.
   * @param time - Seconds since the page loaded.
   * @param proximity - 0 far away, 1 when this island is focused or the ship is alongside.
   */
  update(dt: number, time: number, proximity: number) {
    void dt
    const ringMat = this.ring.material as THREE.MeshBasicMaterial
    ringMat.opacity = proximity * 0.55
    this.ring.visible = proximity > 0.08
    this.marker.visible = proximity > 0.35
    this.marker.position.y = 6.1 + Math.sin(time * 2.8 + this.phase) * 0.22
  }
}
