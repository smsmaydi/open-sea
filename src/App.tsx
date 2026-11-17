import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { SeaAudio } from './audio/sounds'
import { initialCopy, islands, readHour, storeHour, useLocale, type Hour, type Locale } from './data/content'
import { Input } from './experience/Input'
import { FOG } from './experience/settings'
import { Hud, type HudHandle } from './ui/Hud'
import { SeaWorld, type SeaHandle } from './world/SeaWorld'

/**
 * The page. React owns the HUD and the locale, hour, and sound switches.
 * The 3D world reports focus, radar, and nearby islands through refs so sailing does not rerender the overlay.
 */
export function App() {
  const input = useMemo(() => new Input(), [])
  const audio = useMemo(() => new SeaAudio(), [])
  const hud = useRef<HudHandle>(null)
  const sea = useRef<SeaHandle>(null)
  const [copy, setCopy] = useState(initialCopy)
  const [hour, setHour] = useState<Hour>(readHour)
  const [musicOn, setMusicOn] = useState(true)
  const [sfxOn, setSfxOn] = useState(true)
  const [musicVolume, setMusicVolume] = useState(100)
  const [sfxVolume, setSfxVolume] = useState(100)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const focused = islands.find((island) => island.id === focusedId) ?? null

  useEffect(() => {
    const arm = (event: Event) => {
      const target = event.target
      if (target instanceof Element && target.closest('.volume')) return
      audio.start()
    }
    window.addEventListener('pointerdown', arm)
    window.addEventListener('keydown', arm)
    return () => {
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [audio])

  /**
   * Switches the site between English and German and repaints the signs.
   * @param locale - 'en' or 'de'.
   */
  const chooseLocale = (locale: Locale) => {
    const next = useLocale(locale)
    document.documentElement.lang = locale
    document.title = next.documentTitle
    setCopy(next)
  }

  /**
   * Toggles the warm evening light and remembers the choice.
   * The stored value is 'day' or 'dusk'.
   */
  const toggleHour = () => {
    const next: Hour = hour === 'day' ? 'dusk' : 'day'
    storeHour(next)
    setHour(next)
  }

  /** Pauses the shanty playlist, or starts the next song in the shuffled loop. */
  const toggleMusic = () => {
    const next = !musicOn
    audio.setMusicOn(next)
    setMusicOn(next)
  }

  /** Mutes or unmutes the waves and the cannon sounds. */
  const toggleSfx = () => {
    const next = !sfxOn
    audio.setSfxMuted(!next)
    setSfxOn(next)
  }

  return (
    <>
      <Canvas
        className="sea-view"
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 50, near: 0.1, far: 900, position: [0, 8, 18] }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFShadowMap
          gl.setClearColor(FOG.color)
        }}
      >
        <SeaWorld
          ref={sea}
          copy={copy}
          hour={hour}
          focusedId={focusedId}
          audio={audio}
          input={input}
          onFocused={setFocusedId}
          onFlash={(text) => hud.current?.flash(text)}
          onNear={(island) => hud.current?.setNear(island)}
          onRadar={(shipX, shipZ, yaw, marks, activeId) => hud.current?.updateRadar(shipX, shipZ, yaw, marks, activeId)}
          onAim={(x, y, visible) => hud.current?.setAim(x, y, visible)}
        />
      </Canvas>
      <Hud
        ref={hud}
        copy={copy}
        focused={focused}
        hour={hour}
        musicOn={musicOn}
        sfxOn={sfxOn}
        musicVolume={musicVolume}
        sfxVolume={sfxVolume}
        input={input}
        onLocale={chooseLocale}
        onHour={toggleHour}
        onToggleMusic={toggleMusic}
        onToggleSfx={toggleSfx}
        onMusicVolume={(value) => {
          setMusicVolume(value)
          audio.setMusicVolume(value / 100)
        }}
        onSfxVolume={(value) => {
          setSfxVolume(value)
          audio.setSfxVolume(value / 100)
        }}
        onEnter={() => sea.current?.enter()}
        onExit={() => sea.current?.leave()}
        onFire={() => sea.current?.fire()}
      />
    </>
  )
}
