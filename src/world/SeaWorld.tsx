import { useFrame, useThree } from '@react-three/fiber'
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  Physics,
  RigidBody,
  type CollisionEnterPayload,
  type RapierRigidBody,
} from '@react-three/rapier'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Hour, IslandContent, UiCopy } from '../data/content'
import { islands } from '../data/content'
import type { SeaAudio } from '../audio/sounds'
import { applyCurve, bendScene, curveDrop, curveUniforms } from '../experience/curve'
import { Dressing } from '../experience/Dressing'
import { Input } from '../experience/Input'
import { Island, type WorldProp } from '../experience/Island'
import { Ocean } from '../experience/Ocean'
import { FOG } from '../experience/settings'
import { Ship, clampAim } from '../experience/Ship'
import type { RadarMark } from '../ui/Hud'

/**
 * What the page can ask the world to do.
 * `fire` returns nothing. It is ignored while the cannons are cooling down.
 */
export type SeaHandle = {
  fire: () => void
  enter: () => void
  leave: () => void
}

type SeaWorldProps = {
  /** English or German copy. Changing locale refreshes the wooden signs. */
  copy: UiCopy
  /** 'day' or a warm 'dusk'. Dusk stays bright enough to read the sea. */
  hour: Hour
  /** Id of the island being read, or null while the ship is sailing. */
  focusedId: string | null
  /** @param id - Island to focus, or null to sail away. */
  onFocused: (id: string | null) => void
  /** @param text - Toast such as the world-edge warning. */
  onFlash: (text: string) => void
  /**
   * @param shipX - Ship world X.
   * @param shipZ - Ship world Z.
   * @param yaw - Ship heading in radians.
   * @param marks - Island dots for the minimap.
   * @param activeId - Island drawn larger.
   */
  onRadar: (shipX: number, shipZ: number, yaw: number, marks: RadarMark[], activeId: string | null) => void
  /** @param x - Crosshair left, in canvas pixels. @param y - Crosshair top. @param visible - False hides it. */
  onAim: (x: number, y: number, visible: boolean) => void
  /** @param island - Island close enough to enter, or null. */
  onNear: (island: IslandContent | null) => void
  /** Howler clips for the cannon, the splash, the impact, and the tree break. */
  audio: SeaAudio
  /** Keyboard and touch sail input. */
  input: Input
}

/** A cannonball Rapier is currently simulating. `id` lets a hit remove the right one. */
type LiveShot = {
  id: number
  position: [number, number, number]
  velocity: [number, number, number]
}

/** A hit waiting until the next frame, so physics is not changed in the middle of a step. */
type PendingHit = {
  kind: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

/** How a shattered ball behaves on the surface it struck. */
type BreakSurface = {
  keep: number
  drag: number
  lift: number
  scatter: number
  life: number
}

/** One dark chip left after a ball breaks. It is not a physics body, so it cannot bounce. */
type Shard = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  drag: number
  floor: number
  life: number
  max: number
  sx: number
  sy: number
  sz: number
}

const BREAK: Record<string, BreakSurface> = {
  sea: { keep: 0.14, drag: 3.4, lift: -2.4, scatter: 0.85, life: 0.4 },
  island: { keep: 0.05, drag: 11, lift: 0.28, scatter: 0.55, life: 0.3 },
  rock: { keep: 0.03, drag: 14, lift: 0.12, scatter: 0.35, life: 0.24 },
  tree: { keep: 0.08, drag: 8, lift: 0.45, scatter: 0.7, life: 0.32 },
}

/**
 * Builds the ship, sea, islands, and loose props once.
 * Props are detached here so each one can get its own Rapier body.
 * @returns The objects the scene mounts. `colliders` are the arcade hull colliders, not Rapier.
 */
function createWorld() {
  const ship = new Ship()
  const dressing = new Dressing()
  const ocean = new Ocean()
  const worldIslands = islands.map((data) => new Island(data))
  const props = worldIslands.flatMap((island) => island.collectProps())
  ocean.setShores([
    ...worldIslands.map((island) => ({
      x: island.data.position[0],
      z: island.data.position[1],
      radius: island.data.radius,
    })),
    ...dressing.shores,
  ])
  const colliders = [
    ...worldIslands.map((island) => ({
      x: island.data.position[0],
      z: island.data.position[1],
      radius: island.collisionRadius,
    })),
    ...dressing.colliders,
  ]
  return { ship, dressing, ocean, worldIslands, props, colliders }
}

