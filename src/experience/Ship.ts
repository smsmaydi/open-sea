import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { applyCurve } from './curve'
import { TUNE } from './settings'
import { waveHeight } from './waves'

const FLASH_HOT = new THREE.Color('#ffb15a')
const FLASH_SMOKE = new THREE.Color('#d5e0e6')

/** Port and starboard each cover 90°. The bow quarter and the stern stay silent. */
const ARC = Math.PI / 2
/** Closest the crosshair sits to the hull. Stops a click on the deck from dropping a ball at the keel. */
const AIM_MIN = 7
/** Farthest a trained shot is allowed to reach. */
const AIM_MAX = 26
/** Matches the Rapier gravity in the sailing scene. */
const GRAVITY = 11

/** A target pulled onto one battery. `side` is 1 starboard, -1 port, or null when the bow cannot fire. */
export type TrainedAim = {
  side: 1 | -1 | null
  x: number
  z: number
}

/**
 * Limits a world target to the port or starboard quarter.
 * The forward quarter returns a null side. A point astern is pulled to the rear edge of the nearer broadside.
 * @param shipX - Ship world X.
 * @param shipZ - Ship world Z.
 * @param yaw - Ship heading. 0 faces +Z.
 * @param targetX - Desired world X.
 * @param targetZ - Desired world Z.
 * @returns The battery that fires and the world point the balls are sent toward.
 */
export function clampAim(shipX: number, shipZ: number, yaw: number, targetX: number, targetZ: number): TrainedAim {
  const dx = targetX - shipX
  const dz = targetZ - shipZ
  const dist = Math.hypot(dx, dz) || 1
  const worldYaw = Math.atan2(dx, dz)
  const bearing = Math.atan2(Math.sin(worldYaw - yaw), Math.cos(worldYaw - yaw))
  const trained = nearestTrain(bearing)
  const range = THREE.MathUtils.clamp(dist, AIM_MIN, AIM_MAX)
  const aimYaw = yaw + trained.angle
  return {
    side: trained.side,
    x: shipX + Math.sin(aimYaw) * range,
    z: shipZ + Math.cos(aimYaw) * range,
  }
}

/**
 * Speed and loft so a ball leaves `from` and meets the sea near the aim point.
 * A short aim stays low. A long aim gets a higher, slower arc. The hull keeps a minimum range.
 * @param from - Muzzle position in world space.
 * @param aimX - World X the ball should fall toward.
 * @param aimZ - World Z the ball should fall toward.
 * @param dir - Reused horizontal direction. The returned velocity is a new vector.
 */
export function launchVelocity(from: THREE.Vector3, aimX: number, aimZ: number, dir: THREE.Vector3) {
  const dx = aimX - from.x
  const dz = aimZ - from.z
  const flat = Math.hypot(dx, dz)
  if (flat > 0.001) dir.set(dx / flat, 0, dz / flat)
  else if (dir.lengthSq() < 0.0001) dir.set(1, 0, 0)
  const range = THREE.MathUtils.clamp(flat || AIM_MIN, 4.5, AIM_MAX)
  const span = THREE.MathUtils.clamp((range - AIM_MIN) / (AIM_MAX - AIM_MIN), 0, 1)
  const flight = 0.58 + span * 0.72
  const y0 = Math.max(from.y, 0.15)
  const speed = range / flight
  const vy = 0.5 * GRAVITY * flight - y0 / flight
  return new THREE.Vector3(dir.x * speed, vy, dir.z * speed)
}

/**
 * Picks the 90° broadside that faces a bearing.
 * Forward (-45° to 45°) cannot fire. A point astern snaps to the nearer rear edge.
 * @param delta - Radians from the ship's forward, wrapped to -PI..PI.
 * @returns Which battery fires, and the clamped bearing.
 */
