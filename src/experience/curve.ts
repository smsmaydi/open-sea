import * as THREE from 'three'

export const curveUniforms = {
  uCurveOrigin: { value: new THREE.Vector2() },
  uCurve: { value: 0.00172 },
}

export function curveDrop(x: number, z: number, originX: number, originZ: number) {
  const dx = x - originX
  const dz = z - originZ
  return (dx * dx + dz * dz) * curveUniforms.uCurve.value
}

const CURVE_VERTEX = `
{
  vec4 curveWorld = modelMatrix * vec4(transformed, 1.0);
  vec2 curveDelta = curveWorld.xz - uCurveOrigin;
  curveWorld.y -= dot(curveDelta, curveDelta) * uCurve;
  transformed = (inverse(modelMatrix) * curveWorld).xyz;
}
`

const CURVE_NORMAL = `
{
  vec3 curveBase = (modelMatrix * vec4(position, 1.0)).xyz;
  vec2 curveNd = curveBase.xz - uCurveOrigin;
  vec3 curveTilt = vec3(curveNd.x, 0.0, curveNd.y) * (2.0 * uCurve);
  objectNormal = normalize(objectNormal + inverse(mat3(modelMatrix)) * curveTilt);
}
`

export function applyCurve(material: THREE.Material) {
  if (material.userData.curve || material.userData.noCurve) return
  if (!(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial || material instanceof THREE.LineBasicMaterial)) return
  material.userData.curve = true
  const previous = material.onBeforeCompile
  const previousKey = material.customProgramCacheKey.bind(material)
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    shader.uniforms.uCurveOrigin = curveUniforms.uCurveOrigin
    shader.uniforms.uCurve = curveUniforms.uCurve
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform vec2 uCurveOrigin;
      uniform float uCurve;`,
    )
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${CURVE_VERTEX}`)
    if (shader.vertexShader.includes('#include <beginnormal_vertex>')) {
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${CURVE_NORMAL}`)
    }
  }
  material.customProgramCacheKey = () => `${previousKey()}|curve`
}

export function bendScene(scene: THREE.Object3D) {
  const skipped: THREE.Object3D[] = []
  scene.traverse((obj) => {
    if (obj.userData.noCurve) skipped.push(obj)
  })
  scene.traverse((obj) => {
    for (let parent: THREE.Object3D | null = obj; parent; parent = parent.parent) {
      if (skipped.includes(parent)) return
    }
    const drawable = obj as THREE.Mesh
    if (!drawable.isMesh && !(obj as THREE.Line).isLine) return
    const material = drawable.material
    const list = Array.isArray(material) ? material : [material]
    list.forEach((item) => applyCurve(item))
  })
}