/**
 * Reads the kind stored on a Rapier body or on its Three.js object.
 * @param payload - The contact Rapier just reported.
 * @returns 'shot', 'sea', 'island', 'tree', 'rock', or undefined.
 */
function otherKind(payload: CollisionEnterPayload) {
  const body = payload.other.rigidBody as { userData?: { kind?: string } } | undefined
  if (body?.userData?.kind) return body.userData.kind
  const objectData = payload.other.rigidBodyObject?.userData as { kind?: string } | undefined
  return objectData?.kind
}

/**
 * The sailing world. Rapier moves cannonballs, topples trees, and slides rocks.
 * The ship itself stays an arcade hull so its own guns cannot collide with it.
 */
export const SeaWorld = forwardRef<SeaHandle, SeaWorldProps>(function SeaWorld(props, ref) {
  const { hour, focusedId } = props
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const scene = useThree((state) => state.scene)
  const gl = useThree((state) => state.gl)
  const world = useMemo(createWorld, [])
  const propsRef = useRef(props)
  propsRef.current = props
  const focusedRef = useRef(focusedId)
  focusedRef.current = focusedId
  const nearestRef = useRef<Island | null>(null)
  const [shots, setShots] = useState<LiveShot[]>([])
  const shotId = useRef(1)
  const hits = useRef(new Map<number, PendingHit>())
  const shards = useRef<Shard[]>([])
  const sun = useRef<THREE.DirectionalLight>(null)
  const snapped = useRef(false)
  const pointer = useRef({ x: 0, y: 0, inside: false })
  const aimScratch = useMemo(
    () => ({
      ray: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      hit: new THREE.Vector3(),
    }),
    [],
  )
  const look = useRef({
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
  })
  const cam = useMemo(
    () => ({
      followPos: new THREE.Vector3(),
      followLook: new THREE.Vector3(),
      focusPos: new THREE.Vector3(),
      focusLook: new THREE.Vector3(),
      desiredPos: new THREE.Vector3(),
      desiredLook: new THREE.Vector3(),
      camPos: new THREE.Vector3(0, 8, 18),
      camLook: new THREE.Vector3(),
      lookPoint: new THREE.Vector3(),
      approach: new THREE.Vector3(),
      side: new THREE.Vector3(),
      focusMix: 0,
    }),
    [],
  )

  /**
   * Records a cannonball contact. A tree hit replaces a ground or water hit from the same ball.
   * @param id - Shot id.
   * @param kind - What the ball touched.
   * @param x - Contact world X, used to place the splash ring.
   * @param z - Contact world Z.
   */
  const noteHit = useCallback((id: number, kind: string, x: number, y: number, z: number, vx: number, vy: number, vz: number) => {
    const prev = hits.current.get(id)
    if (!prev || (prev.kind !== 'tree' && kind === 'tree')) hits.current.set(id, { kind, x, y, z, vx, vy, vz })
  }, [])

  const aimedFire = useCallback((x: number, z: number) => {
    const spawned = world.ship.aim(x, z)
    if (!spawned) return
    propsRef.current.audio.playCannon()
    const next = spawned.map((shot) => ({
      id: shotId.current++,
      position: [shot.position.x, shot.position.y, shot.position.z] as [number, number, number],
      velocity: [shot.velocity.x, shot.velocity.y, shot.velocity.z] as [number, number, number],
    }))
    setShots((list) => [...list, ...next])
  }, [world])

  const broadside = useCallback(() => {
    const spawned = world.ship.fire()
    if (!spawned) return
    propsRef.current.audio.playCannon()
    const next = spawned.map((shot) => ({
      id: shotId.current++,
      position: [shot.position.x, shot.position.y, shot.position.z] as [number, number, number],
      velocity: [shot.velocity.x, shot.velocity.y, shot.velocity.z] as [number, number, number],
    }))
    setShots((list) => [...list, ...next])
  }, [world])

  const enter = useCallback(() => {
    if (focusedRef.current) return
    const nearest = nearestRef.current
    if (nearest) propsRef.current.onFocused(nearest.data.id)
    else propsRef.current.onFlash(propsRef.current.copy.approach)
  }, [])

  const leave = useCallback(() => {
    propsRef.current.onFocused(null)
  }, [])

  useImperativeHandle(ref, () => ({ fire: broadside, enter, leave }), [broadside, enter, leave])

  useEffect(() => {
    bendScene(scene)
    gl.domElement.id = 'scene'
    if (import.meta.env.DEV) {
      ;(window as unknown as { __sea?: typeof world }).__sea = world
    }
  }, [scene, gl, world])

  useEffect(() => {
    for (const island of world.worldIslands) island.refreshSign()
  }, [props.copy.locale, world])

  useEffect(() => {
    const dusk = hour === 'dusk'
    gl.toneMappingExposure = dusk ? 1.04 : 1.08
    gl.setClearColor(dusk ? '#f3c4a2' : FOG.color)
    world.ocean.setMood(dusk ? '#1a4564' : '#0e4a6e')
    world.dressing.setHour(hour)
    document.body.style.background = dusk ? '#e7c3a4' : '#d4e5f2'
  }, [hour, gl, world])

  useEffect(() => {
    const fit = () => {
      const narrow = window.innerWidth < 760
      camera.fov = narrow ? 60 : 50
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [camera])

  /**
   * Casts the pointer onto the sea plane.
   * A ray that misses the plane, because the pointer is above the horizon, falls back to a point ahead.
   * @param clientX - Pointer X in the page.
   * @param clientY - Pointer Y in the page.
   * @returns The world point, or null when the pointer is outside the canvas.
   */
  const pointOnSea = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null
    const scratch = aimScratch
    scratch.ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1)
    scratch.ray.setFromCamera(scratch.ndc, camera)
    if (scratch.ray.ray.intersectPlane(scratch.plane, scratch.hit)) return scratch.hit
    const dir = scratch.ray.ray.direction
    const flat = Math.hypot(dir.x, dir.z)
    if (flat < 0.0001) return null
    scratch.hit.set(camera.position.x + (dir.x / flat) * 36, 0, camera.position.z + (dir.z / flat) * 36)
    return scratch.hit
  }, [aimScratch, camera, gl])

  useEffect(() => {
    const view = gl.domElement
    const onDown = (event: PointerEvent) => {
      pointer.current.x = event.clientX
      pointer.current.y = event.clientY
      pointer.current.inside = true
      if (event.button === 0) {
        if (focusedRef.current) return
        const hit = pointOnSea(event.clientX, event.clientY)
        if (!hit) return
        aimedFire(hit.x, hit.z)
      }
    }
    const onMove = (event: PointerEvent) => {
      pointer.current.x = event.clientX
      pointer.current.y = event.clientY
      pointer.current.inside = true
    }
    const onLeave = () => {
      pointer.current.inside = false
    }
    const onMenu = (event: Event) => event.preventDefault()
    view.addEventListener('pointerdown', onDown)
    view.addEventListener('pointermove', onMove)
    view.addEventListener('pointerleave', onLeave)
    view.addEventListener('contextmenu', onMenu)
    return () => {
      view.removeEventListener('pointerdown', onDown)
      view.removeEventListener('pointermove', onMove)
      view.removeEventListener('pointerleave', onLeave)
      view.removeEventListener('contextmenu', onMenu)
    }
  }, [aimedFire, gl, pointOnSea])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code.startsWith('Arrow')) event.preventDefault()
      if (event.code === 'Space') {
        event.preventDefault()
        const target = event.target
        if (!(target instanceof Element) || !target.closest('button, a, input, textarea')) broadside()
      }
      if (event.repeat) return
      if (event.code === 'Enter') {
        event.preventDefault()
        enter()
      }
      if (event.code === 'Escape') {
        event.preventDefault()
        leave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [broadside, enter, leave])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const time = state.clock.elapsedTime
    const current = propsRef.current
    const { ship, dressing, ocean, worldIslands, colliders } = world

    if (hits.current.size) {
      const batch = [...hits.current]
      hits.current.clear()
      for (const [, hit] of batch) {
        shatter(shards.current, hit)
        if (hit.kind === 'sea') {
          current.audio.playSplash()
          ship.splash(hit.x, hit.z, time)
        } else if (hit.kind === 'tree') current.audio.playExplosion()
        else current.audio.playImpact()
      }
      const gone = new Set(batch.map(([id]) => id))
      setShots((list) => list.filter((shot) => !gone.has(shot.id)))
    }

    ship.update(dt, time, current.input.forward, current.input.turn, focusedRef.current !== null, colliders, () => {
      current.onFlash(current.copy.edge)
    })

    let nearest: Island | null = null
    let nearestDistance = Infinity
    for (const island of worldIslands) {
      const dx = ship.position.x - island.group.position.x
      const dz = ship.position.z - island.group.position.z
      const distance = Math.hypot(dx, dz)
      if (distance < island.triggerRadius && distance < nearestDistance) {
        nearest = island
        nearestDistance = distance
      }
    }
    nearestRef.current = nearest

    const focused = worldIslands.find((island) => island.data.id === focusedRef.current) ?? null
    for (const island of worldIslands) {
      const dx = ship.position.x - island.group.position.x
      const dz = ship.position.z - island.group.position.z
      const distance = Math.hypot(dx, dz)
      let proximity = 0
      if (focused === island) proximity = 1
      else if (nearest === island) {
        const span = Math.max(island.triggerRadius - island.collisionRadius, 0.001)
        proximity = 1 - THREE.MathUtils.clamp((distance - island.collisionRadius) / span, 0, 1)
      }
      island.update(dt, time, proximity)
    }

    ocean.update(time)
    dressing.update(dt, time, ship.position.x, ship.position.z)
    const low = current.hour === 'dusk'
    if (sun.current) {
      sun.current.position.set(ship.position.x + (low ? 58 : 26), low ? 20 : 54, ship.position.z + (low ? 16 : 18))
      sun.current.target.position.set(ship.position.x, 0, ship.position.z)
      sun.current.target.updateMatrixWorld()
      ocean.setSun(sun.current.position, low ? '#ffb067' : '#fff1d4')
    }

    updateCamera(dt, !snapped.current)
    snapped.current = true
    dressing.follow(camera.position.x, camera.position.z)
    current.onNear(focused ? null : (nearest?.data ?? null))
    current.onRadar(
      ship.position.x,
      ship.position.z,
      ship.yaw,
      worldIslands.map((island) => ({
        id: island.data.id,
        x: island.data.position[0],
        z: island.data.position[1],
        accent: island.data.accent,
      })),
      focused?.data.id ?? nearest?.data.id ?? null,
    )
    const mouse = pointer.current
    const viewRect = gl.domElement.getBoundingClientRect()
    if (!mouse.inside || focused || viewRect.width < 760) {
      current.onAim(0, 0, false)
    } else {
      const hit = pointOnSea(mouse.x, mouse.y)
      const trained = hit ? clampAim(ship.position.x, ship.position.z, ship.yaw, hit.x, hit.z) : null
      current.onAim(mouse.x - viewRect.left, mouse.y - viewRect.top, Boolean(trained && trained.side !== null))
    }
  })

  /**
   * Stays behind the ship and leans toward the pointer once it leaves the middle of the screen.
   * The aim ring stays on the pointer, so this lean does not drag the ring back toward the ship.
   * @param dt - Frame delta in seconds.
   * @param snap - True on the first frame, so the camera does not ease in from the origin.
   */
  function updateCamera(dt: number, snap: boolean) {
    const state = look.current
    const mouse = pointer.current
    const view = gl.domElement
    const rect = view.getBoundingClientRect()
    const followMouse = mouse.inside && !focusedRef.current && rect.width >= 760
    if (followMouse) {
      const nx = ((mouse.x - rect.left) / rect.width) * 2 - 1
      const ny = ((mouse.y - rect.top) / rect.height) * 2 - 1
      const dead = 0.22
      const yawN = Math.abs(nx) <= dead ? 0 : Math.sign(nx) * (Math.abs(nx) - dead) / (1 - dead)
      const pitchN = Math.abs(ny) <= dead ? 0 : Math.sign(ny) * (Math.abs(ny) - dead) / (1 - dead)
      state.targetYaw = THREE.MathUtils.clamp(yawN * 1.15, -1.2, 1.2)
      state.targetPitch = THREE.MathUtils.clamp(-pitchN * 0.5, -0.14, 0.62)
    } else {
      state.targetYaw = 0
      state.targetPitch = 0
    }
    const blend = 1 - Math.exp(-6.2 * dt)
    state.yaw += (state.targetYaw - state.yaw) * blend
    state.pitch += (state.targetPitch - state.pitch) * blend

    const narrow = window.innerWidth < 760
    const distance = narrow ? 11.5 : 13.2
    const height = narrow ? 7.4 : 6.3
    const lookAhead = narrow ? 2.6 : 4.4
    const lookHeight = narrow ? 1.9 : 2.1
    const yaw = world.ship.yaw
    const fx = Math.sin(yaw)
    const fz = Math.cos(yaw)
    const ship = world.ship.position
    cam.followPos.set(ship.x - fx * distance, height, ship.z - fz * distance)
    cam.followLook.set(ship.x + fx * lookAhead, lookHeight, ship.z + fz * lookAhead)

    if (state.yaw * state.yaw + state.pitch * state.pitch > 1e-6) {
      const ox = cam.followPos.x - cam.followLook.x
      const oy = cam.followPos.y - cam.followLook.y
      const oz = cam.followPos.z - cam.followLook.z
      const cos = Math.cos(state.yaw)
      const sin = Math.sin(state.yaw)
      const rx = ox * cos - oz * sin
      const rz = ox * sin + oz * cos
      const horiz = Math.hypot(rx, rz)
      const elev = Math.atan2(oy, horiz) + state.pitch
      const len = Math.hypot(horiz, oy)
      const ny = Math.sin(elev) * len
      const nh = Math.cos(elev) * len
      const scale = horiz > 0.0001 ? nh / horiz : 0
      cam.followPos.set(cam.followLook.x + rx * scale, cam.followLook.y + ny, cam.followLook.z + rz * scale)
    }

    const focused = world.worldIslands.find((island) => island.data.id === focusedRef.current)
    if (focused) {
      cam.approach.set(ship.x - focused.group.position.x, 0, ship.z - focused.group.position.z)
      if (cam.approach.lengthSq() < 0.001) cam.approach.set(0, 0, 1)
      cam.approach.normalize()
      cam.side.set(cam.approach.z, 0, -cam.approach.x)
      const pull = focused.data.radius + (narrow ? 9 : 13)
      cam.focusPos.copy(focused.group.position).addScaledVector(cam.approach, pull)
      cam.focusPos.addScaledVector(cam.side, narrow ? 2 : 6)
      cam.focusPos.y = narrow ? 10 : 8
      cam.focusLook.copy(focused.group.position).addScaledVector(cam.side, narrow ? -1 : -3)
      cam.focusLook.y = narrow ? 2.8 : 2.3
    }

    const targetMix = focused ? 1 : 0
    cam.focusMix = snap ? targetMix : cam.focusMix + (targetMix - cam.focusMix) * (1 - Math.exp(-3.1 * dt))
    const ease = cam.focusMix * cam.focusMix * (3 - 2 * cam.focusMix)
    cam.desiredPos.lerpVectors(cam.followPos, cam.focusPos, ease)
    cam.desiredLook.lerpVectors(cam.followLook, cam.focusLook, ease)
    const k = snap ? 1 : 1 - Math.exp(-4.4 * dt)
    cam.camPos.lerp(cam.desiredPos, k)
    cam.camLook.lerp(cam.desiredLook, k)
    camera.position.copy(cam.camPos)
    cam.lookPoint.copy(cam.camLook)
    cam.lookPoint.y -= curveDrop(cam.lookPoint.x, cam.lookPoint.z, cam.camPos.x, cam.camPos.z)
    camera.lookAt(cam.lookPoint)
    curveUniforms.uCurveOrigin.value.set(cam.camPos.x, cam.camPos.z)
  }

  const dusk = hour === 'dusk'
  return (
    <>
      <color attach="background" args={[dusk ? '#f3c4a2' : FOG.color]} />
      <fog attach="fog" args={[dusk ? '#f3c4a2' : FOG.color, dusk ? 46 : FOG.near, dusk ? 168 : FOG.far]} />
      <hemisphereLight
        color={dusk ? '#ffd2b0' : '#d5e7ff'}
        groundColor={dusk ? '#8a6248' : '#8d6d49'}
        intensity={dusk ? 0.86 : 0.78}
      />
      <ambientLight color={dusk ? '#ffe0c4' : '#fff6ea'} intensity={dusk ? 0.62 : 0.32} />
      <directionalLight
        ref={sun}
        color={dusk ? '#ffc08a' : '#fff1d4'}
        intensity={dusk ? 2.15 : 2.55}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-camera-near={1}
        shadow-camera-far={140}
      />
      <Physics gravity={[0, -11, 0]} colliders={false}>
        <primitive object={world.ocean.mesh} />
        <primitive object={world.ship.group} />
        <primitive object={world.ship.effects} />
        <primitive object={world.dressing.root} />
        {world.worldIslands.map((island) => (
          <IslandBody key={island.data.id} island={island} />
        ))}
        {world.props.map((prop) =>
          prop.kind === 'tree' ? <TreeBody key={prop.id} prop={prop} /> : <RockBody key={prop.id} prop={prop} />,
        )}
        {shots.map((shot) => (
          <CannonBall key={shot.id} shot={shot} onHit={noteHit} />
        ))}
        <Fragments shards={shards} />
        <RigidBody type="fixed" position={[0, -0.35, 0]} colliders={false} userData={{ kind: 'sea' }}>
          <CuboidCollider args={[420, 0.4, 420]} />
        </RigidBody>
      </Physics>
    </>
  )
})