function nearestTrain(delta: number): { side: 1 | -1 | null; angle: number } {
  if (delta >= -ARC / 2 && delta <= ARC / 2) return { side: null, angle: delta }
  const bands: { side: 1 | -1; min: number; max: number }[] = [
    { side: 1, min: ARC / 2, max: ARC / 2 + ARC },
    { side: -1, min: -(ARC / 2 + ARC), max: -ARC / 2 },
  ]
  for (const band of bands) {
    if (delta >= band.min && delta <= band.max) return { side: band.side, angle: delta }
  }
  let best: { side: 1 | -1; angle: number } = { side: 1, angle: ARC / 2 + ARC }
  let bestGap = Infinity
  for (const band of bands) {
    for (const edge of [band.min, band.max]) {
      const gap = Math.abs(Math.atan2(Math.sin(delta - edge), Math.cos(delta - edge)))
      if (gap < bestGap) {
        bestGap = gap
        best = { side: band.side, angle: edge }
      }
    }
  }
  return best
}

export type Collider = {
  x: number
  z: number
  radius: number
}

type WakeItem = {
  mesh: THREE.Mesh
  life: number
}

type ShotSpawn = {
  position: THREE.Vector3
  velocity: THREE.Vector3
}

export type { ShotSpawn }

type Puff = {
  mesh: THREE.Mesh
  life: number
}

type Splash = {
  mesh: THREE.Mesh
  life: number
}

/**
 * Builds the galleon, sails it with arcade controls, and reports cannon spawns.
 * Rapier owns the cannonballs after they leave the muzzle.
 */

export class Ship {
  /** Hull, masts, and everything that sails with the ship. */
  readonly group = new THREE.Group()
  /** Wake ribbons live here, in world space, so they do not inherit the hull turn. */
  readonly effects = new THREE.Group()
  /** Flat world position used by sailing and the minimap. */
  readonly position = new THREE.Vector3()
  /** Heading in radians. 0 looks toward +Z. The ship starts facing -Z. */
  yaw = Math.PI
  /** Meters per second. Negative means the ship is reversing. */
  speed = 0

  private readonly body = new THREE.Group()
  private readonly wake: WakeItem[] = []
  private wakeClock = 0
  private wakeSide = 0
  private edgeLatched = false
  private readonly sternLocal = new THREE.Vector3()
  private readonly sternWorld = new THREE.Vector3()
  private readonly shotDir = new THREE.Vector3()
  private readonly muzzles: THREE.Object3D[] = []
  private readonly flashes: Puff[] = []
  private readonly splashes: Splash[] = []
  private fireCooldown = 0
  private recoil = 0

  constructor() {
    this.group.add(this.body)
    this.placeGuns()
    this.loadHull()
    this.createWake()
    this.createBroadside()
    this.position.set(0, 0, 4)
    this.syncHull(0)
  }

