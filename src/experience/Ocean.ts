import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import { curveUniforms } from './curve'
import { motionScale, readQuality } from './settings'
import { WAVE_GLSL } from './waves'

const SHORE_SLOTS = 24

export type Shore = {
  x: number
  z: number
  radius: number
}

/**
 * The normal map from the three.js ocean example.
 * Linear space, so the ripples are not bent by sRGB.
 * @returns A repeating normal texture.
 */
function exampleWaterNormals() {
  const texture = new THREE.TextureLoader().load('/textures/waternormals.jpg')
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

/**
 * Sea from the three.js ocean example (`webgl_shaders_ocean`), with the mirror turned way down.
 * The sun glint stays. A mild swell and the horizon bend stay so the ship still sits on the water.
 */
export class Ocean {
  /** The Water mesh. Its material is the addon shader. */
  readonly mesh: Water
  private readonly shores: THREE.Vector3[]

  constructor() {
    const quality = readQuality()
    const segments = quality.waterSegments
    const geometry = new THREE.PlaneGeometry(840, 840, segments, segments)
    this.shores = Array.from({ length: SHORE_SLOTS }, () => new THREE.Vector3(0, 0, -1))

    this.mesh = new Water(geometry, {
      textureWidth: quality.waterTexture,
      textureHeight: quality.waterTexture,
      waterNormals: exampleWaterNormals(),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: true,
    })
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.frustumCulled = false
    this.mesh.name = 'ocean'
    this.mesh.receiveShadow = false

    const material = this.mesh.material
    material.uniforms.size.value = 3.5
    material.uniforms.uAmp = { value: motionScale() }
    material.uniforms.uFoam = { value: new THREE.Color('#d5ece8') }
    material.uniforms.uShores = { value: this.shores }
    material.uniforms.uCurveOrigin = curveUniforms.uCurveOrigin
    material.uniforms.uCurve = curveUniforms.uCurve
    this.patchShader(material)
  }

  /**
   * Adds the swell, the horizon bend, and a soft foam ring around each island.
   * Mirror coordinates stay on the flat plane so the reflection does not smear.
   * @param material - The Water shader created by the addon.
   */
  private patchShader(material: THREE.ShaderMaterial) {
    const swell = WAVE_GLSL.replaceAll('uTime', 'time')
    material.vertexShader = material.vertexShader.replace(
      'uniform float time;',
      `uniform float time;
      uniform float uAmp;
      uniform vec2 uCurveOrigin;
      uniform float uCurve;
      ${swell}`,
    )
    material.vertexShader = material.vertexShader.replace(
      /vec4 mvPosition = +modelViewMatrix \* vec4\( position, 1\.0 \);\s*gl_Position = projectionMatrix \* mvPosition;/,
      `vec4 flatWorld = modelMatrix * vec4(position, 1.0);
      vec3 displaced = position;
      float swell = getWave(flatWorld.xz);
      displaced.z += swell;
      vec4 curveWorld = modelMatrix * vec4(displaced, 1.0);
      vec2 curveDelta = curveWorld.xz - uCurveOrigin;
      curveWorld.y -= dot(curveDelta, curveDelta) * uCurve;
      vec4 mvPosition = viewMatrix * curveWorld;
      gl_Position = projectionMatrix * mvPosition;`,
    )

    material.fragmentShader = material.fragmentShader.replace(
      'uniform vec3 waterColor;',
      `uniform vec3 waterColor;
      uniform vec3 uFoam;
      uniform vec3 uShores[${SHORE_SLOTS}];`,
    )
    material.fragmentShader = material.fragmentShader.replace(
      'float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );',
      'float reflectance = ( rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 ) ) * 0.16;',
    )
    material.fragmentShader = material.fragmentShader.replace(
      'vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), reflectionSample + specularLight, reflectance );',
      `vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), reflectionSample, reflectance );
      albedo += specularLight * 0.55;`,
    )
    material.fragmentShader = material.fragmentShader.replace(
      'vec3 outgoingLight = albedo;',
      `float shore = 0.0;
      for (int i = 0; i < ${SHORE_SLOTS}; i++) {
        float rad = uShores[i].z;
        if (rad > 0.0) {
          float d = length(worldPosition.xz - uShores[i].xy);
          shore += 1.0 - smoothstep(rad * 0.86, rad * 1.28, d);
        }
      }
      shore = clamp(shore, 0.0, 1.0);
      vec3 outgoingLight = mix(albedo, uFoam, shore * 0.1);`,
    )
  }

  /**
   * Stores the round foam hints. Irregular shores still get a soft ring from their radius.
   * @param points - Island and rock centers. Extra points past the slot count are ignored.
   */
  setShores(points: Shore[]) {
    this.shores.forEach((shore) => shore.set(0, 0, -1))
    points.slice(0, SHORE_SLOTS).forEach((point, index) => {
      this.shores[index].set(point.x, point.z, point.radius)
    })
  }

  /**
   * Recolors the water body for day or dusk.
   * Day uses the example's dark green. Dusk stays in that family, only a little lighter.
   * @param color - Water body color.
   */
  setMood(color: string) {
    ;(this.mesh.material.uniforms.waterColor.value as THREE.Color).set(color)
  }

  /**
   * Points the water's sun glint at the scene light.
   * @param direction - World direction toward the sun. It is normalized here.
   * @param color - Sun tint, warmer in the evening.
   */
  setSun(direction: THREE.Vector3, color: string) {
    const sunDirection = this.mesh.material.uniforms.sunDirection.value as THREE.Vector3
    sunDirection.copy(direction).normalize()
    ;(this.mesh.material.uniforms.sunColor.value as THREE.Color).set(color)
  }

  /**
   * Advances the ripples and the swell.
   * @param time - Seconds since the page loaded.
   */
  update(time: number) {
    this.mesh.material.uniforms.time.value = time
  }
}