/**
 * Island mesh plus a fixed cylinder the cannonballs can strike.
 * The cylinder top sits on the grass. Trees and rocks have their own bodies.
 */
function IslandBody({ island }: { island: Island }) {
  return (
    <>
      <primitive object={island.group} />
      <RigidBody
        type="fixed"
        colliders={false}
        position={[island.data.position[0], 0.4, island.data.position[1]]}
        userData={{ kind: 'island' }}
      >
        <CylinderCollider args={[0.55, island.data.radius * 0.96]} friction={0.95} restitution={0} />
      </RigidBody>
    </>
  )
}

/**
 * A palm that stays planted until a cannonball touches it.
 * `live` switches the Rapier prop to dynamic. A later render must not put it back to fixed,
 * or the topple is wiped out.
 */
function TreeBody({ prop }: { prop: WorldProp }) {
  const body = useRef<RapierRigidBody>(null)
  const push = useRef(new THREE.Vector3(1, 0, 0))
  const started = useRef(false)
  const sensed = useRef(false)
  const done = useRef(false)
  /** False until a shot hits. Then the body is allowed to rotate. */
  const [live, setLive] = useState(false)
  /** True once the crown is down and the trunk should stay there. */
  const [resting, setResting] = useState(false)

  useFrame(() => {
    const api = body.current
    if (!api || !live || done.current) return
    if (api.bodyType() !== 0) return
    if (!started.current) {
      started.current = true
      api.setAdditionalMassProperties(12, { x: 0, y: 0.15, z: 0 }, { x: 6, y: 0.4, z: 6 }, { x: 0, y: 0, z: 0, w: 1 }, true)
      const dir = push.current
      api.applyTorqueImpulse({ x: dir.z * 16, y: 0, z: -dir.x * 16 }, true)
      return
    }
    if (!sensed.current) {
      sensed.current = true
      api.collider(0).setSensor(true)
    }
    const rot = api.rotation()
    const upY = 1 - 2 * (rot.x * rot.x + rot.z * rot.z)
    if (upY < 0.28) {
      api.setAngvel({ x: 0, y: 0, z: 0 }, true)
      done.current = true
      setResting(true)
      return
    }
    if (upY > 0.45) {
      const dir = push.current
      api.applyTorqueImpulse({ x: dir.z * 0.35, y: 0, z: -dir.x * 0.35 }, true)
    }
  })

  return (
    <RigidBody
      ref={body}
      type={live ? 'dynamic' : 'fixed'}
      colliders={false}
      canSleep={false}
      gravityScale={0}
      lockTranslations
      lockRotations={resting}
      angularDamping={live ? 0.55 : 0}
      position={prop.position}
      rotation={prop.rotation}
      userData={{ kind: 'tree' }}
      onCollisionEnter={(payload) => {
        if (live || otherKind(payload) !== 'shot') return
        const vel = payload.other.rigidBody?.linvel()
        push.current.set(vel?.x ?? 1, 0, vel?.z ?? 0)
        if (push.current.lengthSq() < 0.0001) push.current.set(1, 0, 0)
        push.current.normalize()
        setLive(true)
      }}
    >
      <CylinderCollider args={[1.35, 0.9]} position={[0, 1.95, 0]} friction={0.6} restitution={0} />
      <primitive object={prop.object} />
    </RigidBody>
  )
}

