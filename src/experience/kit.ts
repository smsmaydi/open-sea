import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { applyCurve } from './curve'

const loader = new GLTFLoader()
const sources = new Map<string, THREE.Object3D>()
const waiters = new Map<string, Array<(source: THREE.Object3D) => void>>()

/**
 * Puts a clone of a kit model under `into` once the file has loaded.
 * The same file is fetched once and shared. Names starting with `Characters_` are never requested.
 * @param name - File name without the folder or extension, such as `Environment_PalmTree_1`.
 * @param into - Parent that already has the world position, yaw, and scale.
 */
export function loadKit(name: string, into: THREE.Object3D) {
  const attach = (source: THREE.Object3D) => {
    into.add(source.clone(true))
  }
  const ready = sources.get(name)
  if (ready) {
    attach(ready)
    return
  }
  const queue = waiters.get(name) ?? []
  queue.push(attach)
  waiters.set(name, queue)
  if (queue.length > 1) return
  loader.load(
    `/models/${name}.gltf`,
    (gltf) => {
      const root = gltf.scene
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.castShadow = true
        mesh.receiveShadow = true
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        list.forEach((material) => applyCurve(material))
      })
      sources.set(name, root)
      for (const fn of waiters.get(name) ?? []) fn(root)
      waiters.delete(name)
    },
    undefined,
    () => {
      waiters.delete(name)
    },
  )
}
