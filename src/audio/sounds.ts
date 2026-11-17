import { Howl } from 'howler'

/**
 * Mix at the 100% slider. Effects sit under the shanty; the slider scales these.
 * Waves stay at the quiet bed the visitor already asked for.
 */
const MIX = {
  music: 0.4,
  waves: 0.056,
  cannon: 0.18,
  splash: 0.15,
  impact: 0.15,
  treeHit: 0.18,
  treeFall: 0.15,
  seagull: 0.07,
}

/**
 * Loads one file from `public/sfx`.
 * @param file - Path under `/sfx/`, such as `cannon/cannon-shot-1.mp3`.
 * @param volume - 0 silent, 1 full.
 * @param loop - When true, the clip repeats.
 * @returns The Howler instance.
 */
function fileHowl(file: string, volume: number, loop = false) {
  return new Howl({
    src: [`/sfx/${file}`],
    volume,
    loop,
    preload: true,
  })
}

/** @param level - Any number. Values outside 0..1 are pulled back in. @returns The clamped level. */
function clampLevel(level: number) {
  if (Number.isNaN(level)) return 1
  return Math.min(1, Math.max(0, level))
}

function playAny(howls: Howl[]) {
  howls[Math.floor(Math.random() * howls.length)]?.play()
}

const TRACKS = [
  '/music/ebunny-shanty-spanish-ladies-acoustic-loop.mp3',
  '/music/ebunny-pirate-bay-guitar-loop.mp3',
  '/music/ebunny-pirate-adventure-acoustic.mp3',
  '/music/ebunny-pirate-jolly-roger-acoustic.mp3',
]

/**
 * Shuffles a copy of the playlist. The track that just finished is not placed first.
 * @param avoid - File path to keep off the top when the list is rebuilt.
 * @returns A new play order.
 */
function shuffleTracks(avoid: string) {
  const next = [...TRACKS]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = next[i]
    next[i] = next[j]
    next[j] = swap
  }
  if (avoid && next[0] === avoid && next.length > 1) {
    const swap = next[0]
    next[0] = next[1]
    next[1] = swap
  }
  return next
}

/**
 * All sea audio: the wave loop, the downloaded one-shots, distant gulls, and the music playlist.
 * `started` is true after the first gesture, which browsers require before sound.
 */
export class SeaAudio {
  private readonly waves: Howl
  private readonly cannon: Howl
  private readonly splashes: Howl[]
  private readonly impacts: Howl[]
  private readonly treeHit: Howl
  private readonly treeFall: Howl
  private readonly seagull: Howl
  private readonly sfx: Howl[]
  private started = false
  /** True while the effects button is off. */
  sfxMuted = false
  /** True while the music button is on. */
  musicOn = true
  private seagullTimer = 0
  /** True after play() until the wave loop actually starts, so extra clicks do not stack it. */
  private waveQueued = false
  private queue: string[] = []
  private queueIndex = 0
  private lastTrack = ''
  /** 0..1 from the music slider. 1 is 100%. */
  private musicLevel = 1
  /** 0..1 from the effects slider. 1 is 100%. */
  private sfxLevel = 1
  private music: Howl | null = null
  private skips = 0
  /** How many times each clip has started. Useful while tuning the cannons. */
  readonly plays = { cannon: 0, splash: 0, impact: 0, explosion: 0, seagull: 0 }

  constructor() {
    this.waves = fileHowl('waves/ocean-waves.mp3', MIX.waves, true)
    this.cannon = fileHowl('cannon/cannon-shot-1.mp3', MIX.cannon)
    this.splashes = [
      fileHowl('splash/universfield-water-splash-01.mp3', MIX.splash),
      fileHowl('splash/universfield-water-splash-02.mp3', MIX.splash),
    ]
    this.impacts = [
      fileHowl('impact/hit-rock-01.mp3', MIX.impact),
      fileHowl('impact/universfield-ground-impact.mp3', MIX.impact),
    ]
    this.treeHit = fileHowl('tree/hit-tree.mp3', MIX.treeHit)
    this.treeFall = fileHowl('tree/large-wood-plank-falls-down.mp3', MIX.treeFall)
    this.seagull = fileHowl('animals/seagull-2.mp3', MIX.seagull)
    this.sfx = [this.cannon, ...this.splashes, ...this.impacts, this.treeHit, this.treeFall, this.seagull]
    this.waves.on('load', () => this.ensureWaves())
    if (import.meta.env.DEV) {
      ;(window as unknown as { __audio?: SeaAudio }).__audio = this
    }
  }

  /**
   * Starts the wave loop. Safe to call on every pointer or key event.
   * @returns Nothing. Later calls do nothing once the loop is playing.
   */
  start() {
    const first = !this.started
    this.started = true
    if (!this.sfxMuted) this.ensureWaves()
    if (!first) return
    if (!this.sfxMuted) this.scheduleSeagull()
    if (this.musicOn && !this.music) this.playNext()
  }