/**
 * A rock that stays put until a direct hit, then slides a short way and stops.
 * `live` is what Rapier reads, so a re-render keeps the rock dynamic.
 */
function RockBody({ prop }: { prop: WorldProp }) {
  const body = useRef<RapierRigidBody>(null)
  const push = useRef(new THREE.Vector3(1, 0, 0))
  const pushed = useRef(false)
  /** False until a cannonball hits this stone. */
  const [live, setLive] = useState(false)
  const radius = Math.min(Math.max(prop.radius * 0.8, 0.34), 0.62)
  const bodyY = Math.max(prop.position[1], 0.95 + radius)
  const sink = prop.position[1] - bodyY

  useFrame(() => {
    const api = body.current
    if (!api || !live || pushed.current || api.bodyType() !== 0) return
    pushed.current = true
    const dir = push.current
    api.applyImpulse({ x: dir.x * 2.2, y: 0.08, z: dir.z * 2.2 }, true)
  })

  return (
    <RigidBody
      ref={body}
      type={live ? 'dynamic' : 'fixed'}
      colliders={false}
      linearDamping={7.5}
      angularDamping={8}
      position={[prop.position[0], bodyY, prop.position[2]]}
      rotation={prop.rotation}
      userData={{ kind: 'rock' }}
      onCollisionEnter={(payload) => {
        if (live || otherKind(payload) !== 'shot') return
        const vel = payload.other.rigidBody?.linvel()
        push.current.set(vel?.x ?? 1, 0, vel?.z ?? 0)
        if (push.current.lengthSq() < 0.0001) push.current.set(1, 0, 0)
        push.current.normalize()
        setLive(true)
      }}
    >
      <CylinderCollider args={[1.15, radius]} position={[0, 0.2, 0]} friction={1.25} restitution={0} />
      <primitive object={prop.object} position={[0, sink, 0]} />
    </RigidBody>
  )
}

