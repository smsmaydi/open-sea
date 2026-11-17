import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { SHOW_DRAFT_NOTE, type Hour, type IslandContent, type Locale, type UiCopy } from '../data/content'
import type { Input } from '../experience/Input'

/** One island dot on the minimap. */
export type RadarMark = {
  id: string
  x: number
  z: number
  accent: string
}

/**
 * Methods the 3D world can call without making React redraw the whole page.
 * `setNear` holds the island the ship can enter, or null when none is in range.
 */
export type HudHandle = {
  /** @param island - The island beside the ship, or null when none is in range. Shows the mobile Land button. */
  setNear: (island: IslandContent | null) => void
  /** @param text - Short message shown for about two seconds. */
  flash: (text: string) => void
  /**
   * Redraws the minimap.
   * @param shipX - Ship world X.
   * @param shipZ - Ship world Z.
   * @param yaw - Ship heading in radians. 0 faces +Z.
   * @param marks - Island dots.
   * @param activeId - The focused or nearest island, drawn larger.
   */
  updateRadar: (shipX: number, shipZ: number, yaw: number, marks: RadarMark[], activeId: string | null) => void
  /**
   * Places the aim mark on the pointer. The camera never moves this mark.
   * @param x - Left offset in canvas pixels.
   * @param y - Top offset in canvas pixels.
   * @param visible - False while the bow cannot fire, or the view is narrow.
   */
  setAim: (x: number, y: number, visible: boolean) => void
}

/**
 * One sound button with a percent slider that appears while the pointer is over it.
 * @param pressed - True while that bus is unmuted.
 * @param label - Accessible name of the mute button.
 * @param onToggle - Mutes or unmutes.
 * @param volume - 0 to 100.
 * @param volumeLabel - Accessible name of the slider.
 * @param onVolume - Receives the new percent.
 * @param icon - Which glyph to draw.
 */
function VolumeControl({
  pressed,
  label,
  onToggle,
  volume,
  volumeLabel,
  onVolume,
  icon,
}: {
  pressed: boolean
  label: string
  onToggle: () => void
  volume: number
  volumeLabel: string
  onVolume: (value: number) => void
  icon: 'music' | 'sfx'
}) {
  return (
    <div className="volume">
      <button type="button" className="audio-toggle" aria-pressed={pressed} aria-label={label} onClick={onToggle}>
        {icon === 'music' ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M9 17.6a2.6 2.6 0 1 1-1.9-2.5V5.4l10-2v9.4a2.6 2.6 0 1 1-1.9-2.5V6.1l-6.2 1.24V17.6z"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M4 9.2h3.1L11 5.4v13.2l-3.9-3.8H4V9.2z" />
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              d="M14.2 9.1a3.8 3.8 0 0 1 0 5.8M16.7 6.8a7 7 0 0 1 0 10.4"
            />
          </svg>
        )}
      </button>
      <label className="volume-panel">
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          aria-label={volumeLabel}
          onChange={(event) => onVolume(Number(event.target.value))}
        />
        <span>{volume}%</span>
      </label>
    </div>
  )
}

type HudProps = {
  /** Current English or German strings. */
  copy: UiCopy
  /** Which island panel is open. Null hides the panel. */
  focused: IslandContent | null
  /** 'day' or 'dusk'. The button label comes from `copy`. */
  hour: Hour
  /** True while the shuffled playlist is playing. */
  musicOn: boolean
  /** True while waves and cannon sounds are audible. */
  sfxOn: boolean
  /** Music slider, 0 to 100. */
  musicVolume: number
  /** Effects slider, 0 to 100. */
  sfxVolume: number
  /** Shared key and touch state. The pad writes virtual keys into this. */
  input: Input
  /** @param locale - 'en' or 'de'. */
  onLocale: (locale: Locale) => void
  onHour: () => void
  onToggleMusic: () => void
  onToggleSfx: () => void
  /** @param value - Percent from 0 to 100. */
  onMusicVolume: (value: number) => void
  /** @param value - Percent from 0 to 100. */
  onSfxVolume: (value: number) => void
  onEnter: () => void
  onExit: () => void
  onFire: () => void
}

/**
 * The HTML overlay: language, time of day, sound, hints, radar, island panel, and touch controls.
 * The canvas stays underneath. Buttons opt back into pointer events through the stylesheet.
 */