  /**
   * Mutes or unmutes the waves and the one-shots. Music stays on its own button.
   * @param muted - True turns effects off.
   */
  setSfxMuted(muted: boolean) {
    this.sfxMuted = muted
    for (const howl of this.sfx) howl.mute(muted)
    this.waves.mute(muted)
    this.applySfxVolumes()
    window.clearTimeout(this.seagullTimer)
    if (muted) {
      this.waveQueued = false
      this.waves.stop()
      this.seagull.stop()
      return
    }
    if (this.started) this.ensureWaves()
    if (this.started) this.scheduleSeagull()
  }

  /** Starts the sea loop once. A second call while it is still loading does nothing. */
  private ensureWaves() {
    if (this.sfxMuted || this.waves.playing() || this.waveQueued) return
    this.waveQueued = true
    this.waves.play()
    this.waves.once('play', () => {
      this.waveQueued = false
    })
  }

  /**
   * Calls once, then again after a long random gap, so a gull is only heard now and then.
   * The cry is quiet and panned to one side so it reads as far off the ship.
   */
  private scheduleSeagull() {
    window.clearTimeout(this.seagullTimer)
    const wait = 12000 + Math.random() * 20000
    this.seagullTimer = window.setTimeout(() => {
      if (!this.sfxMuted) {
        this.plays.seagull += 1
        this.seagull.volume((0.035 + Math.random() * 0.03) * this.sfxLevel)
        this.seagull.stereo((Math.random() * 2 - 1) * 0.75)
        this.seagull.rate(0.94 + Math.random() * 0.1)
        this.seagull.play()
      }
      if (!this.sfxMuted) this.scheduleSeagull()
    }, wait)
  }

  /**
   * Pauses the shanty playlist, or starts it again from the same spot.
   * @param on - True plays music.
   */
  /**
   * Sets the shanty loudness.
   * @param level - 0 silent, 1 full. The slider sends a percent divided by 100.
   */
  setMusicVolume(level: number) {
    this.musicLevel = clampLevel(level)
    this.music?.volume(MIX.music * this.musicLevel)
  }

  /**
   * Sets every effect, including the wave loop and the gull.
   * @param level - 0 silent, 1 full. The slider sends a percent divided by 100.
   */
  setSfxVolume(level: number) {
    this.sfxLevel = clampLevel(level)
    this.applySfxVolumes()
  }

  /** Writes the current effects percent onto each clip. A muted bus stays at zero. */
  private applySfxVolumes() {
    const gain = this.sfxMuted ? 0 : this.sfxLevel
    this.waves.volume(MIX.waves * gain)
    this.cannon.volume(MIX.cannon * gain)
    for (const howl of this.splashes) howl.volume(MIX.splash * gain)
    for (const howl of this.impacts) howl.volume(MIX.impact * gain)
    this.treeHit.volume(MIX.treeHit * gain)
    this.treeFall.volume(MIX.treeFall * gain)
    this.seagull.volume(MIX.seagull * gain)
  }

  setMusicOn(on: boolean) {
    this.musicOn = on
    if (!on) {
      this.music?.pause()
      return
    }
    if (this.music) this.music.play()
    else this.playNext()
  }

  /**
   * Plays the next track in the shuffled order. At the end of the list, the order is shuffled again.
   */
  private playNext() {
    if (!this.musicOn) return
    if (this.queueIndex >= this.queue.length) {
      this.queue = shuffleTracks(this.lastTrack)
      this.queueIndex = 0
    }
    const src = this.queue[this.queueIndex]
    this.queueIndex += 1
    this.lastTrack = src
    this.music?.unload()
    this.music = new Howl({
      src: [src],
      volume: MIX.music * this.musicLevel,
      html5: true,
      onend: () => {
        this.skips = 0
        this.playNext()
      },
      onloaderror: () => {
        this.skips += 1
        if (this.skips <= TRACKS.length) this.playNext()
      },
    })
    this.music.play()
  }

  /** The broadside itself. One recording, because only one cannon file was added. */
  playCannon() {
    this.plays.cannon += 1
    this.cannon.play()
  }

  /** A cannonball landing in open water. Picks one of the two splashes. */
  playSplash() {
    this.plays.splash += 1
    playAny(this.splashes)
  }

  /** A cannonball hitting island ground or knocking a rock. Picks one of the two impacts. */
  playImpact() {
    this.plays.impact += 1
    playAny(this.impacts)
  }

  /** A tree taking a direct hit, then the fall a moment later. */
  playExplosion() {
    this.plays.explosion += 1
    this.treeHit.play()
    window.setTimeout(() => {
      if (!this.sfxMuted) this.treeFall.play()
    }, 180)
  }
}