/**
 * Breaks a ball into a few chips. Water lets them sink. Ground, rock, and wood stop them almost at once.
 * @param list - Live chips. The fragment view reads this every frame.
 * @param hit - Surface and the ball's velocity at the moment of contact.
 */
function shatter(list: Shard[], hit: PendingHit) {
  const surface = BREAK[hit.kind] ?? BREAK.island
  const floor = hit.kind === 'sea' ? -0.55 : hit.y - 0.04
  for (let i = 0; i < 7; i += 1) {
    list.push({
      x: hit.x + (Math.random() - 0.5) * 0.12,
      y: hit.y + Math.random() * 0.06,
      z: hit.z + (Math.random() - 0.5) * 0.12,
      vx: hit.vx * surface.keep + (Math.random() - 0.5) * surface.scatter,
      vy: Math.min(hit.vy, 0) * surface.keep + surface.lift * (0.45 + Math.random() * 0.55),
      vz: hit.vz * surface.keep + (Math.random() - 0.5) * surface.scatter,
      drag: surface.drag,
      floor,
      life: surface.life * (0.75 + Math.random() * 0.4),
      max: surface.life,
      sx: 0.45 + Math.random() * 0.7,
      sy: 0.28 + Math.random() * 0.45,
      sz: 0.35 + Math.random() * 0.6,
    })
  }
}