export const Hud = forwardRef<HudHandle, HudProps>(function Hud(
  {
    copy,
    focused,
    hour,
    musicOn,
    sfxOn,
    musicVolume,
    sfxVolume,
    input,
    onLocale,
    onHour,
    onToggleMusic,
    onToggleSfx,
    onMusicVolume,
    onSfxVolume,
    onEnter,
    onExit,
    onFire,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const toastRef = useRef<HTMLDivElement>(null)
  const radarRef = useRef<HTMLCanvasElement>(null)
  const aimRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef(0)

  useImperativeHandle(ref, () => ({
    setNear(island) {
      const root = rootRef.current
      if (!root) return
      root.classList.toggle('is-near', Boolean(island))
    },
    flash(text) {
      const toast = toastRef.current
      if (!toast) return
      toast.textContent = text
      toast.classList.add('is-on')
      window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => toast.classList.remove('is-on'), 1700)
    },
    updateRadar(shipX, shipZ, yaw, marks, activeId) {
      const radar = radarRef.current
      const ctx = radar?.getContext('2d')
      if (!radar || !ctx) return
      drawRadar(ctx, radar, shipX, shipZ, yaw, marks, activeId)
    },
    setAim(x, y, visible) {
      const aim = aimRef.current
      if (!aim) return
      aim.classList.toggle('is-on', visible)
      aim.style.transform = `translate(${x}px, ${y}px)`
    },
  }))

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const hints: [string, string[]][] = [
    [copy.sail, ['W', 'A', 'S', 'D']],
    [copy.look, [copy.lookKey]],
    [copy.fire, [copy.left]],
    [copy.enter, ['Enter']],
    [copy.leave, ['Esc']],
  ]

  return (
      <div ref={rootRef} className={focused ? 'hud is-focused' : 'hud'}>
      <div className="vignette" />
      <div ref={aimRef} className="crosshair" aria-hidden="true" />
      <div className="sound-dock">
        <VolumeControl
          pressed={musicOn}
          label={musicOn ? copy.musicOn : copy.musicOff}
          onToggle={onToggleMusic}
          volume={musicVolume}
          volumeLabel={copy.volume}
          onVolume={onMusicVolume}
          icon="music"
        />
        <VolumeControl
          pressed={sfxOn}
          label={sfxOn ? copy.sfxOn : copy.sfxOff}
          onToggle={onToggleSfx}
          volume={sfxVolume}
          volumeLabel={copy.volume}
          onVolume={onSfxVolume}
          icon="sfx"
        />
      </div>
      <div className="corner">
        <button type="button" className="hour" aria-pressed={hour === 'dusk'} aria-label={copy.timeLabel} onClick={onHour}>
          {hour === 'dusk' ? copy.dusk : copy.day}
        </button>
        <div className="langs" role="group" aria-label={copy.languageLabel}>
          {(['en', 'de'] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              className={copy.locale === locale ? 'is-active' : undefined}
              onClick={() => onLocale(locale)}
            >
              {locale.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="hints">
        {hints.map(([label, keys]) => (
          <span className="hint" key={label}>
            {keys.map((key) => (
              <kbd key={key}>{key}</kbd>
            ))}
            {label}
          </span>
        ))}
      </div>
      <div ref={toastRef} className="toast" role="status" />
      <canvas ref={radarRef} className="radar" width={148} height={148} />
      <aside className={focused ? 'panel is-open' : 'panel'} aria-hidden={focused ? 'false' : 'true'}>
        {focused ? <IslandPanel island={focused} copy={copy} onExit={onExit} /> : null}
      </aside>
      <TouchControls copy={copy} input={input} onEnter={onEnter} onFire={onFire} />
    </div>
  )
})

type PanelProps = {
  /** The island whose text is on screen. */
  island: IslandContent
  copy: UiCopy
  /** Closes the panel and returns the camera to the ship. */
  onExit: () => void
}

/**
 * The reading panel for one island.
 * @returns The article, links, and the back button.
 */
function IslandPanel({ island, copy, onExit }: PanelProps) {
  return (
    <>
      <div className="accent" style={{ background: island.accent }} />
      <button type="button" className="close" aria-label={copy.back} onClick={onExit}>
        ×
      </button>
      <p className="eyebrow">{island.eyebrow}</p>
      <h2>{island.title}</h2>
      <p className="summary">{island.summary}</p>
      <div className="body">
        {island.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {island.entries?.length ? (
          <div className="entries">
            {island.entries.map((entry) => (
              <article className="entry" key={entry.title}>
                {entry.href ? (
                  <a className="entry-title" href={entry.href} target="_blank" rel="noreferrer">
                    {entry.title}
                  </a>
                ) : (
                  <h3>{entry.title}</h3>
                )}
                {entry.meta ? <p className="meta">{entry.meta}</p> : null}
                <p>{entry.text}</p>
              </article>
            ))}
          </div>
        ) : null}
        {island.tags?.length ? (
          <ul className="tags">
            {island.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : island.kind === 'skills' ? (
          <p className="empty">{copy.emptyTags}</p>
        ) : null}
        {island.links?.length ? (
          <div className="links">
            {island.links.map((link) => (
              <a key={link.href} className="link" href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        ) : island.kind === 'github' || island.kind === 'linkedin' || island.kind === 'contact' ? (
          <p className="soon">{copy.comingSoon}</p>
        ) : null}
      </div>
      <footer className="panel-foot">
        {SHOW_DRAFT_NOTE ? <p className="draft">{copy.draft}</p> : null}
        <button type="button" className="back" onClick={onExit}>
          {copy.back}
        </button>
        <span className="esc-hint">ESC</span>
      </footer>
    </>
  )
}

type TouchProps = {
  copy: UiCopy
  /** Receives the stick axes while a finger is dragging it. */
  input: Input
  onEnter: () => void
  onFire: () => void
}

/**
 * A held stick, like a controller's left analog.
 * Drag distance sets speed and turn. Releasing it springs back to the center.
 * @param input - Sail input. The stick writes axes in -1..1.
 * @param label - Accessible name.
 */
function SteerStick({ input, label }: { input: Input; label: string }) {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const active = useRef<number | null>(null)

  const place = (clientX: number, clientY: number) => {
    const el = base.current
    const knobEl = knob.current
    if (!el || !knobEl) return
    const rect = el.getBoundingClientRect()
    const max = rect.width * 0.32
    let dx = clientX - (rect.left + rect.width / 2)
    let dy = clientY - (rect.top + rect.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > max && len > 0) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    knobEl.style.transform = `translate(${dx}px, ${dy}px)`
    const nx = max > 0 ? dx / max : 0
    const ny = max > 0 ? -dy / max : 0
    const mag = Math.hypot(nx, ny)
    const dead = 0.18
    if (mag < dead) input.setStick(0, 0)
    else {
      const shaped = (mag - dead) / (1 - dead)
      input.setStick((nx / mag) * shaped, (ny / mag) * shaped)
    }
  }

  const release = () => {
    active.current = null
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)'
    input.setStick(0, 0)
  }

  return (
    <div
      ref={base}
      className="stick"
      role="group"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault()
        active.current = event.pointerId
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // The stick still follows this gesture if capture is refused.
        }
        place(event.clientX, event.clientY)
      }}
      onPointerMove={(event) => {
        if (active.current !== event.pointerId) return
        place(event.clientX, event.clientY)
      }}
      onPointerUp={(event) => {
        if (active.current !== event.pointerId) return
        release()
      }}
      onPointerCancel={(event) => {
        if (active.current !== event.pointerId) return
        release()
      }}
      onLostPointerCapture={() => {
        if (active.current === null) return
        release()
      }}
    >
      <div ref={knob} className="stick-knob" />
    </div>
  )
}

/**
 * On-screen sail, land, and fire controls.
 * Fire repeats while the button is held. A failed pointer capture still fires the first shot.
 */
function TouchControls({ copy, input, onEnter, onFire }: TouchProps) {
  const repeat = useRef(0)

  useEffect(() => () => window.clearInterval(repeat.current), [])

  return (
    <div className="touch">
      <SteerStick input={input} label={copy.steer} />
      <button
        type="button"
        className="fire-touch"
        onPointerDown={(event) => {
          event.preventDefault()
          onFire()
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // The first shot already left the muzzle.
          }
          window.clearInterval(repeat.current)
          repeat.current = window.setInterval(onFire, 220)
        }}
        onPointerUp={() => window.clearInterval(repeat.current)}
        onPointerCancel={() => window.clearInterval(repeat.current)}
        onLostPointerCapture={() => window.clearInterval(repeat.current)}
      >
        {copy.fireLabel}
      </button>
      <button
        type="button"
        className="enter-touch"
        onPointerDown={(event) => {
          event.preventDefault()
          onEnter()
        }}
      >
        {copy.land}
      </button>
    </div>
  )
}

/**
 * Paints the round minimap. Canvas +Y is world +Z, so the arrow uses PI minus the ship yaw.
 * @param ctx - The radar's 2D context.
 * @param radar - The canvas element, resized for the device pixel ratio.
 * @param shipX - Ship world X.
 * @param shipZ - Ship world Z.
 * @param yaw - Ship heading in radians.
 * @param marks - Island dots.
 * @param activeId - Island drawn larger.
 */
function drawRadar(
  ctx: CanvasRenderingContext2D,
  radar: HTMLCanvasElement,
  shipX: number,
  shipZ: number,
  yaw: number,
  marks: RadarMark[],
  activeId: string | null,
) {
  const size = 148
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (radar.width !== Math.floor(size * dpr)) {
    radar.width = Math.floor(size * dpr)
    radar.height = Math.floor(size * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 8
  const scale = radius / 112

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = 'rgba(7, 28, 42, 0.62)'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = 'rgba(244, 234, 215, 0.16)'
  ctx.lineWidth = 1
  for (const ring of [0.48, 1]) {
    ctx.beginPath()
    ctx.arc(cx, cy, radius * ring, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (const mark of marks) {
    ctx.beginPath()
    ctx.fillStyle = mark.accent
    ctx.arc(cx + mark.x * scale, cy + mark.z * scale, mark.id === activeId ? 5.5 : 3.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.save()
  ctx.translate(cx + shipX * scale, cy + shipZ * scale)
  ctx.rotate(Math.PI - yaw)
  ctx.fillStyle = '#f6edd8'
  ctx.beginPath()
  ctx.moveTo(0, -7)
  ctx.lineTo(4.5, 5.5)
  ctx.lineTo(0, 3)
  ctx.lineTo(-4.5, 5.5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(224, 177, 90, 0.85)'
  ctx.lineWidth = 2
  ctx.stroke()
}