  /**
   * Loads the kit galleon and turns its bow onto local +Z.
   */
  private loadHull() {
    const loader = new GLTFLoader()
    loader.load('/models/Ship_Large.gltf', (gltf) => {
      const hull = gltf.scene
      const scale = 0.46
      const centerX = (-9.517061233520508 + 5.915895462036133) / 2
      hull.scale.setScalar(scale)
      hull.rotation.y = Math.PI / 2
      hull.position.set(0, 0.32, centerX * scale)
      hull.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.castShadow = true
        mesh.receiveShadow = true
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        list.forEach((material) => applyCurve(material))
      })
      this.body.add(hull)
    })
  }

  /**
   * Muzzles sit on the cannon mouths baked into the hull.
   * Four along each gun deck, plus the quarterdeck gun and the forward gun. The bow has none.
   */
  private placeGuns() {
    const along = [-1.71, -1.2, -0.7, -0.15]
    for (const side of [1, -1] as const) {
      for (const z of along) {
        const muzzle = new THREE.Object3D()
        muzzle.position.set(side * 1.2, 0.4, z)
        muzzle.userData.side = side
        this.body.add(muzzle)
        this.muzzles.push(muzzle)
      }
      const upper = [
        { y: 1.16, z: -2.67, x: 1.3 },
        { y: 1.02, z: 1.34, x: 1.26 },
      ]
      for (const gun of upper) {
        const muzzle = new THREE.Object3D()
        muzzle.position.set(side * gun.x, gun.y, gun.z)
        muzzle.userData.side = side
        this.body.add(muzzle)
        this.muzzles.push(muzzle)
      }
    }
  }


  private createWake() {
    const geometry = new THREE.PlaneGeometry(1.15, 2.1)
    for (let i = 0; i < 20; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: '#e7f7ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.rotation.order = 'YXZ'
      mesh.visible = false
      mesh.renderOrder = 2
      this.effects.add(mesh)
      this.wake.push({ mesh, life: 0 })
    }
  }

  private syncHull(time: number) {
    const x = this.position.x
    const z = this.position.z
    const y = waveHeight(x, z, time)
    const sample = 1.35
    const fx = Math.sin(this.yaw)
    const fz = Math.cos(this.yaw)
    const rx = Math.cos(this.yaw)
    const rz = -Math.sin(this.yaw)
    const bow = waveHeight(x + fx * 3.2, z + fz * 3.2, time)
    const stern = waveHeight(x - fx * 3.2, z - fz * 3.2, time)
    const left = waveHeight(x - rx * sample, z - rz * sample, time)
    const right = waveHeight(x + rx * sample, z + rz * sample, time)

    this.body.position.set(x, y + 0.12 + Math.sin(this.recoil * Math.PI) * 0.05, z)
    this.body.rotation.y = this.yaw
    this.body.rotation.x = THREE.MathUtils.clamp((bow - stern) * 0.28, -0.18, 0.18)
    this.body.rotation.z = THREE.MathUtils.clamp((right - left) * 0.35, -0.22, 0.22)
  }

  private collide(colliders: Collider[]) {
    for (const collider of colliders) {
      const dx = this.position.x - collider.x
      const dz = this.position.z - collider.z
      const dist = Math.hypot(dx, dz)
      const min = collider.radius
      if (dist >= min || dist < 0.0001) continue
      const nx = dx / dist
      const nz = dz / dist
      this.position.x = collider.x + nx * min
      this.position.z = collider.z + nz * min
      const forwardDot = Math.sin(this.yaw) * nx + Math.cos(this.yaw) * nz
      if (forwardDot < 0.2 && this.speed > 0) this.speed = 0
      if (forwardDot > -0.2 && this.speed < 0) this.speed = 0
    }
  }

  private spawnWake(time: number) {
    const item = this.wake.find((wake) => wake.life <= 0)
    if (!item) return
    this.wakeSide = 1 - this.wakeSide
    const side = this.wakeSide === 0 ? 0.75 : -0.75
    this.sternLocal.set(side > 0 ? 0.95 : -0.95, 0.2, -3.35)
    this.body.updateMatrixWorld()
    this.sternWorld.copy(this.sternLocal).applyMatrix4(this.body.matrixWorld)
    item.life = 1
    item.mesh.visible = true
    item.mesh.position.copy(this.sternWorld)
    item.mesh.position.y = waveHeight(this.sternWorld.x, this.sternWorld.z, time) + 0.08
    item.mesh.rotation.set(-Math.PI / 2, this.yaw, 0)
    item.mesh.scale.set(0.7 + Math.abs(this.speed) * 0.03, 1, 1)
  }

  private updateWake(dt: number, time: number) {
    for (const item of this.wake) {
      if (item.life <= 0) continue
      item.life -= dt * 0.55
      const material = item.mesh.material as THREE.MeshBasicMaterial
      material.opacity = Math.max(item.life, 0) * 0.32
      item.mesh.scale.x += dt * 0.45
      item.mesh.position.y = waveHeight(item.mesh.position.x, item.mesh.position.z, time) + 0.07
      if (item.life <= 0) {
        item.mesh.visible = false
        material.opacity = 0
      }
    }
  }

  update(
    dt: number,
    time: number,
    forward: number,
    turn: number,
    locked: boolean,
    colliders: Collider[],
    onEdge: () => void,
  ) {
    if (locked) {
      this.speed += (0 - this.speed) * (1 - Math.exp(-4 * dt))
    } else {
      if (forward > 0) this.speed += TUNE.accel * dt
      else if (forward < 0) this.speed -= TUNE.brake * dt
      else this.speed *= Math.exp(-1.15 * dt)
      this.speed = THREE.MathUtils.clamp(this.speed, -TUNE.reverseSpeed, TUNE.maxSpeed)

      const turnStrength = 0.32 + Math.min(Math.abs(this.speed) / TUNE.maxSpeed, 1) * 0.85
      const steer = this.speed < 0 ? -turn : turn
      this.yaw -= steer * TUNE.turnRate * turnStrength * dt

      this.position.x += Math.sin(this.yaw) * this.speed * dt
      this.position.z += Math.cos(this.yaw) * this.speed * dt
    }

    this.collide(colliders)

    const distance = Math.hypot(this.position.x, this.position.z)
    if (distance > TUNE.worldRadius) {
      this.position.multiplyScalar(TUNE.worldRadius / distance)
      const outward = Math.sin(this.yaw) * (this.position.x / distance) + Math.cos(this.yaw) * (this.position.z / distance)
      if (outward > 0 && this.speed > 0) this.speed = 0
      if (!this.edgeLatched) {
        this.edgeLatched = true
        onEdge()
      }
    } else if (distance < TUNE.worldRadius - 8) {
      this.edgeLatched = false
    }

    this.syncHull(time)

    if (!locked && this.speed > 1.4) {
      this.wakeClock += dt
      if (this.wakeClock > 0.07) {
        this.wakeClock = 0
        this.spawnWake(time)
      }
    }
    this.updateWake(dt, time)
    this.updateBroadside(dt, time)
  }

  /**
   * Fires only the broadside that faces the pointer.
   * The forward quarter does not fire. A point astern is pulled to the rear edge of the nearer side.
   * @param targetX - World X the pointer is aimed at.
   * @param targetZ - World Z the pointer is aimed at.
   * @returns Spawns for that side, or null when the guns are cooling down or the aim is ahead.
   */
  aim(targetX: number, targetZ: number): ShotSpawn[] | null {
    if (this.fireCooldown > 0) return null
    const trained = clampAim(this.position.x, this.position.z, this.yaw, targetX, targetZ)
    if (trained.side === null) return null
    this.fireCooldown = 0.68
    this.recoil = 1
    this.body.updateWorldMatrix(true, true)
    return this.muzzles
      .filter((muzzle) => (muzzle.userData.side as number) === trained.side)
      .map((muzzle) => this.spawnToward(muzzle, trained.x, trained.z))
  }

  /**
   * Fires every muzzle on both sides, straight off the beam.
   * @returns Spawn points for Rapier cannonballs, or null while the guns are cooling down.
   */
  fire(): ShotSpawn[] | null {
    if (this.fireCooldown > 0) return null
    this.fireCooldown = 0.68
    this.recoil = 1
    this.body.updateWorldMatrix(true, true)
    return this.muzzles.map((muzzle) => this.spawnFrom(muzzle))
  }

  /** Shows a white ring where a ball meets the water. */
  splash(x: number, z: number, time: number) {
    const splash = this.splashes.find((item) => item.life <= 0)
    if (!splash) return
    splash.life = 1
    splash.mesh.visible = true
    splash.mesh.position.set(x, waveHeight(x, z, time) + 0.08, z)
    splash.mesh.scale.setScalar(0.35)
    const material = splash.mesh.material as THREE.MeshBasicMaterial
    material.opacity = 0.55
  }

  private createBroadside() {
    const flashGeo = new THREE.SphereGeometry(0.16, 6, 5)
    for (const muzzle of this.muzzles) {
      const material = new THREE.MeshBasicMaterial({
        color: '#ffb15a',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(flashGeo, material)
      mesh.visible = false
      mesh.position.set(Math.sign(muzzle.userData.side as number) * 0.05, 0, 0)
      muzzle.add(mesh)
      this.flashes.push({ mesh, life: 0 })
    }

    const splashGeo = new THREE.CircleGeometry(0.5, 16)
    for (let i = 0; i < 12; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: '#f4fbff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(splashGeo, material)
      mesh.rotation.x = -Math.PI / 2
      mesh.visible = false
      this.effects.add(mesh)
      this.splashes.push({ mesh, life: 0 })
    }
  }

  /** @param muzzle - empty object at the outer end of one cannon. @returns where the ball starts and how fast it leaves. */
  private spawnFrom(muzzle: THREE.Object3D): ShotSpawn {
    this.flashMuzzle(muzzle)
    const position = new THREE.Vector3()
    muzzle.getWorldPosition(position)
    const side = muzzle.userData.side as number
    this.shotDir.set(side, 0, 0).transformDirection(this.body.matrixWorld)
    const aimX = position.x + this.shotDir.x * 15
    const aimZ = position.z + this.shotDir.z * 15
    const velocity = launchVelocity(position, aimX, aimZ, this.shotDir)
    position.addScaledVector(this.shotDir, 0.35)
    return { position, velocity }
  }

  /**
   * Sends one ball from a muzzle toward a point on the sea.
   * @param muzzle - Gun that is firing.
   * @param aimX - World X inside the trained arc.
   * @param aimZ - World Z inside the trained arc.
   * @returns The spawn for Rapier.
   */
  private spawnToward(muzzle: THREE.Object3D, aimX: number, aimZ: number): ShotSpawn {
    this.flashMuzzle(muzzle)
    const position = new THREE.Vector3()
    muzzle.getWorldPosition(position)
    const velocity = launchVelocity(position, aimX, aimZ, this.shotDir)
    position.addScaledVector(this.shotDir, 0.35)
    return { position, velocity }
  }

  /** @param muzzle - Gun whose flash mesh should pop. */
  private flashMuzzle(muzzle: THREE.Object3D) {
    const flash = this.flashes.find((item) => item.mesh.parent === muzzle)
    if (!flash) return
    flash.life = 1
    flash.mesh.visible = true
    flash.mesh.scale.setScalar(0.45)
    const material = flash.mesh.material as THREE.MeshBasicMaterial
    material.opacity = 0.95
    material.color.set('#ffb15a')
  }

  private updateBroadside(dt: number, time: number) {
    this.fireCooldown = Math.max(this.fireCooldown - dt, 0)
    this.recoil = Math.max(this.recoil - dt * 2.4, 0)

    for (const flash of this.flashes) {
      if (flash.life <= 0) continue
      flash.life -= dt * 3.1
      const material = flash.mesh.material as THREE.MeshBasicMaterial
      const left = Math.max(flash.life, 0)
      material.opacity = left * 0.9
      material.color.copy(FLASH_HOT).lerp(FLASH_SMOKE, 1 - left)
      flash.mesh.scale.setScalar(0.45 + (1 - left) * 1.7)
      if (flash.life <= 0) flash.mesh.visible = false
    }

    for (const splash of this.splashes) {
      if (splash.life <= 0) continue
      splash.life -= dt * 1.15
      const material = splash.mesh.material as THREE.MeshBasicMaterial
      material.opacity = Math.max(splash.life, 0) * 0.5
      const grown = 1 - Math.max(splash.life, 0)
      splash.mesh.scale.setScalar(0.35 + grown * 2.4)
      splash.mesh.position.y = waveHeight(splash.mesh.position.x, splash.mesh.position.z, time) + 0.07
      if (splash.life <= 0) splash.mesh.visible = false
    }
  }
}