/**
 * Dark chips from a broken ball. They slow down on the surface and never rebound.
 * @param shards - Shared list filled when a shot connects.
 */
function Fragments({ shards }: { shards: { current: Shard[] } }) {
  const group = useRef<THREE.Group>(null)
  const geo = useMemo(() => new THREE.BoxGeometry(0.12, 0.12, 0.12), [])
  const mat = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({ color: '#3a3e44', roughness: 0.84, metalness: 0.28 })
    applyCurve(material)
    return material
  }, [])
  const meshes = useRef<THREE.Mesh[]>([])

  useFrame((_, rawDt) => {
    const root = group.current
    if (!root) return
    const step = Math.min(rawDt, 0.05)
    const list = shards.current
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const shard = list[i]
      shard.life -= step
      if (shard.life <= 0) {
        list.splice(i, 1)
        continue
      }
      const damp = Math.exp(-shard.drag * step)
      shard.vx *= damp
      shard.vz *= damp
      shard.vy = shard.vy * damp - 11 * step
      shard.x += shard.vx * step
      shard.y += shard.vy * step
      shard.z += shard.vz * step
      if (shard.y < shard.floor) {
        shard.y = shard.floor
        if (shard.vy < 0) shard.vy = 0
        shard.vx *= 0.35
        shard.vz *= 0.35
      }
    }
    while (meshes.current.length < list.length) {
      const mesh = new THREE.Mesh(geo, mat)
      root.add(mesh)
      meshes.current.push(mesh)
    }
    for (let i = 0; i < meshes.current.length; i += 1) {
      const mesh = meshes.current[i]
      const shard = list[i]
      mesh.visible = Boolean(shard)
      if (!shard) continue
      mesh.position.set(shard.x, shard.y, shard.z)
      const fade = Math.max(shard.life / shard.max, 0)
      const scale = 0.55 + fade * 0.45
      mesh.scale.set(shard.sx * scale, shard.sy * scale, shard.sz * scale)
      mesh.rotation.x += step * 5
      mesh.rotation.y += step * 3.4
    }
  })

  return <group ref={group} />
}

/**
 * One cannonball. The first solid contact hides it and breaks it apart.
 * Restitution stays at zero so Rapier cannot kick it back up like a game ball.
 * @param shot - Start position and muzzle velocity.
 * @param onHit - Receives the shot id, the other body's kind, the contact point, and the incoming velocity.
 */
function CannonBall({
  shot,
  onHit,
}: {
  shot: LiveShot
  onHit: (id: number, kind: string, x: number, y: number, z: number, vx: number, vy: number, vz: number) => void
}) {
  const body = useRef<RapierRigidBody>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const spent = useRef(false)
  return (
    <RigidBody
      ref={body}
      type="dynamic"
      colliders={false}
      ccd
      canSleep={false}
      position={shot.position}
      linearVelocity={shot.velocity}
      userData={{ kind: 'shot' }}
      onCollisionEnter={(payload) => {
        if (spent.current) return
        const kind = otherKind(payload)
        if (!kind || kind === 'shot') return
        spent.current = true
        const api = body.current
        const vel = api?.linvel()
        api?.setLinvel({ x: 0, y: 0, z: 0 }, true)
        api?.setAngvel({ x: 0, y: 0, z: 0 }, true)
        if (mesh.current) mesh.current.visible = false
        const at = api?.translation()
        onHit(
          shot.id,
          kind,
          at?.x ?? shot.position[0],
          at?.y ?? shot.position[1],
          at?.z ?? shot.position[2],
          vel?.x ?? shot.velocity[0],
          vel?.y ?? shot.velocity[1],
          vel?.z ?? shot.velocity[2],
        )
      }}
    >
      <BallCollider args={[0.15]} friction={1} restitution={0} />
      <mesh ref={mesh} castShadow>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshStandardMaterial
          color="#2c3036"
          roughness={0.74}
          metalness={0.46}
          ref={(material) => {
            if (material) applyCurve(material)
          }}
        />
      </mesh>
    </RigidBody>
  )
}
